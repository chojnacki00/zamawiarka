import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildInvitationForEmailValidation,
  classifyActivationInvitationError,
  createActivationFlowError,
  INVALID_ACTIVATION_INVITATION_MESSAGE,
  resolveActivationStepForUser,
  TECHNICAL_ACTIVATION_INVITATION_MESSAGE,
  validateActivationPasswords
} from '../src/utils/activationFlow.js'

test('ponowna walidacja zachowuje prywatny hash poza bezpiecznym podglądem', () => {
  const preview = {
    restaurantNameSnapshot: 'Restauracja testowa',
    maskedEmail: 'j***@example.test',
    purpose: 'ACCOUNT_ACTIVATION'
  }
  const result = buildInvitationForEmailValidation({
    invitation: preview,
    emailHash: 'a'.repeat(64)
  })

  assert.equal('emailHash' in preview, false)
  assert.equal(result.emailHash, 'a'.repeat(64))
  assert.equal(result.restaurantNameSnapshot, preview.restaurantNameSnapshot)
})

test('niezweryfikowane konto wznawia ekran potwierdzenia, a zweryfikowane przechodzi do urządzenia', () => {
  assert.equal(resolveActivationStepForUser({ emailVerified: false }), 'verify')
  assert.equal(resolveActivationStepForUser({ emailVerified: true }), 'device')
})

test('błąd techniczny nie jest prezentowany jako wygaśnięcie zaproszenia', () => {
  const technical = classifyActivationInvitationError({
    code: 'firestore/unavailable'
  })
  assert.deepEqual(technical, {
    kind: 'technical',
    message: TECHNICAL_ACTIVATION_INVITATION_MESSAGE,
    retryable: true
  })

  const invalid = classifyActivationInvitationError(
    createActivationFlowError('activation/invitation-not-found')
  )
  assert.deepEqual(invalid, {
    kind: 'invalid',
    message: INVALID_ACTIVATION_INVITATION_MESSAGE,
    retryable: false
  })
})

test('różne hasła zatrzymują formularz przed rejestracją', () => {
  assert.equal(validateActivationPasswords({
    password: 'Testowe-haslo-123',
    confirmation: 'Inne-haslo-123'
  }), 'Wpisane hasła nie są takie same.')
  assert.equal(validateActivationPasswords({
    password: 'Testowe-haslo-123',
    confirmation: 'Testowe-haslo-123'
  }), '')
})
