import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

export const usePermissionProfilesStore = defineStore('permissionProfiles', () => {
  // ZMIANA 1: Zamiast ról, trzymamy "profiles"
  const profiles = ref([])
  const isLoading = ref(false)

  // Ta funkcja teraz CIERPLIWIE czeka, aż Firebase potwierdzi sesję
  const getUid = () => {
    return new Promise((resolve) => {
      // 1. Najpierw sprawdzamy, czy działa sesja pracownika (PIN)
      const employeeAuthStore = useEmployeeAuthStore()
      if (employeeAuthStore.restaurantId) {
        resolve(employeeAuthStore.restaurantId)
        return
      }

      // 2. Jeśli to nie pracownik, odpalamy starą logikę dla Szefa
      const auth = getAuth()
      if (auth.currentUser) {
        resolve(auth.currentUser.uid)
      } else {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          resolve(user ? user.uid : null)
        })
      }
    })
  }

  const fetchProfiles = async () => {
    const uid = await getUid()
    if (!uid) return
    
    isLoading.value = true
    try {
      // ZMIANA 2: Odpytujemy kolekcję 'permissionProfiles' zamiast 'stanowiska'
      const profilesRef = collection(db, 'users', uid, 'permissionProfiles')
      const snapshot = await getDocs(profilesRef)
      profiles.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Błąd pobierania profili:', error)
    } finally {
      isLoading.value = false
    }
  }

  const addProfile = async (profileData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      // ZMIANA 2: Zapis do kolekcji 'permissionProfiles'
      const docRef = await addDoc(collection(db, 'users', uid, 'permissionProfiles'), profileData)
      const newProfile = { id: docRef.id, ...profileData }
      profiles.value.push(newProfile)
      return newProfile
    } catch (error) { throw error }
  }

  const updateProfile = async (profileId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await updateDoc(doc(db, 'users', uid, 'permissionProfiles', profileId), updatedData)
      const index = profiles.value.findIndex(p => p.id === profileId)
      if (index !== -1) profiles.value[index] = { id: profileId, ...updatedData }
    } catch (error) { throw error }
  }

  const deleteProfile = async (profileId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, 'permissionProfiles', profileId))
      profiles.value = profiles.value.filter(p => p.id !== profileId)
    } catch (error) { throw error }
  }

  // ZMIANA 3: Udostępniamy nowe, adekwatne nazwy zmiennych i funkcji
  return { profiles, isLoading, fetchProfiles, addProfile, updateProfile, deleteProfile }
})