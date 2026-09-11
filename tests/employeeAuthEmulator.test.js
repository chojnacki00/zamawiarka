import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  initializeTestEnvironment
} from '@firebase/rules-unit-testing'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  applyActionCode,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  verifyBeforeUpdateEmail
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore'
import emulatorConfig from '../firebase-emulators.json' with { type: 'json' }
import { completeLegacyOwnerBootstrap } from '../src/services/legacyOwnerBootstrap.js'
import {
  assertEmailMatchesPublicInvitation,
  hashIdentityValue
} from '../src/utils/identityInvitations.js'
import { resolveAccessContext } from '../src/utils/accessControl.js'
import {
  normalizeRestaurantList,
  serializeRestaurantList
} from '../src/utils/restaurantDataContext.js'
import {
  confirmEmailVerification,
  parseEmailVerificationAction
} from '../src/utils/emailVerificationAction.js'

let rulesEnv
let appCounter = 0
const apps = []

const createEmulatedClient = () => {
  appCounter += 1
  const app = initializeApp({
    apiKey: 'demo-api-key',
    projectId: emulatorConfig.projectId,
    authDomain: `${emulatorConfig.projectId}.firebaseapp.com`,
    appId: `demo-app-${appCounter}`
  }, `employee-auth-test-${appCounter}`)
  const auth = getAuth(app)
  const db = getFirestore(app)
  connectAuthEmulator(
    auth,
    `http://${emulatorConfig.host}:${emulatorConfig.authPort}`,
    { disableWarnings: true }
  )
  connectFirestoreEmulator(
    db,
    emulatorConfig.host,
    emulatorConfig.firestorePort
  )
  apps.push(app)
  return { app, auth, db }
}

const clearAuthEmulator = async () => {
  const response = await fetch(
    `http://${emulatorConfig.host}:${emulatorConfig.authPort}` +
      `/emulator/v1/projects/${emulatorConfig.projectId}/accounts`,
    { method: 'DELETE' }
  )
  assert.equal(response.ok, true)
}

const getVerificationCode = async email => {
  const response = await fetch(
    `http://${emulatorConfig.host}:${emulatorConfig.authPort}` +
      `/emulator/v1/projects/${emulatorConfig.projectId}/oobCodes`
  )
  assert.equal(response.ok, true)
  const payload = await response.json()
  const record = payload.oobCodes.find(code => (
    code.email === email && code.requestType === 'VERIFY_EMAIL'
  ))
  assert.ok(record?.oobCode)
  return record.oobCode
}

const getEmailChangeCode = async newEmail => {
  const response = await fetch(
    `http://${emulatorConfig.host}:${emulatorConfig.authPort}` +
      `/emulator/v1/projects/${emulatorConfig.projectId}/oobCodes`
  )
  assert.equal(response.ok, true)
  const payload = await response.json()
  const record = payload.oobCodes.find(code => (
    code.requestType === 'VERIFY_AND_CHANGE_EMAIL' &&
    [code.email, code.newEmail].includes(newEmail)
  ))
  assert.ok(record?.oobCode)
  return record.oobCode
}

const seed = async documents => {
  await rulesEnv.withSecurityRulesDisabled(async adminContext => {
    const db = adminContext.firestore()
    await Promise.all(documents.map(([path, data]) => (
      setDoc(doc(db, path), data)
    )))
  })
}

const readAsAdmin = async paths => {
  let snapshots = []
  await rulesEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    snapshots = await Promise.all(
      paths.map(path => getDoc(doc(adminDb, path)))
    )
  })
  return snapshots
}

const createVerifiedClient = async ({
  email,
  password = 'Testowe-haslo-123'
}) => {
  const { auth, db } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )
  await sendEmailVerification(credential.user)
  await applyActionCode(auth, await getVerificationCode(email))
  await credential.user.reload()
  await credential.user.getIdToken(true)
  assert.equal(credential.user.emailVerified, true)
  return { auth, db, user: credential.user, password }
}

before(async () => {
  rulesEnv = await initializeTestEnvironment({
    projectId: emulatorConfig.projectId,
    firestore: {
      host: emulatorConfig.host,
      port: emulatorConfig.firestorePort,
      rules: await readFile(
        new URL('../firestore.rules', import.meta.url),
        'utf8'
      )
    }
  })
})

