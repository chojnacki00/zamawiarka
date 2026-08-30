import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import {
  assertInvitationCanBeAccepted,
  assertInvitationMembershipMatch,
  buildAccountDocument,
  buildInvitationDocument,
  buildMembershipDocument,
  buildRestaurantDocument,
  isValidAccountEmail,
  normalizeAccountEmail,
  resolveLegacyOwnerBootstrapRestaurantId,
  resolveMembershipSelection
} from '../utils/employeeIdentity.js'
import {
  clearLocalPin,
  hasLocalPin,
  setLocalPin,
  verifyLocalPin
} from '../utils/localPinLock.js'

const ACTIVE_RESTAURANT_KEY = 'gm_active_restaurant_id'
const INVITATION_LIFETIME_DAYS = 7

const getRestaurantNameFallback = user => {
  const email = normalizeAccountEmail(user?.email)
  const baseName = email ? email.split('@')[0] : 'Moja restauracja'
  return baseName || 'Moja restauracja'
}

export const useAccountSessionStore = defineStore(
  'accountSession',
  () => {
    const authUser = ref(null)
    const account = ref(null)
    const memberships = ref([])
    const pendingInvitations = ref([])
    const currentRestaurant = ref(null)
    const currentRestaurantId = ref(null)
    const currentMembership = ref(null)
    const currentEmployee = ref(null)
    const permissionProfile = ref(null)
    const permissions = ref({})
    const isInitialized = ref(false)
    const isLoading = ref(false)
    const error = ref('')
    const accessRevoked = ref(false)
    const localPinConfigured = ref(false)
    const isPinLocked = ref(false)
    const requiresRestaurantSelection = ref(false)

    let unsubscribeMembership = null
    let unsubscribeEmployee = null
    let unsubscribePermissionProfile = null

    const employeeAuthStore = useEmployeeAuthStore()

    const isOwner = computed(() => (
      currentMembership.value?.role === 'owner'
    ))
    const isEmployeeMembership = computed(() => (
      currentMembership.value?.role === 'employee' &&
      Boolean(currentMembership.value?.employeeId)
    ))
    const needsEmailVerification = computed(() => (
      Boolean(authUser.value) && authUser.value.emailVerified !== true
    ))
    const needsLocalPinSetup = computed(() => (
      isEmployeeMembership.value &&
      !localPinConfigured.value &&
      !isPinLocked.value
    ))
    const hasActiveContext = computed(() => (
      Boolean(
        authUser.value &&
        authUser.value.emailVerified &&
        currentMembership.value?.status === 'active' &&
        currentRestaurantId.value &&
        !accessRevoked.value &&
        !requiresRestaurantSelection.value &&
        !isPinLocked.value &&
        (!isEmployeeMembership.value || localPinConfigured.value)
      )
    ))
    const requiresAccountAction = computed(() => (
      Boolean(authUser.value) && (
        needsEmailVerification.value ||
        isPinLocked.value ||
        needsLocalPinSetup.value ||
        pendingInvitations.value.length > 0 ||
        requiresRestaurantSelection.value ||
        accessRevoked.value ||
        !currentMembership.value
      )
    ))

    const stopSensitiveListeners = () => {
      if (unsubscribeMembership) unsubscribeMembership()
      if (unsubscribeEmployee) unsubscribeEmployee()
      if (unsubscribePermissionProfile) unsubscribePermissionProfile()
      unsubscribeMembership = null
      unsubscribeEmployee = null
      unsubscribePermissionProfile = null
    }

    const clearSensitiveContext = () => {
      stopSensitiveListeners()
      currentRestaurant.value = null
      currentRestaurantId.value = null
      currentMembership.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      requiresRestaurantSelection.value = false
      employeeAuthStore.clearAuthenticatedRestaurantContext()
    }

    const applyCompatibilityContext = () => {
      if (!hasActiveContext.value) {
        employeeAuthStore.clearAuthenticatedRestaurantContext()
        return
      }

      employeeAuthStore.setAuthenticatedRestaurantContext({
        restId: currentRestaurantId.value,
        employee: isEmployeeMembership.value
          ? currentEmployee.value
          : null,
        permissions: permissions.value
      })
    }

    const handleAccessRevoked = message => {
      stopSensitiveListeners()
      accessRevoked.value = true
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      employeeAuthStore.clearAuthenticatedRestaurantContext()
      error.value = message
    }

    const startContextListeners = () => {
      stopSensitiveListeners()

      if (!currentRestaurantId.value || !authUser.value) return

      const restaurantId = currentRestaurantId.value
      const memberRef = doc(
        db,
        'restaurants',
        restaurantId,
        'members',
        authUser.value.uid
      )

      let listenedPermissionProfileId =
        currentMembership.value?.permissionProfileId || null

      const startPermissionProfileListener = profileId => {
        if (unsubscribePermissionProfile) {
          unsubscribePermissionProfile()
          unsubscribePermissionProfile = null
        }

        permissionProfile.value = null
        permissions.value = {}
        listenedPermissionProfileId = profileId || null

        if (!listenedPermissionProfileId) {
          applyCompatibilityContext()
          return
        }

        const profileRef = doc(
          db,
          'users',
          restaurantId,
          'permissionProfiles',
          listenedPermissionProfileId
        )

        unsubscribePermissionProfile = onSnapshot(profileRef, snapshot => {
          permissionProfile.value = snapshot.exists()
            ? { id: snapshot.id, ...snapshot.data() }
            : null
          permissions.value = snapshot.exists()
            ? snapshot.data().uprawnienia || snapshot.data()
            : {}
          applyCompatibilityContext()
        })
      }

      unsubscribeMembership = onSnapshot(memberRef, snapshot => {
        if (!snapshot.exists() || snapshot.data().status !== 'active') {
          handleAccessRevoked(
            'Dostęp do tej restauracji został zablokowany.'
          )
          return
        }

        currentMembership.value = {
          id: snapshot.id,
          ...snapshot.data()
        }

        if (
          isEmployeeMembership.value &&
          currentMembership.value.permissionProfileId !==
            listenedPermissionProfileId
        ) {
          startPermissionProfileListener(
            currentMembership.value.permissionProfileId
          )
        }
      })

      if (!isEmployeeMembership.value) return

      const employeeRef = doc(
        db,
        'users',
        restaurantId,
        'employees',
        currentMembership.value.employeeId
      )

      unsubscribeEmployee = onSnapshot(employeeRef, snapshot => {
        if (!snapshot.exists() || snapshot.data().aktywny === false) {
          handleAccessRevoked(
            'Powiązany pracownik jest nieaktywny.'
          )
          return
        }

        currentEmployee.value = { id: snapshot.id, ...snapshot.data() }
        applyCompatibilityContext()
      })

      startPermissionProfileListener(
        currentMembership.value.permissionProfileId
      )
    }

    const upsertOwnAccount = async user => {
      const accountRef = doc(db, 'accounts', user.uid)
      const snapshot = await getDoc(accountRef)
      const now = serverTimestamp()
      const document = buildAccountDocument({
        authUid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        createdAt: snapshot.exists()
          ? snapshot.data().createdAt
          : now,
        updatedAt: now
      })

      await setDoc(accountRef, document, { merge: true })
      account.value = { id: user.uid, ...document }
    }

    const fetchOwnMemberships = async user => {
      const snapshot = await getDocs(query(
        collectionGroup(db, 'members'),
        where('authUid', '==', user.uid)
      ))
      const rawMemberships = snapshot.docs.map(memberSnapshot => ({
        id: memberSnapshot.id,
        ...memberSnapshot.data()
      }))
      const enriched = await Promise.all(rawMemberships.map(
        async membership => {
          if (membership.status !== 'active') {
            return {
              ...membership,
              restaurantName: membership.restaurantId
            }
          }

          let restaurantSnapshot
          try {
            restaurantSnapshot = await getDoc(doc(
              db,
              'restaurants',
              membership.restaurantId
            ))
          } catch (caughtError) {
            const code = String(caughtError?.code || '')
            if (!code.endsWith('permission-denied')) throw caughtError

            return {
              ...membership,
              status: 'blocked',
              restaurantName: membership.restaurantId
            }
          }

          return {
            ...membership,
            restaurantName: restaurantSnapshot.exists()
              ? restaurantSnapshot.data().name || membership.restaurantId
              : membership.restaurantId
          }
        }
      ))

      memberships.value = enriched
      return enriched
    }

    const fetchPendingInvitations = async user => {
      if (!user.emailVerified || !user.email) {
        pendingInvitations.value = []
        return []
      }

      const email = normalizeAccountEmail(user.email)
      const snapshot = await getDocs(query(
        collectionGroup(db, 'invitations'),
        where('emailNormalized', '==', email)
      ))
      const invitations = snapshot.docs
        .map(invitationSnapshot => ({
          id: invitationSnapshot.id,
          ...invitationSnapshot.data(),
          restaurantId:
            invitationSnapshot.data().restaurantId ||
            invitationSnapshot.ref.parent.parent?.id ||
            null,
          ref: invitationSnapshot.ref
        }))
        .filter(invitation => (
          invitation.status === 'pending' &&
          invitation.expiresAt?.toMillis?.() > Date.now()
        ))

      pendingInvitations.value = invitations
      return invitations
    }

    const bootstrapLegacyOwnerIfNeeded = async ({
      user,
      availableMemberships
    }) => {
      // Jedyny jawny wyjątek przejściowy UID -> restaurantId. Dotyczy wyłącznie
      // istniejącego właściciela z dawnym dokumentem users/{uid}/app/state.
      const legacyRestaurantId = resolveLegacyOwnerBootstrapRestaurantId({
        authUid: user.uid,
        emailVerified: user.emailVerified
      })
      if (!legacyRestaurantId) return false

      if (availableMemberships.some(
        membership => membership.restaurantId === legacyRestaurantId
      )) return false

      const legacyStateRef = doc(
        db,
        'users',
        legacyRestaurantId,
        'app',
        'state'
      )
      const legacyStateSnapshot = await getDoc(legacyStateRef)

      if (!legacyStateSnapshot.exists()) return false

      const restaurantRef = doc(db, 'restaurants', legacyRestaurantId)
      const memberRef = doc(
        db,
        'restaurants',
        legacyRestaurantId,
        'members',
        user.uid
      )

      await runTransaction(db, async transaction => {
        const [restaurantSnapshot, memberSnapshot] = await Promise.all([
          transaction.get(restaurantRef),
          transaction.get(memberRef)
        ])
        const now = serverTimestamp()

        if (!restaurantSnapshot.exists()) {
          transaction.set(restaurantRef, buildRestaurantDocument({
            restaurantId: legacyRestaurantId,
            name: getRestaurantNameFallback(user),
            ownerAuthUid: user.uid,
            createdAt: now
          }))
        }

        if (!memberSnapshot.exists()) {
          transaction.set(memberRef, buildMembershipDocument({
            authUid: user.uid,
            restaurantId: legacyRestaurantId,
            role: 'owner',
            createdAt: now
          }))
        }
      })

      return true
    }

    const loadMembershipContext = async membership => {
      stopSensitiveListeners()
      accessRevoked.value = false
      currentMembership.value = membership
      currentRestaurantId.value = membership.restaurantId
      localStorage.setItem(ACTIVE_RESTAURANT_KEY, membership.restaurantId)

      const restaurantSnapshot = await getDoc(doc(
        db,
        'restaurants',
        membership.restaurantId
      ))
      currentRestaurant.value = restaurantSnapshot.exists()
        ? { id: restaurantSnapshot.id, ...restaurantSnapshot.data() }
        : { id: membership.restaurantId, name: membership.restaurantName }

      if (membership.role === 'owner') {
        currentEmployee.value = null
        permissionProfile.value = null
        permissions.value = {}
      } else {
        const employeeSnapshot = await getDoc(doc(
          db,
          'users',
          membership.restaurantId,
          'employees',
          membership.employeeId
        ))

        if (
          !employeeSnapshot.exists() ||
          employeeSnapshot.data().aktywny === false
        ) {
          handleAccessRevoked('Powiązany pracownik jest nieaktywny.')
          return
        }

        currentEmployee.value = {
          id: employeeSnapshot.id,
          ...employeeSnapshot.data()
        }

        if (membership.permissionProfileId) {
          const profileSnapshot = await getDoc(doc(
            db,
            'users',
            membership.restaurantId,
            'permissionProfiles',
            membership.permissionProfileId
          ))
          permissionProfile.value = profileSnapshot.exists()
            ? { id: profileSnapshot.id, ...profileSnapshot.data() }
            : null
          permissions.value = profileSnapshot.exists()
            ? profileSnapshot.data().uprawnienia || profileSnapshot.data()
            : {}
        }
      }

      requiresRestaurantSelection.value = false
      startContextListeners()
      applyCompatibilityContext()
    }

    const loadAccountContext = async user => {
      await upsertOwnAccount(user)
      let availableMemberships = await fetchOwnMemberships(user)
      const invitations = await fetchPendingInvitations(user)
      const bootstrapped = await bootstrapLegacyOwnerIfNeeded({
        user,
        availableMemberships,
        invitations
      })

      if (bootstrapped) {
        availableMemberships = await fetchOwnMemberships(user)
      }

      const selection = resolveMembershipSelection({
        memberships: availableMemberships,
        preferredRestaurantId:
          localStorage.getItem(ACTIVE_RESTAURANT_KEY)
      })
      memberships.value = selection.activeMemberships
      requiresRestaurantSelection.value = selection.requiresSelection

      if (
        availableMemberships.length > 0 &&
        selection.activeMemberships.length === 0
      ) {
        accessRevoked.value = true
        error.value = 'Dostęp do restauracji został zablokowany.'
      }

      if (selection.selectedMembership) {
        await loadMembershipContext(selection.selectedMembership)
      }
    }

    const initializeForUser = async (user, { force = false } = {}) => {
      if (
        !force &&
        isInitialized.value &&
        authUser.value?.uid === user?.uid
      ) return

      clearSensitiveContext()
      account.value = null
      memberships.value = []
      pendingInvitations.value = []
      accessRevoked.value = false
      error.value = ''
      authUser.value = user || null
      isInitialized.value = false

      if (!user) {
        localPinConfigured.value = false
        isPinLocked.value = false
        isInitialized.value = true
        return
      }

      localPinConfigured.value = hasLocalPin({ authUid: user.uid })

      if (localPinConfigured.value) {
        isPinLocked.value = true
        isInitialized.value = true
        return
      }

      isLoading.value = true
      try {
        await loadAccountContext(user)
      } catch (caughtError) {
        console.error('Błąd inicjalizacji konta pracownika:', caughtError)
        error.value =
          'Nie udało się wczytać dostępu do restauracji.'
      } finally {
        isLoading.value = false
        isInitialized.value = true
      }
    }

    const refreshAfterEmailVerification = async () => {
      if (!auth.currentUser) return false

      await auth.currentUser.reload()
      authUser.value = auth.currentUser

      if (!auth.currentUser.emailVerified) return false

      await auth.currentUser.getIdToken(true)

      await initializeForUser(auth.currentUser, { force: true })
      return true
    }

    const selectRestaurant = async restaurantId => {
      const membership = memberships.value.find(item => (
        item.restaurantId === restaurantId && item.status === 'active'
      ))

      if (!membership) {
        throw new Error('Nie masz aktywnego dostępu do tej restauracji.')
      }

      await loadMembershipContext(membership)
    }

    const acceptInvitation = async invitation => {
      const user = auth.currentUser

      if (!user || !invitation?.ref) {
        throw new Error('Brak danych zaproszenia.')
      }

      await user.reload()
      if (user.emailVerified) await user.getIdToken(true)
      assertInvitationCanBeAccepted({
        invitation,
        authUser: user,
        now: new Date()
      })

      const restaurantId = invitation.restaurantId
      const employeeId = invitation.employeeId
      assertInvitationMembershipMatch({
        invitation,
        restaurantId,
        employeeId
      })
      const memberRef = doc(
        db,
        'restaurants',
        restaurantId,
        'members',
        user.uid
      )

      await runTransaction(db, async transaction => {
        const [invitationSnapshot, memberSnapshot] =
          await Promise.all([
            transaction.get(invitation.ref),
            transaction.get(memberRef)
          ])

        if (!invitationSnapshot.exists()) {
          throw new Error('Zaproszenie nie istnieje.')
        }

        assertInvitationCanBeAccepted({
          invitation: invitationSnapshot.data(),
          authUser: user,
          now: new Date()
        })
        assertInvitationMembershipMatch({
          invitation: invitationSnapshot.data(),
          restaurantId,
          employeeId
        })

        if (memberSnapshot.exists()) {
          throw new Error('To konto ma już członkostwo w restauracji.')
        }

        const now = serverTimestamp()
        transaction.set(memberRef, buildMembershipDocument({
          authUid: user.uid,
          restaurantId,
          employeeId,
          permissionProfileId:
            invitationSnapshot.data().permissionProfileId || null,
          invitationId: invitationSnapshot.id,
          createdAt: now
        }))
        transaction.update(invitation.ref, {
          status: 'accepted',
          acceptedAt: now,
          acceptedByAuthUid: user.uid
        })
      })

      await initializeForUser(user, { force: true })
    }

    const createInvitation = async ({ employee, email }) => {
      const restaurantId = currentRestaurantId.value
      const user = auth.currentUser

      if (!restaurantId || !user || !employee?.id) {
        throw new Error('Brak danych pracownika lub restauracji.')
      }

      if (
        !isOwner.value &&
        permissions.value.can_manage_employees !== true
      ) {
        throw new Error('Nie masz uprawnienia do zapraszania pracowników.')
      }

      const invitationRef = doc(collection(
        db,
        'restaurants',
        restaurantId,
        'invitations'
      ))
      const employeeSnapshot = await getDoc(doc(
        db,
        'users',
        restaurantId,
        'employees',
        employee.id
      ))

      if (
        !employeeSnapshot.exists() ||
        employeeSnapshot.data().aktywny === false
      ) {
        throw new Error('Można zaprosić tylko aktywnego pracownika.')
      }

      const createdAt = Timestamp.now()
      const expiresAt = Timestamp.fromDate(new Date(
        createdAt.toMillis() +
        (INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000)
      ))
      const invitation = buildInvitationDocument({
        invitationId: invitationRef.id,
        restaurantId,
        employeeId: employee.id,
        permissionProfileId:
          employeeSnapshot.data().permissionProfileId || null,
        email,
        invitedByAuthUid: user.uid,
        createdAt,
        expiresAt
      })

      if (!isValidAccountEmail(invitation.email)) {
        throw new Error('Wpisz prawidłowy adres e-mail.')
      }

      const [memberSnapshot, invitationSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'restaurants', restaurantId, 'members'),
          where('employeeId', '==', employee.id)
        )),
        getDocs(query(
          collection(db, 'restaurants', restaurantId, 'invitations'),
          where('employeeId', '==', employee.id)
        ))
      ])

      if (!memberSnapshot.empty) {
        throw new Error(
          'Ten pracownik ma już członkostwo w tej restauracji.'
        )
      }

      const hasActiveInvitation = invitationSnapshot.docs.some(snapshot => {
        const data = snapshot.data()
        return data.status === 'pending' &&
          data.expiresAt?.toMillis?.() > createdAt.toMillis()
      })

      if (hasActiveInvitation) {
        throw new Error(
          'Ten pracownik ma już aktywne zaproszenie.'
        )
      }

      await setDoc(invitationRef, invitation)
      return invitation
    }

    const getEmployeeAccountAccess = async employeeId => {
      if (!currentRestaurantId.value || !employeeId) return null

      const snapshot = await getDocs(query(
        collection(
          db,
          'restaurants',
          currentRestaurantId.value,
          'members'
        ),
        where('employeeId', '==', employeeId)
      ))

      if (snapshot.empty) return null

      const memberSnapshot = snapshot.docs[0]
      return { id: memberSnapshot.id, ...memberSnapshot.data() }
    }

    const syncEmployeeMembershipProfile = async ({
      employeeId,
      permissionProfileId
    }) => {
      if (!currentRestaurantId.value || !employeeId) return

      const snapshot = await getDocs(query(
        collection(
          db,
          'restaurants',
          currentRestaurantId.value,
          'members'
        ),
        where('employeeId', '==', employeeId)
      ))

      await Promise.all(snapshot.docs.map(memberSnapshot => updateDoc(
        memberSnapshot.ref,
        { permissionProfileId: permissionProfileId || null }
      )))
    }

    const blockRestaurantAccess = async authUid => {
      if (!currentRestaurantId.value || !authUid) return

      await updateDoc(doc(
        db,
        'restaurants',
        currentRestaurantId.value,
        'members',
        authUid
      ), {
        status: 'blocked'
      })
    }

    const configureLocalPin = async pin => {
      if (!authUser.value?.uid || !isEmployeeMembership.value) {
        throw new Error('PIN lokalny jest dostępny po wybraniu restauracji.')
      }

      await setLocalPin({ authUid: authUser.value.uid, pin })
      localPinConfigured.value = true
      isPinLocked.value = false
      applyCompatibilityContext()
    }

    const unlockWithLocalPin = async pin => {
      if (!authUser.value?.uid) return { ok: false, missing: true }

      const result = await verifyLocalPin({
        authUid: authUser.value.uid,
        pin
      })

      if (!result.ok) return result

      isPinLocked.value = false
      isLoading.value = true
      try {
        await loadAccountContext(authUser.value)
      } finally {
        isLoading.value = false
      }

      return result
    }

    const lockApplication = () => {
      if (!authUser.value?.uid || !localPinConfigured.value) return

      clearSensitiveContext()
      account.value = null
      memberships.value = []
      pendingInvitations.value = []
      accessRevoked.value = false
      isPinLocked.value = true
    }

    const logoutCurrentDevice = async () => {
      const authUid = auth.currentUser?.uid || authUser.value?.uid

      if (authUid) clearLocalPin({ authUid })

      clearSensitiveContext()
      localStorage.removeItem(ACTIVE_RESTAURANT_KEY)
      localStorage.removeItem('gm_emp_id')
      localStorage.removeItem('gm_rest_id')
      localStorage.removeItem('gm_saved_rest_id')
      localPinConfigured.value = false
      isPinLocked.value = false
      authUser.value = null
      account.value = null
      memberships.value = []
      pendingInvitations.value = []
      await signOut(auth)
    }

    const hasPermission = permissionKey => (
      isOwner.value || permissions.value?.[permissionKey] === true
    )

    return {
      authUser,
      account,
      memberships,
      pendingInvitations,
      currentRestaurant,
      currentRestaurantId,
      currentMembership,
      currentEmployee,
      permissionProfile,
      permissions,
      isInitialized,
      isLoading,
      error,
      accessRevoked,
      localPinConfigured,
      isPinLocked,
      requiresRestaurantSelection,
      isOwner,
      isEmployeeMembership,
      needsEmailVerification,
      needsLocalPinSetup,
      hasActiveContext,
      requiresAccountAction,
      initializeForUser,
      refreshAfterEmailVerification,
      selectRestaurant,
      acceptInvitation,
      createInvitation,
      getEmployeeAccountAccess,
      syncEmployeeMembershipProfile,
      blockRestaurantAccess,
      configureLocalPin,
      unlockWithLocalPin,
      lockApplication,
      logoutCurrentDevice,
      hasPermission,
      clearSensitiveContext
    }
  }
)
