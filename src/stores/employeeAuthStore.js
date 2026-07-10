import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export const useEmployeeAuthStore = defineStore('employeeAuth', () => {
  // Dane aktualnie zalogowanego pracownika
  const currentEmployee = ref(null)
  
  // ID Restauracji (właściwie UID właściciela, czyli "worek z danymi")
  const restaurantId = ref(null)
  
  const isInitialized = ref(false)

  // 1. Inicjalizacja sesji z pamięci telefonu (odpalana przy starcie aplikacji)
  const initSession = async () => {
    const savedEmpId = localStorage.getItem('gm_emp_id')
    const savedRestId = localStorage.getItem('gm_rest_id')

    if (savedEmpId && savedRestId) {
      try {
        // Sprawdzamy czy pracownik w ogóle istnieje i czy ma status "Aktywny"
        const empRef = doc(db, 'users', savedRestId, 'employees', savedEmpId)
        const empSnap = await getDoc(empRef)

        if (empSnap.exists() && empSnap.data().aktywny !== false) {
          // Wszystko gra - przywracamy sesję w tle
          currentEmployee.value = { id: empSnap.id, ...empSnap.data() }
          restaurantId.value = savedRestId
        } else {
          // Zwolniony, zablokowany lub usunięty - wyrzucamy z aplikacji
          logout()
        }
      } catch (error) {
        console.error("Błąd przywracania sesji pracownika:", error)
      }
    }
    isInitialized.value = true
  }

  // 2. Logowanie z ekranu PIN (wymaga Kodu Restauracji i numeru PIN)
  const login = async (restId, pinCode) => {
    try {
      const employeesRef = collection(db, 'users', restId, 'employees')
      // Szukamy pracownika, który ma taki właśnie PIN
      const q = query(employeesRef, where('pin', '==', String(pinCode)))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('Nieprawidłowy PIN lub Kod Restauracji.')
      }

      const empDoc = querySnapshot.docs[0]
      const empData = empDoc.data()

      // Kill Switch (Blokada)
      if (empData.aktywny === false) {
        throw new Error('Twoje konto zostało zablokowane przez Managera.')
      }

      // Sukces! Logujemy pracownika i zapisujemy "ciasteczko" na telefonie
      currentEmployee.value = { id: empDoc.id, ...empData }
      restaurantId.value = restId

      localStorage.setItem('gm_emp_id', empDoc.id)
      localStorage.setItem('gm_rest_id', restId)

      return true
    } catch (error) {
      throw error // Przekazujemy błąd wyżej, żeby wyświetlić go na czerwono w formularzu
    }
  }

  // 3. Wylogowywanie (Czyszczenie pamięci telefonu)
  const logout = () => {
    currentEmployee.value = null
    restaurantId.value = null
    localStorage.removeItem('gm_emp_id')
    localStorage.removeItem('gm_rest_id')
  }

  return {
    currentEmployee,
    restaurantId,
    isInitialized,
    initSession,
    login,
    logout
  }
})