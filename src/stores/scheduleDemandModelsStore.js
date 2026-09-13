import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuthorizationStore } from './authorizationStore.js'
import { useAccountSessionStore } from './accountSessionStore.js'
import { isRestaurantContextCurrent } from '../utils/restaurantDataContext.js'
import {
  shouldIgnoreScheduleListenerCallback,
  shouldIgnoreScheduleListenerError
} from '../utils/scheduleAvailabilityAccess.js'

export const useScheduleDemandModelsStore = defineStore(
  'scheduleDemandModels',
  () => {
    const models = ref([])
    const isLoading = ref(false)
    const isSaving = ref(false)
    let unsubscribeModels = null
    let listenerRestaurantId = null
    let listenerReadyPromise = null
    let modelsListenerRevision = 0

    const getRestaurantId = async () => (
      useAuthorizationStore().requireRestaurantId()
    )

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
      const restaurantId = await getRestaurantId()
      if (!restaurantId) return []
      if (unsubscribeModels && listenerRestaurantId === restaurantId) return listenerReadyPromise || models.value

      modelsListenerRevision += 1
      if (unsubscribeModels) unsubscribeModels()
      const listenerRevision = modelsListenerRevision
      const managerAccessAtStart = useAuthorizationStore()
        .hasPermission('can_manage_schedule')
      listenerRestaurantId = restaurantId
      isLoading.value = true
      listenerReadyPromise = new Promise(resolve => {
        let firstSnapshot = true
        unsubscribeModels = onSnapshot(
          collection(db, 'users', restaurantId, 'scheduleDemandModels'),
          snapshot => {
            const authorizationStore = useAuthorizationStore()
            if (
              shouldIgnoreScheduleListenerCallback({
                listenerRevision,
                currentRevision: modelsListenerRevision,
                managerAccessRequired: true,
                managerAccessAtStart,
                hasManagerAccess: authorizationStore
                  .hasPermission('can_manage_schedule')
              }) ||
              !isRestaurantContextCurrent(
                restaurantId,
                authorizationStore.restaurantId
              )
            ) {
              if (firstSnapshot) {
                firstSnapshot = false
                isLoading.value = false
                resolve(models.value)
              }
              return
            }
            models.value = snapshot.docs.map(document => ({
              id: document.id,
              ...document.data()
            }))
            if (firstSnapshot) {
              firstSnapshot = false
              isLoading.value = false
              resolve(models.value)
            }
          },
          async error => {
            const authorizationStore = useAuthorizationStore()
            if (await shouldIgnoreScheduleListenerError({
              listenerRevision,
              getCurrentRevision: () => modelsListenerRevision,
              managerAccessRequired: true,
              managerAccessAtStart,
              getHasManagerAccess: () => authorizationStore
                .hasPermission('can_manage_schedule'),
              confirmManagerAccess: () => useAccountSessionStore()
                .refreshCurrentPermissionAndCheck('can_manage_schedule'),
              error
            })) {
              if (firstSnapshot) {
                firstSnapshot = false
                if (listenerRevision === modelsListenerRevision) {
                  isLoading.value = false
                }
                resolve(models.value)
              }
              return
            }

            console.error('Błąd pobierania szablonów grafiku:', error)
            if (listenerRevision === modelsListenerRevision) {
              unsubscribeModels = null
              listenerRestaurantId = null
            }
            isLoading.value = false
            if (firstSnapshot) {
              firstSnapshot = false
              resolve(models.value)
            }
          }
        )
      })
      return listenerReadyPromise
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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

        if (!unsubscribeModels && !models.value.some(model => model.id === newModel.id)) models.value.push(newModel)

        return newModel
      } catch (error) {
        console.error('Błąd zapisu szablonu grafiku:', error)
        throw error
      } finally {
        isSaving.value = false
      }
    }

    const updateModel = async (modelId, modelData) => {
      useAuthorizationStore().requirePermission('can_manage_schedule')
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

        if (!unsubscribeModels) {
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
        }
      } catch (error) {
        console.error('Błąd aktualizacji szablonu grafiku:', error)
        throw error
      } finally {
        isSaving.value = false
      }
    }

    const deleteModel = async (modelId) => {
      useAuthorizationStore().requirePermission('can_manage_schedule')
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

        if (!unsubscribeModels) {
          models.value = models.value.filter(
            model => model.id !== modelId
          )
        }
      } catch (error) {
        console.error('Błąd usuwania szablonu grafiku:', error)
        throw error
      } finally {
        isSaving.value = false
      }
    }

    const clearSensitiveData = () => {
      modelsListenerRevision += 1
      if (unsubscribeModels) unsubscribeModels()
      unsubscribeModels = null
      listenerRestaurantId = null
      listenerReadyPromise = null
      models.value = []
      isLoading.value = false
      isSaving.value = false
    }

    return {
      models,
      isLoading,
      isSaving,
      fetchModels,
      fetchModelById,
      addModel,
      updateModel,
      deleteModel,
      clearSensitiveData
    }
  }
)
