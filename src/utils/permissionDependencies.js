export const normalizePermissionDependencies = permissions => {
  const normalized = { ...(permissions || {}) }

  if (normalized.can_manage_schedule === true) {
    normalized.can_view_schedule = true
  }

  if (normalized.can_view_schedule !== true) {
    normalized.can_manage_schedule = false
  }

  return normalized
}

export const togglePermissionWithDependencies = (
  permissions,
  permissionKey
) => {
  if (
    permissionKey === 'can_manage_schedule' &&
    permissions?.can_view_schedule !== true
  ) {
    return normalizePermissionDependencies(permissions)
  }

  const nextPermissions = {
    ...(permissions || {}),
    [permissionKey]: permissions?.[permissionKey] !== true
  }

  if (
    permissionKey === 'can_view_schedule' &&
    !nextPermissions.can_view_schedule
  ) {
    nextPermissions.can_manage_schedule = false
  }

  return normalizePermissionDependencies(nextPermissions)
}
