// src/stores/rolesStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth' // Pobieramy autoryzację z Firebase
import { db } from '../firebase.js'

export const useRolesStore = defineStore('roles', () => {
  const roles = ref([])
  const isLoading = ref(false)

  // Funkcja pomocnicza: pobiera ID zalogowanego użytkownika (UID)
  const getUid = () => {
    const auth = getAuth()
    return auth.currentUser?.uid
  }

  // 1. Pobieranie stanowisk z bazy
  const fetchRoles = async () => {
    const uid = getUid()
    if (!uid) return
    
    isLoading.value = true
    try {
      // Zmieniona ścieżka - idealnie pasuje do Twojej aplikacji!
      const rolesRef = collection(db, 'users', uid, 'roles')
      const snapshot = await getDocs(rolesRef)
      
      roles.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Błąd podczas pobierania stanowisk:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 2. Dodawanie nowego stanowiska
  const addRole = async (roleData) => {
    const uid = getUid()
    if (!uid) {
      console.error('Brak zalogowanego użytkownika (UID)!')
      return null
    }

    try {
      const rolesRef = collection(db, 'users', uid, 'roles')
      const docRef = await addDoc(rolesRef, roleData)
      
      const newRole = { id: docRef.id, ...roleData }
      roles.value.push(newRole)
      return newRole
    } catch (error) {
      console.error('Błąd podczas dodawania stanowiska:', error)
      throw error
    }
  }

  // 3. Edycja stanowiska
  const updateRole = async (roleId, updatedData) => {
    const uid = getUid()
    if (!uid) return

    try {
      const roleRef = doc(db, 'users', uid, 'roles', roleId)
      await updateDoc(roleRef, updatedData)
      
      const index = roles.value.findIndex(r => r.id === roleId)
      if (index !== -1) {
        roles.value[index] = { id: roleId, ...updatedData }
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji stanowiska:', error)
      throw error
    }
  }

  // 4. Usuwanie stanowiska
  const deleteRole = async (roleId) => {
    const uid = getUid()
    if (!uid) return

    try {
      const roleRef = doc(db, 'users', uid, 'roles', roleId)
      await deleteDoc(roleRef)
      
      roles.value = roles.value.filter(r => r.id !== roleId)
    } catch (error) {
      console.error('Błąd podczas usuwania stanowiska:', error)
      throw error
    }
  }

  return {
    roles,
    isLoading,
    fetchRoles,
    addRole,
    updateRole,
    deleteRole
  }
})