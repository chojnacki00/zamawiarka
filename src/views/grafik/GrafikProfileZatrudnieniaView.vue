<template>
  <main class="screen-with-topbar employment-profiles-screen">
    <div class="zamawiarka-menu-topbar">
      <button class="zamawiarka-menu-back" type="button" @click="goBack">←</button>
      <h2 class="zamawiarka-menu-title">PROFILE ZATRUDNIENIA</h2>
    </div>

    <div class="scroll-area employment-profiles-scroll">
      <section class="employment-profiles-intro">
        <div class="employment-profiles-step">USTAWIENIA APLIKACJI</div>
        <h1>Profile zatrudnienia</h1>
        <p>
          Utwórz zestawy warunków, które później przypiszesz pracownikom.
          Wartości określa manager.
        </p>
      </section>

      <section class="employment-profiles-warning">
        <div>!</div>
        <p>
          Profil opisuje zasady przyjęte w restauracji. Samo zapisanie profilu
          nie jest potwierdzeniem jego zgodności z przepisami.
        </p>
      </section>

      <div v-if="profilesStore.isLoading" class="employment-profiles-state">
        Pobieranie profili…
      </div>

      <div
        v-else-if="profilesStore.error && !profilesStore.profiles.length"
        class="employment-profiles-state error"
      >
        {{ profilesStore.error }}
      </div>

      <section v-else-if="profilesStore.profiles.length" class="employment-profiles-list">
        <button
          v-for="profile in profilesStore.profiles"
          :key="profile.id"
          class="employment-profile-row"
          type="button"
          @click="openEditProfile(profile)"
        >
          <span class="employment-profile-main">
            <strong>{{ profile.name }}</strong>
            <small>{{ profile.description || 'Bez dodatkowego opisu' }}</small>
          </span>

          <span class="employment-profile-summary">
            <b>{{ formatTarget(profile) }}</b>
            <b>{{ formatOptional(profile.maximumDailyHours, 'hours', 'godz./dzień') }}</b>
            <b>{{ formatOptional(profile.minimumRest, 'hours', 'godz. przerwy') }}</b>
          </span>

          <span class="employment-profile-arrow">›</span>
        </button>
      </section>

      <section v-else class="employment-profiles-empty">
        <div>◷</div>
        <strong>Nie ma jeszcze profili zatrudnienia</strong>
        <span>Dodaj pierwszy profil, np. „Standardowa umowa o pracę”.</span>
      </section>
    </div>

    <button
      class="employment-profiles-fab"
      type="button"
      aria-label="Dodaj profil zatrudnienia"
      @click="openNewProfile"
    >
      +
    </button>

    <div
      v-if="showEditor"
      class="app-dialog-overlay employment-editor-overlay"
      @click.self="closeEditor"
    >
      <div class="app-dialog-card employment-editor-card">
        <div class="employment-editor-kicker">
          {{ form.id ? 'EDYCJA PROFILU' : 'NOWY PROFIL' }}
        </div>
        <div class="app-dialog-title employment-editor-title">
          {{ form.id ? form.name || 'Profil zatrudnienia' : 'Dodaj profil zatrudnienia' }}
        </div>

        <button class="employment-section-toggle" type="button" @click="toggleSection('basic')">
          <span>Informacje podstawowe</span>
          <b>{{ openSections.basic ? '−' : '+' }}</b>
        </button>

        <section v-if="openSections.basic" class="employment-form-section">
          <label class="employment-field full">
            <span>Nazwa profilu *</span>
            <input v-model="form.name" type="text" maxlength="80" placeholder="Np. Standardowa umowa o pracę">
          </label>

          <label class="employment-field full">
            <span>Opis</span>
            <textarea
              v-model="form.description"
              rows="3"
              maxlength="500"
              placeholder="Opcjonalna informacja dla managera"
            ></textarea>
          </label>
        </section>

        <button class="employment-section-toggle" type="button" @click="toggleSection('hours')">
          <span>Godziny i okres rozliczeniowy</span>
          <b>{{ openSections.hours ? '−' : '+' }}</b>
        </button>

        <section v-if="openSections.hours" class="employment-form-section parameters">
          <article class="employment-parameter-card" :class="{ inactive: !form.targetHours.applies }">
            <div class="employment-parameter-heading">
              <div>
                <strong>Docelowa liczba godzin</strong>
                <small>Dla pracownika zatrudnionego w wymiarze 100%.</small>
              </div>
              <button type="button" @click="toggleTargetHours">
                {{ form.targetHours.applies ? 'Aktywne' : 'Nie dotyczy' }}
              </button>
            </div>
            <div v-if="form.targetHours.applies" class="employment-value-grid target">
              <label>
                <span>Liczba godzin</span>
                <input v-model.number="form.targetHours.amount" type="number" min="0" max="744" inputmode="decimal">
              </label>
              <label>
                <span>Cel godzinowy dotyczy</span>
                <select v-model="form.targetHours.unit" @change="handleTargetUnitChange">
                  <option value="week">Jednego tygodnia</option>
                  <option value="settlementPeriod">Całego okresu rozliczeniowego</option>
                </select>
              </label>
            </div>
          </article>

          <article class="employment-parameter-card" :class="{ inactive: !form.settlementPeriod.applies }">
            <div class="employment-parameter-heading">
              <div>
                <strong>Okres rozliczeniowy</strong>
                <small>Okres, w którym mają zostać wyrównane godziny.</small>
              </div>
              <button
                type="button"
                :disabled="targetRequiresSettlementPeriod"
                @click="form.settlementPeriod.applies = !form.settlementPeriod.applies"
              >
                {{ targetRequiresSettlementPeriod ? 'Wymagane' : form.settlementPeriod.applies ? 'Aktywne' : 'Nie dotyczy' }}
              </button>
            </div>
            <div v-if="form.settlementPeriod.applies" class="employment-value-grid target">
              <label>
                <span>Długość okresu</span>
                <input
                  v-model.number="form.settlementPeriod.amount"
                  type="number"
                  min="1"
                  :max="settlementPeriodMaximum"
                  inputmode="numeric"
                >
              </label>
              <label>
                <span>Jednostka okresu</span>
                <select v-model="form.settlementPeriod.unit" @change="normalizeSettlementPeriodAmount">
                  <option value="day">Dni</option>
                  <option value="week">Tygodnie</option>
                  <option value="month">Miesiące</option>
                </select>
              </label>
            </div>
          </article>

          <article class="employment-parameter-card" :class="{ inactive: !form.targetHours.applies || !form.targetTolerance.applies }">
            <div class="employment-parameter-heading">
              <div>
                <strong>Dopuszczalne odchylenie od celu</strong>
                <small>Zakres poniżej i powyżej docelowej liczby godzin.</small>
              </div>
              <button
                type="button"
                :disabled="!form.targetHours.applies"
                @click="form.targetTolerance.applies = !form.targetTolerance.applies"
              >
                {{ form.targetHours.applies && form.targetTolerance.applies ? 'Aktywne' : 'Nie dotyczy' }}
              </button>
            </div>
            <div v-if="form.targetHours.applies && form.targetTolerance.applies" class="employment-value-grid">
              <label>
                <span>Mniej o maks.</span>
                <div class="employment-input-suffix">
                  <input v-model.number="form.targetTolerance.minusHours" type="number" min="0" max="168" inputmode="decimal">
                  <b>godz.</b>
                </div>
              </label>
              <label>
                <span>Więcej o maks.</span>
                <div class="employment-input-suffix">
                  <input v-model.number="form.targetTolerance.plusHours" type="number" min="0" max="168" inputmode="decimal">
                  <b>godz.</b>
                </div>
              </label>
            </div>
          </article>

          <article
            v-for="rule in hourRules"
            :key="rule.key"
            class="employment-parameter-card"
            :class="{ inactive: !form[rule.key].applies }"
          >
            <div class="employment-parameter-heading">
              <div>
                <strong>{{ rule.title }}</strong>
                <small>{{ rule.description }}</small>
              </div>
              <button type="button" @click="form[rule.key].applies = !form[rule.key].applies">
                {{ form[rule.key].applies ? 'Aktywne' : 'Nie dotyczy' }}
              </button>
            </div>
            <label v-if="form[rule.key].applies" class="employment-single-value">
              <input
                v-model.number="form[rule.key][rule.valueKey]"
                type="number"
                :min="getHourRuleMinimum(rule)"
                :max="rule.maximum"
                inputmode="decimal"
                @blur="normalizeHourRuleValue(rule)"
              >
              <span>{{ rule.unit }}</span>
            </label>
            <p
              v-if="rule.key === 'maximumWeeklyHours' && weeklyHoursConflict"
              class="employment-value-error"
            >
              Przy obecnym celu minimum wynosi {{ minimumWeeklyHours }} godz. tygodniowo.
            </p>
          </article>
        </section>

        <button class="employment-section-toggle" type="button" @click="toggleSection('rest')">
          <span>Odpoczynek i dni pracy</span>
          <b>{{ openSections.rest ? '−' : '+' }}</b>
        </button>

        <section v-if="openSections.rest" class="employment-form-section parameters">
          <article
            v-for="rule in restRules"
            :key="rule.key"
            class="employment-parameter-card"
            :class="{ inactive: !form[rule.key].applies }"
          >
            <div class="employment-parameter-heading">
              <div>
                <strong>{{ rule.title }}</strong>
                <small>{{ rule.description }}</small>
              </div>
              <button type="button" @click="form[rule.key].applies = !form[rule.key].applies">
                {{ form[rule.key].applies ? 'Aktywne' : 'Nie dotyczy' }}
              </button>
            </div>
            <label v-if="form[rule.key].applies" class="employment-single-value">
              <input
                v-model.number="form[rule.key][rule.valueKey]"
                type="number"
                :min="rule.minimum"
                :max="rule.maximum"
                inputmode="decimal"
              >
              <span>{{ rule.unit }}</span>
            </label>
          </article>

          <article class="employment-parameter-card" :class="{ inactive: !form.weekendRotation.applies }">
            <div class="employment-parameter-heading">
              <div>
                <strong>Rotacja sobót i niedziel</strong>
                <small>Soboty i niedziele są liczone niezależnie.</small>
              </div>
              <button type="button" @click="form.weekendRotation.applies = !form.weekendRotation.applies">
                {{ form.weekendRotation.applies ? 'Aktywne' : 'Nie dotyczy' }}
              </button>
            </div>
            <div v-if="form.weekendRotation.applies" class="employment-value-grid">
              <label>
                <span>Pracujące soboty z rzędu</span>
                <input v-model.number="form.weekendRotation.maxConsecutiveSaturdays" type="number" min="1" max="12" inputmode="numeric">
              </label>
              <label>
                <span>Pracujące niedziele z rzędu</span>
                <input v-model.number="form.weekendRotation.maxConsecutiveSundays" type="number" min="1" max="12" inputmode="numeric">
              </label>
            </div>
          </article>
        </section>

        <button class="employment-section-toggle" type="button" @click="toggleSection('breaks')">
          <span>Przerwy w trakcie pracy</span>
          <b>{{ openSections.breaks ? '−' : '+' }}</b>
        </button>

        <section v-if="openSections.breaks" class="employment-form-section parameters">
          <p class="employment-breaks-copy">
            Przerwy nie wpływają jeszcze na generator. Dane są przygotowane
            również dla przyszłego rejestratora czasu pracy.
          </p>

          <article
            v-for="(breakRule, index) in form.breaks"
            :key="breakRule.id"
            class="employment-parameter-card"
            :class="{ inactive: !breakRule.applies }"
          >
            <div class="employment-parameter-heading">
              <div>
                <strong>Przerwa {{ index + 1 }}</strong>
                <small>Próg czasu pracy i długość przerwy.</small>
              </div>
              <div class="employment-break-actions">
                <button type="button" @click="breakRule.applies = !breakRule.applies">
                  {{ breakRule.applies ? 'Aktywna' : 'Nie dotyczy' }}
                </button>
                <button class="delete" type="button" @click="removeBreak(index)">Usuń</button>
              </div>
            </div>

            <template v-if="breakRule.applies">
              <div class="employment-value-grid">
                <label>
                  <span>Po przepracowaniu</span>
                  <div class="employment-input-suffix">
                    <input v-model.number="breakRule.afterHours" type="number" min="0" max="24" inputmode="decimal">
                    <b>godz.</b>
                  </div>
                </label>
                <label>
                  <span>Długość przerwy</span>
                  <div class="employment-input-suffix">
                    <input v-model.number="breakRule.minutes" type="number" min="0" max="180" inputmode="numeric">
                    <b>min</b>
                  </div>
                </label>
              </div>

              <label class="employment-checkbox-row">
                <input v-model="breakRule.includedInWorkTime" type="checkbox">
                <span>Przerwa wliczana do czasu pracy</span>
              </label>
            </template>
          </article>

          <button class="employment-add-break" type="button" @click="addBreak">
            + Dodaj kolejny próg przerwy
          </button>
        </section>

        <div v-if="editorError" class="employment-editor-error">{{ editorError }}</div>

        <div class="employment-editor-actions">
          <button
            v-if="form.id"
            class="employment-delete-profile"
            type="button"
            :disabled="profilesStore.isSaving"
            @click="showDeleteConfirm = true"
          >
            Usuń profil
          </button>

          <div>
            <button class="employment-cancel" type="button" :disabled="profilesStore.isSaving" @click="closeEditor">
              Anuluj
            </button>
            <button
              class="employment-save"
              type="button"
              :disabled="profilesStore.isSaving || weeklyHoursConflict"
              @click="saveProfile"
            >
              {{ profilesStore.isSaving ? 'Zapisywanie…' : 'Zapisz profil' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="app-dialog-overlay employment-delete-overlay">
      <div class="app-dialog-card employment-delete-dialog">
        <div class="app-dialog-icon employment-delete-icon">−</div>
        <div class="app-dialog-title">Usunąć profil?</div>
        <div class="app-dialog-message">Profil „{{ form.name }}” zostanie trwale usunięty.</div>
        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="profilesStore.isDeleting"
            @click="showDeleteConfirm = false"
          >
            Anuluj
          </button>
          <button
            class="app-dialog-button app-dialog-delete"
            type="button"
            :disabled="profilesStore.isDeleting"
            @click="deleteProfile"
          >
            {{ profilesStore.isDeleting ? 'Usuwanie…' : 'Usuń' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="feedback.visible" class="app-dialog-overlay employment-feedback-overlay">
      <div class="app-dialog-card employment-feedback-card" :class="feedback.type">
        <div class="app-dialog-icon">{{ feedback.type === 'success' ? '✓' : '!' }}</div>
        <div class="app-dialog-title">{{ feedback.title }}</div>
        <div class="app-dialog-message">{{ feedback.message }}</div>
        <div class="app-dialog-actions">
          <button class="app-dialog-button app-dialog-ok" type="button" @click="feedback.visible = false">OK</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createDefaultEmploymentProfile,
  useScheduleEmploymentProfilesStore
} from '../../stores/scheduleEmploymentProfilesStore.js'

const router = useRouter()
const profilesStore = useScheduleEmploymentProfilesStore()
const showEditor = ref(false)
const showDeleteConfirm = ref(false)
const editorError = ref('')
const form = reactive(createDefaultEmploymentProfile())
const openSections = reactive({ basic: false, hours: false, rest: false, breaks: false })
const feedback = reactive({ visible: false, type: 'success', title: '', message: '' })

const targetRequiresSettlementPeriod = computed(() => (
  form.targetHours.applies && form.targetHours.unit === 'settlementPeriod'
))

const settlementPeriodMaximum = computed(() => {
  if (form.settlementPeriod.unit === 'day') return 365
  if (form.settlementPeriod.unit === 'week') return 52
  return 12
})

const minimumWeeklyHours = computed(() => {
  if (!form.targetHours.applies) return 1

  const targetAmount = Number(form.targetHours.amount)
  if (!Number.isFinite(targetAmount)) return 1
  if (form.targetHours.unit === 'week') return Math.ceil(targetAmount * 10) / 10
  if (!form.settlementPeriod.applies) return 1

  const periodAmount = Number(form.settlementPeriod.amount)
  if (!Number.isFinite(periodAmount) || periodAmount <= 0) return 1

  let settlementWeeks = periodAmount
  if (form.settlementPeriod.unit === 'day') settlementWeeks = periodAmount / 7
  if (form.settlementPeriod.unit === 'month') {
    settlementWeeks = periodAmount * (365.2425 / 12 / 7)
  }

  return Math.ceil((targetAmount / settlementWeeks) * 10) / 10
})

const weeklyHoursConflict = computed(() => (
  form.targetHours.applies
  && form.maximumWeeklyHours.applies
  && Number(form.maximumWeeklyHours.hours) < minimumWeeklyHours.value
))

const hourRules = [
  {
    key: 'maximumDailyHours',
    title: 'Maksymalna liczba godzin dziennie',
    description: 'Najdłuższy dopuszczalny czas pracy jednego dnia.',
    valueKey: 'hours',
    unit: 'godz.',
    minimum: 1,
    maximum: 24
  },
  {
    key: 'maximumWeeklyHours',
    title: 'Maksymalna liczba godzin tygodniowo',
    description: 'Łączny tygodniowy limit godzin pracownika.',
    valueKey: 'hours',
    unit: 'godz.',
    minimum: 1,
    maximum: 168
  }
]

const restRules = [
  {
    key: 'minimumRest',
    title: 'Przerwa między zmianami',
    description: 'Minimalny czas między zakończeniem i rozpoczęciem pracy.',
    valueKey: 'hours',
    unit: 'godz.',
    minimum: 0,
    maximum: 72
  },
  {
    key: 'minimumWeeklyRest',
    title: 'Odpoczynek tygodniowy',
    description: 'Minimalny nieprzerwany odpoczynek w tygodniu.',
    valueKey: 'hours',
    unit: 'godz.',
    minimum: 0,
    maximum: 168
  },
  {
    key: 'maximumConsecutiveDays',
    title: 'Dni pracy z rzędu',
    description: 'Maksymalna liczba kolejnych dni pracy.',
    valueKey: 'days',
    unit: 'dni',
    minimum: 1,
    maximum: 31
  }
]

const clone = value => JSON.parse(JSON.stringify(value))

const replaceForm = source => {
  const defaults = createDefaultEmploymentProfile()
  const incoming = clone(source || {})
  const incomingSettlementPeriod = incoming.settlementPeriod || {}
  const nextForm = {
    ...defaults,
    ...incoming,
    targetHours: { ...defaults.targetHours, ...(incoming.targetHours || {}) },
    settlementPeriod: {
      ...defaults.settlementPeriod,
      ...incomingSettlementPeriod,
      applies: incomingSettlementPeriod.applies
        ?? incoming.settlementPeriodApplies
        ?? defaults.settlementPeriod.applies,
      amount: incomingSettlementPeriod.amount
        ?? incomingSettlementPeriod.months
        ?? incoming.settlementPeriodAmount
        ?? incoming.settlementPeriodMonths
        ?? defaults.settlementPeriod.amount,
      unit: incomingSettlementPeriod.unit
        ?? incoming.settlementPeriodUnit
        ?? defaults.settlementPeriod.unit
    },
    targetTolerance: { ...defaults.targetTolerance, ...(incoming.targetTolerance || {}) },
    maximumDailyHours: { ...defaults.maximumDailyHours, ...(incoming.maximumDailyHours || {}) },
    maximumWeeklyHours: { ...defaults.maximumWeeklyHours, ...(incoming.maximumWeeklyHours || {}) },
    minimumRest: { ...defaults.minimumRest, ...(incoming.minimumRest || {}) },
    minimumWeeklyRest: { ...defaults.minimumWeeklyRest, ...(incoming.minimumWeeklyRest || {}) },
    maximumConsecutiveDays: {
      ...defaults.maximumConsecutiveDays,
      ...(incoming.maximumConsecutiveDays || {})
    },
    weekendRotation: { ...defaults.weekendRotation, ...(incoming.weekendRotation || {}) },
    breaks: Array.isArray(incoming.breaks) ? incoming.breaks : defaults.breaks
  }
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, nextForm)
  normalizeSettlementPeriodAmount()
}

const resetSections = () => {
  Object.keys(openSections).forEach(section => {
    openSections[section] = false
  })
}

const openNewProfile = () => {
  replaceForm(createDefaultEmploymentProfile())
  editorError.value = ''
  resetSections()
  showEditor.value = true
}

const openEditProfile = profile => {
  replaceForm(profile)
  editorError.value = ''
  resetSections()
  showEditor.value = true
}

const closeEditor = () => {
  if (profilesStore.isSaving || profilesStore.isDeleting) return
  showEditor.value = false
  showDeleteConfirm.value = false
  editorError.value = ''
}

const toggleSection = section => {
  const shouldOpen = !openSections[section]
  Object.keys(openSections).forEach(sectionKey => {
    openSections[sectionKey] = false
  })
  if (shouldOpen) openSections[section] = true
}

const toggleTargetHours = () => {
  form.targetHours.applies = !form.targetHours.applies
  if (!form.targetHours.applies) form.targetTolerance.applies = false
  if (targetRequiresSettlementPeriod.value) form.settlementPeriod.applies = true
}

const handleTargetUnitChange = () => {
  if (targetRequiresSettlementPeriod.value) form.settlementPeriod.applies = true
}

const normalizeSettlementPeriodAmount = () => {
  const amount = Number(form.settlementPeriod.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    form.settlementPeriod.amount = 1
    return
  }
  form.settlementPeriod.amount = Math.min(Math.round(amount), settlementPeriodMaximum.value)
}

const getHourRuleMinimum = rule => {
  if (rule.key === 'maximumWeeklyHours' && form.targetHours.applies) {
    return minimumWeeklyHours.value
  }
  return rule.minimum
}

const normalizeHourRuleValue = rule => {
  const currentValue = Number(form[rule.key][rule.valueKey])
  const minimumValue = getHourRuleMinimum(rule)
  if (!Number.isFinite(currentValue) || currentValue < minimumValue) {
    form[rule.key][rule.valueKey] = minimumValue
    return
  }
  form[rule.key][rule.valueKey] = Math.min(currentValue, rule.maximum)
}

const createBreakId = () => {
  if (globalThis.crypto?.randomUUID) return `break_${globalThis.crypto.randomUUID()}`
  return `break_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const addBreak = () => {
  form.breaks.push({
    id: createBreakId(),
    applies: true,
    afterHours: 9,
    minutes: 15,
    includedInWorkTime: true
  })
}

const removeBreak = index => form.breaks.splice(index, 1)

const showFeedback = (type, title, message) => {
  feedback.type = type
  feedback.title = title
  feedback.message = message
  feedback.visible = true
}

const saveProfile = async () => {
  editorError.value = ''
  try {
    normalizeSettlementPeriodAmount()
    await profilesStore.saveProfile(form)
    showEditor.value = false
    showFeedback(
      'success',
      'Profil zapisany',
      'Profil zatrudnienia został zapisany. Wersję profilu nadano automatycznie.'
    )
  } catch (error) {
    editorError.value = error?.message || 'Nie udało się zapisać profilu.'
    if (editorError.value.includes('godzin') || editorError.value.includes('okres rozliczeniowy')) {
      Object.keys(openSections).forEach(section => {
        openSections[section] = section === 'hours'
      })
    }
  }
}

const deleteProfile = async () => {
  try {
    await profilesStore.deleteProfile(form.id)
    showDeleteConfirm.value = false
    showEditor.value = false
    showFeedback('success', 'Profil usunięty', 'Profil zatrudnienia został usunięty.')
  } catch (error) {
    showDeleteConfirm.value = false
    editorError.value = error?.message || 'Nie udało się usunąć profilu.'
  }
}

const formatTarget = profile => {
  if (!profile.targetHours?.applies) return 'bez celu godzin'
  const suffix = profile.targetHours.unit === 'week' ? 'godz./tydz.' : 'godz./okres'
  return `${profile.targetHours.amount} ${suffix}`
}

const formatOptional = (rule, valueKey, unit) => {
  if (!rule?.applies) return 'nie dotyczy'
  return `${rule[valueKey]} ${unit}`
}

const goBack = () => router.push('/ustawienia')

onMounted(async () => {
  try {
    await profilesStore.fetchProfiles()
  } catch (error) {
    console.error(error)
  }
})
</script>

<style scoped>
.employment-profiles-scroll {
  width: 100%;
  max-width: 840px;
  margin: 0 auto;
  box-sizing: border-box;
}

.employment-profiles-intro { padding: 5px 2px 14px; }
.employment-profiles-step,
.employment-editor-kicker {
  margin-bottom: 6px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.employment-profiles-intro h1 { margin: 0 0 8px; color: #111827; font-size: 23px; }
.employment-profiles-intro p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; }

.employment-profiles-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 13px;
  border: 1px solid #fde68a;
  border-radius: 15px;
  background: #fffbeb;
}
.employment-profiles-warning > div {
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  background: #d97706;
  font-weight: 900;
}
.employment-profiles-warning p { margin: 2px 0 0; color: #854d0e; font-size: 12px; line-height: 1.45; }
.employment-profiles-list { display: grid; gap: 10px; }
.employment-profile-row {
  width: 100%;
  padding: 15px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  color: inherit;
  text-align: left;
  box-shadow: 0 7px 22px rgba(15, 23, 42, 0.06);
}
.employment-profile-main { min-width: 0; }
.employment-profile-main strong,
.employment-profile-main small { display: block; }
.employment-profile-main strong { color: #111827; font-size: 16px; }
.employment-profile-main small {
  margin-top: 4px;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.employment-profile-summary { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.employment-profile-summary b {
  padding: 5px 7px;
  border-radius: 8px;
  color: #6d28d9;
  background: #f3e8ff;
  font-size: 10px;
}
.employment-profile-arrow { color: #94a3b8; font-size: 25px; }
.employment-profiles-state,
.employment-profiles-empty {
  padding: 32px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  color: #64748b;
  text-align: center;
}
.employment-profiles-empty { display: grid; gap: 7px; }
.employment-profiles-empty > div { color: #a855f7; font-size: 34px; }
.employment-profiles-empty strong { color: #1f2937; }
.employment-profiles-empty span { font-size: 12px; }
.employment-profiles-state.error { color: #b91c1c; }
.employment-profiles-fab {
  position: fixed;
  right: max(20px, calc((100vw - 840px) / 2 + 20px));
  bottom: calc(22px + env(safe-area-inset-bottom));
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(145deg, #a855f7, #7e22ce);
  color: #fff;
  font-size: 33px;
  box-shadow: 0 12px 30px rgba(126, 34, 206, 0.35);
}

.employment-editor-overlay { padding: 14px; align-items: center; }
.employment-editor-card {
  width: min(760px, 100%);
  max-height: calc(100dvh - 28px);
  padding: 20px;
  overflow-y: auto;
  border-radius: 24px;
  text-align: left;
}
.employment-editor-title { margin-bottom: 16px; text-align: left; }
.employment-section-toggle {
  width: 100%;
  min-height: 48px;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  color: #1f2937;
  font-size: 14px;
  font-weight: 850;
  text-align: left;
}
.employment-section-toggle b { color: #7c3aed; font-size: 20px; }
.employment-section-toggle + .employment-form-section,
.employment-form-section + .employment-section-toggle { margin-top: 10px; }
.employment-form-section { padding: 12px 3px 14px; }
.employment-form-section.parameters { display: grid; gap: 10px; }
.employment-field { display: grid; gap: 6px; }
.employment-field + .employment-field { margin-top: 12px; }
.employment-field > span,
.employment-value-grid label > span { color: #475569; font-size: 11px; font-weight: 800; }
.employment-field input,
.employment-field textarea,
.employment-value-grid input,
.employment-value-grid select,
.employment-single-value input {
  width: 100%;
  min-height: 43px;
  padding: 9px 11px;
  box-sizing: border-box;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  outline: none;
  background: #fff;
  color: #111827;
  font: inherit;
}
.employment-field textarea { resize: vertical; }
.employment-parameter-card {
  padding: 13px;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #7c3aed;
  border-radius: 16px;
  background: #fff;
}
.employment-parameter-card.inactive { border-left-color: #cbd5e1; background: #f8fafc; }
.employment-parameter-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.employment-parameter-heading strong,
.employment-parameter-heading small { display: block; }
.employment-parameter-heading strong { color: #1f2937; font-size: 13px; }
.employment-parameter-heading small { margin-top: 3px; color: #64748b; font-size: 10px; line-height: 1.4; }
.employment-parameter-heading > button,
.employment-break-actions button {
  flex-shrink: 0;
  padding: 6px 8px;
  border: 1px solid #ddd6fe;
  border-radius: 9px;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 10px;
  font-weight: 850;
}
.employment-parameter-card.inactive .employment-parameter-heading > button { border-color: #cbd5e1; background: #fff; color: #64748b; }
.employment-parameter-heading > button:disabled {
  cursor: default;
  opacity: 1;
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}
.employment-value-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.employment-value-grid label { display: grid; gap: 5px; }
.employment-single-value {
  width: 150px;
  margin-top: 11px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #fff;
}
.employment-single-value input { min-width: 0; border: none; border-radius: 0; }
.employment-single-value span { padding-right: 11px; color: #64748b; font-size: 11px; font-weight: 800; white-space: nowrap; }
.employment-input-suffix {
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #fff;
}
.employment-input-suffix input { min-width: 0; border: none; border-radius: 0; }
.employment-input-suffix b { padding-right: 10px; color: #64748b; font-size: 10px; white-space: nowrap; }
.employment-value-error {
  margin: 8px 0 0;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
}
.employment-breaks-copy { margin: 0 0 2px; color: #64748b; font-size: 11px; line-height: 1.45; }
.employment-break-actions { display: flex; gap: 5px; }
.employment-break-actions button.delete { border-color: #fecaca; background: #fff1f2; color: #be123c; }
.employment-checkbox-row {
  margin-top: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 750;
}
.employment-checkbox-row input { width: 18px; height: 18px; accent-color: #7c3aed; }
.employment-add-break {
  min-height: 42px;
  border: 1px dashed #a78bfa;
  border-radius: 13px;
  background: #faf5ff;
  color: #6d28d9;
  font-weight: 850;
}
.employment-editor-error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 750;
}
.employment-editor-actions {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.employment-editor-actions > div { display: flex; gap: 8px; margin-left: auto; }
.employment-cancel,
.employment-save,
.employment-delete-profile {
  min-height: 43px;
  padding: 10px 15px;
  border: none;
  border-radius: 13px;
  font-weight: 850;
}
.employment-cancel { background: #e2e8f0; color: #334155; }
.employment-save { background: #7c3aed; color: #fff; }
.employment-delete-profile { background: #fee2e2; color: #b91c1c; }
.employment-delete-dialog,
.employment-feedback-card { width: min(390px, calc(100% - 28px)); }
.employment-delete-icon { background: #fee2e2; color: #dc2626; }
.employment-feedback-card.success .app-dialog-icon { background: #dcfce7; color: #16a34a; }

@media (max-width: 620px) {
  .employment-profile-row { grid-template-columns: minmax(0, 1fr) auto; }
  .employment-profile-summary { grid-column: 1 / -1; justify-content: flex-start; }
  .employment-profile-arrow { grid-column: 2; grid-row: 1; }
  .employment-editor-overlay { padding: 7px; }
  .employment-editor-card { max-height: calc(100dvh - 14px); padding: 16px 13px; border-radius: 21px; }
  .employment-value-grid { grid-template-columns: 1fr; }
  .employment-editor-actions { align-items: stretch; flex-direction: column-reverse; }
  .employment-editor-actions > div { width: 100%; margin: 0; }
  .employment-editor-actions > div button { flex: 1; }
  .employment-delete-profile { width: 100%; }
  .employment-parameter-heading { flex-direction: column; }
  .employment-break-actions { width: 100%; }
}
</style>