beforeEach(async () => {
  await Promise.all([
    clearAuthEmulator(),
    rulesEnv.clearFirestore()
  ])
})

after(async () => {
  await rulesEnv.cleanup()
  await Promise.all(apps.map(app => deleteApp(app)))
})

test('Auth Emulator tworzy konto e-mail/hasło i odtwarza sesję', async () => {
  const email = 'employee@example.test'
  const password = 'Testowe-haslo-123'
  const { auth } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )

  assert.ok(credential.user.uid)
  assert.equal(credential.user.emailVerified, false)
  await signOut(auth)

  const signedIn = await signInWithEmailAndPassword(auth, email, password)
  assert.equal(signedIn.user.uid, credential.user.uid)
})

test('weryfikacja e-maila z Emulatora zmienia token Auth', async () => {
  const email = 'verified@example.test'
  const { auth } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    'Testowe-haslo-123'
  )

  await sendEmailVerification(credential.user)
  const code = await getVerificationCode(email)
  await applyActionCode(auth, code)
  await credential.user.reload()
  const token = await credential.user.getIdTokenResult(true)

  assert.equal(credential.user.emailVerified, true)
  assert.equal(token.claims.email_verified, true)
})

test('własny handler potwierdza prawdziwy kod verifyEmail w Auth Emulatorze', async () => {
  const email = 'custom-handler@example.test'
  const { auth } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    'Testowe-haslo-123'
  )

  await sendEmailVerification(credential.user)
  const action = parseEmailVerificationAction({
    query: {
      mode: 'verifyEmail',
      oobCode: await getVerificationCode(email),
      apiKey: 'demo-api-key'
    },
    expectedApiKey: auth.app.options.apiKey
  })
  const unchangedUid = credential.user.uid

  await confirmEmailVerification({
    authInstance: auth,
    oobCode: action.oobCode
  })
  await credential.user.reload()
  await credential.user.getIdToken(true)

  assert.equal(credential.user.emailVerified, true)
  assert.equal(credential.user.uid, unchangedUid)
})

