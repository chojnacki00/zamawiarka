import { shouldUseFirebaseEmulators } from './firebaseEmulatorMode.js'

export const PRODUCTION_FIREBASE_PROJECT_ID = 'gastromanager-ddcc9'
export const TEST_FIREBASE_PROJECT_ID = 'gasteomanager---test'

const TEST_MODE = 'test'
const TEST_FLAG = 'VITE_USE_FIREBASE_TEST_PROJECT'
const REQUIRED_TEST_CONFIG = Object.freeze({
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID'
})

export const REQUIRED_TEST_FIREBASE_ENV_VARIABLES = Object.freeze([
  TEST_FLAG,
  ...Object.values(REQUIRED_TEST_CONFIG)
])

const normalize = value => String(value || '').trim()

export const buildFirebaseTestConfig = (environment = {}) => {
  const config = Object.fromEntries(
    Object.entries(REQUIRED_TEST_CONFIG).map(([key, variable]) => [
      key,
      normalize(environment[variable])
    ])
  )
  const missingVariables = Object.entries(REQUIRED_TEST_CONFIG)
    .filter(([key]) => !config[key])
    .map(([, variable]) => variable)

  if (missingVariables.length) {
    throw new Error(
      `Brak konfiguracji projektu testowego: ${missingVariables.join(', ')}.`
    )
  }
  if (config.projectId === PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error('Tryb testowy nie może korzystać z projektu produkcyjnego.')
  }
  if (config.projectId !== TEST_FIREBASE_PROJECT_ID) {
    throw new Error(
      `Tryb testowy wymaga projectId ${TEST_FIREBASE_PROJECT_ID}.`
    )
  }

  const measurementId = normalize(environment.VITE_FIREBASE_MEASUREMENT_ID)
  if (measurementId) config.measurementId = measurementId
  return config
}

export const resolveFirebaseRuntimeConfig = ({
  environment = {},
  productionConfig,
  emulatorConfig
} = {}) => {
  const emulatorRequested =
    environment.VITE_USE_FIREBASE_EMULATORS === 'true'
  const testProjectRequested = environment[TEST_FLAG] === 'true'
  const useFirebaseEmulators = shouldUseFirebaseEmulators(environment)

  if (emulatorRequested && testProjectRequested) {
    throw new Error(
      'Nie można jednocześnie korzystać z Emulatorów i projektu testowego.'
    )
  }

  if (testProjectRequested) {
    if (environment.DEV !== true || environment.MODE !== TEST_MODE) {
      throw new Error(
        'Prawdziwy projekt testowy jest dostępny wyłącznie przez lokalny tryb dev:test.'
      )
    }
    return {
      firebaseConfig: buildFirebaseTestConfig(environment),
      useFirebaseEmulators: false,
      useFirebaseTestProject: true
    }
  }

  if (environment.MODE === TEST_MODE) {
    throw new Error(
      `Tryb dev:test wymaga flagi ${TEST_FLAG}=true.`
    )
  }

  if (useFirebaseEmulators) {
    return {
      firebaseConfig: {
        apiKey: 'demo-api-key',
        authDomain: `${emulatorConfig.projectId}.firebaseapp.com`,
        projectId: emulatorConfig.projectId,
        storageBucket: `${emulatorConfig.projectId}.appspot.com`,
        messagingSenderId: '000000000000',
        appId: '1:000000000000:web:demo'
      },
      useFirebaseEmulators: true,
      useFirebaseTestProject: false
    }
  }

  if (productionConfig?.projectId !== PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error('Nieprawidłowa konfiguracja projektu produkcyjnego.')
  }

  return {
    firebaseConfig: productionConfig,
    useFirebaseEmulators: false,
    useFirebaseTestProject: false
  }
}
