import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  collection,
  collectionGroup,
  clearIndexedDbPersistence,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  terminate,
  updateDoc,
  writeBatch,
  where
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import {
  buildAccountDocument,
  buildMembershipDocument,
  normalizeAccountEmail,
  resolveMembershipSelection
} from '../utils/employeeIdentity.js'
import { completeLegacyOwnerBootstrap } from '../services/legacyOwnerBootstrap.js'
import {
  assertPrivateInvitationForAccount,
  createIdentityInvitationBundle,
  hashIdentityValue,
  INVITATION_PURPOSES,
  normalizeIdentityEmail
} from '../utils/identityInvitations.js'
import {
  buildDeviceSessionDocument,
  clearLocalApprovedDevice,
  getDeviceSessionId,
  getFirebaseAuthTime,
  getPlatformDescription,
  saveLocalApprovedDevice
} from '../utils/deviceAccess.js'
import {
  clearLocalPin,
  hasLocalPin,
  setLocalPin,
  verifyLocalPin
} from '../utils/localPinLock.js'
import {
  cleanupDisconnectedDeviceSessions,
  cleanupExpiredInvitations,
  cleanupExpiredPairingCodes
} from '../services/temporaryDataCleanup.js'

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
    const deviceApprovalRequired = ref(false)
    const currentDeviceSession = ref(null)
    const localPinConfigured = ref(false)
    const isPinLocked = ref(false)
    const requiresRestaurantSelection = ref(false)

    let unsubscribeMembership = null
    let unsubscribeEmployee = null
    let unsubscribePermissionProfile = null
    let unsubscribeDeviceSession = null
    let isHandlingDeviceDisconnect = false

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
        !deviceApprovalRequired.value &&
        !requiresRestaurantSelection.value &&
        !isPinLocked.value &&
        (!isEmployeeMembership.value || (
          localPinConfigured.value &&
          currentDeviceSession.value?.status === 'active'
        ))
      )
    ))
    const requiresAccountAction = computed(() => (
      Boolean(authUser.value) && (
        needsEmailVerification.value ||
        isPinLocked.value ||
        needsLocalPinSetup.value ||
        pendingInvitations.value.length > 0 ||
        deviceApprovalRequired.value ||
        requiresRestaurantSelection.value ||
        accessRevoked.value ||
        !currentMembership.value
      )
    ))

    const stopSensitiveListeners = () => {
      if (unsubscribeMembership) unsubscribeMembership()
      if (unsubscribeEmployee) unsubscribeEmployee()
      if (unsubscribePermissionProfile) unsubscribePermissionProfile()
      if (unsubscribeDeviceSession) unsubscribeDeviceSession()
      unsubscribeMembership = null
      unsubscribeEmployee = null
      unsubscribePermissionProfile = null
      unsubscribeDeviceSession = null
    }

    const clearSensitiveContext = () => {
      stopSensitiveListeners()
      currentRestaurant.value = null
      currentRestaurantId.value = null
      currentMembership.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      currentDeviceSession.value = null
      deviceApprovalRequired.value = false
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

    const handleDeviceDisconnected = async () => {
      if (isHandlingDeviceDisconnect) return
      isHandlingDeviceDisconnect = true
      const authUid = authUser.value?.uid
      const restaurantId = currentRestaurantId.value
      const deviceId = currentDeviceSession.value?.deviceId

      if (authUid && deviceId) clearLocalPin({ authUid, deviceId })
      if (authUid && restaurantId) {
        clearLocalApprovedDevice({ authUid, restaurantId })
      }

      handleAccessRevoked(
        'To urządzenie zostało odłączone. Poproś managera o nowe zaproszenie urządzenia.'
      )
      deviceApprovalRequired.value = true
      localPinConfigured.value = false
      isPinLocked.value = false
      try {
        await signOut(auth)
      } catch (caughtError) {
        console.warn(
          'Nie udało się zakończyć sesji Firebase po odłączeniu urządzenia:',
          caughtError?.code || caughtError?.message
        )
      }
      try {
        await terminate(db)
        await clearIndexedDbPersistence(db)
      } catch (caughtError) {
        console.warn(
          'Nie udało się wyczyścić lokalnego cache po odłączeniu urządzenia:',
          caughtError?.code || caughtError?.message
        )
      }
      if (globalThis.location?.replace) {
        globalThis.location.replace('/login')
      }
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

      if (currentDeviceSession.value?.sessionId) {
        const sessionRef = doc(
          db,
          'restaurants',
          restaurantId,
          'members',
          authUser.value.uid,
          'deviceSessions',
          currentDeviceSession.value.sessionId
        )
        unsubscribeDeviceSession = onSnapshot(sessionRef, snapshot => {
          if (!snapshot.exists() || snapshot.data().status !== 'active') {
            void handleDeviceDisconnected()
            return
          }
          currentDeviceSession.value = {
            sessionId: snapshot.id,
            ...snapshot.data()
          }
        })
      }

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

          // Pracownik nie może odczytać dokumentu restauracji przed
          // zatwierdzeniem bieżącej sesji urządzenia. Nazwa zostanie pobrana
          // dopiero po pozytywnej kontroli w loadMembershipContext.
          if (membership.role === 'employee') {
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

    const prepareEmployeeDeviceSession = async ({
      membership,
      pinUnlocked = false
    }) => {
      const authTime = await getFirebaseAuthTime(authUser.value)
      const sessionId = getDeviceSessionId(authTime)
      const sessionSnapshot = await getDoc(doc(
        db,
        'restaurants',
        membership.restaurantId,
        'members',
        authUser.value.uid,
        'deviceSessions',
        sessionId
      ))

      if (
        !sessionSnapshot.exists() ||
        sessionSnapshot.data().status !== 'active' ||
        sessionSnapshot.data().employeeId !== membership.employeeId
      ) {
        currentDeviceSession.value = null
        deviceApprovalRequired.value = true
        localPinConfigured.value = false
        isPinLocked.value = false
        return false
      }

      currentDeviceSession.value = {
        sessionId,
        ...sessionSnapshot.data()
      }
      deviceApprovalRequired.value = false
      saveLocalApprovedDevice({
        authUid: authUser.value.uid,
        restaurantId: membership.restaurantId,
        deviceId: sessionSnapshot.data().deviceId,
        sessionId
      })
      localPinConfigured.value = hasLocalPin({
        authUid: authUser.value.uid,
        deviceId: sessionSnapshot.data().deviceId
      })

      if (!localPinConfigured.value) {
        isPinLocked.value = false
        return false
      }
      if (!pinUnlocked) {
        isPinLocked.value = true
        return false
      }

      isPinLocked.value = false
      return true
    }

    const loadMembershipContext = async (
      membership,
      { pinUnlocked = false } = {}
    ) => {
      stopSensitiveListeners()
      accessRevoked.value = false
      error.value = ''
      currentMembership.value = membership
      currentRestaurantId.value = membership.restaurantId
      localStorage.setItem(ACTIVE_RESTAURANT_KEY, membership.restaurantId)

      if (
        membership.role === 'employee' &&
        !(await prepareEmployeeDeviceSession({ membership, pinUnlocked }))
      ) {
        requiresRestaurantSelection.value = false
        applyCompatibilityContext()
        return
      }

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
      if (isEmployeeMembership.value && currentDeviceSession.value?.sessionId) {
        void updateDoc(doc(
          db,
          'restaurants',
          membership.restaurantId,
          'members',
          authUser.value.uid,
          'deviceSessions',
          currentDeviceSession.value.sessionId
        ), { lastActiveAt: serverTimestamp() }).catch(() => {})
      }
      applyCompatibilityContext()
    }

    const loadAccountContext = async user => {
      pendingInvitations.value = []
      const ownerBootstrap = await completeLegacyOwnerBootstrap({
        db,
        user,
        restaurantName: getRestaurantNameFallback(user)
      })

      if (ownerBootstrap.bootstrapped) {
        account.value = {
          id: user.uid,
          ...ownerBootstrap.accountDocument
        }
      } else {
        await upsertOwnAccount(user)
      }

      const availableMemberships = await fetchOwnMemberships(user)

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

      isLoading.value = true
      try {
        await loadAccountContext(user)
      } catch (caughtError) {
        console.error('Błąd inicjalizacji konta pracownika:', caughtError)
        error.value =
          'Nie udało się zakończyć konfiguracji konta. Odśwież widok i spróbuj ponownie.'
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

    const acceptIdentityInvitation = async ({ token, deviceName }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Najpierw zaloguj się do konta GastroManager.')

      await user.reload()
      if (user.emailVerified) await user.getIdToken(true)
      const tokenHash = await hashIdentityValue(token)
      const invitationRef = doc(db, 'identityInvitations', tokenHash)
      const publicInvitationRef = doc(db, 'activationInvitations', tokenHash)
      const invitationSnapshot = await getDoc(invitationRef)
      if (!invitationSnapshot.exists()) {
        throw new Error('Link jest nieważny, anulowany albo został już wykorzystany.')
      }

      const initialInvitation = invitationSnapshot.data()
      assertPrivateInvitationForAccount({
        invitation: initialInvitation,
        authUser: user,
        purpose: initialInvitation.purpose
      })

      const authTime = await getFirebaseAuthTime(user)
      const sessionId = getDeviceSessionId(authTime)
      const memberRef = doc(
        db,
        'restaurants',
        initialInvitation.restaurantId,
        'members',
        user.uid
      )
      const sessionRef = doc(memberRef, 'deviceSessions', sessionId)
      const slotRef = doc(
        db,
        'restaurants',
        initialInvitation.restaurantId,
        'identityInvitationSlots',
        initialInvitation.slotId
      )
      let createdDevice = null

      await runTransaction(db, async transaction => {
        const [
          privateSnapshot,
          publicSnapshot,
          slotSnapshot,
          memberSnapshot,
          sessionSnapshot
        ] = await Promise.all([
          transaction.get(invitationRef),
          transaction.get(publicInvitationRef),
          transaction.get(slotRef),
          transaction.get(memberRef),
          transaction.get(sessionRef)
        ])

        if (!privateSnapshot.exists() || !publicSnapshot.exists()) {
          throw new Error('Zaproszenie jest nieważne lub zostało już wykorzystane.')
        }
        const invitation = privateSnapshot.data()
        assertPrivateInvitationForAccount({
          invitation,
          authUser: user,
          purpose: invitation.purpose
        })
        if (!slotSnapshot.exists() || slotSnapshot.data().tokenHash !== tokenHash) {
          throw new Error('To zaproszenie zostało zastąpione nowszym.')
        }
        if (sessionSnapshot.exists()) {
          throw new Error('Ta sesja urządzenia została już zatwierdzona.')
        }

        if (invitation.purpose === INVITATION_PURPOSES.ACCOUNT_ACTIVATION) {
          if (memberSnapshot.exists()) {
            throw new Error('To konto ma już członkostwo w restauracji.')
          }
          transaction.set(memberRef, buildMembershipDocument({
            authUid: user.uid,
            restaurantId: invitation.restaurantId,
            employeeId: invitation.employeeId,
            permissionProfileId: invitation.permissionProfileId,
            invitationId: tokenHash,
            createdAt: serverTimestamp()
          }))
        } else if (
          !memberSnapshot.exists() ||
          memberSnapshot.data().status !== 'active' ||
          memberSnapshot.data().employeeId !== invitation.employeeId ||
          invitation.targetAuthUid !== user.uid
        ) {
          throw new Error('Zaproszenie urządzenia nie pasuje do tego konta.')
        }

        createdDevice = buildDeviceSessionDocument({
          authUid: user.uid,
          restaurantId: invitation.restaurantId,
          employeeId: invitation.employeeId,
          deviceName,
          platform: getPlatformDescription(),
          authTime,
          approvedByAuthUid: invitation.createdByAuthUid,
          invitationId: tokenHash,
          createdAt: serverTimestamp()
        })
        transaction.set(sessionRef, createdDevice)
        transaction.delete(invitationRef)
        transaction.delete(publicInvitationRef)
        transaction.delete(slotRef)
      })

      saveLocalApprovedDevice({
        authUid: user.uid,
        restaurantId: initialInvitation.restaurantId,
        deviceId: createdDevice.deviceId,
        sessionId
      })
      localStorage.setItem(
        ACTIVE_RESTAURANT_KEY,
        initialInvitation.restaurantId
      )
      await initializeForUser(user, { force: true })
      return {
        restaurantId: initialInvitation.restaurantId,
        purpose: initialInvitation.purpose,
        deviceId: createdDevice.deviceId,
        sessionId
      }
    }

    const createInvitation = async ({
      employee,
      purpose = INVITATION_PURPOSES.ACCOUNT_ACTIVATION,
      targetAuthUid = null
    }) => {
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

      void cleanupExpiredInvitations({ db, restaurantId }).then(result => {
        if (!result.completed) {
          console.warn(
            'Nie udało się wyczyścić wygasłych zaproszeń:',
            result.error
          )
        }
      })

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
      const employeeEmail = normalizeIdentityEmail(
        employeeSnapshot.data().email
      )
      if (!employeeEmail) {
        throw new Error('Najpierw zapisz adres e-mail w danych pracownika.')
      }
      if (
        purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT &&
        !String(targetAuthUid || '').trim()
      ) {
        throw new Error('Brak konta pracownika dla nowego urządzenia.')
      }

      const bundle = await createIdentityInvitationBundle({
        restaurantId,
        restaurantName: currentRestaurant.value?.name,
        employeeId: employee.id,
        permissionProfileId:
          employeeSnapshot.data().permissionProfileId || null,
        email: employeeEmail,
        purpose,
        targetAuthUid,
        createdByAuthUid: user.uid,
        createdAt,
        expiresAt
      })

      const memberSnapshot = await getDocs(query(
        collection(db, 'restaurants', restaurantId, 'members'),
        where('employeeId', '==', employee.id)
      ))
      if (
        purpose === INVITATION_PURPOSES.ACCOUNT_ACTIVATION &&
        !memberSnapshot.empty
      ) {
        throw new Error(
          'Ten pracownik ma już członkostwo w tej restauracji.'
        )
      }

      const privateRef = doc(db, 'identityInvitations', bundle.tokenHash)
      const publicRef = doc(db, 'activationInvitations', bundle.tokenHash)
      const slotRef = doc(
        db,
        'restaurants',
        restaurantId,
        'identityInvitationSlots',
        bundle.slotId
      )

      await runTransaction(db, async transaction => {
        const slotSnapshot = await transaction.get(slotRef)
        if (slotSnapshot.exists()) {
          const oldTokenHash = slotSnapshot.data().tokenHash
          const oldPrivateRef = doc(db, 'identityInvitations', oldTokenHash)
          const oldPublicRef = doc(db, 'activationInvitations', oldTokenHash)
          const [oldPrivate, oldPublic] = await Promise.all([
            transaction.get(oldPrivateRef),
            transaction.get(oldPublicRef)
          ])
          if (oldPrivate.exists()) transaction.delete(oldPrivateRef)
          if (oldPublic.exists()) transaction.delete(oldPublicRef)
        }
        transaction.set(privateRef, bundle.privateInvitation)
        transaction.set(publicRef, bundle.publicInvitation)
        transaction.set(slotRef, bundle.slot)
      })

      return {
        id: bundle.tokenHash,
        token: bundle.rawToken,
        purpose,
        expiresAt,
        maskedEmail: bundle.publicInvitation.maskedEmail
      }
    }

    const getEmployeeAccountAccess = async employeeId => {
      if (!currentRestaurantId.value || !employeeId) return null

      const [memberSnapshot, invitationSnapshot] = await Promise.all([
        getDocs(query(
        collection(
          db,
          'restaurants',
          currentRestaurantId.value,
          'members'
        ),
        where('employeeId', '==', employeeId)
        )),
        getDocs(query(
          collection(db, 'identityInvitations'),
          where('restaurantId', '==', currentRestaurantId.value),
          where('employeeId', '==', employeeId)
        ))
      ])

      if (!memberSnapshot.empty) {
        const snapshot = memberSnapshot.docs[0]
        return {
          id: snapshot.id,
          accessType: 'membership',
          ...snapshot.data()
        }
      }

      const now = Date.now()
      const pendingInvitation = invitationSnapshot.docs.find(snapshot => (
        snapshot.data().purpose === INVITATION_PURPOSES.ACCOUNT_ACTIVATION &&
        snapshot.data().status === 'pending' &&
        snapshot.data().expiresAt?.toMillis?.() > now
      ))

      return pendingInvitation
        ? {
            id: pendingInvitation.id,
            accessType: 'invitation',
            ...pendingInvitation.data()
          }
        : null
    }

    const cancelInvitation = async ({ invitationId, employeeId }) => {
      const restaurantId = currentRestaurantId.value
      if (!restaurantId || !invitationId || !employeeId) {
        throw new Error('Brak danych zaproszenia do anulowania.')
      }
      if (
        !isOwner.value &&
        permissions.value.can_manage_employees !== true
      ) {
        throw new Error('Nie masz uprawnienia do anulowania zaproszeń.')
      }

      const invitationRef = doc(db, 'identityInvitations', invitationId)
      const publicInvitationRef = doc(db, 'activationInvitations', invitationId)

      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(invitationRef)
        if (!snapshot.exists()) return

        const invitation = snapshot.data()
        if (
          invitation.restaurantId !== restaurantId ||
          invitation.employeeId !== employeeId
        ) {
          throw new Error('Zaproszenie nie należy do tego pracownika.')
        }

        const slotRef = doc(
          db,
          'restaurants',
          restaurantId,
          'identityInvitationSlots',
          invitation.slotId
        )
        const [publicSnapshot, slotSnapshot] = await Promise.all([
          transaction.get(publicInvitationRef),
          transaction.get(slotRef)
        ])
        transaction.delete(invitationRef)
        if (publicSnapshot.exists()) transaction.delete(publicInvitationRef)
        if (
          slotSnapshot.exists() &&
          slotSnapshot.data().tokenHash === invitationId
        ) transaction.delete(slotRef)
      })
    }

    const getEmployeeDevices = async authUid => {
      if (!currentRestaurantId.value || !authUid) return []
      if (!isOwner.value && permissions.value.can_manage_employees !== true) {
        throw new Error('Nie masz uprawnienia do przeglądania urządzeń.')
      }

      const snapshot = await getDocs(collection(
        db,
        'restaurants',
        currentRestaurantId.value,
        'members',
        authUid,
        'deviceSessions'
      ))
      return snapshot.docs
        .map(deviceSnapshot => ({
          sessionId: deviceSnapshot.id,
          ...deviceSnapshot.data()
        }))
        .sort((left, right) => (
          (right.createdAt?.toMillis?.() || 0) -
          (left.createdAt?.toMillis?.() || 0)
        ))
    }

    const disconnectDevice = async ({ authUid, sessionId }) => {
      if (!currentRestaurantId.value || !authUid || !sessionId) {
        throw new Error('Brak danych urządzenia do odłączenia.')
      }
      if (!isOwner.value && permissions.value.can_manage_employees !== true) {
        throw new Error('Nie masz uprawnienia do odłączania urządzeń.')
      }

      await updateDoc(doc(
        db,
        'restaurants',
        currentRestaurantId.value,
        'members',
        authUid,
        'deviceSessions',
        sessionId
      ), {
        status: 'disconnected',
        disconnectedAt: serverTimestamp(),
        disconnectedByAuthUid: auth.currentUser.uid
      })
    }

    const disconnectAllDevices = async authUid => {
      const devices = await getEmployeeDevices(authUid)
      const activeDevices = devices.filter(device => device.status === 'active')
      for (let offset = 0; offset < activeDevices.length; offset += 450) {
        const batch = writeBatch(db)
        activeDevices.slice(offset, offset + 450).forEach(device => {
          batch.update(doc(
            db,
            'restaurants',
            currentRestaurantId.value,
            'members',
            authUid,
            'deviceSessions',
            device.sessionId
          ), {
            status: 'disconnected',
            disconnectedAt: serverTimestamp(),
            disconnectedByAuthUid: auth.currentUser.uid
          })
        })
        await batch.commit()
      }
      return activeDevices.length
    }

    const cleanupCurrentRestaurantTemporaryData = async () => {
      const restaurantId = currentRestaurantId.value
      if (
        !restaurantId ||
        (!isOwner.value &&
          permissions.value.can_manage_employees !== true)
      ) return null

      const [invitations, pairingCodes, deviceSessions] = await Promise.all([
        cleanupExpiredInvitations({ db, restaurantId }),
        cleanupExpiredPairingCodes({ db, restaurantId }),
        cleanupDisconnectedDeviceSessions({ db, restaurantId })
      ])

      return { invitations, pairingCodes, deviceSessions }
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
      const deviceId = currentDeviceSession.value?.deviceId
      if (!authUser.value?.uid || !isEmployeeMembership.value || !deviceId) {
        throw new Error('PIN lokalny jest dostępny po wybraniu restauracji.')
      }

      await setLocalPin({ authUid: authUser.value.uid, deviceId, pin })
      localPinConfigured.value = true
      isPinLocked.value = false
      await loadMembershipContext(currentMembership.value, {
        pinUnlocked: true
      })
      applyCompatibilityContext()
    }

    const unlockWithLocalPin = async pin => {
      const deviceId = currentDeviceSession.value?.deviceId
      if (!authUser.value?.uid || !deviceId || !currentMembership.value) {
        return { ok: false, missing: true }
      }

      const result = await verifyLocalPin({
        authUid: authUser.value.uid,
        deviceId,
        pin
      })

      if (!result.ok) return result

      isPinLocked.value = false
      isLoading.value = true
      try {
        await loadMembershipContext(currentMembership.value, {
          pinUnlocked: true
        })
      } finally {
        isLoading.value = false
      }

      return result
    }

    const lockApplication = () => {
      if (!authUser.value?.uid || !localPinConfigured.value) return

      stopSensitiveListeners()
      currentRestaurant.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      employeeAuthStore.clearAuthenticatedRestaurantContext()
      accessRevoked.value = false
      isPinLocked.value = true
    }

    const logoutCurrentDevice = async () => {
      const authUid = auth.currentUser?.uid || authUser.value?.uid
      const restaurantId = currentRestaurantId.value
      const deviceId = currentDeviceSession.value?.deviceId

      if (authUid && deviceId) clearLocalPin({ authUid, deviceId })
      if (authUid && restaurantId) {
        clearLocalApprovedDevice({ authUid, restaurantId })
      }

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
      deviceApprovalRequired,
      currentDeviceSession,
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
      acceptIdentityInvitation,
      createInvitation,
      cancelInvitation,
      getEmployeeDevices,
      disconnectDevice,
      disconnectAllDevices,
      cleanupCurrentRestaurantTemporaryData,
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
