import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import {
  ACCESS_PRINCIPALS,
  accessContextCanOpenRoute,
  accessContextHasPermission,
  requireAccessPermission,
  resolveAccessContext
} from '../src/utils/accessControl.js'
import { useAccountSessionStore } from '../src/stores/accountSessionStore.js'
import { useAuthorizationStore } from '../src/stores/authorizationStore.js'

const activeMembership = ({
  role = 'employee',
  status = 'active',
  authUid = 'auth-marzena',
  employeeId = 'employee-marzena'
} = {}) => ({
  id: authUid,
  authUid,
  restaurantId: 'restaurant-a',
  employeeId: role === 'owner' ? null : employeeId,
  role,
  status
})

const resolveEmployee = (permissions = {}, overrides = {}) => (
  resolveAccessContext({
    firebaseAuthUid: 'auth-marzena',
    hasActiveAccountContext: true,
    membership: activeMembership(overrides),
    employee: {
      id: 'employee-marzena',
      aktywny: overrides.employeeActive !== false
    },
    permissions
  })
)

beforeEach(() => {
  setActivePinia(createPinia())
})

test('sama sesja Firebase pracownika nie nadaje praw właściciela', () => {
  const context = resolveEmployee({ can_view_zamawiarka: true })

  assert.equal(context.principal, ACCESS_PRINCIPALS.EMPLOYEE)
  assert.equal(accessContextHasPermission(context, 'can_view_zamawiarka'), true)
  assert.equal(accessContextHasPermission(context, 'can_edit_products'), false)
  assert.equal(accessContextHasPermission(context, 'can_manage_roles'), false)
})

test('właściciel z aktywnym członkostwem ma pełny dostęp', () => {
  const context = resolveAccessContext({
    firebaseAuthUid: 'auth-owner',
    hasActiveAccountContext: true,
    membership: activeMembership({
      role: 'owner',
      authUid: 'auth-owner'
    })
  })

  assert.equal(context.principal, ACCESS_PRINCIPALS.OWNER)
  assert.equal(accessContextHasPermission(context, 'can_edit_products'), true)
  assert.equal(accessContextHasPermission(context, 'can_manage_schedule'), true)
})

test('brak lub zablokowane członkostwo nie daje dostępu', () => {
  const withoutMembership = resolveAccessContext({
    firebaseAuthUid: 'auth-marzena',
    hasActiveAccountContext: false
  })
  const blockedMembership = resolveEmployee(
    { can_edit_products: true },
    { status: 'blocked' }
  )

  assert.equal(withoutMembership.principal, ACCESS_PRINCIPALS.NONE)
  assert.equal(blockedMembership.principal, ACCESS_PRINCIPALS.NONE)
  assert.equal(accessContextHasPermission(blockedMembership, 'can_edit_products'), false)
})

test('sesja legacy PIN zachowuje tylko dozwolony odczyt', () => {
  const context = resolveAccessContext({
    legacySessionMode: 'legacy_pin',
    legacyEmployee: {
      id: 'employee-legacy',
      aktywny: true,
      uprawnienia: {
        can_view_zamawiarka: true,
        can_edit_products: true,
        can_manage_schedule: true
      }
    }
  })

  assert.equal(context.principal, ACCESS_PRINCIPALS.LEGACY_PIN)
  assert.equal(accessContextHasPermission(context, 'can_view_zamawiarka'), true)
  assert.equal(accessContextHasPermission(context, 'can_edit_products'), false)
  assert.equal(accessContextHasPermission(context, 'can_manage_schedule'), false)
})

test('uprawnienie grafiku nie rozszerza dostępu do ustawień Zamawiarki', () => {
  const context = resolveEmployee({
    can_view_zamawiarka: true,
    can_view_schedule: true,
    can_manage_schedule: true
  })

  assert.equal(accessContextCanOpenRoute(context, '/grafik/grafiki'), true)
  assert.equal(accessContextCanOpenRoute(context, '/zamawiarka'), true)
  assert.equal(accessContextHasPermission(context, 'can_edit_products'), false)
  assert.throws(
    () => requireAccessPermission(context, 'can_edit_products'),
    /Nie masz uprawnienia/
  )
})

test('router odrzuca bezpośredni adres ekranu bez uprawnienia', () => {
  const context = resolveEmployee({ can_view_zamawiarka: true })

  assert.equal(accessContextCanOpenRoute(context, '/profile-uprawnien'), false)
  assert.equal(accessContextCanOpenRoute(context, '/zespol'), false)
  assert.equal(accessContextCanOpenRoute(context, '/grafik/grafiki/abc'), false)
})

test('właściwe uprawnienie pozwala otworzyć ekran i wykonać operację', () => {
  const context = resolveEmployee({ can_edit_products: true })

  assert.equal(accessContextCanOpenRoute(context, '/zamawiarka'), true)
  assert.equal(requireAccessPermission(context, 'can_edit_products'), true)
})

test('zmiana profilu jest uwzględniana bez tworzenia nowej sesji', () => {
  const beforeChange = resolveEmployee({ can_edit_products: false })
  const afterChange = resolveEmployee({ can_edit_products: true })

  assert.equal(accessContextHasPermission(beforeChange, 'can_edit_products'), false)
  assert.equal(accessContextHasPermission(afterChange, 'can_edit_products'), true)
})

test('store autoryzacji odrzuca ręczne wywołanie zapisu bez uprawnienia', () => {
  const accountSessionStore = useAccountSessionStore()
  accountSessionStore.authUser = {
    uid: 'auth-marzena',
    emailVerified: true
  }
  accountSessionStore.currentRestaurantId = 'restaurant-a'
  accountSessionStore.currentMembership = activeMembership()
  accountSessionStore.currentEmployee = {
    id: 'employee-marzena',
    aktywny: true
  }
  accountSessionStore.permissions = {
    can_view_zamawiarka: true,
    can_manage_schedule: true
  }
  accountSessionStore.localPinConfigured = true
  accountSessionStore.currentDeviceSession = { status: 'active' }

  const authorizationStore = useAuthorizationStore()

  assert.equal(authorizationStore.isOwner, false)
  assert.throws(
    () => authorizationStore.requirePermission('can_edit_products'),
    /Nie masz uprawnienia/
  )
})

test('store autoryzacji traci dostęp po zablokowaniu członkostwa', () => {
  const accountSessionStore = useAccountSessionStore()
  accountSessionStore.authUser = {
    uid: 'auth-marzena',
    emailVerified: true
  }
  accountSessionStore.currentRestaurantId = 'restaurant-a'
  accountSessionStore.currentMembership = activeMembership()
  accountSessionStore.currentEmployee = {
    id: 'employee-marzena',
    aktywny: true
  }
  accountSessionStore.permissions = { can_edit_products: true }
  accountSessionStore.localPinConfigured = true
  accountSessionStore.currentDeviceSession = { status: 'active' }

  const authorizationStore = useAuthorizationStore()
  assert.equal(authorizationStore.hasPermission('can_edit_products'), true)

  accountSessionStore.currentMembership = activeMembership({
    status: 'blocked'
  })
  assert.equal(authorizationStore.hasPermission('can_edit_products'), false)
})
