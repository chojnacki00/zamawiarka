import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import {
  normalizeCompensation,
  normalizePositionAssignments
} from '../utils/employeeAssignments.js'
import { cleanupEmployeeReferences } from '../utils/employeeDataCleanup.js'

const normalizeEmployee = (employee, id = null) => ({
  id: id || employee?.id || null,
  imie: String(employee?.imie || '').trim(),
  nazwisko: String(employee?.nazwisko || '').trim(),
  telefon: String(employee?.telefon || '').trim(),
  email: String(employee?.email || '').trim(),
  pin: String(employee?.pin || '').trim(),
  aktywny: employee?.aktywny !== false,
  employmentProfileId: employee?.employmentProfileId || null,
  employmentPercentage: Math.min(200, Math.max(5, Number(employee?.employmentPercentage) || 100)),
  employeeGroupIds: [...new Set(
    (Array.isArray(employee?.employeeGroupIds) ? employee.employeeGroupIds : [])
      .map(groupId => String(groupId || '').trim())
      .filter(Boolean)
  )],
  compensation: normalizeCompensation(employee),
  positionAssignments: normalizePositionAssignments(employee?.positionAssignments),
  permissionProfileId: employee?.permissionProfileId || null,
  schemaVersion: 3
})

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref([])
  const isLoading = ref(false)
  let unsubscribeEmployees = null
  let listenerUid = null
  let listenerReadyPromise = null

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

  const fetchEmployees = async () => {
    const uid = await getUid()
    if (!uid) return []
    if (unsubscribeEmployees && listenerUid === uid) return listenerReadyPromise || employees.value

    if (unsubscribeEmployees) unsubscribeEmployees()
    listenerUid = uid
    isLoading.value = true
    listenerReadyPromise = new Promise(resolve => {
      let firstSnapshot = true
      unsubscribeEmployees = onSnapshot(
        collection(db, 'users', uid, 'employees'),
        snapshot => {
          employees.value = snapshot.docs.map(employeeSnapshot => normalizeEmployee(
            employeeSnapshot.data(),
            employeeSnapshot.id
          ))
          if (firstSnapshot) {
            firstSnapshot = false
            isLoading.value = false
            resolve(employees.value)
          }
        },
        error => {
          console.error('Błąd pobierania pracowników:', error)
          unsubscribeEmployees = null
          listenerUid = null
          isLoading.value = false
          if (firstSnapshot) {
            firstSnapshot = false
            resolve(employees.value)
          }
        }
      )
    })
    return listenerReadyPromise
  }

  const addEmployee = async (employeeData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      const employeeRef = doc(collection(db, 'users', uid, 'employees'))
      const normalizedEmployee = normalizeEmployee(employeeData, employeeRef.id)
      const storedEmployee = {
        ...normalizedEmployee,
        id: employeeRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      await setDoc(employeeRef, storedEmployee)
      const newEmployee = { ...normalizedEmployee, id: employeeRef.id }
      if (!unsubscribeEmployees && !employees.value.some(employee => employee.id === newEmployee.id)) employees.value.push(newEmployee)
      return newEmployee
    } catch (error) { throw error }
  }

  const updateEmployee = async (empId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      const employeeRef = doc(db, 'users', uid, 'employees', empId)
      const currentSnapshot = await getDoc(employeeRef)
      const normalizedEmployee = normalizeEmployee(updatedData, empId)
      await setDoc(employeeRef, {
        ...normalizedEmployee,
        id: empId,
        createdAt: currentSnapshot.data()?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: false })
      if (!unsubscribeEmployees) {
        const index = employees.value.findIndex(e => e.id === empId)
        if (index !== -1) employees.value[index] = normalizedEmployee
      }
    } catch (error) { throw error }
  }

  const deleteEmployee = async (empId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await cleanupEmployeeReferences(uid, [empId])
      if (!unsubscribeEmployees) employees.value = employees.value.filter(e => e.id !== empId)
    } catch (error) { throw error }
  }

  return { employees, isLoading, fetchEmployees, addEmployee, updateEmployee, deleteEmployee }
})
