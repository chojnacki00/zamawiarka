import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  PRODUCTION_FIREBASE_PROJECT_ID,
  resolveFirebaseRuntimeConfig,
  TEST_FIREBASE_PROJECT_ID
} from '../src/utils/firebaseRuntimeConfig.js'
import {
  assertTestDeploymentTarget,
  buildTestAccessCheckArguments,
  buildTestRulesDeployArguments
} from '../scripts/firebaseTestDeployment.mjs'

const productionConfig = {
  apiKey: 'production-key',
  projectId: PRODUCTION_FIREBASE_PROJECT_ID
}
const emulatorConfig = { projectId: 'demo-gastromanager' }
const validTestEnvironment = {
  DEV: true,
  PROD: false,
  MODE: 'test',
  VITE_USE_FIREBASE_TEST_PROJECT: 'true',
  VITE_FIREBASE_API_KEY: 'test-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${TEST_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: `${TEST_FIREBASE_PROJECT_ID}.appspot.com`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:test'
}

test('dev:test korzysta wyłącznie z dokładnego projektu testowego', () => {
  const result = resolveFirebaseRuntimeConfig({
    environment: validTestEnvironment,
    productionConfig,
    emulatorConfig
  })
  assert.equal(result.firebaseConfig.projectId, TEST_FIREBASE_PROJECT_ID)
  assert.equal(result.useFirebaseTestProject, true)
  assert.equal(result.useFirebaseEmulators, false)
})

test('tryb testowy odrzuca produkcyjny i dowolny inny projectId', () => {
  for (const projectId of [PRODUCTION_FIREBASE_PROJECT_ID, 'inny-projekt']) {
    assert.throws(() => resolveFirebaseRuntimeConfig({
      environment: {
        ...validTestEnvironment,
        VITE_FIREBASE_PROJECT_ID: projectId
      },
      productionConfig,
      emulatorConfig
    }), /produkcyjnego|wymaga projectId/)
  }
})

test('produkcyjny build nie może włączyć konfiguracji projektu testowego', () => {
  assert.throws(() => resolveFirebaseRuntimeConfig({
    environment: {
      ...validTestEnvironment,
      DEV: false,
      PROD: true,
      MODE: 'production'
    },
    productionConfig,
    emulatorConfig
  }), /wyłącznie przez lokalny tryb dev:test/)

  const result = resolveFirebaseRuntimeConfig({
    environment: {
      DEV: false,
      PROD: true,
      MODE: 'production',
      VITE_FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID
    },
    productionConfig,
    emulatorConfig
  })
  assert.equal(result.firebaseConfig, productionConfig)
  assert.equal(result.useFirebaseTestProject, false)
})

test('tryb emulatorowy pozostaje odseparowany od prawdziwych projektów', () => {
  const result = resolveFirebaseRuntimeConfig({
    environment: {
      DEV: true,
      PROD: false,
      MODE: 'emulator',
      VITE_USE_FIREBASE_EMULATORS: 'true'
    },
    productionConfig,
    emulatorConfig
  })
  assert.equal(result.firebaseConfig.projectId, 'demo-gastromanager')
  assert.equal(result.useFirebaseEmulators, true)
  assert.equal(result.useFirebaseTestProject, false)

  assert.throws(() => resolveFirebaseRuntimeConfig({
    environment: {
      ...validTestEnvironment,
      VITE_USE_FIREBASE_EMULATORS: 'true'
    },
    productionConfig,
    emulatorConfig
  }), /Nie można jednocześnie/)
})

test('skrypt wdrożenia dopuszcza wyłącznie reguły projektu testowego', () => {
  assert.equal(
    assertTestDeploymentTarget(TEST_FIREBASE_PROJECT_ID),
    TEST_FIREBASE_PROJECT_ID
  )
  assert.throws(
    () => assertTestDeploymentTarget(PRODUCTION_FIREBASE_PROJECT_ID),
    /produkcyjnego jest zabronione/
  )
  assert.deepEqual(buildTestRulesDeployArguments(TEST_FIREBASE_PROJECT_ID), [
    'deploy',
    '--only',
    'firestore:rules',
    '--project',
    TEST_FIREBASE_PROJECT_ID,
    '--non-interactive'
  ])
  assert.deepEqual(buildTestAccessCheckArguments(TEST_FIREBASE_PROJECT_ID), [
    'apps:list',
    'WEB',
    '--project',
    TEST_FIREBASE_PROJECT_ID,
    '--json'
  ])
})

test('lokalny plik konfiguracji jest jawnie ignorowany przez Git', async () => {
  const gitignore = await readFile(
    new URL('../.gitignore', import.meta.url),
    'utf8'
  )
  assert.match(gitignore, /^\.env\.test\.local$/m)
})

test('przykład konfiguracji zawiera wszystkie wymagane pola bez danych projektu webowego', async () => {
  const example = await readFile(
    new URL('../.env.test.example', import.meta.url),
    'utf8'
  )
  assert.match(example, /VITE_USE_FIREBASE_TEST_PROJECT=true/)
  assert.match(
    example,
    /VITE_FIREBASE_PROJECT_ID=gasteomanager---test/
  )
  assert.match(example, /VITE_FIREBASE_API_KEY=\r?\n/)
  assert.doesNotMatch(example, /AIza[0-9A-Za-z_-]+/)
})
