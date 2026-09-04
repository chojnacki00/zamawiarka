import { defineStore } from 'pinia'
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '../firebase.js'
import { useAuthorizationStore } from './authorizationStore.js'
import { isRestaurantContextCurrent } from '../utils/restaurantDataContext.js'
import {
  getWeeklyMaximumValidationMessage
} from '../utils/employmentRules.js'

const TARGET_UNITS = ['week', 'month', 'settlementPeriod']
const SETTLEMENT_PERIOD_UNITS = ['day', 'week', 'month']

const createId = prefix => {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const padNumber = value => String(value).padStart(2, '0')

const createVersionId = () => {
  const now = new Date()
  const date = [now.getFullYear(), padNumber(now.getMonth() + 1), padNumber(now.getDate())].join('')
  const time = [padNumber(now.getHours()), padNumber(now.getMinutes()), padNumber(now.getSeconds())].join('')
  return `${date}_${time}`
}

const normalizeNumber = (value, fallback, minimum, maximum, integer = false) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  const normalized = Math.min(maximum, Math.max(minimum, number))
  return integer ? Math.round(normalized) : normalized
}

const normalizeApplies = (value, fallback = true) => {
  return typeof value === 'boolean' ? value : fallback
}

const normalizeSimpleRule = (rule, valueKey, fallback, minimum, maximum, integer = false) => ({
  applies: normalizeApplies(rule?.applies),
  [valueKey]: normalizeNumber(rule?.[valueKey], fallback, minimum, maximum, integer)
})

export const createDefaultEmploymentProfile = () => ({
  id: null,
  name: '',
  description: '',
  profileVersionNumber: 0,
  profileVersionId: null,
  targetHours: { applies: true, amount: 40, unit: 'week' },
  settlementPeriod: { applies: true, amount: 1, unit: 'month' },
  targetTolerance: { applies: true, minusHours: 4, plusHours: 4 },
  maximumDailyHours: { applies: true, hours: 12 },
  maximumWeeklyHours: { applies: true, hours: 48 },
  minimumRest: { applies: true, hours: 11 },
  minimumWeeklyRest: { applies: true, hours: 35 },
  maximumConsecutiveDays: { applies: true, days: 6 },
  weekendRotation: {
    applies: true,
    maxConsecutiveSaturdays: 1,
    maxConsecutiveSundays: 1
  },
  breaks: [{
    id: createId('break'),
    applies: true,
    afterHours: 6,
    minutes: 15,
    includedInWorkTime: true
  }]
})

const legacyRuleApplies = rule => rule?.mode ? rule.mode !== 'off' : true

