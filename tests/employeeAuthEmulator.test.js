import assert from 'node:assert/strict'
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
  Timestamp
} from 'firebase/firestore'
import emulatorConfig from '../firebase-emulators.json' with { type: 'json' }
import { completeLegacyOwnerBootstrap } from '../src/services/legacyOwnerBootstrap.js'

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
