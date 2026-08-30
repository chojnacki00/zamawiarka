import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import { normalizePermissionDependencies } from '../utils/permissionDependencies.js'

const normalizeProfileData = profileData => ({
  ...(profileData || {}),
  uprawnienia: normalizePermissionDependencies(
    profileData?.uprawnienia
  )
})

export const usePermissionProfilesStore = defineStore('permissionProfiles', () => {
  // ZMIANA 1: Zamiast ról, trzymamy "profiles"
  const profiles = ref([])
  const isLoading = ref(false)
  let unsubscribeProfiles = null
  let listenerUid = null
  let listenerReadyPromise = null

  const getUid = async () => (
    useEmployeeAuthStore().requireRestaurantId()
  )

  const fetchProfiles = async () => {
    const uid = await getUid()
    if (!uid) return []
    if (unsubscribeProfiles && listenerUid === uid) return listenerReadyPromise || profiles.value

    if (unsubscribeProfiles) unsubscribeProfiles()
    listenerUid = uid
    isLoading.value = true
    listenerReadyPromise = new Promise(resolve => {
      let firstSnapshot = true
      unsubscribeProfiles = onSnapshot(
        collection(db, 'users', uid, 'permissionProfiles'),
        snapshot => {
          profiles.value = snapshot.docs
            .map(profileSnapshot => ({ id: profileSnapshot.id, ...profileSnapshot.data() }))
            .sort((first, second) => String(first.nazwa || '').localeCompare(String(second.nazwa || ''), 'pl'))
          if (firstSnapshot) {
            firstSnapshot = false
            isLoading.value = false
            resolve(profiles.value)
          }
        },
        error => {
          console.error('Błąd pobierania profili:', error)
          unsubscribeProfiles = null
          listenerUid = null
          isLoading.value = false
          if (firstSnapshot) {
            firstSnapshot = false
            resolve(profiles.value)
          }
        }
      )
    })
    return listenerReadyPromise
  }

  const addProfile = async (profileData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      // ZMIANA 2: Zapis do kolekcji 'permissionProfiles'
      const normalizedProfileData = normalizeProfileData(profileData)
      const docRef = await addDoc(collection(db, 'users', uid, 'permissionProfiles'), normalizedProfileData)
      const newProfile = { id: docRef.id, ...normalizedProfileData }
      if (!unsubscribeProfiles && !profiles.value.some(profile => profile.id === newProfile.id)) profiles.value.push(newProfile)
      return newProfile
    } catch (error) { throw error }
  }

  const updateProfile = async (profileId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      const normalizedProfileData = normalizeProfileData(updatedData)
      await updateDoc(doc(db, 'users', uid, 'permissionProfiles', profileId), normalizedProfileData)
      if (!unsubscribeProfiles) {
        const index = profiles.value.findIndex(p => p.id === profileId)
        if (index !== -1) profiles.value[index] = { id: profileId, ...normalizedProfileData }
      }
    } catch (error) { throw error }
  }

  const deleteProfile = async (profileId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, 'permissionProfiles', profileId))
      if (!unsubscribeProfiles) profiles.value = profiles.value.filter(p => p.id !== profileId)
    } catch (error) { throw error }
  }

  // ZMIANA 3: Udostępniamy nowe, adekwatne nazwy zmiennych i funkcji
  return { profiles, isLoading, fetchProfiles, addProfile, updateProfile, deleteProfile }
})
