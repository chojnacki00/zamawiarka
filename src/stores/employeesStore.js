import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref([])
  const isLoading = ref(false)

  const getUid = () => {
    return new Promise((resolve) => {
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

  const fetchEmployees = async () => {
    const uid = await getUid()
    if (!uid) return
    
    isLoading.value = true
    try {
      const snapshot = await getDocs(collection(db, 'users', uid, 'employees'))
      employees.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Błąd pobierania pracowników:', error)
    } finally {
      isLoading.value = false
    }
  }

  const addEmployee = async (employeeData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      const docRef = await addDoc(collection(db, 'users', uid, 'employees'), employeeData)
      const newEmployee = { id: docRef.id, ...employeeData }
      employees.value.push(newEmployee)
      return newEmployee
    } catch (error) { throw error }
  }

  const updateEmployee = async (empId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await updateDoc(doc(db, 'users', uid, 'employees', empId), updatedData)
      const index = employees.value.findIndex(e => e.id === empId)
      if (index !== -1) employees.value[index] = { id: empId, ...updatedData }
    } catch (error) { throw error }
  }

  const deleteEmployee = async (empId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, 'employees', empId))
      employees.value = employees.value.filter(e => e.id !== empId)
    } catch (error) { throw error }
  }

  return { employees, isLoading, fetchEmployees, addEmployee, updateEmployee, deleteEmployee }
})