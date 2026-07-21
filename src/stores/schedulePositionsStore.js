import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

export const useSchedulePositionsStore = defineStore('schedulePositions', () => {
  const positions = ref([])
  const isLoading = ref(false)

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
    if (!uid) return
    
    isLoading.value = true
    try {
      const positionsRef = collection(db, 'users', uid, 'positions')
      const snapshot = await getDocs(positionsRef)
      positions.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Błąd pobierania stanowisk:', error)
    } finally {
      isLoading.value = false
    }
  }

  const addPosition = async (positionData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      const docRef = await addDoc(collection(db, 'users', uid, 'positions'), positionData)
      const newPosition = { id: docRef.id, ...positionData }
      positions.value.push(newPosition)
      return newPosition
    } catch (error) { throw error }
  }

  const updatePosition = async (positionId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await updateDoc(doc(db, 'users', uid, 'positions', positionId), updatedData)
      const index = positions.value.findIndex(p => p.id === positionId)
      if (index !== -1) positions.value[index] = { id: positionId, ...updatedData }
    } catch (error) { throw error }
  }

  const deletePosition = async (positionId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, 'positions', positionId))
      positions.value = positions.value.filter(p => p.id !== positionId)
    } catch (error) { throw error }
  }

  return { positions, isLoading, fetchPositions, addPosition, updatePosition, deletePosition }
})