test('rzeczywisty bootstrap pracownika czyta i zmienia wspólny legacy app/state restauracji', async () => {
  const restaurantId = 'restaurant-shared'
  const employeeId = 'employee-julia'
  const profileId = 'profile-full'
  const owner = await createVerifiedClient({
    email: 'shared-owner@example.test'
  })
  const employee = await createVerifiedClient({
    email: 'shared-employee@example.test'
  })
  const authTime = Number(
    (await employee.user.getIdTokenResult()).claims.auth_time
  )
  const employeeMembership = {
    authUid: employee.user.uid,
    restaurantId,
    employeeId,
    permissionProfileId: profileId,
    invitationId: 'seed-invitation',
    role: 'employee',
    status: 'active',
    createdAt: Timestamp.now(),
    acceptedAt: Timestamp.now()
  }

  await seed([
    [`restaurants/${restaurantId}`, {
      id: restaurantId,
      name: 'Wspólna restauracja',
      ownerAuthUid: owner.user.uid,
      status: 'active'
    }],
    [`restaurants/${restaurantId}/members/${owner.user.uid}`, {
      authUid: owner.user.uid,
      restaurantId,
      employeeId: null,
      permissionProfileId: null,
      invitationId: null,
      role: 'owner',
      status: 'active',
      createdAt: Timestamp.now(),
      acceptedAt: Timestamp.now()
    }],
    [`restaurants/${restaurantId}/members/${employee.user.uid}`, employeeMembership],
    [`restaurants/${restaurantId}/members/${employee.user.uid}/deviceSessions/${authTime}`, {
      deviceId: 'device-shared-employee-0001',
      restaurantId,
      employeeId,
      authUid: employee.user.uid,
      deviceName: 'Telefon Julii',
      platform: 'Emulator',
      authTime,
      status: 'active',
      addedAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
      approvedAt: Timestamp.now(),
      approvedByAuthUid: owner.user.uid,
      invitationId: 'seed-invitation',
      disconnectedAt: null,
      disconnectedByAuthUid: null
    }],
    [`users/${restaurantId}/employees/${employeeId}`, {
      imie: 'Julia',
      nazwisko: 'Testowa',
      aktywny: true,
      permissionProfileId: profileId
    }],
    [`users/${restaurantId}/permissionProfiles/${profileId}`, {
      nazwa: 'Pełny dostęp Zamawiarki',
      uprawnienia: {
        can_view_zamawiarka: true,
        can_edit_products: true
      }
    }],
    [`users/${restaurantId}/app/state`, {
      initialized: true,
      suppliers: ['Hurtownia legacy'],
      warehouses: ['Magazyn legacy'],
      units: ['kg'],
      fcSettings: { target: 31 }
    }]
  ])

  let membershipContextReady = false
  const beforeContext = resolveAccessContext({
    firebaseAuthUid: employee.user.uid,
    hasActiveAccountContext: membershipContextReady,
    membership: employeeMembership
  })
  assert.equal(beforeContext.restaurantId, null)

  const memberSnapshot = await getDoc(doc(
    employee.db,
    `restaurants/${restaurantId}/members/${employee.user.uid}`
  ))
  const sessionSnapshot = await getDoc(doc(
    employee.db,
    `restaurants/${restaurantId}/members/${employee.user.uid}/deviceSessions/${authTime}`
  ))
  const restaurantSnapshot = await getDoc(doc(
    employee.db,
    `restaurants/${restaurantId}`
  ))
  const employeeSnapshot = await getDoc(doc(
    employee.db,
    `users/${restaurantId}/employees/${employeeId}`
  ))
  const profileSnapshot = await getDoc(doc(
    employee.db,
    `users/${restaurantId}/permissionProfiles/${profileId}`
  ))

  assert.equal(memberSnapshot.exists(), true)
  assert.equal(sessionSnapshot.data().status, 'active')
  assert.equal(restaurantSnapshot.data().id, restaurantId)
  assert.equal(employeeSnapshot.data().imie, 'Julia')
  assert.equal(profileSnapshot.data().uprawnienia.can_edit_products, true)

  membershipContextReady = true
  const resolvedContext = resolveAccessContext({
    firebaseAuthUid: employee.user.uid,
    hasActiveAccountContext: membershipContextReady,
    membership: { id: memberSnapshot.id, ...memberSnapshot.data() },
    employee: { id: employeeSnapshot.id, ...employeeSnapshot.data() },
    permissions: profileSnapshot.data().uprawnienia
  })
  assert.equal(resolvedContext.restaurantId, restaurantId)
  assert.notEqual(resolvedContext.restaurantId, employee.user.uid)

  const sharedPath = `users/${resolvedContext.restaurantId}/app/state`
  const employeeState = await getDoc(doc(employee.db, sharedPath))
  const ownerState = await getDoc(doc(owner.db, sharedPath))
  assert.deepEqual(employeeState.data(), ownerState.data())

  await updateDoc(doc(owner.db, sharedPath), {
    suppliers: ['Hurtownia legacy', 'Hurtownia właściciela']
  })
  const employeeAfterOwnerWrite = await getDoc(doc(employee.db, sharedPath))
  assert.deepEqual(employeeAfterOwnerWrite.data().suppliers, [
    'Hurtownia legacy',
    'Hurtownia właściciela'
  ])

  let hydratedSuppliers = normalizeRestaurantList(
    'suppliers',
    employeeAfterOwnerWrite.data().suppliers
  )
  assert.equal(hydratedSuppliers[0].name, 'Hurtownia legacy')
  assert.equal(hydratedSuppliers[1].name, 'Hurtownia właściciela')

  hydratedSuppliers.push({ id: 'supplier-new', name: 'Nowa hurtownia' })
  await updateDoc(doc(employee.db, sharedPath), {
    suppliers: serializeRestaurantList('suppliers', hydratedSuppliers)
  })
  let ownerAfter = await getDoc(doc(owner.db, sharedPath))
  assert.deepEqual(ownerAfter.data().suppliers, [
    'Hurtownia legacy',
    'Hurtownia właściciela',
    { id: 'supplier-new', name: 'Nowa hurtownia' }
  ])

  hydratedSuppliers[0] = {
    ...hydratedSuppliers[0],
    name: 'Hurtownia po edycji'
  }
  await updateDoc(doc(employee.db, sharedPath), {
    suppliers: serializeRestaurantList('suppliers', hydratedSuppliers)
  })
  ownerAfter = await getDoc(doc(owner.db, sharedPath))
  assert.equal(ownerAfter.data().suppliers[0].name, 'Hurtownia po edycji')

  await updateDoc(doc(employee.db, sharedPath), { suppliers: [] })
  ownerAfter = await getDoc(doc(owner.db, sharedPath))
  assert.deepEqual(ownerAfter.data().suppliers, [])
  assert.deepEqual(ownerAfter.data().warehouses, ['Magazyn legacy'])
  assert.deepEqual(ownerAfter.data().units, ['kg'])
  assert.deepEqual(ownerAfter.data().fcSettings, { target: 31 })

  await assert.rejects(
    getDoc(doc(employee.db, `users/${employee.user.uid}/app/state`)),
    error => String(error?.code || '').includes('permission-denied')
  )

  await seed([[`users/${restaurantId}/permissionProfiles/${profileId}`, {
    nazwa: 'Tylko odczyt',
    uprawnienia: { can_view_zamawiarka: true }
  }]])
  await assert.rejects(
    updateDoc(doc(employee.db, sharedPath), {
      suppliers: ['Niedozwolona zmiana']
    }),
    error => String(error?.code || '').includes('permission-denied')
  )
})

