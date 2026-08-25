import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

export const useEmployeeGroupsStore = defineStore('employeeGroups', () => {
  const groups = ref([])
  const isLoading = ref(false)
  let unsubscribeGroups = null
  let listenerRestaurantId = null
  let listenerReadyPromise = null

  const getRestaurantId = () => new Promise(resolve => {
    const employeeAuthStore = useEmployeeAuthStore()
    if (employeeAuthStore.restaurantId) {
      resolve(employeeAuthStore.restaurantId)
      return
    }

    const auth = getAuth()
    if (auth.currentUser) {
      resolve(auth.currentUser.uid)
      return
    }

    let unsubscribe = () => {}
    unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      resolve(user?.uid || null)
    })
  })

  const sortGroups = () => {
    groups.value.sort((first, second) => {
      const orderDifference = Number(first.displayOrder || 0) - Number(second.displayOrder || 0)
      return orderDifference || String(first.name || '').localeCompare(String(second.name || ''), 'pl')
    })
  }

  const fetchGroups = async () => {
    const restaurantId = await getRestaurantId()
    if (!restaurantId) return []
    if (unsubscribeGroups && listenerRestaurantId === restaurantId) return listenerReadyPromise || groups.value

    if (unsubscribeGroups) unsubscribeGroups()
    listenerRestaurantId = restaurantId
    isLoading.value = true
    listenerReadyPromise = new Promise(resolve => {
      let firstSnapshot = true
      unsubscribeGroups = onSnapshot(
        collection(db, 'users', restaurantId, 'employeeGroups'),
        snapshot => {
          groups.value = snapshot.docs.map(groupSnapshot => ({
            id: groupSnapshot.id,
            ...groupSnapshot.data()
          }))
          sortGroups()
          if (firstSnapshot) {
            firstSnapshot = false
            isLoading.value = false
            resolve(groups.value)
          }
        },
        error => {
          console.error('Błąd pobierania grup pracowniczych:', error)
          unsubscribeGroups = null
          listenerRestaurantId = null
          isLoading.value = false
          if (firstSnapshot) {
            firstSnapshot = false
            resolve(groups.value)
          }
        }
      )
    })
    return listenerReadyPromise
  }

  const saveGroup = async groupData => {
    const restaurantId = await getRestaurantId()
    if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')

    const isNew = !groupData.id
    const groupRef = isNew
      ? doc(collection(db, 'users', restaurantId, 'employeeGroups'))
      : doc(db, 'users', restaurantId, 'employeeGroups', groupData.id)
    const currentSnapshot = isNew ? null : await getDoc(groupRef)
    const storedGroup = {
      id: groupRef.id,
      name: String(groupData.name || '').trim(),
      description: String(groupData.description || '').trim(),
      active: groupData.active !== false,
      displayOrder: Math.max(1, Math.round(Number(groupData.displayOrder) || groups.value.length + 1)),
      createdAt: currentSnapshot?.data()?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(groupRef, storedGroup, { merge: false })
    const localGroup = { ...storedGroup, id: groupRef.id }
    if (!unsubscribeGroups) {
      const index = groups.value.findIndex(group => group.id === groupRef.id)
      if (index === -1) groups.value.push(localGroup)
      else groups.value[index] = localGroup
      sortGroups()
    }
    return localGroup
  }

  const deleteGroup = async groupId => {
    const restaurantId = await getRestaurantId()
    if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')
    await deleteDoc(doc(db, 'users', restaurantId, 'employeeGroups', groupId))
    if (!unsubscribeGroups) groups.value = groups.value.filter(group => group.id !== groupId)
  }

  return { groups, isLoading, fetchGroups, saveGroup, deleteGroup }
})
