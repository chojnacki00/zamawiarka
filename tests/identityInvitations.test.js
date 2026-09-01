import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { test } from 'node:test'
import { buildActivationUrl } from '../src/config/publicAppUrl.js'
import {
  assertEmailMatchesPublicInvitation,
  assertPrivateInvitationForAccount,
  assertPublicInvitationIsActive,
  buildSafePublicInvitationPreview,
  createIdentityInvitationBundle,
  hashIdentityValue,
  INVITATION_PURPOSES
} from '../src/utils/identityInvitations.js'
import {
  buildDeviceSessionDocument,
  getDeviceSessionId
} from '../src/utils/deviceAccess.js'
import {
  hasLocalPin,
  setLocalPin,
  verifyLocalPin
} from '../src/utils/localPinLock.js'

const createStorage = () => {
  const values = new Map()
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  }
}

const createBundle = purpose => createIdentityInvitationBundle({
  restaurantId: 'restaurant-a',
  restaurantName: 'Restauracja Testowa',
  employeeId: 'employee-1',
  permissionProfileId: 'profile-1',
  email: 'jan@example.com',
  purpose,
  targetAuthUid: purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT
    ? 'auth-1'
    : null,
  createdByAuthUid: 'manager-1',
  createdAt: new Date('2026-08-31T10:00:00Z'),
  expiresAt: new Date('2026-09-07T10:00:00Z'),
  cryptoImpl: webcrypto
})

test('dwa zaproszenia mają różne kryptograficzne tokeny i skróty', async () => {
  const first = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  const second = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  assert.notEqual(first.rawToken, second.rawToken)
  assert.notEqual(first.tokenHash, second.tokenHash)
  assert.equal(first.tokenHash.length, 64)
})

test('surowy token i pełny e-mail nie trafiają do publicznego dokumentu', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  const serializedPrivate = JSON.stringify(bundle.privateInvitation)
  const serializedPublic = JSON.stringify(bundle.publicInvitation)
  assert.equal(serializedPrivate.includes(bundle.rawToken), false)
  assert.equal(serializedPublic.includes(bundle.rawToken), false)
  assert.equal(serializedPublic.includes('jan@example.com'), false)
  assert.equal(bundle.publicInvitation.maskedEmail, 'j***@example.com')
})

test('publiczny podgląd aktywacji zawiera wyłącznie bezpieczne dane', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  const preview = buildSafePublicInvitationPreview({
    invitation: {
      ...bundle.publicInvitation,
      restaurantId: 'restaurant-secret',
      employeeId: 'employee-secret',
      emailNormalized: 'jan@example.com'
    },
    now: new Date('2026-09-01T10:00:00Z')
  })

  assert.deepEqual(Object.keys(preview).sort(), [
    'expiresAt',
    'maskedEmail',
    'purpose',
    'restaurantNameSnapshot'
  ])
  assert.equal(JSON.stringify(preview).includes('restaurant-secret'), false)
  assert.equal(JSON.stringify(preview).includes('employee-secret'), false)
  assert.equal(JSON.stringify(preview).includes('jan@example.com'), false)
})

test('QR i kopiowany link mogą użyć dokładnie tego samego adresu aktywacji', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  const link = buildActivationUrl({
    token: bundle.rawToken,
    currentOrigin: 'http://127.0.0.1:5173'
  })
  assert.equal(new URL(link).pathname, '/aktywacja')
  assert.equal(new URL(link).searchParams.get('t'), bundle.rawToken)
  assert.equal(link.includes('restaurant-a'), false)
  assert.equal(link.includes('employee-1'), false)
})

test('błędny e-mail jest odrzucany przed utworzeniem konta', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  await assert.rejects(assertEmailMatchesPublicInvitation({
    email: 'inna@example.com',
    invitation: bundle.publicInvitation,
    cryptoImpl: webcrypto
  }), /nie jest zgodny/)
  await assert.doesNotReject(assertEmailMatchesPublicInvitation({
    email: 'JAN@example.com',
    invitation: bundle.publicInvitation,
    cryptoImpl: webcrypto
  }))
})

