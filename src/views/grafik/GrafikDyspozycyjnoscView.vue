<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        DYSPOZYCYJNOŚĆ
      </h2>
    </div>

    <div class="scroll-area">
      <div class="grafik-menu-list">
        <button
          class="app-list-row"
          type="button"
          @click="router.push('/grafik/dyspozycyjnosc/kalendarz')"
        >
          <div class="app-list-row-main">
            <div class="app-list-row-title">
              Kalendarz dyspozycyjności
            </div>

            <div class="app-list-row-subtitle">
              Uzupełnij lub sprawdź dyspozycyjność
            </div>
          </div>

          <div class="app-list-row-arrow">
            ›
          </div>
        </button>

        <button
          v-if="canManageSchedule"
          class="app-list-row"
          type="button"
          @click="router.push('/grafik/dyspozycyjnosc/okresy')"
        >
          <div class="app-list-row-main">
            <div class="app-list-row-title">
              Okresy dyspozycji
            </div>

            <div class="app-list-row-subtitle">
              Twórz okresy i kontroluj zatwierdzenia
            </div>
          </div>

          <div class="app-list-row-arrow">
            ›
          </div>
        </button>

        <button
          v-if="canManageSchedule"
          class="app-list-row availability-cleanup-menu-row"
          type="button"
          :disabled="periodsStore.isSaving"
          @click="openCleanupModal"
        >
          <div class="app-list-row-main">
            <div class="app-list-row-title">
              Wyczyść dane dyspozycji
            </div>

            <div class="app-list-row-subtitle">
              Usuń wybrane dane z podanego zakresu
            </div>
          </div>

          <div class="app-list-row-arrow">
            ›
          </div>
        </button>
      </div>
    </div>

    <div
      v-if="showCleanupModal"
      class="app-dialog-overlay"
      @click.self="closeCleanupModal"
    >
      <div class="app-dialog-card availability-cleanup-dialog">
        <div class="app-dialog-icon availability-cleanup-dialog-icon">
          ⌫
        </div>

        <div class="app-dialog-title">
          Wyczyść dane dyspozycji
        </div>

        <div class="app-dialog-message">
          Wybierz zakres dat i dane, które chcesz usunąć.
        </div>

        <div class="availability-cleanup-date-grid">
          <div class="supplier-form-group">
            <label
              class="supplier-form-label notranslate"
              translate="no"
            >
              Data od
            </label>

            <button
              class="availability-period-date-button"
              type="button"
              :disabled="periodsStore.isSaving"
              @click="openDatePicker('from')"
            >
              <span>{{ formatDate(cleanupDateFrom) }}</span>
              <span class="availability-period-date-button-icon">📅</span>
            </button>
          </div>

          <div class="supplier-form-group">
            <label
              class="supplier-form-label notranslate"
              translate="no"
            >
              Data do
            </label>

            <button
              class="availability-period-date-button"
              type="button"
              :disabled="periodsStore.isSaving"
              @click="openDatePicker('to')"
            >
              <span>{{ formatDate(cleanupDateTo) }}</span>
              <span class="availability-period-date-button-icon">📅</span>
            </button>
          </div>
        </div>

        <div class="availability-cleanup-options">
          <label class="availability-cleanup-option all">
            <input
              v-model="allCleanupOptionsSelected"
              type="checkbox"
              :disabled="periodsStore.isSaving"
            >

            <span>
              <strong>Wszystko</strong>
              <small>Zaznacz lub odznacz wszystkie opcje</small>
            </span>
          </label>

          <label class="availability-cleanup-option">
            <input
              v-model="cleanupOptions.employeeEntries"
              type="checkbox"
              :disabled="periodsStore.isSaving"
            >

            <span>
              <strong>Dyspozycje pracowników</strong>
              <small>Wersje zapisane samodzielnie przez pracowników</small>
            </span>
          </label>

          <label class="availability-cleanup-option">
            <input
              v-model="cleanupOptions.managerEntries"
              type="checkbox"
              :disabled="periodsStore.isSaving"
            >

            <span>
              <strong>Zmiany managera</strong>
              <small>Wersje nadrzędne zapisane w God Mode</small>
            </span>
          </label>

          <label class="availability-cleanup-option">
            <input
              v-model="cleanupOptions.demandModels"
              type="checkbox"
              :disabled="periodsStore.isSaving"
            >

            <span>
              <strong>Modele przypisane do dni</strong>
              <small>Nie usuwa szablonów modeli zapotrzebowania</small>
            </span>
          </label>
        </div>

        <div class="availability-cleanup-warning">
          Operacji nie można cofnąć. Otwarty okres najpierw trzeba
          wstrzymać.
        </div>

        <div
          v-if="cleanupError"
          class="schedule-employee-newer-entry-warning"
        >
          {{ cleanupError }}
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="closeCleanupModal"
          >
            Anuluj
          </button>

          <button
            class="app-dialog-button app-dialog-delete"
            type="button"
            :disabled="
              periodsStore.isSaving ||
              !cleanupDateFrom ||
              !cleanupDateTo ||
              !hasSelectedCleanupOption
            "
            @click="openCleanupConfirmationModal"
          >
            Wyczyść
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDatePickerModal"
      class="app-dialog-overlay availability-period-calendar-overlay"
      @click.self="closeDatePicker"
    >
      <div class="app-dialog-card availability-period-calendar-dialog">
        <div class="availability-period-calendar-title">
          {{ datePickerTitle }}
        </div>

        <div class="availability-period-calendar-subtitle">
          Kliknij wybrany dzień
        </div>

        <div class="availability-period-calendar-header">
          <button
            class="availability-period-calendar-arrow"
            type="button"
            title="Poprzedni miesiąc"
            @click="changeCalendarMonth(-1)"
          >
            ‹
          </button>

          <div class="availability-period-calendar-month">
            {{ calendarMonthLabel }}
          </div>

          <button
            class="availability-period-calendar-arrow"
            type="button"
            title="Następny miesiąc"
            @click="changeCalendarMonth(1)"
          >
            ›
          </button>
        </div>

        <div class="availability-period-calendar-weekdays">
          <div
            v-for="weekDay in calendarWeekDays"
            :key="weekDay"
            class="availability-period-calendar-weekday"
          >
            {{ weekDay }}
          </div>
        </div>

        <div class="availability-period-calendar-grid">
          <button
            v-for="(day, index) in calendarDays"
            :key="day ? formatDateKey(day) : `empty-${index}`"
            class="availability-period-calendar-day"
            :class="{
              empty: !day,
              weekend: day && isWeekend(day),
              today: day && isToday(day),
              selected: day && isSelectedCalendarDay(day)
            }"
            type="button"
            @click="selectCalendarDate(day)"
          >
            {{ day ? day.getDate() : '' }}
          </button>
        </div>

        <div
          v-if="datePickerError"
          class="schedule-employee-newer-entry-warning"
        >
          {{ datePickerError }}
        </div>

        <div class="app-dialog-actions availability-period-calendar-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            @click="closeDatePicker"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showCleanupConfirmationModal"
      class="app-dialog-overlay"
    >
      <div class="app-dialog-card">
        <div class="app-dialog-icon schedule-delete-dialog-icon">
          !
        </div>

        <div class="app-dialog-title">
          Usunąć wybrane dane?
        </div>

        <div class="app-dialog-message">
          {{ cleanupConfirmationMessage }}
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="cancelCleanupConfirmation"
          >
            Anuluj
          </button>

          <button
            class="app-dialog-button app-dialog-delete"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="confirmCleanup"
          >
            {{ periodsStore.isSaving ? 'Usuwanie...' : 'Usuń' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showCleanupResultModal"
      class="app-dialog-overlay"
    >
      <div class="app-dialog-card">
        <div class="app-dialog-icon availability-cleanup-result-icon">
          ✓
        </div>

        <div class="app-dialog-title">
          Dane zostały wyczyszczone
        </div>

        <div class="app-dialog-message">
          {{ cleanupResultMessage }}
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-ok"
            type="button"
            @click="closeCleanupResultModal"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useScheduleAvailabilityPeriodsStore } from '../../stores/scheduleAvailabilityPeriodsStore.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const periodsStore = useScheduleAvailabilityPeriodsStore()

const showCleanupModal = ref(false)
const showCleanupConfirmationModal = ref(false)
const showCleanupResultModal = ref(false)
const showDatePickerModal = ref(false)

const cleanupDateFrom = ref('')
const cleanupDateTo = ref('')
const cleanupError = ref('')
const cleanupResult = ref(null)

const cleanupOptions = ref({
  employeeEntries: false,
  managerEntries: false,
  demandModels: false
})

const datePickerTarget = ref(null)
const datePickerError = ref('')

const calendarDisplayedMonth = ref(
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
)

const calendarWeekDays = [
  'Pn',
  'Wt',
  'Śr',
  'Cz',
  'Pt',
  'Sb',
  'Nd'
]

const canManageSchedule = computed(() => {
  if (!employeeAuthStore.currentEmployee) {
    return true
  }

  return employeeAuthStore.hasPermission(
    'can_manage_schedule'
  )
})

const hasSelectedCleanupOption = computed(() => {
  return Object.values(cleanupOptions.value).some(Boolean)
})

const allCleanupOptionsSelected = computed({
  get: () => {
    return Object.values(cleanupOptions.value).every(Boolean)
  },
  set: selected => {
    cleanupOptions.value = {
      employeeEntries: selected,
      managerEntries: selected,
      demandModels: selected
    }
  }
})

const selectedCleanupOptionLabels = computed(() => {
  const labels = []

  if (cleanupOptions.value.employeeEntries) {
    labels.push('dyspozycje pracowników')
  }

  if (cleanupOptions.value.managerEntries) {
    labels.push('zmiany managera')
  }

  if (cleanupOptions.value.demandModels) {
    labels.push('modele przypisane do dni')
  }

  return labels
})

const cleanupConfirmationMessage = computed(() => {
  const options = selectedCleanupOptionLabels.value
    .map(label => `• ${label}`)
    .join('\n')

  return (
    `Zakres: ${formatDate(cleanupDateFrom.value)} – ` +
    `${formatDate(cleanupDateTo.value)}\n\n` +
    `Usunięte zostaną:\n${options}\n\n` +
    'Tej operacji nie można cofnąć.'
  )
})

const cleanupResultMessage = computed(() => {
  if (!cleanupResult.value) {
    return 'Czyszczenie zakończone.'
  }

  const lines = []

  if (
    cleanupOptions.value.employeeEntries ||
    cleanupOptions.value.managerEntries
  ) {
    lines.push(
      `Zmienione dyspozycje: ${cleanupResult.value.entriesCount}`
    )
  }

  if (cleanupOptions.value.demandModels) {
    lines.push(
      `Usunięte przypisania modeli: ${cleanupResult.value.modelsCount}`
    )
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'Czyszczenie zakończone.'
})

const calendarMonthLabel = computed(() => {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(calendarDisplayedMonth.value)
})

const calendarDays = computed(() => {
  const year = calendarDisplayedMonth.value.getFullYear()
  const month = calendarDisplayedMonth.value.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstWeekDay = (firstDayOfMonth.getDay() + 6) % 7
  const days = []

  for (let index = 0; index < firstWeekDay; index += 1) {
    days.push(null)
  }

  for (
    let day = 1;
    day <= lastDayOfMonth.getDate();
    day += 1
  ) {
    days.push(new Date(year, month, day))
  }

  return days
})

const datePickerTitle = computed(() => {
  return datePickerTarget.value === 'from'
    ? 'Wybierz datę początkową'
    : 'Wybierz datę końcową'
})

const formatDateKey = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getDateFromKey = dateKey => {
  if (!dateKey) {
    return null
  }

  const [year, month, day] = dateKey.split('-').map(Number)

  return new Date(year, month - 1, day)
}

const getLastDayOfMonthKey = date => {
  return formatDateKey(
    new Date(date.getFullYear(), date.getMonth() + 1, 0)
  )
}

const formatDate = dateKey => {
  const date = getDateFromKey(dateKey)

  if (!date) {
    return 'Wybierz datę'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

const openCleanupModal = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

  cleanupDateFrom.value = formatDateKey(firstDay)
  cleanupDateTo.value = getLastDayOfMonthKey(firstDay)
  cleanupOptions.value = {
    employeeEntries: false,
    managerEntries: false,
    demandModels: false
  }
  cleanupError.value = ''
  cleanupResult.value = null
  showCleanupModal.value = true
}

const closeCleanupModal = () => {
  if (periodsStore.isSaving) {
    return
  }

  showCleanupModal.value = false
  cleanupError.value = ''
}

const openCleanupConfirmationModal = () => {
  cleanupError.value = ''

  if (
    !cleanupDateFrom.value ||
    !cleanupDateTo.value ||
    !hasSelectedCleanupOption.value
  ) {
    return
  }

  if (cleanupDateFrom.value > cleanupDateTo.value) {
    cleanupError.value =
      'Data końcowa nie może być wcześniejsza od daty początkowej.'
    return
  }

  showCleanupModal.value = false
  showCleanupConfirmationModal.value = true
}

const cancelCleanupConfirmation = () => {
  if (periodsStore.isSaving) {
    return
  }

  showCleanupConfirmationModal.value = false
  showCleanupModal.value = true
}

const confirmCleanup = async () => {
  if (periodsStore.isSaving) {
    return
  }

  try {
    cleanupResult.value =
      await periodsStore.clearAvailabilityDataRange({
        dateFrom: cleanupDateFrom.value,
        dateTo: cleanupDateTo.value,
        clearEmployeeEntries:
          cleanupOptions.value.employeeEntries,
        clearManagerEntries:
          cleanupOptions.value.managerEntries,
        clearDemandModels:
          cleanupOptions.value.demandModels
      })

    showCleanupConfirmationModal.value = false
    showCleanupResultModal.value = true
  } catch (error) {
    showCleanupConfirmationModal.value = false
    showCleanupModal.value = true
    cleanupError.value =
      error?.message ||
      'Nie udało się wyczyścić danych dyspozycji.'
  }
}

const closeCleanupResultModal = () => {
  showCleanupResultModal.value = false
  cleanupResult.value = null
}

const openDatePicker = target => {
  datePickerTarget.value = target
  datePickerError.value = ''
  showCleanupModal.value = false

  const selectedDateKey =
    target === 'from'
      ? cleanupDateFrom.value
      : cleanupDateTo.value

  const selectedDate = getDateFromKey(selectedDateKey) || new Date()

  calendarDisplayedMonth.value = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  )

  showDatePickerModal.value = true
}

const closeDatePicker = () => {
  showDatePickerModal.value = false
  datePickerTarget.value = null
  datePickerError.value = ''
  showCleanupModal.value = true
}

const changeCalendarMonth = offset => {
  calendarDisplayedMonth.value = new Date(
    calendarDisplayedMonth.value.getFullYear(),
    calendarDisplayedMonth.value.getMonth() + offset,
    1
  )
}

const selectCalendarDate = day => {
  if (!day || !datePickerTarget.value) {
    return
  }

  const selectedDateKey = formatDateKey(day)

  if (datePickerTarget.value === 'from') {
    cleanupDateFrom.value = selectedDateKey

    if (
      !cleanupDateTo.value ||
      cleanupDateTo.value < selectedDateKey
    ) {
      cleanupDateTo.value = selectedDateKey
    }

    cleanupError.value = ''
    closeDatePicker()
    return
  }

  if (
    cleanupDateFrom.value &&
    selectedDateKey < cleanupDateFrom.value
  ) {
    datePickerError.value =
      'Data końcowa nie może być wcześniejsza od daty początkowej.'
    return
  }

  cleanupDateTo.value = selectedDateKey
  cleanupError.value = ''
  closeDatePicker()
}

const isWeekend = day => {
  return day.getDay() === 0 || day.getDay() === 6
}

const isToday = day => {
  return formatDateKey(day) === formatDateKey(new Date())
}

const isSelectedCalendarDay = day => {
  const selectedDateKey =
    datePickerTarget.value === 'from'
      ? cleanupDateFrom.value
      : cleanupDateTo.value

  return formatDateKey(day) === selectedDateKey
}
</script>