test('aktywacja zachowuje zaproszenie po utworzeniu niezweryfikowanego konta i kończy się atomowo', async () => {
  const rawToken = 'testowy-token-aktywacji-pracownika'
  const email = 'activation-resume@example.test'
  const password = 'Testowe-haslo-123'
  const [tokenHash, emailHash] = await Promise.all([
    hashIdentityValue(rawToken, { cryptoImpl: webcrypto }),
    hashIdentityValue(email, { cryptoImpl: webcrypto })
  ])
  const slotId = 'restaurant-a__employee-resume__ACCOUNT_ACTIVATION'
  const expiresAt = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)

  await seed([
    ['users/restaurant-a/employees/employee-resume', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    [`identityInvitations/${tokenHash}`, {
      id: tokenHash,
      tokenHash,
      slotId,
      purpose: 'ACCOUNT_ACTIVATION',
      restaurantId: 'restaurant-a',
      employeeId: 'employee-resume',
      permissionProfileId: 'profile-1',
      emailNormalized: email,
      emailHash,
      targetAuthUid: null,
      status: 'pending',
      createdByAuthUid: 'owner-auth',
      createdAt: Timestamp.now(),
      expiresAt
    }],
    [`activationInvitations/${tokenHash}`, {
      id: tokenHash,
      tokenHash,
      purpose: 'ACCOUNT_ACTIVATION',
      restaurantNameSnapshot: 'Restauracja testowa',
      maskedEmail: 'a***@example.test',
      emailHash,
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt
    }],
    [`restaurants/restaurant-a/identityInvitationSlots/${slotId}`, {
      id: slotId,
      tokenHash,
      restaurantId: 'restaurant-a',
      employeeId: 'employee-resume',
      purpose: 'ACCOUNT_ACTIVATION',
      createdAt: Timestamp.now(),
      expiresAt
    }]
  ])

  const { auth, db } = createEmulatedClient()
  const publicRef = doc(db, `activationInvitations/${tokenHash}`)
  const privateRef = doc(db, `identityInvitations/${tokenHash}`)
  const anonymousPreview = await getDoc(publicRef)
  assert.equal(anonymousPreview.exists(), true)
  await assertEmailMatchesPublicInvitation({
    email,
    invitation: anonymousPreview.data(),
    cryptoImpl: webcrypto
  })

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )
  assert.equal(credential.user.emailVerified, false)
  assert.equal((await getDoc(publicRef)).exists(), true)
  await assert.rejects(getDoc(privateRef), error => (
    error?.code === 'permission-denied'
  ))

  const memberRef = doc(
    db,
    `restaurants/restaurant-a/members/${credential.user.uid}`
  )
  const [memberBefore, privateBefore, publicBefore, slotBefore] = await readAsAdmin([
    `restaurants/restaurant-a/members/${credential.user.uid}`,
    `identityInvitations/${tokenHash}`,
    `activationInvitations/${tokenHash}`,
    `restaurants/restaurant-a/identityInvitationSlots/${slotId}`
  ])
  assert.equal(memberBefore.exists(), false)
  assert.equal(privateBefore.exists(), true)
  assert.equal(publicBefore.exists(), true)
  assert.equal(slotBefore.exists(), true)

  await signOut(auth)
  const resumed = await signInWithEmailAndPassword(auth, email, password)
  assert.equal(resumed.user.emailVerified, false)
  assert.equal((await getDoc(publicRef)).exists(), true)

  await sendEmailVerification(resumed.user)
  await applyActionCode(auth, await getVerificationCode(email))
  await resumed.user.reload()
  await resumed.user.getIdToken(true)
  assert.equal(resumed.user.emailVerified, true)

  const authTime = Number(
    (await resumed.user.getIdTokenResult()).claims.auth_time
  )
  const sessionRef = doc(
    memberRef,
    'deviceSessions',
    String(authTime)
  )
  const slotRef = doc(
    db,
    `restaurants/restaurant-a/identityInvitationSlots/${slotId}`
  )

  await runTransaction(db, async transaction => {
    const [privateInvitation, publicInvitation, slot, member, session] = await Promise.all([
      transaction.get(privateRef),
      transaction.get(publicRef),
      transaction.get(slotRef),
      transaction.get(memberRef),
      transaction.get(sessionRef)
    ])
    assert.equal(privateInvitation.exists(), true)
    assert.equal(publicInvitation.exists(), true)
    assert.equal(slot.exists(), true)
    assert.equal(member.exists(), false)
    assert.equal(session.exists(), false)

    transaction.set(memberRef, {
      authUid: resumed.user.uid,
      restaurantId: 'restaurant-a',
      employeeId: 'employee-resume',
      permissionProfileId: 'profile-1',
      invitationId: tokenHash,
      role: 'employee',
      status: 'active',
      createdAt: serverTimestamp(),
      acceptedAt: serverTimestamp()
    })
    transaction.set(sessionRef, {
      deviceId: 'device-auth-emulator-resume',
      restaurantId: 'restaurant-a',
      employeeId: 'employee-resume',
      authUid: resumed.user.uid,
      deviceName: 'Telefon testowy',
      platform: 'Auth Emulator',
      authTime,
      status: 'active',
      addedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
      approvedByAuthUid: 'owner-auth',
      invitationId: tokenHash,
      disconnectedAt: null,
      disconnectedByAuthUid: null
    })
    transaction.delete(privateRef)
    transaction.delete(publicRef)
    transaction.delete(slotRef)
  })

  const [memberAfter, privateAfter, publicAfter, slotAfter] = await readAsAdmin([
    `restaurants/restaurant-a/members/${resumed.user.uid}`,
    `identityInvitations/${tokenHash}`,
    `activationInvitations/${tokenHash}`,
    `restaurants/restaurant-a/identityInvitationSlots/${slotId}`
  ])
  assert.equal(memberAfter.exists(), true)
  assert.equal(privateAfter.exists(), false)
  assert.equal(publicAfter.exists(), false)
  assert.equal(slotAfter.exists(), false)
  assert.equal((await getDoc(sessionRef)).exists(), true)
})

