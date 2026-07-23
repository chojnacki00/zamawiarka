import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

export const useScheduleDemandModelsStore = defineStore(
  'scheduleDemandModels',
  () => {
    const models = ref([])
    const isLoading = ref(false)
    const isSaving = ref(false)

    const getRestaurantId = () => {
      return new Promise((resolve) => {
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

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          resolve(user ? user.uid : null)
        })
      })
    }

    const getModelsCollectionRef = async () => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId) return null

      return collection(
        db,
        'users',
        restaurantId,
        'scheduleDemandModels'
      )
    }

    const fetchModels = async () => {
      const modelsRef = await getModelsCollectionRef()

      if (!modelsRef) return

      isLoading.value = true

      try {
        const snapshot = await getDocs(modelsRef)

        models.value = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data()
        }))
      } catch (error) {
        console.error('Błąd pobierania szablonów grafiku:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    const fetchModelById = async (modelId) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !modelId) return null

      const modelRef = doc(
        db,
        'users',
        restaurantId,
        'scheduleDemandModels',
        modelId
      )

      const snapshot = await getDoc(modelRef)

      if (!snapshot.exists()) return null

      return {
        id: snapshot.id,
        ...snapshot.data()
      }
    }

    const addModel = async (modelData) => {
      const modelsRef = await getModelsCollectionRef()

      if (!modelsRef) return null

      isSaving.value = true

      try {
        const dataToSave = {
          ...modelData,
          active: modelData.active ?? true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }

        const documentRef = await addDoc(modelsRef, dataToSave)

        const newModel = {
          id: documentRef.id,
          ...modelData,
          active: modelData.active ?? true
        }

        models.value.push(newModel)

        return newModel
      } catch (error) {
        console.error('Błąd zapisu szablonu grafiku:', error)
        throw error
      } finally {
        isSaving.value = false
      }
    }

    const updateModel = async (modelId, modelData) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !modelId) return

      isSaving.value = true

      try {
        const modelRef = doc(
          db,
          'users',
          restaurantId,
          'scheduleDemandModels',
          modelId
        )

        const dataToSave = {
          ...modelData,
          updatedAt: serverTimestamp()
        }

        await updateDoc(modelRef, dataToSave)

        const index = models.value.findIndex(
          model => model.id === modelId
        )

        if (index !== -1) {
          models.value[index] = {
            ...models.value[index],
            ...modelData,
            id: modelId
          }
        }
      } catch (error) {
        console.error('Błąd aktualizacji szablonu grafiku:', error)
        throw error
      } finally {
        isSaving.value = false
      }
    }

    const deleteModel = async (modelId) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !modelId) return

      isSaving.value = true

      try {
        await deleteDoc(
          doc(
            db,
            'users',
            restaurantId,
            'scheduleDemandModels',
            modelId
          )
        )

        models.value = models.value.filter(
          model => model.id !== modelId
        )
      } catch (error) {
        console.error('Błąd usuwania szablonu grafiku:', error)
        throw error
      } finally {
        isSaving.value = false
      }
    }

    return {
      models,
      isLoading,
      isSaving,
      fetchModels,
      fetchModelById,
      addModel,
      updateModel,
      deleteModel
    }
  }
)