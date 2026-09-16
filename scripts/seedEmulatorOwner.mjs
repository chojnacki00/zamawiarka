import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  applyActionCode,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import emulatorConfig from '../firebase-emulators.json' with { type: 'json' }
import {
  assertSafeEmulatorOwnerSeedConfig,
  EMULATOR_OWNER_EMAIL,
  EMULATOR_OWNER_PASSWORD
} from './emulatorOwnerSeedConfig.mjs'

const config = assertSafeEmulatorOwnerSeedConfig(emulatorConfig)
const app = initializeApp({
  apiKey: 'demo-api-key',
  authDomain: `${config.projectId}.firebaseapp.com`,
  projectId: config.projectId,
  appId: '1:000000000000:web:emulator-owner-seed'
}, `emulator-owner-seed-${Date.now()}`)
const auth = getAuth(app)
connectAuthEmulator(
  auth,
  `http://${config.host}:${config.authPort}`,
  { disableWarnings: true }
)

let rulesEnvironment = null

const getVerificationCode = async email => {
  const response = await fetch(
    `http://${config.host}:${config.authPort}` +
      `/emulator/v1/projects/${config.projectId}/oobCodes`
  )
  if (!response.ok) {
    throw new Error('Nie udało się odczytać kodu weryfikacyjnego z Auth Emulatora.')
  }
  const payload = await response.json()
  const record = payload.oobCodes.find(code => (
    code.email === email && code.requestType === 'VERIFY_EMAIL'
  ))
  if (!record?.oobCode) {
    throw new Error('Auth Emulator nie zwrócił kodu weryfikacyjnego.')
  }
  return record.oobCode
}

try {
  let credential
  try {
    credential = await createUserWithEmailAndPassword(
      auth,
      EMULATOR_OWNER_EMAIL,
      EMULATOR_OWNER_PASSWORD
    )
  } catch (error) {
    if (error?.code !== 'auth/email-already-in-use') throw error
    credential = await signInWithEmailAndPassword(
      auth,
      EMULATOR_OWNER_EMAIL,
      EMULATOR_OWNER_PASSWORD
    )
  }

  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user)
    await applyActionCode(
      auth,
      await getVerificationCode(EMULATOR_OWNER_EMAIL)
    )
    await credential.user.reload()
    await credential.user.getIdToken(true)
  }

  rulesEnvironment = await initializeTestEnvironment({
    projectId: config.projectId,
    firestore: {
      host: config.host,
      port: config.firestorePort
    }
  })
  await rulesEnvironment.withSecurityRulesDisabled(async context => {
    const adminDb = context.firestore()
    await Promise.all([
      setDoc(doc(adminDb, 'users', credential.user.uid), {
        emulatorSeed: true,
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(
        adminDb,
        'users',
        credential.user.uid,
        'app',
        'state'
      ), {
        initialized: true,
        emulatorSeed: true,
        updatedAt: serverTimestamp()
      }, { merge: true })
    ])
  })

  console.log('Utworzono lub odtworzono fikcyjnego właściciela Emulatora.')
  console.log(`Projekt: ${config.projectId}`)
  console.log(`E-mail: ${EMULATOR_OWNER_EMAIL}`)
  console.log(`Hasło: ${EMULATOR_OWNER_PASSWORD}`)
  console.log(`UID: ${credential.user.uid}`)
  console.log('Zaloguj się lokalnie przez http://localhost:5173/login')
} catch (error) {
  console.error(
    'Nie udało się przygotować właściciela Emulatora:',
    error?.message || 'nieznany błąd'
  )
  process.exitCode = 1
} finally {
  await rulesEnvironment?.cleanup()
  await deleteApp(app)
}
