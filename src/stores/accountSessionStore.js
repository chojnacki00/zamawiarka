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
  assertDeviceEnrollmentTargetMembership,
  assertPrivateInvitationForAccount,
  createIdentityInvitationBundle,
  hashIdentityValue,
  INVITATION_PURPOSES,
  normalizeIdentityEmail,
  resolveEmployeeInvitationTarget
} from '../utils/identityInvitations.js'
import {
  buildDeviceSessionDocument,
  buildReactivatedDeviceSessionDocument,
  clearLocalApprovedDevice,
  getDeviceSessionId,
  getFirebaseAuthTime,
  getPlatformDescription,
  readLocalApprovedDevice,
  saveLocalApprovedDevice
} from '../utils/deviceAccess.js'
import {
  clearLocalPin,
  hasLocalPin,
  setLocalPin,
  verifyLocalPin
} from '../utils/localPinLock.js'
import {
  getLocalPinAccessFailure,
  getLocalPinAccessMessage,
  LOCAL_PIN_ACCESS_FAILURES
} from '../utils/localPinAccess.js'
import {
  cleanupDisconnectedDeviceSessions,
  cleanupExpiredInvitations,
  cleanupExpiredPairingCodes
} from '../services/temporaryDataCleanup.js'
import { getCleanupFailureDetails } from '../utils/temporaryDataCleanup.js'
import {
  isPermissionDeniedError,
  shouldTreatBusinessPermissionDeniedAsBlocked
} from '../utils/accountAccessUx.js'

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
    const isMembershipContextReady = ref(false)
    const isLoading = ref(false)
    const error = ref('')
    const accessRevoked = ref(false)
    const deviceApprovalRequired = ref(false)
    const currentDeviceSession = ref(null)
    const localPinConfigured = ref(false)
    const isPinLocked = ref(false)
    const pinAccessFailure = ref(null)
    const deviceAccessState = ref('unknown')
    const lockedEmployeeName = ref('')
    const requiresRestaurantSelection = ref(false)

    let unsubscribeMembership = null
    let unsubscribeEmployee = null
    let unsubscribePermissionProfile = null
    let unsubscribeDeviceSession = null
    let isHandlingDeviceDisconnect = false
    let businessAccessValidationPromise = null
    const applicationLockCleanupHandlers = new Set()

    const employeeAuthStore = useEmployeeAuthStore()

    const isOwner = computed(() => (
      currentMembership.value?.role === 'owner'
    ))
    const isEmployeeMembership = computed(() => (
      currentMembership.value?.role === 'employee' &&
      Boolean(currentMembership.value?.employeeId)
    ))
    const pinLockDisplayName = computed(() => (
      lockedEmployeeName.value ||
      String(account.value?.displayName || '').trim()
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
        isMembershipContextReady.value &&
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
        !isMembershipContextReady.value ||
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

    const registerApplicationLockCleanup = handler => {
      if (typeof handler !== 'function') return () => {}
      applicationLockCleanupHandlers.add(handler)
      return () => applicationLockCleanupHandlers.delete(handler)
    }

    const runApplicationLockCleanup = () => {
      applicationLockCleanupHandlers.forEach(handler => {
        try {
          handler()
        } catch (caughtError) {
          console.error(
            'Nie udało się wyczyścić części danych podczas blokowania aplikacji:',
            caughtError?.code || 'local-pin/cleanup-failed'
          )
        }
      })
    }

    const getEmployeeDisplayName = employee => {
      const fullName = [employee?.imie, employee?.nazwisko]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .join(' ')
      return fullName || String(employee?.name || '').trim()
    }

    const clearSensitiveContext = () => {
      stopSensitiveListeners()
      isMembershipContextReady.value = false
      currentRestaurant.value = null
      currentRestaurantId.value = null
      currentMembership.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      currentDeviceSession.value = null
      deviceApprovalRequired.value = false
      localPinConfigured.value = false
      isPinLocked.value = false
      pinAccessFailure.value = null
      deviceAccessState.value = 'unknown'
      lockedEmployeeName.value = ''
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

    const handleAccessRevoked = (message, membership = null) => {
      runApplicationLockCleanup()
      stopSensitiveListeners()
      isMembershipContextReady.value = false
      isLoading.value = false
      accessRevoked.value = true
      currentRestaurant.value = null
      if (membership) currentMembership.value = membership
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      employeeAuthStore.clearAuthenticatedRestaurantContext()
      error.value = message
    }

    const handleBusinessPermissionDenied = async ({
      error: caughtError,
      restaurantId
    } = {}) => {
      const expectedRestaurantId = String(restaurantId || '').trim()
      const expectedAuthUid = authUser.value?.uid

      if (
        !isPermissionDeniedError(caughtError) ||
        !expectedRestaurantId ||
        expectedRestaurantId !== currentRestaurantId.value ||
        !expectedAuthUid ||
        expectedAuthUid !== auth.currentUser?.uid
      ) return false

      if (accessRevoked.value) return true
      if (businessAccessValidationPromise) {
        return businessAccessValidationPromise
      }

      businessAccessValidationPromise = (async () => {
        try {
          const snapshot = await getDoc(doc(
            db,
            'restaurants',
            expectedRestaurantId,
            'members',
            expectedAuthUid
          ))
          if (
            expectedRestaurantId !== currentRestaurantId.value ||
            expectedAuthUid !== authUser.value?.uid ||
            expectedAuthUid !== auth.currentUser?.uid
          ) return false

          const membership = snapshot.exists()
            ? { id: snapshot.id, ...snapshot.data() }
            : null
          const accessWasRevoked =
            shouldTreatBusinessPermissionDeniedAsBlocked({
              error: caughtError,
              expectedRestaurantId,
              currentRestaurantId: currentRestaurantId.value,
              expectedAuthUid,
              currentAuthUid: auth.currentUser?.uid,
              membershipExists: snapshot.exists(),
              membershipStatus: membership?.status
            })

          if (!accessWasRevoked) return false

          handleAccessRevoked(
            'Dostęp do tej restauracji został zablokowany.',
            membership
          )
          return true
        } catch (validationError) {
          console.error(
            'Nie udało się potwierdzić stanu członkostwa po utracie dostępu:',
            validationError?.code || 'account/membership-check-failed'
          )
          return false
        } finally {
          businessAccessValidationPromise = null
        }
      })()

      return businessAccessValidationPromise
    }

    const handleDeviceDisconnected = () => {
      if (isHandlingDeviceDisconnect) return
      isHandlingDeviceDisconnect = true
      const authUid = authUser.value?.uid
      const restaurantId = currentRestaurantId.value
      const deviceId = currentDeviceSession.value?.deviceId
      const status = currentDeviceSession.value?.status || 'missing'
      const isSuspended = status === 'suspended'

      if (!isSuspended && authUid && deviceId) {
        clearLocalPin({ authUid, deviceId })
      }
      if (!isSuspended && authUid && restaurantId) {
        clearLocalApprovedDevice({ authUid, restaurantId })
      }

      runApplicationLockCleanup()
      stopSensitiveListeners()
      isMembershipContextReady.value = false
      currentRestaurant.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      employeeAuthStore.clearAuthenticatedRestaurantContext()
      accessRevoked.value = false
      deviceApprovalRequired.value = true
      deviceAccessState.value = status
      pinAccessFailure.value = isSuspended
        ? LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED
        : status === 'missing'
          ? LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING
          : LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_INACTIVE
      error.value = getLocalPinAccessMessage(pinAccessFailure.value)
      localPinConfigured.value = isSuspended && localPinConfigured.value
      isPinLocked.value = isSuspended && localPinConfigured.value
      isHandlingDeviceDisconnect = false
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
      const handleContextListenerError = (source, listenerError) => {
        void handleBusinessPermissionDenied({
          error: listenerError,
          restaurantId
        }).then(accessWasRevoked => {
          if (
            accessWasRevoked ||
            restaurantId !== currentRestaurantId.value
          ) return

          isLoading.value = false
          console.error(
            `Nie udało się obserwować ${source}:`,
            listenerError?.code || 'account/context-listener-failed'
          )
          error.value =
            'Nie udało się sprawdzić aktualnego stanu dostępu. Spróbuj ponownie.'
        })
      }

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
        }, listenerError => {
          handleContextListenerError('profilu uprawnień', listenerError)
        })
      }

      unsubscribeMembership = onSnapshot(memberRef, snapshot => {
        if (!snapshot.exists() || snapshot.data().status !== 'active') {
          handleAccessRevoked(
            'Dostęp do tej restauracji został zablokowany.',
            snapshot.exists()
              ? { id: snapshot.id, ...snapshot.data() }
              : null
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
      }, listenerError => {
        isLoading.value = false
        console.error(
          'Nie udało się obserwować stanu członkostwa:',
          listenerError?.code || 'account/membership-listener-failed'
        )
        error.value =
          'Nie udało się sprawdzić aktualnego stanu dostępu. Spróbuj ponownie.'
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
            currentDeviceSession.value = snapshot.exists()
              ? { sessionId: snapshot.id, ...snapshot.data() }
              : { ...currentDeviceSession.value, status: 'missing' }
            handleDeviceDisconnected()
            return
          }
          currentDeviceSession.value = {
            sessionId: snapshot.id,
            ...snapshot.data()
          }
        }, listenerError => {
          handleContextListenerError('sesji urządzenia', listenerError)
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
      }, listenerError => {
        handleContextListenerError('danych pracownika', listenerError)
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

      if (!sessionSnapshot.exists()) {
        const approvedDevice = readLocalApprovedDevice({
          authUid: authUser.value.uid,
          restaurantId: membership.restaurantId
        })
        if (approvedDevice?.deviceId) {
          clearLocalPin({
            authUid: authUser.value.uid,
            deviceId: approvedDevice.deviceId
          })
        }
        clearLocalApprovedDevice({
          authUid: authUser.value.uid,
          restaurantId: membership.restaurantId
        })
        currentDeviceSession.value = null
        deviceApprovalRequired.value = true
        localPinConfigured.value = false
        isPinLocked.value = false
        deviceAccessState.value = 'missing'
        pinAccessFailure.value =
          LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING
        error.value = getLocalPinAccessMessage(pinAccessFailure.value)
        return false
      }

      const session = {
        sessionId,
        ...sessionSnapshot.data()
      }
      currentDeviceSession.value = {
        ...session
      }
      localPinConfigured.value = hasLocalPin({
        authUid: authUser.value.uid,
        deviceId: session.deviceId
      })

      const accessFailure = getLocalPinAccessFailure({
        firebaseAuthUid: authUser.value.uid,
        membership,
        deviceSession: session,
        expectedRestaurantId: membership.restaurantId,
        expectedEmployeeId: membership.employeeId,
        expectedSessionId: sessionId,
        // Brak lokalnego PIN-u w tym miejscu oznacza pierwszy etap konfiguracji,
        // a nie brak zatwierdzenia istniejącej sesji urządzenia.
        localPinConfigured: true
      })

      if (accessFailure) {
        pinAccessFailure.value = accessFailure
        deviceAccessState.value = session.status || 'invalid'
        deviceApprovalRequired.value = true
        isPinLocked.value =
          accessFailure === LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED &&
          localPinConfigured.value
        error.value = getLocalPinAccessMessage(accessFailure)
        if (
          accessFailure !== LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED
        ) {
          if (session.deviceId) {
            clearLocalPin({
              authUid: authUser.value.uid,
              deviceId: session.deviceId
            })
          }
          clearLocalApprovedDevice({
            authUid: authUser.value.uid,
            restaurantId: membership.restaurantId
          })
          localPinConfigured.value = false
        }
        return false
      }

      deviceApprovalRequired.value = false
      deviceAccessState.value = 'active'
      pinAccessFailure.value = null
      error.value = ''
      saveLocalApprovedDevice({
        authUid: authUser.value.uid,
        restaurantId: membership.restaurantId,
        deviceId: session.deviceId,
        sessionId
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
      isMembershipContextReady.value = false
      accessRevoked.value = false
      error.value = ''
      currentRestaurant.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
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
      isMembershipContextReady.value = true
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
        if (
          sessionSnapshot.exists() &&
          sessionSnapshot.data().status !== 'disconnected'
        ) {
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

        const approvalTimestamp = serverTimestamp()
        const deviceData = {
          authUid: user.uid,
          restaurantId: invitation.restaurantId,
          employeeId: invitation.employeeId,
          deviceName,
          platform: getPlatformDescription(),
          authTime,
          approvedByAuthUid: invitation.createdByAuthUid,
          invitationId: tokenHash
        }
        if (sessionSnapshot.exists()) {
          if (invitation.purpose !== INVITATION_PURPOSES.DEVICE_ENROLLMENT) {
            throw new Error('Ta sesja urządzenia nie może zostać ponownie zatwierdzona.')
          }
          createdDevice = buildReactivatedDeviceSessionDocument({
            ...deviceData,
            existingSession: sessionSnapshot.data(),
            reactivatedAt: approvalTimestamp
          })
          transaction.update(sessionRef, createdDevice)
        } else {
          createdDevice = buildDeviceSessionDocument({
            ...deviceData,
            createdAt: approvalTimestamp
          })
          transaction.set(sessionRef, createdDevice)
        }
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
      targetAuthUid = null,
      reactivateMembership = false
    }) => {
      const restaurantId = currentRestaurantId.value
      const user = auth.currentUser

      if (!restaurantId || !user || !employee?.id) {
        throw new Error('Brak danych pracownika lub restauracji.')
      }

      if (!hasPermission('can_manage_employees')) {
        throw new Error('Nie masz uprawnienia do zapraszania pracowników.')
      }

      const invitationCleanup = await cleanupExpiredInvitations({
        db,
        restaurantId
      })
      if (!invitationCleanup.completed) {
        console.warn('Nie udało się wyczyścić wygasłych zaproszeń.')
        if (import.meta.env.DEV) {
          console.warn(
            'Szczegóły czyszczenia zaproszeń:',
            getCleanupFailureDetails({ invitations: invitationCleanup })
          )
        }
      }

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

      let targetMembershipRef = null
      if (purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT) {
        targetMembershipRef = doc(
          db,
          'restaurants',
          restaurantId,
          'members',
          String(targetAuthUid).trim()
        )
        const targetMembershipSnapshot = await getDoc(targetMembershipRef)
        assertDeviceEnrollmentTargetMembership({
          membership: targetMembershipSnapshot.exists()
            ? targetMembershipSnapshot.data()
            : null,
          restaurantId,
          employeeId: employee.id,
          targetAuthUid,
          allowBlocked: reactivateMembership
        })
      } else {
        const memberSnapshot = await getDocs(query(
          collection(db, 'restaurants', restaurantId, 'members'),
          where('employeeId', '==', employee.id)
        ))
        if (!memberSnapshot.empty) {
          throw new Error(
            'Ten pracownik ma już członkostwo w tej restauracji.'
          )
        }
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

      const existingInvitationsSnapshot = await getDocs(query(
        collection(db, 'identityInvitations'),
        where('restaurantId', '==', restaurantId),
        where('employeeId', '==', employee.id)
      ))

      await runTransaction(db, async transaction => {
        const [slotSnapshot, membershipSnapshot] = await Promise.all([
          transaction.get(slotRef),
          targetMembershipRef
            ? transaction.get(targetMembershipRef)
            : Promise.resolve(null)
        ])
        const invitationRefs = new Map()
        existingInvitationsSnapshot.docs.forEach(snapshot => {
          invitationRefs.set(snapshot.ref.path, snapshot.ref)
          invitationRefs.set(
            `activationInvitations/${snapshot.id}`,
            doc(db, 'activationInvitations', snapshot.id)
          )
          const oldSlotId = snapshot.data().slotId
          if (oldSlotId) {
            const oldSlotRef = doc(
              db,
              'restaurants',
              restaurantId,
              'identityInvitationSlots',
              oldSlotId
            )
            invitationRefs.set(oldSlotRef.path, oldSlotRef)
          }
        })
        if (slotSnapshot.exists()) {
          const oldTokenHash = slotSnapshot.data().tokenHash
          invitationRefs.set(
            `identityInvitations/${oldTokenHash}`,
            doc(db, 'identityInvitations', oldTokenHash)
          )
          invitationRefs.set(
            `activationInvitations/${oldTokenHash}`,
            doc(db, 'activationInvitations', oldTokenHash)
          )
        }

        const oldSnapshots = await Promise.all(
          [...invitationRefs.values()].map(reference => transaction.get(reference))
        )
        const oldSnapshotsByPath = new Map(oldSnapshots.map(snapshot => [
          snapshot.ref.path,
          snapshot
        ]))

        existingInvitationsSnapshot.docs.forEach(snapshot => {
          const oldPrivate = oldSnapshotsByPath.get(snapshot.ref.path)
          const oldPublicRef = doc(db, 'activationInvitations', snapshot.id)
          const oldPublic = oldSnapshotsByPath.get(oldPublicRef.path)
          const oldSlotId = snapshot.data().slotId
          const oldSlotRef = oldSlotId
            ? doc(
                db,
                'restaurants',
                restaurantId,
                'identityInvitationSlots',
                oldSlotId
              )
            : null
          const oldSlot = oldSlotRef
            ? oldSnapshotsByPath.get(oldSlotRef.path)
            : null

          if (oldPrivate?.exists()) transaction.delete(oldPrivate.ref)
          if (oldPublic?.exists()) transaction.delete(oldPublic.ref)
          if (
            oldSlotRef?.path !== slotRef.path &&
            oldSlot?.exists() &&
            oldSlot.data().tokenHash === snapshot.id
          ) transaction.delete(oldSlot.ref)
        })

        if (slotSnapshot.exists()) {
          const oldTokenHash = slotSnapshot.data().tokenHash
          const oldPrivate = oldSnapshotsByPath.get(
            `identityInvitations/${oldTokenHash}`
          )
          const oldPublic = oldSnapshotsByPath.get(
            `activationInvitations/${oldTokenHash}`
          )
          if (oldPrivate?.exists()) transaction.delete(oldPrivate.ref)
          if (oldPublic?.exists()) transaction.delete(oldPublic.ref)
        }

        if (targetMembershipRef) {
          assertDeviceEnrollmentTargetMembership({
            membership: membershipSnapshot?.exists()
              ? membershipSnapshot.data()
              : null,
            restaurantId,
            employeeId: employee.id,
            targetAuthUid,
            allowBlocked: reactivateMembership
          })
          if (
            reactivateMembership &&
            membershipSnapshot.data().status === 'blocked'
          ) {
            transaction.update(targetMembershipRef, { status: 'active' })
          }
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

    const createEmployeeAccessInvitation = async ({
      employee,
      restoreBlocked = false
    }) => {
      const restaurantId = currentRestaurantId.value
      if (!restaurantId || !employee?.id) {
        throw new Error('Brak danych pracownika lub restauracji.')
      }
      if (!hasPermission('can_manage_employees')) {
        throw new Error('Nie masz uprawnienia do zapraszania pracowników.')
      }

      const membershipSnapshot = await getDocs(query(
        collection(db, 'restaurants', restaurantId, 'members'),
        where('employeeId', '==', employee.id)
      ))
      if (membershipSnapshot.size > 1) {
        throw new Error('Pracownik ma niespójne dane dostępu do restauracji.')
      }

      const membershipDocument = membershipSnapshot.empty
        ? null
        : membershipSnapshot.docs[0].data()
      const target = resolveEmployeeInvitationTarget({
        membership: membershipDocument,
        restoreBlocked
      })

      return createInvitation({
        employee,
        ...target
      })
    }

    const getEmployeeAccountAccess = async employeeId => {
      if (!currentRestaurantId.value || !employeeId) return null
      if (!hasPermission('can_manage_employees')) {
        throw new Error('Nie masz uprawnienia do przeglądania dostępu pracownika.')
      }

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
      if (!hasPermission('can_manage_employees')) {
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
      if (!hasPermission('can_manage_employees')) {
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
      if (!hasPermission('can_manage_employees')) {
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
        !hasPermission('can_manage_employees')
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
      if (!hasPermission('can_manage_employees')) {
        throw new Error('Nie masz uprawnienia do zmiany dostępu pracownika.')
      }

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
      if (!hasPermission('can_manage_employees')) {
        throw new Error('Nie masz uprawnienia do blokowania dostępu.')
      }

      const restaurantId = currentRestaurantId.value
      const memberRef = doc(
        db,
        'restaurants',
        restaurantId,
        'members',
        authUid
      )
      const memberSnapshot = await getDoc(memberRef)
      if (!memberSnapshot.exists()) {
        throw new Error('Pracownik nie ma dostępu do tej restauracji.')
      }
      const member = memberSnapshot.data()
      if (
        member.restaurantId !== restaurantId ||
        member.authUid !== authUid ||
        member.role !== 'employee'
      ) {
        throw new Error('Nie można zmienić dostępu tego konta.')
      }

      const [deviceSnapshots, invitationSnapshots, slotSnapshots] =
        await Promise.all([
          getDocs(collection(
            db,
            'restaurants',
            restaurantId,
            'members',
            authUid,
            'deviceSessions'
          )),
          getDocs(query(
            collection(db, 'identityInvitations'),
            where('restaurantId', '==', restaurantId),
            where('employeeId', '==', member.employeeId)
          )),
          getDocs(query(
            collection(
              db,
              'restaurants',
              restaurantId,
              'identityInvitationSlots'
            ),
            where('employeeId', '==', member.employeeId)
          ))
        ])
      const activeDevices = deviceSnapshots.docs.filter(
        snapshot => snapshot.data().status === 'active'
      )
      const slotsById = new Map(slotSnapshots.docs.map(snapshot => [
        snapshot.id,
        snapshot
      ]))
      const invitationSlotIds = new Set(
        invitationSnapshots.docs
          .filter(snapshot => (
            slotsById.get(snapshot.data().slotId)?.data().tokenHash ===
            snapshot.id
          ))
          .map(snapshot => snapshot.data().slotId)
      )
      const operationCount = 1 + activeDevices.length +
        (invitationSnapshots.size * 2) + invitationSlotIds.size
      if (operationCount > 450) {
        throw new Error(
          'Nie można bezpiecznie zablokować dostępu. Skontaktuj się z administratorem.'
        )
      }

      const batch = writeBatch(db)
      batch.update(memberRef, { status: 'blocked' })
      activeDevices.forEach(snapshot => {
        batch.update(snapshot.ref, {
          status: 'disconnected',
          disconnectedAt: serverTimestamp(),
          disconnectedByAuthUid: auth.currentUser.uid
        })
      })
      invitationSnapshots.docs.forEach(snapshot => {
        batch.delete(snapshot.ref)
        batch.delete(doc(db, 'activationInvitations', snapshot.id))
      })
      invitationSlotIds.forEach(slotId => {
        batch.delete(doc(
          db,
          'restaurants',
          restaurantId,
          'identityInvitationSlots',
          slotId
        ))
      })
      await batch.commit()

      return {
        disconnectedDevices: activeDevices.length,
        cancelledInvitations: invitationSnapshots.size
      }
    }

    const configureLocalPin = async pin => {
      const deviceId = currentDeviceSession.value?.deviceId
      if (!authUser.value?.uid || !isEmployeeMembership.value || !deviceId) {
        throw new Error('PIN lokalny jest dostępny po wybraniu restauracji.')
      }

      await setLocalPin({ authUid: authUser.value.uid, deviceId, pin })
      localPinConfigured.value = true
      isPinLocked.value = false
      pinAccessFailure.value = null
      deviceAccessState.value = 'active'
      lockedEmployeeName.value = ''
      await loadMembershipContext(currentMembership.value, {
        pinUnlocked: true
      })
      applyCompatibilityContext()
    }

    const unlockWithLocalPin = async pin => {
      isLoading.value = true
      try {
        const user = auth.currentUser
        const restaurantId = currentRestaurantId.value
        const expectedMembership = currentMembership.value
        const expectedEmployeeId = expectedMembership?.employeeId

        if (!user || user.uid !== authUser.value?.uid) {
          pinAccessFailure.value =
            LOCAL_PIN_ACCESS_FAILURES.NO_FIREBASE_SESSION
          error.value = getLocalPinAccessMessage(pinAccessFailure.value)
          isPinLocked.value = false
          return { ok: false, reason: pinAccessFailure.value }
        }

        if (!restaurantId || !expectedMembership) {
          pinAccessFailure.value =
            LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISSING
          error.value = getLocalPinAccessMessage(pinAccessFailure.value)
          isPinLocked.value = false
          return { ok: false, reason: pinAccessFailure.value }
        }

        const membershipSnapshot = await getDoc(doc(
          db,
          'restaurants',
          restaurantId,
          'members',
          user.uid
        ))
        const membership = membershipSnapshot.exists()
          ? { id: membershipSnapshot.id, ...membershipSnapshot.data() }
          : null
        const authTime = await getFirebaseAuthTime(user)
        const sessionId = getDeviceSessionId(authTime)
        const sessionSnapshot = await getDoc(doc(
          db,
          'restaurants',
          restaurantId,
          'members',
          user.uid,
          'deviceSessions',
          sessionId
        ))
        const deviceSession = sessionSnapshot.exists()
          ? { sessionId: sessionSnapshot.id, ...sessionSnapshot.data() }
          : null
        const deviceId = deviceSession?.deviceId
        const localPinMatchesSession = hasLocalPin({
          authUid: user.uid,
          deviceId
        })
        const accessFailure = getLocalPinAccessFailure({
          firebaseAuthUid: user.uid,
          membership,
          deviceSession,
          expectedRestaurantId: restaurantId,
          expectedEmployeeId,
          expectedSessionId: sessionId,
          localPinConfigured: localPinMatchesSession
        })

        if (accessFailure) {
          pinAccessFailure.value = accessFailure
          error.value = getLocalPinAccessMessage(accessFailure)
          currentMembership.value = membership || expectedMembership
          currentDeviceSession.value = deviceSession
          deviceAccessState.value = deviceSession?.status || 'missing'
          deviceApprovalRequired.value = [
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING,
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED,
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_INACTIVE,
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISMATCH
          ].includes(accessFailure)
          accessRevoked.value = [
            LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISSING,
            LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_INACTIVE,
            LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISMATCH
          ].includes(accessFailure)
          isPinLocked.value =
            accessFailure ===
              LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED &&
            localPinMatchesSession
          localPinConfigured.value = localPinMatchesSession
          if ([
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING,
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_INACTIVE,
            LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISMATCH
          ].includes(accessFailure)) {
            const approvedDevice = readLocalApprovedDevice({
              authUid: user.uid,
              restaurantId
            })
            const staleDeviceId =
              deviceSession?.deviceId ||
              currentDeviceSession.value?.deviceId ||
              approvedDevice?.deviceId
            if (staleDeviceId) {
              clearLocalPin({ authUid: user.uid, deviceId: staleDeviceId })
            }
            clearLocalApprovedDevice({
              authUid: user.uid,
              restaurantId
            })
            localPinConfigured.value = false
            isPinLocked.value = false
          }
          return { ok: false, reason: accessFailure }
        }

        const result = await verifyLocalPin({
          authUid: user.uid,
          deviceId,
          pin
        })
        if (!result.ok) return result

        pinAccessFailure.value = null
        deviceAccessState.value = 'active'
        deviceApprovalRequired.value = false
        accessRevoked.value = false
        currentMembership.value = membership
        currentDeviceSession.value = deviceSession
        isPinLocked.value = false
        await loadMembershipContext(membership, {
          pinUnlocked: true
        })
        lockedEmployeeName.value = ''
        return result
      } finally {
        isLoading.value = false
      }
    }

    const lockApplication = () => {
      const canLock = Boolean(
        auth.currentUser?.uid &&
        auth.currentUser.uid === authUser.value?.uid &&
        isEmployeeMembership.value &&
        currentMembership.value?.status === 'active' &&
        currentDeviceSession.value?.status === 'active' &&
        currentDeviceSession.value?.deviceId &&
        localPinConfigured.value
      )
      if (!canLock) return { locked: false }

      lockedEmployeeName.value = getEmployeeDisplayName(currentEmployee.value)
      runApplicationLockCleanup()
      stopSensitiveListeners()
      isMembershipContextReady.value = false
      currentRestaurant.value = null
      currentEmployee.value = null
      permissionProfile.value = null
      permissions.value = {}
      employeeAuthStore.clearAuthenticatedRestaurantContext()
      accessRevoked.value = false
      deviceApprovalRequired.value = false
      pinAccessFailure.value = null
      isPinLocked.value = true
      return { locked: true }
    }

    const logoutCurrentDevice = async () => {
      const authUid = auth.currentUser?.uid || authUser.value?.uid
      const restaurantId = currentRestaurantId.value
      const deviceId = currentDeviceSession.value?.deviceId

      if (authUid && deviceId) clearLocalPin({ authUid, deviceId })
      if (authUid && restaurantId) {
        clearLocalApprovedDevice({ authUid, restaurantId })
      }

      runApplicationLockCleanup()
      clearSensitiveContext()
      localStorage.removeItem(ACTIVE_RESTAURANT_KEY)
      localStorage.removeItem('gm_emp_id')
      localStorage.removeItem('gm_rest_id')
      localStorage.removeItem('gm_saved_rest_id')
      localPinConfigured.value = false
      isPinLocked.value = false
      pinAccessFailure.value = null
      deviceAccessState.value = 'unknown'
      lockedEmployeeName.value = ''
      authUser.value = null
      account.value = null
      memberships.value = []
      pendingInvitations.value = []
      await signOut(auth)
    }

    const hasPermission = permissionKey => (
      hasActiveContext.value && (
        isOwner.value || permissions.value?.[permissionKey] === true
      )
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
      isMembershipContextReady,
      isLoading,
      error,
      accessRevoked,
      deviceApprovalRequired,
      currentDeviceSession,
      localPinConfigured,
      isPinLocked,
      pinAccessFailure,
      deviceAccessState,
      pinLockDisplayName,
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
      createEmployeeAccessInvitation,
      cancelInvitation,
      getEmployeeDevices,
      disconnectDevice,
      disconnectAllDevices,
      cleanupCurrentRestaurantTemporaryData,
      getEmployeeAccountAccess,
      handleBusinessPermissionDenied,
      syncEmployeeMembershipProfile,
      blockRestaurantAccess,
      configureLocalPin,
      unlockWithLocalPin,
      lockApplication,
      registerApplicationLockCleanup,
      logoutCurrentDevice,
      hasPermission,
      clearSensitiveContext
    }
  }
)
