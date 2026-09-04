import { canUseEmployeePermissionInSession } from './employeeIdentity.js'

export const ACCESS_PRINCIPALS = Object.freeze({
  NONE: 'none',
  OWNER: 'owner',
  EMPLOYEE: 'employee',
  LEGACY_PIN: 'legacy_pin'
})

const normalizePermissions = permissions => (
  permissions && typeof permissions === 'object'
    ? { ...permissions }
    : {}
)

export const resolveAccessContext = ({
  firebaseAuthUid = null,
  hasActiveAccountContext = false,
  membership = null,
  employee = null,
  permissions = {},
  legacySessionMode = null,
  legacyEmployee = null,
  legacyRestaurantId = null
} = {}) => {
  const authUid = String(firebaseAuthUid || '').trim()

  if (authUid) {
    const membershipMatches = (
      hasActiveAccountContext === true &&
      membership?.status === 'active' &&
      String(membership?.authUid || membership?.id || '').trim() === authUid
    )

    if (!membershipMatches) {
      return {
        principal: ACCESS_PRINCIPALS.NONE,
        authUid,
        restaurantId: null,
        employeeId: null,
        permissions: {}
      }
    }

    if (membership.role === 'owner') {
      return {
        principal: ACCESS_PRINCIPALS.OWNER,
        authUid,
        restaurantId: String(membership.restaurantId || '').trim() || null,
        employeeId: null,
        permissions: {}
      }
    }

    if (
      membership.role === 'employee' &&
      employee?.aktywny !== false &&
      String(membership.employeeId || '').trim() &&
      String(employee?.id || '').trim() ===
        String(membership.employeeId || '').trim()
    ) {
      return {
        principal: ACCESS_PRINCIPALS.EMPLOYEE,
        authUid,
        restaurantId: String(membership.restaurantId || '').trim() || null,
        employeeId: String(membership.employeeId).trim(),
        permissions: normalizePermissions(permissions)
      }
    }

    return {
      principal: ACCESS_PRINCIPALS.NONE,
      authUid,
      restaurantId: null,
      employeeId: null,
      permissions: {}
    }
  }

  if (
    legacySessionMode === ACCESS_PRINCIPALS.LEGACY_PIN &&
    legacyEmployee?.aktywny !== false &&
    String(legacyEmployee?.id || '').trim()
  ) {
    return {
      principal: ACCESS_PRINCIPALS.LEGACY_PIN,
      authUid: null,
      restaurantId: String(legacyRestaurantId || '').trim() || null,
      employeeId: String(legacyEmployee.id).trim(),
      permissions: normalizePermissions(legacyEmployee.uprawnienia)
    }
  }

  return {
    principal: ACCESS_PRINCIPALS.NONE,
    authUid: null,
    restaurantId: null,
    employeeId: null,
    permissions: {}
  }
}

export const accessContextHasPermission = (context, permissionKey) => {
  if (context?.principal === ACCESS_PRINCIPALS.OWNER) return true

  if (context?.principal === ACCESS_PRINCIPALS.EMPLOYEE) {
    return context.permissions?.[permissionKey] === true
  }

  if (context?.principal === ACCESS_PRINCIPALS.LEGACY_PIN) {
    return canUseEmployeePermissionInSession({
      permissionKey,
      permissionEnabled: context.permissions?.[permissionKey],
      sessionMode: ACCESS_PRINCIPALS.LEGACY_PIN
    })
  }

  return false
}

export const accessContextHasAnyPermission = (
  context,
  permissionKeys = []
) => permissionKeys.some(permissionKey => (
  accessContextHasPermission(context, permissionKey)
))

export const requireAccessPermission = (context, permissionKey) => {
  if (!accessContextHasPermission(context, permissionKey)) {
    throw new Error('Nie masz uprawnienia do wykonania tej operacji.')
  }

  return true
}

export const requireOwnerAccess = context => {
  if (context?.principal !== ACCESS_PRINCIPALS.OWNER) {
    throw new Error('Ta operacja jest dostępna wyłącznie dla właściciela.')
  }

  return true
}

export const requireRestaurantAccess = context => {
  const restaurantId = String(context?.restaurantId || '').trim()

  if (!restaurantId) {
    throw new Error(
      'Nie udało się rozpoznać aktywnej restauracji. Odśwież widok i spróbuj ponownie.'
    )
  }

  return restaurantId
}

const EXACT_ROUTE_REQUIREMENTS = Object.freeze({
  '/zamawiarka': ['can_view_zamawiarka', 'can_create_orders', 'can_edit_products'],
  '/rentownosc': ['can_view_foodcost', 'can_edit_menu'],
  '/ustawienia': ['can_manage_roles', 'can_manage_employees', 'can_manage_schedule'],
  '/ustawienia/profile-zatrudnienia': ['can_manage_schedule'],
  '/ustawienia/grupy-pracownicze': ['can_manage_employees'],
  '/profile-uprawnien': ['can_manage_roles'],
  '/stanowiska-grafik': ['can_manage_roles'],
  '/zespol': ['can_manage_employees'],
  '/terminal': ['can_manage_employees'],
  '/grafik': ['can_view_schedule'],
  '/grafik/kalendarz': ['can_view_schedule'],
  '/grafik/dyspozycyjnosc': ['can_view_schedule'],
  '/grafik/dyspozycyjnosc/kalendarz': ['can_view_schedule'],
  '/grafik/dyspozycyjnosc/okresy': ['can_manage_schedule'],
  '/grafik/tworzenie': ['can_manage_schedule'],
  '/grafik/grafiki': ['can_manage_schedule'],
  '/grafik/ustawienia': ['can_manage_schedule'],
  '/grafik/ustawienia/reguly': ['can_manage_schedule'],
  '/grafik/szablony': ['can_manage_schedule'],
  '/grafik/szablony/nowy': ['can_manage_schedule']
})

export const getRoutePermissionRequirement = path => {
  const normalizedPath = String(path || '').trim()
  if (EXACT_ROUTE_REQUIREMENTS[normalizedPath]) {
    return EXACT_ROUTE_REQUIREMENTS[normalizedPath]
  }
  if (
    normalizedPath.startsWith('/grafik/grafiki/') ||
    normalizedPath.startsWith('/grafik/szablony/')
  ) {
    return ['can_manage_schedule']
  }
  return []
}

export const accessContextCanOpenRoute = (context, path) => {
  const requiredPermissions = getRoutePermissionRequirement(path)
  return requiredPermissions.length === 0 ||
    accessContextHasAnyPermission(context, requiredPermissions)
}
