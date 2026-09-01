import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertSafeEmulatorOwnerSeedConfig,
  EMULATOR_OWNER_EMAIL
} from '../scripts/emulatorOwnerSeedConfig.mjs'

const safeConfig = {
  projectId: 'demo-gastromanager',
  host: '127.0.0.1',
  authPort: 9099,
  firestorePort: 8080
}

test('seed właściciela dopuszcza wyłącznie lokalny projekt demo', () => {
  assert.deepEqual(assertSafeEmulatorOwnerSeedConfig(safeConfig), safeConfig)
  assert.match(EMULATOR_OWNER_EMAIL, /@gastromanager\.test$/)
})

test('seed właściciela odrzuca produkcyjny projekt i zdalny host', () => {
  assert.throws(() => assertSafeEmulatorOwnerSeedConfig({
    ...safeConfig,
    projectId: 'gastromanager-ddcc9'
  }), /demo-gastromanager/)
  assert.throws(() => assertSafeEmulatorOwnerSeedConfig({
    ...safeConfig,
    host: 'localhost'
  }), /127\.0\.0\.1/)
})
