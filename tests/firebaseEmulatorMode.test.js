import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shouldUseFirebaseEmulators } from '../src/utils/firebaseEmulatorMode.js'

test('Emulatory wymagają jawnej flagi w trybie deweloperskim', () => {
  assert.equal(shouldUseFirebaseEmulators({
    DEV: true,
    VITE_USE_FIREBASE_EMULATORS: 'true'
  }), true)
})

test('produkcyjny build nie łączy się z Emulatorami mimo ustawionej flagi', () => {
  assert.equal(shouldUseFirebaseEmulators({
    DEV: false,
    PROD: true,
    VITE_USE_FIREBASE_EMULATORS: 'true'
  }), false)
})

test('tryb deweloperski bez dokładnej flagi true korzysta z Firebase projektu', () => {
  assert.equal(shouldUseFirebaseEmulators({ DEV: true }), false)
  assert.equal(shouldUseFirebaseEmulators({
    DEV: true,
    VITE_USE_FIREBASE_EMULATORS: 'TRUE'
  }), false)
})