test('zweryfikowany stary właściciel atomowo tworzy konto, restaurację i członkostwo', async () => {
  const { db, user } = await createVerifiedClient({
    email: 'legacy-owner@example.test'
  })
  await seed([[`users/${user.uid}/app/state`, { initialized: true }]])

  const result = await completeLegacyOwnerBootstrap({
    db,
    user,
    restaurantName: 'Restauracja emulatorowa'
  })
  assert.equal(result.bootstrapped, true)

  const [account, restaurant, member] = await readAsAdmin([
    `accounts/${user.uid}`,
    `restaurants/${user.uid}`,
    `restaurants/${user.uid}/members/${user.uid}`
  ])
  assert.equal(account.exists(), true)
  assert.equal(restaurant.exists(), true)
  assert.equal(member.exists(), true)
  assert.equal(account.data().authUid, user.uid)
  assert.equal(restaurant.data().ownerAuthUid, user.uid)
  assert.equal(member.data().role, 'owner')
  assert.equal(member.data().status, 'active')
  assert.equal(member.data().employeeId, null)
  assert.equal(member.data().permissionProfileId, null)
  assert.equal(member.data().invitationId, null)

  const marker = await getDoc(doc(db, `users/${user.uid}/app/state`))
  assert.equal(marker.data().initialized, true)
  const missingProduct = await getDoc(doc(
    db,
    `users/${user.uid}/towary/brak-testowego-produktu`
  ))
  assert.equal(missingProduct.exists(), false)
})