test('wygasłe i wykorzystane zaproszenie są odrzucane', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  assert.throws(() => assertPublicInvitationIsActive({
    invitation: bundle.publicInvitation,
    now: new Date('2026-09-08T10:00:00Z')
  }), /wygasło/)
  assert.throws(() => assertPublicInvitationIsActive({
    invitation: { ...bundle.publicInvitation, status: 'used' },
    now: new Date('2026-09-01T10:00:00Z')
  }), /wykorzystane lub anulowane/)
})

test('ostateczna akceptacja wymaga zweryfikowanego zgodnego konta', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  assert.throws(() => assertPrivateInvitationForAccount({
    invitation: bundle.privateInvitation,
    authUser: { uid: 'auth-1', email: 'jan@example.com', emailVerified: false },
    purpose: INVITATION_PURPOSES.ACCOUNT_ACTIVATION,
    now: new Date('2026-09-01T10:00:00Z')
  }), /potwierdź/)
  assert.throws(() => assertPrivateInvitationForAccount({
    invitation: bundle.privateInvitation,
    authUser: { uid: 'auth-1', email: 'inna@example.com', emailVerified: true },
    purpose: INVITATION_PURPOSES.ACCOUNT_ACTIVATION,
    now: new Date('2026-09-01T10:00:00Z')
  }), /innego adresu/)
})

test('zmiana e-maila konta nie pozwala przyjąć zaproszenia przypisanego do starego adresu', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.ACCOUNT_ACTIVATION)
  assert.throws(() => assertPrivateInvitationForAccount({
    invitation: bundle.privateInvitation,
    authUser: {
      uid: 'auth-1',
      email: 'zmieniony@example.com',
      emailVerified: true
    },
    purpose: INVITATION_PURPOSES.ACCOUNT_ACTIVATION,
    now: new Date('2026-09-01T10:00:00Z')
  }), /innego adresu/)
})

test('zaproszenie urządzenia jest związane z właściwym authUid', async () => {
  const bundle = await createBundle(INVITATION_PURPOSES.DEVICE_ENROLLMENT)
  assert.throws(() => assertPrivateInvitationForAccount({
    invitation: bundle.privateInvitation,
    authUser: { uid: 'auth-2', email: 'jan@example.com', emailVerified: true },
    purpose: INVITATION_PURPOSES.DEVICE_ENROLLMENT,
    now: new Date('2026-09-01T10:00:00Z')
  }), /inne konto/)
})

test('rejestr urządzenia nie zawiera PIN-u, hasła ani surowego sekretu', () => {
  const document = buildDeviceSessionDocument({
    authUid: 'auth-1',
    restaurantId: 'restaurant-a',
    employeeId: 'employee-1',
    deviceName: 'Telefon Jana',
    platform: 'Android',
    authTime: 1700000000,
    approvedByAuthUid: 'manager-1',
    invitationId: 'a'.repeat(64),
    createdAt: new Date(),
    deviceId: 'device-unique-123456'
  })
  assert.equal(getDeviceSessionId(document.authTime), '1700000000')
  assert.equal('pin' in document, false)
  assert.equal('password' in document, false)
  assert.equal('secret' in document, false)
})

test('ten sam PIN na dwóch urządzeniach ma osobne sole i blokady', async () => {
  const storage = createStorage()
  const first = await setLocalPin({
    authUid: 'auth-1', deviceId: 'device-a', pin: '1234', storage,
    cryptoImpl: webcrypto, iterations: 1000
  })
  const second = await setLocalPin({
    authUid: 'auth-1', deviceId: 'device-b', pin: '1234', storage,
    cryptoImpl: webcrypto, iterations: 1000
  })
  assert.notEqual(first.salt, second.salt)
  assert.equal(hasLocalPin({ authUid: 'auth-1', deviceId: 'device-a', storage }), true)
  assert.equal((await verifyLocalPin({
    authUid: 'auth-1', deviceId: 'device-b', pin: '1234', storage,
    cryptoImpl: webcrypto
  })).ok, true)
  assert.equal(JSON.stringify([...storage.values.values()]).includes('1234'), false)
})

test('skrót tokenu jest deterministyczny, ale nie ujawnia tokenu', async () => {
  const first = await hashIdentityValue('sekretny-token', { cryptoImpl: webcrypto })
  const second = await hashIdentityValue('sekretny-token', { cryptoImpl: webcrypto })
  assert.equal(first, second)
  assert.equal(first.includes('sekretny-token'), false)
})
