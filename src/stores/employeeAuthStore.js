import { defineStore } from 'pinia'
import { ref } from 'vue'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import {
  canUseEmployeePermissionInSession,
  requireRestaurantContextId
} from '../utils/employeeIdentity.js'

export const useEmployeeAuthStore = defineStore('employeeAuth', () => {
  const currentEmployee = ref(null)
  const restaurantId = ref(null)
  const isInitialized = ref(false)
  const sessionMode = ref(null)

  let unsubscribeEmployee = null

  const startEmployeeListener = (restId, empId) => {
    if (unsubscribeEmployee) {
      unsubscribeEmployee()
    }

    const empRef = doc(db, 'users', restId, 'employees', empId)
    
    unsubscribeEmployee = onSnapshot(empRef, (docSnap) => {
      if (!docSnap.exists() || docSnap.data().aktywny === false) {
        console.warn('⚡ KILL SWITCH AKTYWOWANY: Brak dostępu!')
        logout()
      }
    })
  }

  const initSession = async () => {
    const savedEmpId = localStorage.getItem('gm_emp_id')
    const savedRestId = localStorage.getItem('gm_rest_id')

    if (savedEmpId && savedRestId) {
      try {
        const empRef = doc(db, 'users', savedRestId, 'employees', savedEmpId)
        const empSnap = await getDoc(empRef)

        if (empSnap.exists() && empSnap.data().aktywny !== false) {
          const empData = empSnap.data()
          let uprawnienia = {}

          // CZYSTA LOGIKA: Tylko nowe profile uprawnień
          if (empData.permissionProfileId) {
            const profileRef = doc(db, 'users', savedRestId, 'permissionProfiles', empData.permissionProfileId)
            const profileSnap = await getDoc(profileRef)
            
            if (profileSnap.exists()) {
              uprawnienia = profileSnap.data().uprawnienia || profileSnap.data()
            }
          }

          currentEmployee.value = { id: empSnap.id, ...empData, uprawnienia }
          restaurantId.value = savedRestId
          sessionMode.value = 'legacy_pin'
          startEmployeeListener(savedRestId, savedEmpId)

        } else {
          logout()
        }
      } catch (error) {
        console.error("Błąd przywracania sesji pracownika:", error)
      }
    }
    isInitialized.value = true
  }

  const login = async (restId, pinCode) => {
    try {
      const pairedEmpId = localStorage.getItem('gm_saved_emp_id')

      if (!pairedEmpId) {
        throw new Error('Urządzenie nie jest poprawnie sparowane z pracownikiem.')
      }

      const empRef = doc(db, 'users', restId, 'employees', pairedEmpId)
      const empSnap = await getDoc(empRef)

      if (!empSnap.exists()) {
        throw new Error('Konto pracownika nie istnieje.')
      }

      const empData = empSnap.data()

      if (String(empData.pin) !== String(pinCode)) {
        throw new Error('Nieprawidłowy PIN dla tego urządzenia.')
      }

      if (empData.aktywny === false) {
        throw new Error('Twoje konto zostało zablokowane przez Managera.')
      }

      let uprawnienia = {}
      
      // CZYSTA LOGIKA: Tylko nowe profile uprawnień
      if (empData.permissionProfileId) {
        const profileRef = doc(db, 'users', restId, 'permissionProfiles', empData.permissionProfileId)
        const profileSnap = await getDoc(profileRef)
        
        if (profileSnap.exists()) {
          uprawnienia = profileSnap.data().uprawnienia || profileSnap.data()
        }
      }

      currentEmployee.value = { id: empSnap.id, ...empData, uprawnienia }
      restaurantId.value = restId
      sessionMode.value = 'legacy_pin'

      localStorage.setItem('gm_emp_id', empSnap.id)
      localStorage.setItem('gm_rest_id', restId)
      startEmployeeListener(restId, empSnap.id)

      return true
    } catch (error) {
      throw error 
    }
  }

  const logout = () => {
    if (unsubscribeEmployee) {
      unsubscribeEmployee() 
      unsubscribeEmployee = null
    }
    currentEmployee.value = null
    restaurantId.value = null
    sessionMode.value = null
    localStorage.removeItem('gm_emp_id')
    localStorage.removeItem('gm_rest_id')
  }

  const hasPermission = (permissionKey) => {
    if (!currentEmployee.value || !currentEmployee.value.uprawnienia) {
      return false
    }
    return canUseEmployeePermissionInSession({
      permissionKey,
      permissionEnabled:
        currentEmployee.value.uprawnienia[permissionKey],
      sessionMode: sessionMode.value
    })
  }

  const requireRestaurantId = () => (
    requireRestaurantContextId(restaurantId.value)
  )

  const setAuthenticatedRestaurantContext = ({
    restId,
    employee = null,
    permissions = {}
  } = {}) => {
    if (unsubscribeEmployee) {
      unsubscribeEmployee()
      unsubscribeEmployee = null
    }

    restaurantId.value = String(restId || '').trim() || null
    currentEmployee.value = employee
      ? { ...employee, uprawnienia: { ...permissions } }
      : null
    sessionMode.value = 'firebase_account'
    isInitialized.value = true
  }

  const clearAuthenticatedRestaurantContext = () => {
    if (sessionMode.value !== 'firebase_account') return

    currentEmployee.value = null
    restaurantId.value = null
    sessionMode.value = null
  }

  return {
    currentEmployee,
    restaurantId,
    isInitialized,
    sessionMode,
    initSession,
    login,
    logout,
    hasPermission,
    requireRestaurantId,
    setAuthenticatedRestaurantContext,
    clearAuthenticatedRestaurantContext
  }
})
