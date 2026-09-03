import { defineStore } from 'pinia'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import { useAuthorizationStore } from './authorizationStore.js'

const SETTINGS_MODES = ['hard', 'suggestion', 'off']

export const DEFAULT_GENERATOR_SETTINGS = {
  useEmploymentProfiles: true,
  profileRules: {
    targetHours: { mode: 'suggestion' },
    maximumDailyHours: { mode: 'hard' },
    maximumWeeklyHours: { mode: 'hard' },
    minimumRest: { mode: 'hard' },
    minimumWeeklyRest: { mode: 'suggestion' },
    maximumConsecutiveDays: { mode: 'suggestion' },
    weekendRotation: { mode: 'suggestion' },
    breaks: { mode: 'off' }
  },
  competenceStars: {
    enabled: true,
    minimumAutomaticStars: 2
  }
}

const cloneSettings = settings => JSON.parse(JSON.stringify(settings))

const normalizeMode = mode => SETTINGS_MODES.includes(mode) ? mode : 'suggestion'

const normalizeInteger = (value, fallback, minimum, maximum) => {
  const normalizedValue = Math.trunc(Number(value))
  if (!Number.isFinite(normalizedValue)) return fallback
  return Math.min(maximum, Math.max(minimum, normalizedValue))
}

const getLegacyMode = (source, key, fallback) => {
  if (source.profileRules?.[key]?.mode) return source.profileRules[key].mode
  if (source[key]?.mode) return source[key].mode
  return fallback
}

export const normalizeGeneratorSettings = settings => {
  const source = settings || {}
  const defaults = DEFAULT_GENERATOR_SETTINGS.profileRules

  return {
    useEmploymentProfiles: typeof source.useEmploymentProfiles === 'boolean'
      ? source.useEmploymentProfiles
      : true,
    profileRules: {
      targetHours: {
        mode: normalizeMode(getLegacyMode(source, 'targetHours', defaults.targetHours.mode))
      },
      maximumDailyHours: {
        mode: normalizeMode(getLegacyMode(source, 'maximumDailyHours', defaults.maximumDailyHours.mode))
      },
      maximumWeeklyHours: {
        mode: normalizeMode(getLegacyMode(source, 'maximumWeeklyHours', defaults.maximumWeeklyHours.mode))
      },
      minimumRest: {
        mode: normalizeMode(getLegacyMode(source, 'minimumRest', defaults.minimumRest.mode))
      },
      minimumWeeklyRest: {
        mode: normalizeMode(getLegacyMode(source, 'minimumWeeklyRest', defaults.minimumWeeklyRest.mode))
      },
      maximumConsecutiveDays: {
        mode: normalizeMode(getLegacyMode(
          source,
          'maximumConsecutiveDays',
          defaults.maximumConsecutiveDays.mode
        ))
      },
      weekendRotation: {
        mode: normalizeMode(getLegacyMode(source, 'weekendRotation', defaults.weekendRotation.mode))
      },
      breaks: {
        mode: normalizeMode(getLegacyMode(source, 'breaks', defaults.breaks.mode))
      }
    },
    competenceStars: {
      enabled: typeof source.competenceStars?.enabled === 'boolean'
        ? source.competenceStars.enabled
        : true,
      minimumAutomaticStars: normalizeInteger(
        source.competenceStars?.minimumAutomaticStars,
        DEFAULT_GENERATOR_SETTINGS.competenceStars.minimumAutomaticStars,
        1,
        5
      )
    }
  }
}

export const useScheduleGeneratorSettingsStore = defineStore('scheduleGeneratorSettings', {
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
      return employeeAuthStore.requireRestaurantId()
    },

    async fetchSettings(force = false) {
      if (this.isLoading || (this.isLoaded && !force)) {
        return cloneSettings(this.settings)
      }

      this.isLoading = true
      this.error = ''

      try {
        const restaurantId = await this.getRestaurantId()
        if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')

        const settingsSnapshot = await getDoc(
          doc(db, 'users', restaurantId, 'grafik_ustawienia', 'generator')
        )
        const storedData = settingsSnapshot.exists() ? settingsSnapshot.data() : null

        this.hasStoredSettings = Boolean(storedData)
        this.settings = storedData
          ? normalizeGeneratorSettings(storedData)
          : cloneSettings(DEFAULT_GENERATOR_SETTINGS)
        this.isLoaded = true

        return cloneSettings(this.settings)
      } catch (error) {
        console.error('Błąd pobierania ustawień generatora:', error)
        this.error = error?.message || 'Nie udało się pobrać ustawień generatora.'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async saveSettings(nextSettings) {
      useAuthorizationStore().requirePermission('can_manage_schedule')
      if (this.isSaving) return cloneSettings(this.settings)

      this.isSaving = true
      this.error = ''

      try {
        const restaurantId = await this.getRestaurantId()
        if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')

        const employeeAuthStore = useEmployeeAuthStore()
        const auth = getAuth()
        const normalizedSettings = normalizeGeneratorSettings(nextSettings)

        await setDoc(
          doc(db, 'users', restaurantId, 'grafik_ustawienia', 'generator'),
          {
            ...normalizedSettings,
            settingsVersion: 3,
            updatedAt: serverTimestamp(),
            updatedBy: employeeAuthStore.currentEmployee?.id || auth.currentUser?.uid || null
          }
        )

        this.settings = cloneSettings(normalizedSettings)
        this.isLoaded = true
        this.hasStoredSettings = true
        return cloneSettings(this.settings)
      } catch (error) {
        console.error('Błąd zapisywania ustawień generatora:', error)
        this.error = error?.message || 'Nie udało się zapisać ustawień generatora.'
        throw error
      } finally {
        this.isSaving = false
      }
    }
  }
})
