import { defineStore } from 'pinia'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged
} from 'firebase/auth'
import { db } from '../firebase.js'
import { useAuthStore } from './authStore.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

const SETTINGS_MODES = [
  'hard',
  'suggestion',
  'off'
]

export const DEFAULT_GENERATOR_SETTINGS = {
  minimumRest: {
    mode: 'suggestion',
    hours: 11
  },
  maximumConsecutiveDays: {
    mode: 'suggestion',
    days: 5
  },
  weekendRotation: {
    mode: 'suggestion',
    consecutiveWeeks: 1
  }
}

const cloneSettings = settings => {
  return JSON.parse(JSON.stringify(settings))
}

const normalizeMode = mode => {
  return SETTINGS_MODES.includes(mode)
    ? mode
    : 'suggestion'
}

const normalizeInteger = (
  value,
  fallback,
  minimum,
  maximum
) => {
  const normalizedValue = Math.trunc(Number(value))

  if (!Number.isFinite(normalizedValue)) {
    return fallback
  }

  return Math.min(
    maximum,
    Math.max(minimum, normalizedValue)
  )
}

const normalizeSettings = settings => {
  const source = settings || {}

  return {
    minimumRest: {
      mode: normalizeMode(source.minimumRest?.mode),
      hours: normalizeInteger(
        source.minimumRest?.hours,
        DEFAULT_GENERATOR_SETTINGS.minimumRest.hours,
        1,
        48
      )
    },
    maximumConsecutiveDays: {
      mode: normalizeMode(
        source.maximumConsecutiveDays?.mode
      ),
      days: normalizeInteger(
        source.maximumConsecutiveDays?.days,
        DEFAULT_GENERATOR_SETTINGS.maximumConsecutiveDays.days,
        1,
        31
      )
    },
    weekendRotation: {
      mode: normalizeMode(
        source.weekendRotation?.mode
      ),
      consecutiveWeeks: normalizeInteger(
        source.weekendRotation?.consecutiveWeeks,
        DEFAULT_GENERATOR_SETTINGS.weekendRotation.consecutiveWeeks,
        1,
        12
      )
    }
  }
}

export const useScheduleGeneratorSettingsStore = defineStore(
  'scheduleGeneratorSettings',
  {
    state: () => ({
      settings: cloneSettings(DEFAULT_GENERATOR_SETTINGS),
      isLoading: false,
      isSaving: false,
      isLoaded: false,
      hasStoredSettings: false,
      error: ''
    }),

    actions: {
      async getRestaurantId() {
        const employeeAuthStore = useEmployeeAuthStore()
        const authStore = useAuthStore()

        if (employeeAuthStore.restaurantId) {
          return employeeAuthStore.restaurantId
        }

        if (authStore.currentCompany?.uid) {
          return authStore.currentCompany.uid
        }

        const auth = getAuth()

        if (auth.currentUser) {
          return auth.currentUser.uid
        }

        return new Promise(resolve => {
          let unsubscribe = () => {}

          unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe()
            resolve(user?.uid || null)
          })
        })
      },

      async fetchSettings(force = false) {
        if (this.isLoading || (this.isLoaded && !force)) {
          return cloneSettings(this.settings)
        }

        this.isLoading = true
        this.error = ''

        try {
          const restaurantId = await this.getRestaurantId()

          if (!restaurantId) {
            throw new Error(
              'Nie udało się rozpoznać restauracji.'
            )
          }

          const settingsSnapshot = await getDoc(
            doc(
              db,
              'users',
              restaurantId,
              'grafik_ustawienia',
              'generator'
            )
          )

          const storedData = settingsSnapshot.exists()
            ? settingsSnapshot.data()
            : null

          this.hasStoredSettings = Boolean(
            storedData?.settingsVersion === 2 &&
            storedData?.weekendRotation
          )
          this.settings = storedData
            ? normalizeSettings(storedData)
            : cloneSettings(DEFAULT_GENERATOR_SETTINGS)

          this.isLoaded = true

          return cloneSettings(this.settings)
        } catch (error) {
          console.error(
            'Błąd pobierania ustawień generatora:',
            error
          )

          this.error =
            error?.message ||
            'Nie udało się pobrać ustawień generatora.'

          throw error
        } finally {
          this.isLoading = false
        }
      },

      async saveSettings(nextSettings) {
        if (this.isSaving) {
          return cloneSettings(this.settings)
        }

        this.isSaving = true
        this.error = ''

        try {
          const restaurantId = await this.getRestaurantId()

          if (!restaurantId) {
            throw new Error(
              'Nie udało się rozpoznać restauracji.'
            )
          }

          const employeeAuthStore = useEmployeeAuthStore()
          const auth = getAuth()
          const normalizedSettings = normalizeSettings(nextSettings)

          await setDoc(
            doc(
              db,
              'users',
              restaurantId,
              'grafik_ustawienia',
              'generator'
            ),
            {
              ...normalizedSettings,
              settingsVersion: 2,
              updatedAt: serverTimestamp(),
              updatedBy:
                employeeAuthStore.currentEmployee?.id ||
                auth.currentUser?.uid ||
                null
            }
          )

          this.settings = cloneSettings(normalizedSettings)
          this.isLoaded = true
          this.hasStoredSettings = true

          return cloneSettings(this.settings)
        } catch (error) {
          console.error(
            'Błąd zapisywania ustawień generatora:',
            error
          )

          this.error =
            error?.message ||
            'Nie udało się zapisać ustawień generatora.'

          throw error
        } finally {
          this.isSaving = false
        }
      }
    }
  }
)
