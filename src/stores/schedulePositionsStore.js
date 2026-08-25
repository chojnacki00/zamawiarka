import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDoc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

export const useSchedulePositionsStore = defineStore('schedulePositions', () => {
  const positions = ref([])
  const isLoading = ref(false)
  let unsubscribePositions = null
  let listenerUid = null
  let listenerReadyPromise = null

  const getUid = () => {
    return new Promise((resolve) => {
      const employeeAuthStore = useEmployeeAuthStore()
      if (employeeAuthStore.restaurantId) {
        resolve(employeeAuthStore.restaurantId)
        return
      }
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

  const fetchPositions = async () => {
    const uid = await getUid()
    if (!uid) return []
    if (unsubscribePositions && listenerUid === uid) return listenerReadyPromise || positions.value

    if (unsubscribePositions) unsubscribePositions()
    listenerUid = uid
    isLoading.value = true
    listenerReadyPromise = new Promise(resolve => {
      let firstSnapshot = true
      unsubscribePositions = onSnapshot(
        collection(db, 'users', uid, 'positions'),
        snapshot => {
          positions.value = snapshot.docs
            .map(positionSnapshot => ({ id: positionSnapshot.id, ...positionSnapshot.data() }))
            .sort((first, second) => {
              const orderDifference = Number(first.displayOrder || 0) - Number(second.displayOrder || 0)
              return orderDifference || String(first.nazwa || '').localeCompare(String(second.nazwa || ''), 'pl')
            })
          if (firstSnapshot) {
            firstSnapshot = false
            isLoading.value = false
            resolve(positions.value)
          }
        },
        error => {
          console.error('Błąd pobierania stanowisk:', error)
          unsubscribePositions = null
          listenerUid = null
          isLoading.value = false
          if (firstSnapshot) {
            firstSnapshot = false
            resolve(positions.value)
          }
        }
      )
    })
    return listenerReadyPromise
  }

  const addPosition = async (positionData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      const positionRef = doc(collection(db, 'users', uid, 'positions'))
      const storedPosition = {
        id: positionRef.id,
        nazwa: String(positionData.nazwa || '').trim(),
        defaultHourlyRate: Math.max(0, Number(positionData.defaultHourlyRate) || 0),
        active: positionData.active !== false,
        displayOrder: Number(positionData.displayOrder) || positions.value.length + 1,
        schemaVersion: 2,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      await setDoc(positionRef, storedPosition)
      const newPosition = { ...storedPosition, id: positionRef.id }
      if (!unsubscribePositions && !positions.value.some(position => position.id === newPosition.id)) positions.value.push(newPosition)
      return newPosition
    } catch (error) { throw error }
  }

  const updatePosition = async (positionId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      const positionRef = doc(db, 'users', uid, 'positions', positionId)
      const currentSnapshot = await getDoc(positionRef)
      const storedPosition = {
        ...currentSnapshot.data(),
        ...updatedData,
        id: positionId,
        nazwa: String(updatedData.nazwa || '').trim(),
        defaultHourlyRate: Math.max(0, Number(updatedData.defaultHourlyRate) || 0),
        active: updatedData.active !== false,
        schemaVersion: 2,
        updatedAt: serverTimestamp()
      }
      await setDoc(positionRef, storedPosition, { merge: false })
      if (!unsubscribePositions) {
        const index = positions.value.findIndex(p => p.id === positionId)
        if (index !== -1) positions.value[index] = { ...storedPosition, id: positionId }
      }
    } catch (error) { throw error }
  }

  const deletePosition = async (positionId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, 'positions', positionId))
      if (!unsubscribePositions) positions.value = positions.value.filter(p => p.id !== positionId)
    } catch (error) { throw error }
  }

  const setPositionActive = async (positionId, active) => {
    const position = positions.value.find(item => item.id === positionId)
    if (!position) return
    return updatePosition(positionId, { ...position, active })
  }

  return { positions, isLoading, fetchPositions, addPosition, updatePosition, deletePosition, setPositionActive }
})
