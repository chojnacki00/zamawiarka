const PIN_VERSION = 1
const DEFAULT_ITERATIONS = 210000
const SALT_BYTES = 16
const BASE_DELAY_MS = 5000
const MAX_DELAY_MS = 5 * 60 * 1000

const getStorageKey = authUid => (
  `gm_local_pin_v${PIN_VERSION}:${String(authUid || '').trim()}`
)

const bytesToBase64 = bytes => {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

const base64ToBytes = value => Uint8Array.from(
  atob(value),
  character => character.charCodeAt(0)
)

const readRecord = ({ authUid, storage }) => {
  try {
    const value = storage?.getItem(getStorageKey(authUid))
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const writeRecord = ({ authUid, storage, record }) => {
  storage?.setItem(getStorageKey(authUid), JSON.stringify(record))
}

export const isValidLocalPin = pin => /^\d{4}$/.test(String(pin || ''))

export const getLocalPinDelayMs = failedAttempts => {
  const attempts = Math.max(0, Number(failedAttempts) || 0)

  if (attempts < 3) return 0

  return Math.min(
    BASE_DELAY_MS * (2 ** (attempts - 3)),
    MAX_DELAY_MS
  )
}

const derivePinVerifier = async ({
  pin,
  salt,
  cryptoImpl,
  iterations
}) => {
  const encoder = new TextEncoder()
  const keyMaterial = await cryptoImpl.subtle.importKey(
    'raw',
    encoder.encode(String(pin)),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await cryptoImpl.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations
  }, keyMaterial, 256)

  return bytesToBase64(new Uint8Array(bits))
}

const constantTimeEqual = (left, right) => {
  const leftBytes = new TextEncoder().encode(String(left || ''))
  const rightBytes = new TextEncoder().encode(String(right || ''))
  let difference = leftBytes.length ^ rightBytes.length
  const length = Math.max(leftBytes.length, rightBytes.length)

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0)
  }

  return difference === 0
}

export const hasLocalPin = ({ authUid, storage = localStorage } = {}) => (
  Boolean(readRecord({ authUid, storage })?.verifier)
)

export const setLocalPin = async ({
  authUid,
  pin,
  storage = localStorage,
  cryptoImpl = crypto,
  iterations = DEFAULT_ITERATIONS
} = {}) => {
  if (!String(authUid || '').trim()) {
    throw new Error('Brak konta dla lokalnego PIN-u.')
  }

  if (!isValidLocalPin(pin)) {
    throw new Error('PIN musi składać się z dokładnie czterech cyfr.')
  }

  const salt = cryptoImpl.getRandomValues(new Uint8Array(SALT_BYTES))
  const verifier = await derivePinVerifier({
    pin,
    salt,
    cryptoImpl,
    iterations
  })
  const record = {
    version: PIN_VERSION,
    salt: bytesToBase64(salt),
    verifier,
    iterations,
    failedAttempts: 0,
    blockedUntil: 0
  }

  writeRecord({ authUid, storage, record })
  return record
}

export const verifyLocalPin = async ({
  authUid,
  pin,
  storage = localStorage,
  cryptoImpl = crypto,
  now = Date.now()
} = {}) => {
  const record = readRecord({ authUid, storage })

  if (!record?.salt || !record?.verifier) {
    return { ok: false, missing: true, retryAfterMs: 0 }
  }

  const blockedUntil = Number(record.blockedUntil) || 0

  if (blockedUntil > now) {
    return {
      ok: false,
      blocked: true,
      retryAfterMs: blockedUntil - now
    }
  }

  const verifier = await derivePinVerifier({
    pin,
    salt: base64ToBytes(record.salt),
    cryptoImpl,
    iterations: Number(record.iterations) || DEFAULT_ITERATIONS
  })

  if (constantTimeEqual(verifier, record.verifier)) {
    writeRecord({
      authUid,
      storage,
      record: { ...record, failedAttempts: 0, blockedUntil: 0 }
    })
    return { ok: true, retryAfterMs: 0 }
  }

  const failedAttempts = (Number(record.failedAttempts) || 0) + 1
  const delayMs = getLocalPinDelayMs(failedAttempts)
  const nextRecord = {
    ...record,
    failedAttempts,
    blockedUntil: delayMs ? now + delayMs : 0
  }
  writeRecord({ authUid, storage, record: nextRecord })

  return {
    ok: false,
    failedAttempts,
    blocked: delayMs > 0,
    retryAfterMs: delayMs
  }
}

export const clearLocalPin = ({
  authUid,
  storage = localStorage
} = {}) => {
  storage?.removeItem(getStorageKey(authUid))
}
