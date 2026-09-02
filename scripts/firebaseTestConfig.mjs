import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import {
  buildFirebaseTestConfig,
  REQUIRED_TEST_FIREBASE_ENV_VARIABLES,
  TEST_FIREBASE_PROJECT_ID
} from '../src/utils/firebaseRuntimeConfig.js'

export const loadAndValidateFirebaseTestConfig = async ({
  cwd = process.cwd()
} = {}) => {
  const envPath = resolve(cwd, '.env.test.local')
  let localEnvironmentSource = ''
  try {
    localEnvironmentSource = await readFile(envPath, 'utf8')
  } catch {
    throw new Error(
      'Brak lokalnego pliku .env.test.local z konfiguracją projektu testowego.'
    )
  }

  const localVariableNames = new Set(
    localEnvironmentSource
      .split(/\r?\n/)
      .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1])
      .filter(Boolean)
  )
  const missingLocalVariables = REQUIRED_TEST_FIREBASE_ENV_VARIABLES
    .filter(variable => !localVariableNames.has(variable))
  if (missingLocalVariables.length) {
    throw new Error(
      'Plik .env.test.local nie zawiera wszystkich wymaganych zmiennych: ' +
      `${missingLocalVariables.join(', ')}.`
    )
  }

  const environment = loadEnv('test', cwd, '')
  if (environment.VITE_USE_FIREBASE_TEST_PROJECT !== 'true') {
    throw new Error(
      'Plik .env.test.local musi zawierać VITE_USE_FIREBASE_TEST_PROJECT=true.'
    )
  }

  const firebaseConfig = buildFirebaseTestConfig(environment)
  if (firebaseConfig.projectId !== TEST_FIREBASE_PROJECT_ID) {
    throw new Error('Nie potwierdzono właściwego projektu testowego.')
  }
  return firebaseConfig
}
