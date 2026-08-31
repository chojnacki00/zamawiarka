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
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
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

const seed = async documents => {
  await rulesEnv.withSecurityRulesDisabled(async adminContext => {
    const db = adminContext.firestore()
    await Promise.all(documents.map(([path, data]) => (
      setDoc(doc(db, path), data)
    )))
  })
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
