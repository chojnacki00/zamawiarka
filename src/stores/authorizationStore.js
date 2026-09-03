import { computed } from 'vue'
import { defineStore } from 'pinia'
import { auth } from '../firebase.js'
import { useAccountSessionStore } from './accountSessionStore.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import {
  ACCESS_PRINCIPALS,
  accessContextHasAnyPermission,
  accessContextHasPermission,
  requireAccessPermission,
  requireOwnerAccess,
  resolveAccessContext
} from '../utils/accessControl.js'

export const useAuthorizationStore = defineStore('authorization', () => {
  const accountSessionStore = useAccountSessionStore()
  const employeeAuthStore = useEmployeeAuthStore()

  const context = computed(() => resolveAccessContext({
    firebaseAuthUid:
      auth.currentUser?.uid || accountSessionStore.authUser?.uid || null,
    hasActiveAccountContext: accountSessionStore.hasActiveContext,
    membership: accountSessionStore.currentMembership,
    employee: accountSessionStore.currentEmployee,
    permissions: accountSessionStore.permissions,
    legacySessionMode: employeeAuthStore.sessionMode,
    legacyEmployee: employeeAuthStore.currentEmployee
  }))

  const isOwner = computed(() => (
    context.value.principal === ACCESS_PRINCIPALS.OWNER
  ))
  const isEmployee = computed(() => ([
    ACCESS_PRINCIPALS.EMPLOYEE,
    ACCESS_PRINCIPALS.LEGACY_PIN
  ].includes(context.value.principal)))
  const isFirebaseEmployee = computed(() => (
    context.value.principal === ACCESS_PRINCIPALS.EMPLOYEE
  ))
  const isLegacyPin = computed(() => (
    context.value.principal === ACCESS_PRINCIPALS.LEGACY_PIN
  ))
  const employeeId = computed(() => context.value.employeeId)
  const permissions = computed(() => context.value.permissions)

  const hasPermission = permissionKey => (
    accessContextHasPermission(context.value, permissionKey)
  )
  const hasAnyPermission = permissionKeys => (
    accessContextHasAnyPermission(context.value, permissionKeys)
  )
  const requirePermission = permissionKey => (
    requireAccessPermission(context.value, permissionKey)
  )
  const requireOwner = () => requireOwnerAccess(context.value)

  return {
    context,
    isOwner,
    isEmployee,
    isFirebaseEmployee,
    isLegacyPin,
    employeeId,
    permissions,
    hasPermission,
    hasAnyPermission,
    requirePermission,
    requireOwner
  }
})