const normalizeProfile = profile => {
  const source = profile || {}
  const legacyRules = source.rules || {}
  const sourceBreaks = Array.isArray(source.breaks) ? source.breaks : []
  const targetHours = source.targetHours || {
    applies: legacyRuleApplies(legacyRules.weeklyHours),
    amount: legacyRules.weeklyHours?.hours ?? 40,
    unit: 'week'
  }
  const minimumRest = source.minimumRest || {
    applies: legacyRuleApplies(legacyRules.dailyRest),
    hours: legacyRules.dailyRest?.hours ?? 11
  }
  const minimumWeeklyRest = source.minimumWeeklyRest || {
    applies: legacyRuleApplies(legacyRules.weeklyRest),
    hours: legacyRules.weeklyRest?.hours ?? 35
  }
  const maximumConsecutiveDays = source.maximumConsecutiveDays || {
    applies: legacyRuleApplies(legacyRules.maximumConsecutiveDays),
    days: legacyRules.maximumConsecutiveDays?.days ?? 6
  }
  const nestedSettlementPeriod = source.settlementPeriod || {}
  const settlementPeriodSource = {
    applies: source.settlementPeriodApplies ?? nestedSettlementPeriod.applies,
    amount: source.settlementPeriodAmount
      ?? nestedSettlementPeriod.amount
      ?? nestedSettlementPeriod.months
      ?? source.settlementPeriodMonths,
    unit: source.settlementPeriodUnit ?? nestedSettlementPeriod.unit
  }
  const settlementPeriodUnit = SETTLEMENT_PERIOD_UNITS.includes(settlementPeriodSource.unit)
    ? settlementPeriodSource.unit
    : 'month'
  const settlementPeriodMaximum = settlementPeriodUnit === 'day'
    ? 365
    : settlementPeriodUnit === 'week' ? 52 : 12

  return {
    id: source.id || null,
    name: String(source.name || '').trim(),
    description: String(source.description || source.note || '').trim(),
    profileVersionNumber: normalizeNumber(
      source.profileVersionNumber,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
      true
    ),
    profileVersionId: source.profileVersionId || null,
    targetHours: {
      applies: normalizeApplies(targetHours.applies),
      amount: normalizeNumber(targetHours.amount, 40, 0, 744),
      unit: TARGET_UNITS.includes(targetHours.unit) ? targetHours.unit : 'week'
    },
    settlementPeriod: {
      applies: normalizeApplies(settlementPeriodSource.applies),
      amount: normalizeNumber(
        settlementPeriodSource.amount,
        1,
        1,
        settlementPeriodMaximum,
        true
      ),
      unit: settlementPeriodUnit
    },
    targetTolerance: {
      applies: normalizeApplies(source.targetTolerance?.applies) && normalizeApplies(targetHours.applies),
      minusHours: normalizeNumber(source.targetTolerance?.minusHours, 4, 0, 168),
      plusHours: normalizeNumber(source.targetTolerance?.plusHours, 4, 0, 168)
    },
    maximumDailyHours: normalizeSimpleRule(
      source.maximumDailyHours || {
        applies: legacyRuleApplies(legacyRules.dailyHours),
        hours: legacyRules.dailyHours?.hours ?? 12
      },
      'hours', 12, 1, 24
    ),
    maximumWeeklyHours: normalizeSimpleRule(
      source.maximumWeeklyHours, 'hours', 48, 1, 168
    ),
    minimumRest: normalizeSimpleRule(minimumRest, 'hours', 11, 0, 72),
    minimumWeeklyRest: normalizeSimpleRule(minimumWeeklyRest, 'hours', 35, 0, 168),
    maximumConsecutiveDays: normalizeSimpleRule(
      maximumConsecutiveDays, 'days', 6, 1, 31, true
    ),
    weekendRotation: {
      applies: normalizeApplies(source.weekendRotation?.applies),
      maxConsecutiveSaturdays: normalizeNumber(
        source.weekendRotation?.maxConsecutiveSaturdays, 1, 1, 12, true
      ),
      maxConsecutiveSundays: normalizeNumber(
        source.weekendRotation?.maxConsecutiveSundays, 1, 1, 12, true
      )
    },
    breaks: sourceBreaks.map(item => ({
      id: item?.id || createId('break'),
      applies: normalizeApplies(item?.applies, item?.mode ? item.mode !== 'off' : true),
      afterHours: normalizeNumber(item?.afterHours, 6, 0, 24),
      minutes: normalizeNumber(item?.minutes, 15, 0, 180, true),
      includedInWorkTime: typeof item?.includedInWorkTime === 'boolean'
        ? item.includedInWorkTime
        : true
    }))
  }
}

const validateProfileConsistency = profile => {
  if (
    profile.targetHours.applies
    && profile.targetHours.unit === 'settlementPeriod'
    && !profile.settlementPeriod.applies
  ) {
    throw new Error(
      'Włącz okres rozliczeniowy, ponieważ docelowa liczba godzin została podana dla całego okresu.'
    )
  }

  const weeklyMaximumError = getWeeklyMaximumValidationMessage(
    profile
  )
  if (weeklyMaximumError) throw new Error(weeklyMaximumError)
}

const cloneProfile = profile => JSON.parse(JSON.stringify(profile))

let unsubscribeEmploymentProfiles = null
let employmentProfilesRestaurantId = null
let employmentProfilesReadyPromise = null