test('konto bez markera legacy nie uruchamia bootstrapu właściciela', async () => {
  const { db, user } = await createVerifiedClient({
    email: 'no-marker@example.test'
  })
  const result = await completeLegacyOwnerBootstrap({
    db,
    user,
    restaurantName: 'Niedozwolona restauracja'
  })
  assert.deepEqual(result, {
    bootstrapped: false,
    reason: 'marker-missing'
  })

  const [account, restaurant, member] = await readAsAdmin([
    `accounts/${user.uid}`,
    `restaurants/${user.uid}`,
    `restaurants/${user.uid}/members/${user.uid}`
  ])
  assert.equal(account.exists(), false)
  assert.equal(restaurant.exists(), false)
  assert.equal(member.exists(), false)
})

test('istniejące konto i marker są bezpiecznie uzupełniane o restaurację i właściciela', async () => {
  const { db, user } = await createVerifiedClient({
    email: 'partial-owner@example.test'
  })
  await setDoc(doc(db, `accounts/${user.uid}`), {
    authUid: user.uid,
    email: user.email,
    displayName: '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  await seed([[`users/${user.uid}/app/state`, { initialized: true }]])

  const result = await completeLegacyOwnerBootstrap({
    db,
    user,
    restaurantName: 'Dokończona restauracja'
  })
  assert.equal(result.bootstrapped, true)

  const [account, restaurant, member] = await readAsAdmin([
    `accounts/${user.uid}`,
    `restaurants/${user.uid}`,
    `restaurants/${user.uid}/members/${user.uid}`
  ])
  assert.equal(account.exists(), true)
  assert.equal(restaurant.exists(), true)
  assert.equal(member.exists(), true)
})

test('częściowe konto bez markera nie może uzyskać restauracji ani członkostwa', async () => {
  const { db, user } = await createVerifiedClient({
    email: 'partial-no-marker@example.test'
  })
  await setDoc(doc(db, `accounts/${user.uid}`), {
    authUid: user.uid,
    email: user.email,
    displayName: '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  const result = await completeLegacyOwnerBootstrap({
    db,
    user,
    restaurantName: 'Niedozwolona restauracja'
  })
  assert.equal(result.bootstrapped, false)

  const [, restaurant, member] = await readAsAdmin([
    `accounts/${user.uid}`,
    `restaurants/${user.uid}`,
    `restaurants/${user.uid}/members/${user.uid}`
  ])
  assert.equal(restaurant.exists(), false)
  assert.equal(member.exists(), false)
})

test('ponowny bootstrap właściciela jest idempotentny', async () => {
  const { db, user } = await createVerifiedClient({
    email: 'idempotent-owner@example.test'
  })
  await seed([[`users/${user.uid}/app/state`, { initialized: true }]])
  const options = {
    db,
    user,
    restaurantName: 'Stała restauracja'
  }

  await completeLegacyOwnerBootstrap(options)
  const before = await readAsAdmin([
    `accounts/${user.uid}`,
    `restaurants/${user.uid}`,
    `restaurants/${user.uid}/members/${user.uid}`
  ])
  await completeLegacyOwnerBootstrap(options)
  const after = await readAsAdmin([
    `accounts/${user.uid}`,
    `restaurants/${user.uid}`,
    `restaurants/${user.uid}/members/${user.uid}`
  ])

  assert.deepEqual(
    after.map(snapshot => snapshot.data()),
    before.map(snapshot => snapshot.data())
  )
})

test('dwa równoległe bootstrapy kończą się jednym spójnym zestawem dokumentów', async () => {
  const email = 'parallel-owner@example.test'
  const first = await createVerifiedClient({ email })
  const second = createEmulatedClient()
  await signInWithEmailAndPassword(second.auth, email, first.password)
  await seed([[`users/${first.user.uid}/app/state`, { initialized: true }]])

  const results = await Promise.all([
    completeLegacyOwnerBootstrap({
      db: first.db,
      user: first.user,
      restaurantName: 'Równoległa restauracja'
    }),
    completeLegacyOwnerBootstrap({
      db: second.db,
      user: second.auth.currentUser,
      restaurantName: 'Równoległa restauracja'
    })
  ])
  assert.deepEqual(results.map(result => result.bootstrapped), [true, true])

  const [account, restaurant, member] = await readAsAdmin([
    `accounts/${first.user.uid}`,
    `restaurants/${first.user.uid}`,
    `restaurants/${first.user.uid}/members/${first.user.uid}`
  ])
  assert.equal(account.exists(), true)
  assert.equal(restaurant.exists(), true)
  assert.equal(member.exists(), true)
  assert.equal(member.data().employeeId, null)
  assert.equal(member.data().permissionProfileId, null)
})

test('ponowne uwierzytelnienie wysyła zmianę e-maila, ale stosuje ją dopiero po kodzie', async () => {
  const oldEmail = 'owner-old@example.test'
  const newEmail = 'owner-new@example.test'
  const password = 'Testowe-haslo-123'
  const { auth, db } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    oldEmail,
    password
  )
  const unchangedUid = credential.user.uid

  await reauthenticateWithCredential(
    credential.user,
    EmailAuthProvider.credential(oldEmail, password)
  )
  auth.languageCode = 'pl'
  await verifyBeforeUpdateEmail(credential.user, newEmail, {
    url: 'http://localhost:5173/konto'
  })

  assert.equal(credential.user.email, oldEmail)
  assert.equal(credential.user.emailVerified, false)
  const code = await getEmailChangeCode(newEmail)
  await applyActionCode(auth, code)
  await credential.user.reload()
  await credential.user.getIdToken(true)

  assert.equal(credential.user.email, newEmail)
  assert.equal(credential.user.emailVerified, true)
  assert.equal(credential.user.uid, unchangedUid)

  await seed([[`users/${unchangedUid}/app/state`, { initialized: true }]])
  await completeLegacyOwnerBootstrap({
    db,
    user: credential.user,
    restaurantName: 'Restauracja testowa'
  })

  assert.equal((await getDoc(doc(db, `accounts/${unchangedUid}`))).data().email, newEmail)
  assert.equal((await getDoc(doc(db, `restaurants/${unchangedUid}`))).exists(), true)
})

test('złe obecne hasło nie wysyła kodu zmiany e-maila', async () => {
  const oldEmail = 'wrong-password@example.test'
  const newEmail = 'unused-new@example.test'
  const { auth } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    oldEmail,
    'Testowe-haslo-123'
  )

  await assert.rejects(reauthenticateWithCredential(
    credential.user,
    EmailAuthProvider.credential(oldEmail, 'Bledne-haslo-123')
  ), error => [
    'auth/invalid-credential',
    'auth/wrong-password'
  ].includes(error?.code))
  await assert.rejects(getEmailChangeCode(newEmail))
  assert.equal(credential.user.email, oldEmail)
})

