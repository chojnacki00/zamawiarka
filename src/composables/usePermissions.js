import { useAuthStore } from '../stores/authStore.js'
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'

export function usePermissions() {
  const authStore = useAuthStore()
  const employeeAuthStore = useEmployeeAuthStore()

  // 1. Uniwersalna funkcja do sprawdzania uprawnień (do blokowania przycisków i widoków)
  const can = (permissionKey) => {
    // Szef ma dostęp do wszystkiego
    if (authStore.isLoggedIn) return true

    // Pracownik ma dostęp tylko do tego, co ma włączone w stanowisku
    if (employeeAuthStore.currentEmployee) {
      return !!employeeAuthStore.currentEmployee.uprawnienia?.[permissionKey]
    }

    return false
  }

  // 2. Funkcja do wyświetlania powitania ("Witaj, Lech")
  const getUserDisplayName = () => {
    if (authStore.isLoggedIn) {
      // Jeśli Manager ma ustawioną nazwę firmy, wyświetlamy ją, inaczej domyślne powitanie
      return authStore.currentCompany?.companyName 
        ? `Witaj, ${authStore.currentCompany.companyName}` 
        : 'Witaj, Manager'
    }

    if (employeeAuthStore.currentEmployee) {
      const emp = employeeAuthStore.currentEmployee
      return `Witaj, ${emp.imie}`
    }

    return ''
  }

  return { can, getUserDisplayName }
}