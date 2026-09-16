import assert from 'node:assert/strict'

export const EMULATOR_OWNER_EMAIL = 'owner.demo@gastromanager.test'
export const EMULATOR_OWNER_PASSWORD = 'Emulator-only-Owner-123!'

export const assertSafeEmulatorOwnerSeedConfig = ({
  projectId,
  host,
  authPort,
  firestorePort
} = {}) => {
  assert.equal(
    projectId,
    'demo-gastromanager',
    'Seed właściciela działa wyłącznie dla projektu demo-gastromanager.'
  )
  assert.notEqual(
    projectId,
    'gastromanager-ddcc9',
    'Seed nie może używać produkcyjnego projectId.'
  )
  assert.equal(
    host,
    '127.0.0.1',
    'Seed wymaga Emulatorów dostępnych wyłącznie na 127.0.0.1.'
  )
  assert.equal(Number.isInteger(authPort), true)
  assert.equal(Number.isInteger(firestorePort), true)

  return { projectId, host, authPort, firestorePort }
}
