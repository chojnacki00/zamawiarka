// src/stores/employeesStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '../firebase.js'

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref([])
  const isLoading = ref(false)

  const getUid = () => {
    const auth = getAuth()
    return auth.currentUser?.uid
  }

  // 1. Pobieranie pracowników
  const fetchEmployees = async () => {
    const uid = getUid()
    if (!uid) return
    
    isLoading.value = true
    try {
      const employeesRef = collection(db, 'users', uid, 'employees')
      const snapshot = await getDocs(employeesRef)
      
      employees.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Błąd podczas pobierania pracowników:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 2. Dodawanie pracownika
  const addEmployee = async (employeeData) => {
    const uid = getUid()
    if (!uid) return null

    try {
      const employeesRef = collection(db, 'users', uid, 'employees')
      const docRef = await addDoc(employeesRef, employeeData)
      
      const newEmployee = { id: docRef.id, ...employeeData }
      employees.value.push(newEmployee)
      return newEmployee
    } catch (error) {
      console.error('Błąd podczas dodawania pracownika:', error)
      throw error
    }
  }

  // 3. Edycja pracownika
  const updateEmployee = async (empId, updatedData) => {
    const uid = getUid()
    if (!uid) return

    try {
      const empRef = doc(db, 'users', uid, 'employees', empId)
      await updateDoc(empRef, updatedData)
      
      const index = employees.value.findIndex(e => e.id === empId)
      if (index !== -1) {
        employees.value[index] = { id: empId, ...updatedData }
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji pracownika:', error)
      throw error
    }
  }

  // 4. Usuwanie pracownika
  const deleteEmployee = async (empId) => {
    const uid = getUid()
    if (!uid) return

    try {
      const empRef = doc(db, 'users', uid, 'employees', empId)
      await deleteDoc(empRef)
      
      employees.value = employees.value.filter(e => e.id !== empId)
    } catch (error) {
      console.error('Błąd podczas usuwania pracownika:', error)
      throw error
    }
  }

  return {
    employees,
    isLoading,
    fetchEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee
  }
})