test('nie można zmienić e-maila na adres zajęty przez inne konto', async () => {
  const occupiedEmail = 'occupied@example.test'
  const password = 'Testowe-haslo-123'
  const firstClient = createEmulatedClient()
  const secondClient = createEmulatedClient()
  await createUserWithEmailAndPassword(
    secondClient.auth,
    occupiedEmail,
    password
  )
  const credential = await createUserWithEmailAndPassword(
    firstClient.auth,
    'owner-source@example.test',
    password
  )

  await reauthenticateWithCredential(
    credential.user,
    EmailAuthProvider.credential(credential.user.email, password)
  )
  await assert.rejects(
    verifyBeforeUpdateEmail(credential.user, occupiedEmail),
    error => error?.code === 'auth/email-already-in-use'
  )
  assert.equal(credential.user.email, 'owner-source@example.test')
})

test('zweryfikowane konto przyjmuje zaproszenie atomowo w Auth i Firestore Emulatorze', async () => {
  const email = 'invited@example.test'
  const { auth, db } = createEmulatedClient()
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    'Testowe-haslo-123'
  )
  await sendEmailVerification(credential.user)
  await applyActionCode(auth, await getVerificationCode(email))
  await credential.user.reload()
  await credential.user.getIdToken(true)
  const authTime = Number(
    (await credential.user.getIdTokenResult()).claims.auth_time
  )
  const tokenHash = 'a'.repeat(64)
  const slotId = 'restaurant-a__employee-1__ACCOUNT_ACTIVATION'
  const expiresAt = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)

  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    [`identityInvitations/${tokenHash}`, {
      id: tokenHash,
      tokenHash,
      slotId,
      purpose: 'ACCOUNT_ACTIVATION',
      restaurantId: 'restaurant-a',
      employeeId: 'employee-1',
      permissionProfileId: 'profile-1',
      emailNormalized: email,
      emailHash: 'e'.repeat(64),
      targetAuthUid: null,
      status: 'pending',
      createdByAuthUid: 'owner-auth',
      createdAt: Timestamp.now(),
      expiresAt
    }],
    [`activationInvitations/${tokenHash}`, {
      id: tokenHash,
      tokenHash,
      purpose: 'ACCOUNT_ACTIVATION',
      restaurantNameSnapshot: 'Restauracja testowa',
      maskedEmail: 'i***@example.test',
      emailHash: 'e'.repeat(64),
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt
    }],
    [`restaurants/restaurant-a/identityInvitationSlots/${slotId}`, {
      id: slotId,
      tokenHash,
      restaurantId: 'restaurant-a',
      employeeId: 'employee-1',
      purpose: 'ACCOUNT_ACTIVATION',
      createdAt: Timestamp.now(),
      expiresAt
    }]
  ])

  const memberRef = doc(
    db,
    `restaurants/restaurant-a/members/${credential.user.uid}`
  )
  const invitationRef = doc(db, `identityInvitations/${tokenHash}`)
  const publicRef = doc(db, `activationInvitations/${tokenHash}`)
  const slotRef = doc(
    db,
    `restaurants/restaurant-a/identityInvitationSlots/${slotId}`
  )
  const deviceRef = doc(
    db,
    `restaurants/restaurant-a/members/${credential.user.uid}/deviceSessions/${authTime}`
  )
  await runTransaction(db, async transaction => {
    const [invitation] = await Promise.all([
      transaction.get(invitationRef),
      transaction.get(publicRef),
      transaction.get(slotRef),
      transaction.get(memberRef),
      transaction.get(deviceRef)
    ])
    assert.equal(invitation.exists(), true)
    transaction.set(memberRef, {
      authUid: credential.user.uid,
      restaurantId: 'restaurant-a',
      employeeId: 'employee-1',
      permissionProfileId: 'profile-1',
      invitationId: tokenHash,
      role: 'employee',
      status: 'active',
      createdAt: serverTimestamp(),
      acceptedAt: serverTimestamp()
    })
    transaction.set(deviceRef, {
      deviceId: 'device-auth-emulator-0001',
      restaurantId: 'restaurant-a',
      employeeId: 'employee-1',
      authUid: credential.user.uid,
      deviceName: 'Telefon testowy',
      platform: 'Auth Emulator',
      authTime,
      status: 'active',
      addedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
      approvedByAuthUid: 'owner-auth',
      invitationId: tokenHash,
      disconnectedAt: null,
      disconnectedByAuthUid: null
    })
    transaction.delete(invitationRef)
    transaction.delete(publicRef)
    transaction.delete(slotRef)
  })

  assert.equal((await getDoc(memberRef)).exists(), true)
  await rulesEnv.withSecurityRulesDisabled(async adminContext => {
    assert.equal((await getDoc(doc(
      adminContext.firestore(),
      `identityInvitations/${tokenHash}`
    ))).exists(), false)
  })
  assert.notEqual(credential.user.uid, 'restaurant-a')
})
