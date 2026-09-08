import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  appendLocalPinDigit,
  getLocalPinAccessFailure,
  LOCAL_PIN_ACCESS_FAILURES,
  removeLocalPinDigit
} from '../src/utils/localPinAccess.js'

const validContext = (overrides = {}) => ({
  firebaseAuthUid: 'auth-1',
  membership: {
    id: 'auth-1',
    authUid: 'auth-1',
    restaurantId: 'restaurant-1',
    employeeId: 'employee-1',
    role: 'employee',
    status: 'active'
  },
  deviceSession: {
    sessionId: '1700000000',
    authUid: 'auth-1',
    restaurantId: 'restaurant-1',
    employeeId: 'employee-1',
    deviceId: 'device-1',
    status: 'active'
  },
  expectedRestaurantId: 'restaurant-1',
  expectedEmployeeId: 'employee-1',
  expectedSessionId: '1700000000',
  localPinConfigured: true,
  ...overrides
})

test('aktywny kontekst konta, członkostwa, sesji urządzenia i PIN-u pozwala odblokować aplikację', () => {
  assert.equal(getLocalPinAccessFailure(validContext()), null)
})

test('PIN nie otwiera aplikacji bez sesji Firebase', () => {
  assert.equal(getLocalPinAccessFailure(validContext({
    firebaseAuthUid: null
  })), LOCAL_PIN_ACCESS_FAILURES.NO_FIREBASE_SESSION)
})

test('PIN nie otwiera aplikacji bez członkostwa ani przy nieaktywnym członkostwie', () => {
  assert.equal(getLocalPinAccessFailure(validContext({
    membership: null
  })), LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISSING)
  assert.equal(getLocalPinAccessFailure(validContext({
    membership: {
      ...validContext().membership,
      status: 'blocked'
    }
  })), LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_INACTIVE)
})

test('PIN nie otwiera innej restauracji ani konta pracownika', () => {
  assert.equal(getLocalPinAccessFailure(validContext({
    expectedRestaurantId: 'restaurant-2'
  })), LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISMATCH)
  assert.equal(getLocalPinAccessFailure(validContext({
    expectedEmployeeId: 'employee-2'
  })), LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISMATCH)
})

test('brak, wstrzymanie i odłączenie sesji urządzenia mają oddzielne wyniki', () => {
  assert.equal(getLocalPinAccessFailure(validContext({
    deviceSession: null
  })), LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING)
  assert.equal(getLocalPinAccessFailure(validContext({
    deviceSession: {
      ...validContext().deviceSession,
      status: 'suspended'
    }
  })), LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED)
  assert.equal(getLocalPinAccessFailure(validContext({
    deviceSession: {
      ...validContext().deviceSession,
      status: 'disconnected'
    }
  })), LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_INACTIVE)
})

test('PIN jest związany z bieżącym authTime, kontem, restauracją, pracownikiem i urządzeniem', () => {
  for (const deviceSession of [{
    ...validContext().deviceSession,
    sessionId: 'inna-sesja'
  }, {
    ...validContext().deviceSession,
    authUid: 'inne-konto'
  }, {
    ...validContext().deviceSession,
    restaurantId: 'restaurant-2'
  }, {
    ...validContext().deviceSession,
    employeeId: 'employee-2'
  }, {
    ...validContext().deviceSession,
    deviceId: ''
  }]) {
    assert.equal(getLocalPinAccessFailure(validContext({ deviceSession })),
      LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISMATCH)
  }
  assert.equal(getLocalPinAccessFailure(validContext({
    localPinConfigured: false
  })), LOCAL_PIN_ACCESS_FAILURES.LOCAL_PIN_MISMATCH)
})

test('klawiatura przyjmuje tylko cyfry, ogranicza PIN do czterech znaków i usuwa ostatnią cyfrę', () => {
  assert.equal(appendLocalPinDigit('', 1), '1')
  assert.equal(appendLocalPinDigit('12', 'x'), '12')
  assert.equal(appendLocalPinDigit('1234', 5), '1234')
  assert.equal(removeLocalPinDigit('1234'), '123')
})