export const useScheduleEmploymentProfilesStore = defineStore('scheduleEmploymentProfiles', {
  state: () => ({
    profiles: [],
    isLoading: false,
    isSaving: false,
    isDeleting: false,
    error: ''
  }),

  actions: {
    async getRestaurantId() {
      return useAuthorizationStore().requireRestaurantId()
    },

    async fetchProfiles() {
      const restaurantId = await this.getRestaurantId()
      if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')
      if (unsubscribeEmploymentProfiles && employmentProfilesRestaurantId === restaurantId) {
        return employmentProfilesReadyPromise || this.profiles
      }

      if (unsubscribeEmploymentProfiles) unsubscribeEmploymentProfiles()
      employmentProfilesRestaurantId = restaurantId
      this.isLoading = true
      this.error = ''
      const store = this

      employmentProfilesReadyPromise = new Promise(resolve => {
        let firstSnapshot = true
        unsubscribeEmploymentProfiles = onSnapshot(
          collection(db, 'users', restaurantId, 'grafik_profile_zatrudnienia'),
          snapshot => {
            if (!isRestaurantContextCurrent(restaurantId, useAuthorizationStore().restaurantId)) {
              if (firstSnapshot) {
                firstSnapshot = false
                store.isLoading = false
                resolve(store.profiles)
              }
              return
            }
            store.profiles = snapshot.docs
              .map(profileSnapshot => normalizeProfile({
                id: profileSnapshot.id,
                ...profileSnapshot.data()
              }))
              .sort((first, second) => first.name.localeCompare(second.name, 'pl'))
            if (firstSnapshot) {
              firstSnapshot = false
              store.isLoading = false
              resolve(store.profiles)
            }
          },
          error => {
            console.error('Błąd pobierania profili zatrudnienia:', error)
            unsubscribeEmploymentProfiles = null
            employmentProfilesRestaurantId = null
            store.error = error?.message || 'Nie udało się pobrać profili zatrudnienia.'
            store.isLoading = false
            if (firstSnapshot) {
              firstSnapshot = false
              resolve(store.profiles)
            }
          }
        )
      })

      return employmentProfilesReadyPromise
    },

    async saveProfile(profile) {
      if (this.isSaving) return null
      const normalizedProfile = normalizeProfile(profile)
      if (!normalizedProfile.name) throw new Error('Wpisz nazwę profilu zatrudnienia.')
      validateProfileConsistency(normalizedProfile)
      useAuthorizationStore().requirePermission('can_manage_schedule')

      this.isSaving = true
      this.error = ''

      try {
        const restaurantId = await this.getRestaurantId()
        if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')

        const isNew = !normalizedProfile.id
        const profileRef = isNew
          ? doc(collection(db, 'users', restaurantId, 'grafik_profile_zatrudnienia'))
          : doc(db, 'users', restaurantId, 'grafik_profile_zatrudnienia', normalizedProfile.id)
        const authorizationStore = useAuthorizationStore()
        const auth = getAuth()
        const nextVersionNumber = normalizedProfile.profileVersionNumber + 1
        const nextVersionId = createVersionId()
        const currentSnapshot = isNew ? null : await getDoc(profileRef)
        const currentCreatedAt = currentSnapshot?.data()?.createdAt || serverTimestamp()
        const storedProfile = {
          ...normalizedProfile,
          id: profileRef.id,
          profileVersionNumber: nextVersionNumber,
          profileVersionId: nextVersionId,
          schemaVersion: 4,
          settlementPeriodApplies: normalizedProfile.settlementPeriod.applies,
          settlementPeriodAmount: normalizedProfile.settlementPeriod.amount,
          settlementPeriodUnit: normalizedProfile.settlementPeriod.unit,
          updatedAt: serverTimestamp(),
          updatedBy: authorizationStore.employeeId || auth.currentUser?.uid || null,
          createdAt: currentCreatedAt
        }

        await setDoc(profileRef, storedProfile, { merge: false })

        const savedSnapshot = await getDoc(profileRef)
        if (!savedSnapshot.exists()) throw new Error('Nie udało się potwierdzić zapisu profilu.')

        const localProfile = cloneProfile(normalizeProfile({
          id: profileRef.id,
          ...savedSnapshot.data()
        }))
        if (
          localProfile.settlementPeriod.applies !== normalizedProfile.settlementPeriod.applies
          || localProfile.settlementPeriod.amount !== normalizedProfile.settlementPeriod.amount
          || localProfile.settlementPeriod.unit !== normalizedProfile.settlementPeriod.unit
        ) {
          throw new Error('Nie udało się potwierdzić zapisu okresu rozliczeniowego.')
        }
        const profileIndex = this.profiles.findIndex(item => item.id === profileRef.id)

        if (profileIndex === -1) this.profiles.push(localProfile)
        else this.profiles[profileIndex] = localProfile

        this.profiles.sort((first, second) => first.name.localeCompare(second.name, 'pl'))
        return localProfile
      } catch (error) {
        console.error('Błąd zapisywania profilu zatrudnienia:', error)
        this.error = error?.message || 'Nie udało się zapisać profilu zatrudnienia.'
        throw error
      } finally {
        this.isSaving = false
      }
    },

    async deleteProfile(profileId) {
      useAuthorizationStore().requirePermission('can_manage_schedule')
      if (!profileId || this.isDeleting) return false
      this.isDeleting = true
      this.error = ''

      try {
        const restaurantId = await this.getRestaurantId()
        if (!restaurantId) throw new Error('Nie udało się rozpoznać restauracji.')

        await deleteDoc(doc(db, 'users', restaurantId, 'grafik_profile_zatrudnienia', profileId))
        this.profiles = this.profiles.filter(profileItem => profileItem.id !== profileId)
        return true
      } catch (error) {
        console.error('Błąd usuwania profilu zatrudnienia:', error)
        this.error = error?.message || 'Nie udało się usunąć profilu zatrudnienia.'
        throw error
      } finally {
        this.isDeleting = false
      }
    }
  }
})
