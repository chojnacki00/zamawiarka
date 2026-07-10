import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'

export const useRolesStore = defineStore('roles', () => {
  const roles = ref([])
  const isLoading = ref(false)

  // Ta funkcja teraz CIERPLIWIE czeka, aż Firebase potwierdzi sesję
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

  const fetchRoles = async () => {
    const uid = await getUid()
    if (!uid) return
    
    isLoading.value = true
    try {
      const rolesRef = collection(db, 'users', uid, 'roles')
      const snapshot = await getDocs(rolesRef)
      roles.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Błąd pobierania ról:', error)
    } finally {
      isLoading.value = false
    }
  }

  const addRole = async (roleData) => {
    const uid = await getUid()
    if (!uid) return null
    try {
      const docRef = await addDoc(collection(db, 'users', uid, 'roles'), roleData)
      const newRole = { id: docRef.id, ...roleData }
      roles.value.push(newRole)
      return newRole
    } catch (error) { throw error }
  }

  const updateRole = async (roleId, updatedData) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await updateDoc(doc(db, 'users', uid, 'roles', roleId), updatedData)
      const index = roles.value.findIndex(r => r.id === roleId)
      if (index !== -1) roles.value[index] = { id: roleId, ...updatedData }
    } catch (error) { throw error }
  }

  const deleteRole = async (roleId) => {
    const uid = await getUid()
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, 'roles', roleId))
      roles.value = roles.value.filter(r => r.id !== roleId)
    } catch (error) { throw error }
  }

  return { roles, isLoading, fetchRoles, addRole, updateRole, deleteRole }
})