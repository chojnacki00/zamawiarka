import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  hasStoredLegacyPinSession,
  resolveAuthenticationRedirect
} from '../src/utils/routeAccess.js'
import { shouldUseFirebaseEmulators } from '../src/utils/firebaseEmulatorMode.js'

const redirectFor = (path, options = {}) => resolveAuthenticationRedirect({
  path,
  hasFirebaseSession: false,
  hasLegacyPinSession: false,
  ...options
})

test('niezalogowany użytkownik może otworzyć logowanie Firebase', () => {
  assert.equal(redirectFor('/login'), null)
})

test('konto bez sesji wraca do logowania Firebase, a nie do PIN-u', () => {
  assert.equal(redirectFor('/konto'), '/login')
})

test('aktywacja z tokenem pozostaje publiczna', () => {
  assert.equal(redirectFor('/aktywacja?t=testowy-token'), null)
  assert.equal(redirectFor('/aktywacja'), null)
})

test('stare logowanie PIN pozostaje dostępną ścieżką przejściową', () => {
  assert.equal(redirectFor('/logowanie'), null)
})

test('chroniona trasa biznesowa blokuje brak sesji', () => {
  assert.equal(redirectFor('/grafik/grafiki'), '/login')
  assert.equal(redirectFor('/ustawienia'), '/login')
})

test('świeży storage nie uruchamia odtwarzania legacy PIN', () => {
  const storage = {
    getItem: () => null
  }
  assert.equal(hasStoredLegacyPinSession(storage), false)
  assert.equal(redirectFor('/login'), null)
})

test('kompletna sesja legacy zachowuje dostęp do dozwolonych tras', () => {
  const values = new Map([
    ['gm_emp_id', 'employee-1'],
    ['gm_rest_id', 'restaurant-1']
  ])
  const storage = {
    getItem: key => values.get(key) || null
  }

  assert.equal(hasStoredLegacyPinSession(storage), true)
  assert.equal(redirectFor('/grafik', {
    hasLegacyPinSession: true
  }), null)
  assert.equal(redirectFor('/konto', {
    hasLegacyPinSession: true
  }), '/login')
})

test('tryb emulatorowy nie zmienia zasad ochrony tras', () => {
  assert.equal(shouldUseFirebaseEmulators({
    DEV: false,
    PROD: true,
    VITE_USE_FIREBASE_EMULATORS: 'true'
  }), false)
  assert.equal(redirectFor('/rentownosc'), '/login')
  assert.equal(redirectFor('/login'), null)
  assert.equal(redirectFor('/konto', {
    hasFirebaseSession: true
  }), null)
})
