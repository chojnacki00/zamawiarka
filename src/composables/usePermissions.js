import { useAuthStore } from '../stores/authStore.js'
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'
import { useAuthorizationStore } from '../stores/authorizationStore.js'

export function usePermissions() {
  const authStore = useAuthStore()
  const employeeAuthStore = useEmployeeAuthStore()
  const accountSessionStore = useAccountSessionStore()
  const authorizationStore = useAuthorizationStore()

  // 1. Uniwersalna funkcja do sprawdzania uprawnień (do blokowania przycisków i widoków)
  const can = permissionKey => (
    authorizationStore.hasPermission(permissionKey)
  )

  // 2. Funkcja do wyświetlania powitania ("Witaj, Lech")
  const getUserDisplayName = () => {
    if (authorizationStore.isOwner) {
      // Jeśli Manager ma ustawioną nazwę firmy, wyświetlamy ją, inaczej domyślne powitanie
      return authStore.currentCompany?.companyName 
        ? `Witaj, ${authStore.currentCompany.companyName}` 
        : 'Witaj, Manager'
    }

    const employee = accountSessionStore.currentEmployee ||
      employeeAuthStore.currentEmployee
    if (employee) {
      const emp = employee
      return `Witaj, ${emp.imie}`
    }

    return ''
  }

  return {
    can,
    getUserDisplayName,
    isOwner: authorizationStore.isOwner,
    isEmployee: authorizationStore.isEmployee,
    requirePermission: authorizationStore.requirePermission
  }
}
