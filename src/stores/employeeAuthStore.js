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
          const empData = empSnap.data()
          let uprawnienia = {}

          // Pobieramy uprawnienia stanowiska, jeśli pracownik ma je przypisane
          if (empData.roleId) {
            const stanowiskoRef = doc(db, 'users', savedRestId, 'stanowiska', empData.roleId)
            const stanowiskoSnap = await getDoc(stanowiskoRef)
            
            if (stanowiskoSnap.exists()) {
              // Zakładam, że w dokumencie stanowiska flagi są bezpośrednio, lub w obiekcie 'uprawnienia'
              uprawnienia = stanowiskoSnap.data().uprawnienia || stanowiskoSnap.data()
            }
          }

          // Wszystko gra - przywracamy sesję w tle (z uprawnieniami)
          currentEmployee.value = { id: empSnap.id, ...empData, uprawnienia }
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

  // 2. Logowanie z ekranu PIN (Wymaga sparowanego urządzenia)
  const login = async (restId, pinCode) => {
    try {
      // 1. Pobieramy ID przypisanego pracownika (zapiszemy je podczas parowania)
      const pairedEmpId = localStorage.getItem('gm_saved_emp_id')

      if (!pairedEmpId) {
        throw new Error('Urządzenie nie jest poprawnie sparowane z pracownikiem.')
      }

      // 2. Uderzamy prosto w dokument TEGO konkretnego pracownika (np. Lecha)
      const empRef = doc(db, 'users', restId, 'employees', pairedEmpId)
      const empSnap = await getDoc(empRef)

      if (!empSnap.exists()) {
        throw new Error('Konto pracownika nie istnieje.')
      }

      const empData = empSnap.data()

      // 3. Sprawdzamy czy podany PIN zgadza się z PIN-em naszego przypisanego pracownika
      if (String(empData.pin) !== String(pinCode)) {
        throw new Error('Nieprawidłowy PIN dla tego urządzenia.')
      }

      // Kill Switch (Blokada)
      if (empData.aktywny === false) {
        throw new Error('Twoje konto zostało zablokowane przez Managera.')
      }

      // Pobieramy uprawnienia ze stanowiska
      let uprawnienia = {}
      if (empData.roleId) {
        const stanowiskoRef = doc(db, 'users', restId, 'stanowiska', empData.roleId)
        const stanowiskoSnap = await getDoc(stanowiskoRef)
        
        if (stanowiskoSnap.exists()) {
          uprawnienia = stanowiskoSnap.data().uprawnienia || stanowiskoSnap.data()
        }
      }

      // Sukces! Logujemy pracownika z jego uprawnieniami
      currentEmployee.value = { id: empSnap.id, ...empData, uprawnienia }
      restaurantId.value = restId

      localStorage.setItem('gm_emp_id', empSnap.id)
      localStorage.setItem('gm_rest_id', restId)

      return true
    } catch (error) {
      throw error // Przekazujemy błąd wyżej
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