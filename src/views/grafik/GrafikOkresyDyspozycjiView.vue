<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik/dyspozycyjnosc')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        OKRESY DYSPOZYCJI
      </h2>
    </div>

    <div class="scroll-area">
      <div
        v-if="periodsStore.isLoading"
        class="schedule-loading"
      >
        Pobieranie okresów dyspozycji...
      </div>

      <div
        v-else-if="loadError"
        class="empty-state"
      >
        <div class="empty-title">
          Nie udało się pobrać okresów
        </div>

        <div class="empty-subtitle">
          {{ loadError }}
        </div>
      </div>

      <div
        v-else-if="periods.length === 0"
        class="empty-state"
      >
        <div class="empty-title">
          Brak okresów dyspozycji
        </div>

        <div class="empty-subtitle">
          Kliknij +, aby utworzyć pierwszy okres
        </div>
      </div>

      <div
        v-else
        style="display: flex; flex-direction: column; gap: 12px;"
      >
        <div
          v-for="period in periods"
          :key="period.id"
          class="app-list-row app-list-row-with-action"
          :class="{
            'availability-period-row-open':
              isPeriodEffectivelyOpen(period)
          }"
        >
          <button
            class="app-list-row-open"
            type="button"
            @click="openEditModal(period)"
          >
            <div class="app-list-row-main">
              <div class="app-list-row-title">
                {{ period.name }}
              </div>

                            <div class="app-list-row-subtitle">
                {{ formatDateRange(period) }}
              </div>

              <div class="app-list-row-subtitle">
                Model:
                {{ getDemandModelName(period.demandModelId) }}
              </div>

              <div class="app-list-row-subtitle">
                Status:
                {{ getPeriodStatusLabel(period) }}
              </div>

              <div class="app-list-row-subtitle">
                Wprowadzanie zmian do:
                {{ formatTimestampDate(period.closesAt) }}
              </div>
            </div>

            <div class="app-list-row-arrow">
              ›
            </div>
          </button>

          <button
            v-if="!isPeriodEffectivelyOpen(period)"
            class="app-list-row-delete"
            type="button"
            title="Usuń okres"
            aria-label="Usuń okres"
            @click.stop="openDeleteModal(period)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <button
      class="fab-add-button"
      type="button"
      aria-label="Dodaj okres dyspozycji"
      @click="openCreateModal"
    >
      +
    </button>

    <div
      v-if="showCreateModal"
      class="app-dialog-overlay"
      @click.self="closeCreateModal"
    >
      <div
        class="app-dialog-card availability-period-form-dialog"
      >
        <div class="app-dialog-icon">
          📅
        </div>

                <div class="app-dialog-title">
          {{
            editingPeriodId
              ? editingPeriodStatus === 'draft'
                ? 'Edytuj okres dyspozycji'
                : 'Okres dyspozycji'
              : 'Nowy okres dyspozycji'
          }}
        </div>

        <div class="app-dialog-message">
          {{
            isEditingPeriodEffectivelyOpen
              ? 'Zakres i model są zablokowane. Możesz przedłużyć termin albo zamknąć okres.'
              : editingPeriodStatus === 'open'
                ? 'Termin wprowadzania zmian minął. Możesz otworzyć okres ponownie.'
              : editingPeriodStatus === 'closed'
                ? 'Okres został zamknięty. Możesz otworzyć go ponownie, dopóki jego zakres nie minął.'
              : editingPeriodId
                ? 'Zmień ustawienia zapisanego szkicu.'
                : 'Podaj nazwę oraz zakres dat. Nowy okres zostanie zapisany jako szkic.'
          }}
        </div>

        <div class="supplier-form-group">
          <label class="supplier-form-label">
            Nazwa okresu
          </label>

          <input
            v-model="newPeriodName"
            type="text"
            class="supplier-form-input"
            placeholder="Np. Sierpień (Rok)"
            maxlength="80"
            :disabled="
              editingPeriodId &&
              editingPeriodStatus !== 'draft'
            "
            autofocus
          >
        </div>


                <div class="supplier-form-group">
          <label class="supplier-form-label">
            Model zapotrzebowania
          </label>

          <select
            v-model="newPeriodDemandModelId"
            class="supplier-form-input notranslate"
            translate="no"
            :disabled="
              editingPeriodId &&
              editingPeriodStatus !== 'draft'
            "
          >
            <option value="">
              Wybierz
            </option>

            <option
              v-for="model in demandModels"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
        </div>




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
            :disabled="
              editingPeriodId &&
              editingPeriodStatus !== 'draft'
            "
            @click="openDatePicker('from')"
          >
            <span>
              {{ formatDate(newPeriodDateFrom) }}
            </span>

            <span class="availability-period-date-button-icon">
              📅
            </span>
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
            :disabled="
              editingPeriodId &&
              editingPeriodStatus !== 'draft'
            "
            @click="openDatePicker('to')"
          >
            <span>
              {{ formatDate(newPeriodDateTo) }}
            </span>

            <span class="availability-period-date-button-icon">
              📅
            </span>
          </button>
        </div>


                <div class="supplier-form-group">
          <label class="supplier-form-label">
            Termin wprowadzania zmian dyspozycji
          </label>

          <button
            class="availability-period-date-button"
            type="button"
            :disabled="!canChangeEditingDeadline"
            @click="openDatePicker('closes')"
          >
            <span>
              {{ formatDate(newPeriodClosesOn) }}
            </span>

            <span class="availability-period-date-button-icon">
              📅
            </span>
          </button>
        </div>


        <div class="supplier-form-group">
          <label class="supplier-form-label">
            Dni wyłączone z dyspozycji
          </label>

          <button
            class="availability-period-date-button"
            type="button"
            :disabled="
              !newPeriodDateFrom ||
              !newPeriodDateTo
            "
            @click="openBlockedDatesPicker"
          >
            <span>
              {{ formatBlockedDatesCount() }}
            </span>

            <span class="availability-period-date-button-icon">
              📅
            </span>
          </button>
        </div>




        <div
          v-if="createError"
          class="schedule-employee-newer-entry-warning"
        >
          {{ createError }}
        </div>

        <div
          v-if="
            !editingPeriodId ||
            editingPeriodStatus === 'draft'
          "
          class="app-dialog-actions"
        >
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="closeCreateModal"
          >
            Anuluj
          </button>

          <button
            class="app-dialog-button app-dialog-ok"
            type="button"
            :disabled="!canSavePeriod || periodsStore.isSaving"
            @click="savePeriod"
          >
            {{
              periodsStore.isSaving
                ? 'Zapisywanie...'
                : editingPeriodId
                  ? 'Zapisz zmiany'
                  : 'Zapisz szkic'
            }}
          </button>
        </div>

        <div
          v-else
          class="app-dialog-actions"
        >
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="closeCreateModal"
          >
            Zamknij
          </button>
        </div>



        <button
          v-if="
            editingPeriodId &&
            editingPeriodStatus === 'draft'
          "
          class="availability-period-open-button"
          type="button"
          :disabled="periodsStore.isSaving"
          @click="openCurrentPeriod"
        >
          {{
            periodsStore.isSaving
              ? 'Otwieranie...'
              : 'Otwórz dyspozycje'
          }}
        </button>

        <div
  v-if="isEditingPeriodEffectivelyOpen"
  class="app-dialog-actions"
>
  <button
    class="app-dialog-button app-dialog-ok"
    type="button"
    :disabled="periodsStore.isSaving"
    @click="extendCurrentPeriod"
  >
    Zmień termin
  </button>

  <button
    class="app-dialog-button app-dialog-delete"
    type="button"
    :disabled="periodsStore.isSaving"
    @click="closeCurrentPeriod"
  >
    Wstrzymaj
  </button>
</div>

        <button
          v-if="canReopenEditingPeriod"
          class="availability-period-open-button"
          type="button"
          :disabled="periodsStore.isSaving"
          @click="reopenCurrentPeriod"
        >
          Otwórz ponownie
        </button>





      </div>
    </div>

    <div
      v-if="showDatePickerModal"
      class="app-dialog-overlay availability-period-calendar-overlay"
      @click.self="closeDatePicker"
    >
      <div
        class="app-dialog-card availability-period-calendar-dialog"
      >
        <div class="availability-period-calendar-title">
          {{
            datePickerTarget === 'from'
              ? 'Wybierz datę początkową'
              : datePickerTarget === 'to'
                ? 'Wybierz datę końcową'
                : 'Wybierz termin wprowadzania zmian'
          }}
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
            :key="
              day
                ? formatDateKey(day)
                : `empty-${index}`
            "
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




        <div
          class="app-dialog-actions availability-period-calendar-actions"
        >
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
      v-if="showBlockedDatesModal"
      class="app-dialog-overlay availability-period-calendar-overlay"
      @click.self="closeBlockedDatesPicker"
    >
      <div
        class="app-dialog-card availability-period-calendar-dialog"
      >
        <div class="availability-period-calendar-title">
          Dni wyłączone z dyspozycji
        </div>

        <div class="availability-period-calendar-subtitle">
          {{
            canEditBlockedDates
              ? 'Zaznacz wszystkie dni, które chcesz wyłączyć'
              : 'Podgląd dni wyłączonych w tym okresie'
          }}
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
            :key="
              day
                ? `blocked-${formatDateKey(day)}`
                : `blocked-empty-${index}`
            "
            class="availability-period-calendar-day"
            :class="[
              {
                empty: !day,
                weekend: day && isWeekend(day),
                today: day && isToday(day)
              },
              getBlockedDateCalendarClasses(day, index)
            ]"
            type="button"
            :disabled="
              !day ||
              !isDayInsideCurrentPeriod(day) ||
              !canEditBlockedDates
            "
            @click="toggleBlockedDate(day)"
          >
            {{ day ? day.getDate() : '' }}
          </button>
        </div>

        <div
          v-if="blockedDatesError"
          class="schedule-employee-newer-entry-warning"
        >
          {{ blockedDatesError }}
        </div>

        <div
          class="app-dialog-actions availability-period-calendar-actions"
        >
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="closeBlockedDatesPicker"
          >
            {{ canEditBlockedDates ? 'Anuluj' : 'Zamknij' }}
          </button>

          <button
            v-if="canEditBlockedDates"
            class="app-dialog-button app-dialog-ok"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="confirmBlockedDates"
          >
            {{
              periodsStore.isSaving
                ? 'Zapisywanie...'
                : 'Wybierz'
            }}
          </button>
        </div>
      </div>
    </div>


        <div
      v-if="showDeleteModal"
      class="app-dialog-overlay"
      @click.self="closeDeleteModal"
    >
      <div class="app-dialog-card">
        <div class="app-dialog-icon schedule-delete-dialog-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>

        <div class="app-dialog-title">
          Usuń okres?
        </div>

        <div class="app-dialog-message">
          Czy na pewno chcesz usunąć okres
          „{{ periodToDelete?.name }}”?

          Tej operacji nie można cofnąć.
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="closeDeleteModal"
          >
            Anuluj
          </button>

          <button
            class="app-dialog-button app-dialog-delete"
            type="button"
            :disabled="periodsStore.isSaving"
            @click="confirmDeletePeriod"
          >
            {{
              periodsStore.isSaving
                ? 'Usuwanie...'
                : 'Usuń'
            }}
          </button>
        </div>
      </div>
    </div>


  </main>
</template>

<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref
} from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useScheduleAvailabilityPeriodsStore } from '../../stores/scheduleAvailabilityPeriodsStore.js'
import { useScheduleDemandModelsStore } from '../../stores/scheduleDemandModelsStore.js'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useAuthStore } from '../../stores/authStore.js'

const router = useRouter()

const periodsStore =
  useScheduleAvailabilityPeriodsStore()

const demandModelsStore =
  useScheduleDemandModelsStore()

const employeeAuthStore = useEmployeeAuthStore()
const authStore = useAuthStore()

const { periods } = storeToRefs(periodsStore)

const { models: demandModels } =
  storeToRefs(demandModelsStore)

const showCreateModal = ref(false)
const editingPeriodId = ref(null)
const editingPeriodStatus = ref(null)

const newPeriodName = ref('')
const newPeriodDemandModelId = ref('')
const newPeriodDateFrom = ref('')
const newPeriodDateTo = ref('')
const newPeriodClosesOn = ref('')
const newPeriodBlockedDates = ref([])
const createError = ref('')
const loadError = ref('')

const showDeleteModal = ref(false)
const periodToDelete = ref(null)

const showDatePickerModal = ref(false)
const datePickerTarget = ref(null)
const datePickerError = ref('')

const showBlockedDatesModal = ref(false)
const blockedDatesDraft = ref([])
const blockedDatesError = ref('')

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

const currentEditor = computed(() => {
  const employee = employeeAuthStore.currentEmployee

  if (employee) {
    return {
      id: employee.id,
      name:
        `${employee.imie || ''} ${employee.nazwisko || ''}`.trim() ||
        'Pracownik'
    }
  }

  return {
    id: authStore.currentCompany?.uid || null,
    name: 'Administrator'
  }
})

const canSavePeriod = computed(() => {
  return Boolean(
    newPeriodName.value.trim() &&
    newPeriodDateFrom.value &&
    newPeriodDateTo.value &&
    newPeriodClosesOn.value
  )
})

const calendarMonthLabel = computed(() => {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(calendarDisplayedMonth.value)
})

const calendarDays = computed(() => {
  const year =
    calendarDisplayedMonth.value.getFullYear()

  const month =
    calendarDisplayedMonth.value.getMonth()

  const firstDayOfMonth =
    new Date(year, month, 1)

  const lastDayOfMonth =
    new Date(year, month + 1, 0)

  const firstWeekDay =
    (firstDayOfMonth.getDay() + 6) % 7

  const days = []

  for (
    let index = 0;
    index < firstWeekDay;
    index += 1
  ) {
    days.push(null)
  }

  for (
    let day = 1;
    day <= lastDayOfMonth.getDate();
    day += 1
  ) {
    days.push(
      new Date(year, month, day)
    )
  }

  return days
})

onMounted(async () => {
  try {
    await Promise.all([
      periodsStore.fetchPeriods(),
      demandModelsStore.fetchModels()
    ])
  } catch (error) {
    loadError.value =
      'Sprawdź połączenie z bazą danych i spróbuj ponownie.'
  }
})


onUnmounted(() => {
  periodsStore.stopPeriodsListener()
})



const formatDateKey = (date) => {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    date.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getDateFromKey = (dateKey) => {
  if (!dateKey) {
    return null
  }

  const [year, month, day] =
    dateKey.split('-').map(Number)

  return new Date(
    year,
    month - 1,
    day
  )
}


const getDateKeyFromTimestamp = (timestamp) => {
  if (!timestamp) {
    return ''
  }

  const date =
    typeof timestamp.toDate === 'function'
      ? timestamp.toDate()
      : new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return formatDateKey(date)
}




const getLastDayOfMonthKey = (date) => {
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  )

  return formatDateKey(lastDay)
}

const setDefaultPeriodDates = () => {
  const now = new Date()

  const firstDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  newPeriodDateFrom.value =
    formatDateKey(firstDay)

  newPeriodDateTo.value =
    getLastDayOfMonthKey(firstDay)
}

const openCreateModal = () => {
  editingPeriodId.value = null
  editingPeriodStatus.value = null

  newPeriodName.value = ''
  newPeriodDemandModelId.value = ''
  newPeriodClosesOn.value = ''
  newPeriodBlockedDates.value = []
  createError.value = ''

  setDefaultPeriodDates()

  showCreateModal.value = true
}

const openEditModal = (period) => {
  if (!period) {
    return
  }

  editingPeriodId.value = period.id
    editingPeriodStatus.value =
    period.status || 'draft'

    newPeriodName.value = period.name || ''

  newPeriodDemandModelId.value =
    period.demandModelId || ''

  newPeriodDateFrom.value = period.dateFrom || ''
  newPeriodDateTo.value = period.dateTo || ''

  newPeriodClosesOn.value =
    getDateKeyFromTimestamp(
      period.closesAt
    )

  newPeriodBlockedDates.value = [
    ...(period.blockedDates || [])
  ]

  createError.value = ''
  showCreateModal.value = true
}

const closeCreateModal = () => {
  if (periodsStore.isSaving) {
    return
  }

  showCreateModal.value = false
  editingPeriodId.value = null
  editingPeriodStatus.value = null
  newPeriodBlockedDates.value = []
  createError.value = ''
}



const openDeleteModal = (period) => {
  if (
    !period ||
    isPeriodEffectivelyOpen(period)
  ) {
    return
  }

  periodToDelete.value = period
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (periodsStore.isSaving) {
    return
  }

  showDeleteModal.value = false
  periodToDelete.value = null
}

const confirmDeletePeriod = async () => {
  if (
    !periodToDelete.value ||
    periodsStore.isSaving
  ) {
    return
  }

  try {
    await periodsStore.deletePeriod(
      periodToDelete.value.id
    )

    closeDeleteModal()
  } catch (error) {
    alert(
      error?.message ||
      'Nie udało się usunąć okresu dyspozycji.'
    )
  }
}





const openDatePicker = (target) => {
  datePickerTarget.value = target
  createError.value = ''
  datePickerError.value = ''

    const selectedDateKey =
    target === 'from'
      ? newPeriodDateFrom.value
      : target === 'to'
        ? newPeriodDateTo.value
        : newPeriodClosesOn.value

  const selectedDate =
    getDateFromKey(selectedDateKey) ||
    new Date()

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
}

const changeCalendarMonth = (offset) => {
  calendarDisplayedMonth.value = new Date(
    calendarDisplayedMonth.value.getFullYear(),
    calendarDisplayedMonth.value.getMonth() + offset,
    1
  )
}

const trimBlockedDatesToCurrentRange = () => {
  newPeriodBlockedDates.value =
    newPeriodBlockedDates.value.filter(dateKey => {
      return (
        dateKey >= newPeriodDateFrom.value &&
        dateKey <= newPeriodDateTo.value
      )
    })
}

const selectCalendarDate = (day) => {
  if (!day || !datePickerTarget.value) {
    return
  }

  const selectedDateKey =
    formatDateKey(day)

  if (datePickerTarget.value === 'from') {
    newPeriodDateFrom.value = selectedDateKey

    if (
      !newPeriodDateTo.value ||
      newPeriodDateTo.value < selectedDateKey
    ) {
      newPeriodDateTo.value =
        getLastDayOfMonthKey(day)
    }

    if (
      newPeriodClosesOn.value &&
      newPeriodClosesOn.value >
        newPeriodDateTo.value
    ) {
      newPeriodClosesOn.value =
        newPeriodDateTo.value
    }

    trimBlockedDatesToCurrentRange()

    closeDatePicker()
    return
  }

  if (datePickerTarget.value === 'to') {
    if (
      newPeriodDateFrom.value &&
      selectedDateKey < newPeriodDateFrom.value
    ) {
      datePickerError.value =
        'Data końcowa nie może być wcześniejsza od daty początkowej.'

      return
    }

    newPeriodDateTo.value = selectedDateKey

    if (
      newPeriodClosesOn.value &&
      newPeriodClosesOn.value > selectedDateKey
    ) {
      newPeriodClosesOn.value =
        selectedDateKey
    }

    trimBlockedDatesToCurrentRange()

    closeDatePicker()
    return
  }

 

  if (
    newPeriodDateTo.value &&
    selectedDateKey > newPeriodDateTo.value
  ) {
    datePickerError.value =
      'Termin wprowadzania zmian nie może przypadać po zakończeniu okresu.'

    return
  }

  if (
    editingPeriodStatus.value !== 'draft' &&
    selectedDateKey < formatDateKey(new Date())
  ) {
    datePickerError.value =
      'Nowy termin nie może przypadać przed dzisiejszym dniem.'

    return
  }

  newPeriodClosesOn.value = selectedDateKey
  closeDatePicker()
}

const isWeekend = (day) => {
  return (
    day.getDay() === 0 ||
    day.getDay() === 6
  )
}

const isToday = (day) => {
  return (
    formatDateKey(day) ===
    formatDateKey(new Date())
  )
}

const isSelectedCalendarDay = (day) => {
    const selectedDateKey =
    datePickerTarget.value === 'from'
      ? newPeriodDateFrom.value
      : datePickerTarget.value === 'to'
        ? newPeriodDateTo.value
        : newPeriodClosesOn.value

  return formatDateKey(day) === selectedDateKey
}

const canEditBlockedDates = computed(() => {
  if (!editingPeriodId.value) {
    return true
  }

  if (editingPeriodStatus.value === 'draft') {
    return true
  }

  return isEditingPeriodEffectivelyOpen.value
})

const formatBlockedDatesCount = () => {
  const count = newPeriodBlockedDates.value.length

  if (count === 0) {
    return 'Brak wyłączonych dni'
  }

  if (count === 1) {
    return '1 wyłączony dzień'
  }

  return `${count} wyłączonych dni`
}

const isDayInsideCurrentPeriod = (day) => {
  if (!day) {
    return false
  }

  const dateKey = formatDateKey(day)

  return Boolean(
    newPeriodDateFrom.value &&
    newPeriodDateTo.value &&
    dateKey >= newPeriodDateFrom.value &&
    dateKey <= newPeriodDateTo.value
  )
}

const getShiftedDateKey = (dateKey, offset) => {
  const [year, month, day] = dateKey
    .split('-')
    .map(Number)

  return formatDateKey(
    new Date(year, month - 1, day + offset)
  )
}

const getBlockedDateCalendarClasses = (
  day,
  calendarIndex
) => {
  if (!day) {
    return {}
  }

  const dateKey = formatDateKey(day)

  if (!isDayInsideCurrentPeriod(day)) {
    return {
      'blocked-date-outside-period': true
    }
  }

  const columnIndex = calendarIndex % 7

  const previousDateKey =
    getShiftedDateKey(dateKey, -1)

  const nextDateKey =
    getShiftedDateKey(dateKey, 1)

  const startsRange =
    columnIndex === 0 ||
    previousDateKey < newPeriodDateFrom.value

  const endsRange =
    columnIndex === 6 ||
    nextDateKey > newPeriodDateTo.value

  return {
    'blocked-date-period-range': true,
    'blocked-date-range-start': startsRange,
    'blocked-date-range-end': endsRange,
    'blocked-date-selected':
      blockedDatesDraft.value.includes(dateKey)
  }
}

const openBlockedDatesPicker = () => {
  if (
    !newPeriodDateFrom.value ||
    !newPeriodDateTo.value
  ) {
    return
  }

  blockedDatesDraft.value = [
    ...newPeriodBlockedDates.value
  ]

  blockedDatesError.value = ''

  const firstPeriodDate =
    getDateFromKey(newPeriodDateFrom.value)

  calendarDisplayedMonth.value = new Date(
    firstPeriodDate.getFullYear(),
    firstPeriodDate.getMonth(),
    1
  )

  showBlockedDatesModal.value = true
}

const closeBlockedDatesPicker = () => {
  if (periodsStore.isSaving) {
    return
  }

  showBlockedDatesModal.value = false
  blockedDatesDraft.value = []
  blockedDatesError.value = ''
}

const toggleBlockedDate = (day) => {
  if (
    !day ||
    !canEditBlockedDates.value ||
    !isDayInsideCurrentPeriod(day)
  ) {
    return
  }

  const dateKey = formatDateKey(day)
  const dateIndex =
    blockedDatesDraft.value.indexOf(dateKey)

  if (dateIndex === -1) {
    blockedDatesDraft.value.push(dateKey)
    blockedDatesDraft.value.sort()
    return
  }

  blockedDatesDraft.value.splice(dateIndex, 1)
}

const confirmBlockedDates = async () => {
  if (
    !canEditBlockedDates.value ||
    periodsStore.isSaving
  ) {
    return
  }

  blockedDatesError.value = ''

  const selectedBlockedDates =
    [...blockedDatesDraft.value].sort()

  try {
    if (isEditingPeriodEffectivelyOpen.value) {
      const savedBlockedDates =
        await periodsStore.updateBlockedDates(
          editingPeriodId.value,
          selectedBlockedDates,
          currentEditor.value
        )

      newPeriodBlockedDates.value =
        savedBlockedDates
    } else {
      newPeriodBlockedDates.value =
        selectedBlockedDates
    }

    closeBlockedDatesPicker()
  } catch (error) {
    blockedDatesError.value =
      error?.message ||
      'Nie udało się zapisać wyłączonych dni.'
  }
}



const openCurrentPeriod = async () => {
  if (
    !editingPeriodId.value ||
    periodsStore.isSaving
  ) {
    return
  }

  createError.value = ''

  if (!canSavePeriod.value) {
    createError.value =
      'Uzupełnij nazwę, zakres dat i termin wprowadzania zmian.'

    return
  }

  if (!newPeriodDemandModelId.value) {
    createError.value =
      'Wybierz model zapotrzebowania przed otwarciem dyspozycji.'

    return
  }

  if (
    newPeriodDateFrom.value >
    newPeriodDateTo.value
  ) {
    createError.value =
      'Termin końcowy nie może być wcześniejszy od terminu początkowego.'

    return
  }

  if (
    newPeriodClosesOn.value >
    newPeriodDateTo.value
  ) {
    createError.value =
      'Termin wprowadzania zmian nie może przypadać po zakończeniu okresu.'

    return
  }

  const todayDateKey =
    formatDateKey(new Date())

  if (newPeriodClosesOn.value < todayDateKey) {
    createError.value =
      'Termin wprowadzania zmian już minął. Ustaw nowy termin.'

    return
  }

  if (newPeriodDateTo.value < todayDateKey) {
    createError.value =
      'Nie można otworzyć okresu, którego zakres już się zakończył.'

    return
  }

  try {
    const periodId = editingPeriodId.value

    await periodsStore.updatePeriod(
      periodId,
      {
        name: newPeriodName.value.trim(),

        demandModelId:
          newPeriodDemandModelId.value,

        dateFrom: newPeriodDateFrom.value,
        dateTo: newPeriodDateTo.value,
        closesOn: newPeriodClosesOn.value,
        blockedDates:
          newPeriodBlockedDates.value,

        updatedById: currentEditor.value.id,
        updatedByName: currentEditor.value.name
      }
    )

    await periodsStore.openPeriod(
      periodId,
      currentEditor.value
    )

    closeCreateModal()
  } catch (error) {
    createError.value =
      error?.message ||
      'Nie udało się otworzyć dyspozycji.'
  }
}




const savePeriod = async () => {
  if (
    !canSavePeriod.value ||
    periodsStore.isSaving ||
    (
      editingPeriodId.value &&
      editingPeriodStatus.value !== 'draft'
    )
  ) {
    return
  }

  createError.value = ''

  if (
    newPeriodDateFrom.value >
    newPeriodDateTo.value
  ) {
    createError.value =
      'Data końcowa nie może być wcześniejsza od daty początkowej.'

    return
  }


   

  if (
    newPeriodClosesOn.value >
    newPeriodDateTo.value
  ) {
    createError.value =
      'Termin wprowadzania zmian nie może przypadać po zakończeniu okresu.'

    return
  }



  try {
    if (editingPeriodId.value) {
      await periodsStore.updatePeriod(
        editingPeriodId.value,
        {
          name: newPeriodName.value.trim(),
          demandModelId:
          newPeriodDemandModelId.value || null,
          dateFrom: newPeriodDateFrom.value,
          dateTo: newPeriodDateTo.value,
          closesOn: newPeriodClosesOn.value,
          blockedDates:
            newPeriodBlockedDates.value,
          updatedById: currentEditor.value.id,
          updatedByName: currentEditor.value.name
        }
      )
    } else {
      await periodsStore.addPeriod({
        name: newPeriodName.value.trim(),
        demandModelId:
        newPeriodDemandModelId.value || null,
        dateFrom: newPeriodDateFrom.value,
        dateTo: newPeriodDateTo.value,
        closesOn: newPeriodClosesOn.value,
        blockedDates:
          newPeriodBlockedDates.value,
        createdById: currentEditor.value.id,
        createdByName: currentEditor.value.name
      })
    }

    closeCreateModal()
  } catch (error) {
    createError.value =
      error?.message ||
      'Nie udało się zapisać okresu dyspozycji.'
  }
}

const formatDate = (dateKey) => {
  if (!dateKey) {
    return 'Wybierz datę'
  }

  const [year, month, day] =
    dateKey.split('-')

  return `${day}.${month}.${year}`
}



const formatTimestampDate = (timestamp) => {
  if (!timestamp) {
    return 'nie ustawiono'
  }

  const date =
    typeof timestamp.toDate === 'function'
      ? timestamp.toDate()
      : new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'nie ustawiono'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}




const formatDateRange = (period) => {
  return (
    `${formatDate(period.dateFrom)} – ` +
    `${formatDate(period.dateTo)}`
  )
}



const getDemandModelName = (modelId) => {
  if (!modelId) {
    return 'nie wybrano'
  }

  const model = demandModels.value.find(
    item => item.id === modelId
  )

  return model
    ? model.name
    : 'nie znaleziono modelu'
}





const isPeriodEffectivelyOpen = (period) => {
  if (period?.status !== 'open') {
    return false
  }

  if (!period.closesAt) {
    return false
  }

  const closesAtDate =
    typeof period.closesAt.toDate === 'function'
      ? period.closesAt.toDate()
      : new Date(period.closesAt)

  if (
    Number.isNaN(closesAtDate.getTime()) ||
    closesAtDate.getTime() < Date.now()
  ) {
    return false
  }

  const todayDateKey =
    formatDateKey(new Date())

  return (
    period.dateTo &&
    period.dateTo >= todayDateKey
  )
}

const getPeriodStatusLabel = (period) => {
  if (isPeriodEffectivelyOpen(period)) {
    return 'Dyspozycje otwarte'
  }

  if (period?.status === 'open') {
    return 'Termin wprowadzania zmian minął'
  }

  if (period?.status === 'closed') {
    return 'Dyspozycje zamknięte'
  }

  return 'Szkic'
}

const editingPeriod = computed(() => {
  return periods.value.find(
    period => period.id === editingPeriodId.value
  ) || null
})

const isEditingPeriodEffectivelyOpen = computed(() => {
  return isPeriodEffectivelyOpen(
    editingPeriod.value
  )
})

const canReopenEditingPeriod = computed(() => {
  const period = editingPeriod.value

  if (
    !period ||
    period.status === 'draft' ||
    isPeriodEffectivelyOpen(period)
  ) {
    return false
  }

  return (
    period.dateTo &&
    period.dateTo >= formatDateKey(new Date())
  )
})

const canChangeEditingDeadline = computed(() => {
  if (!editingPeriodId.value) {
    return true
  }

  if (editingPeriodStatus.value === 'draft') {
    return true
  }

  const period = editingPeriod.value

  return Boolean(
    period?.dateTo &&
    period.dateTo >= formatDateKey(new Date())
  )
})

const closeCurrentPeriod = async () => {
  if (
    !editingPeriodId.value ||
    periodsStore.isSaving
  ) {
    return
  }

  createError.value = ''

  try {
    await periodsStore.closePeriod(
      editingPeriodId.value,
      currentEditor.value
    )

    closeCreateModal()
  } catch (error) {
    createError.value =
      error?.message ||
      'Nie udało się zamknąć okresu dyspozycji.'
  }
}

const extendCurrentPeriod = async () => {
  if (
    !editingPeriodId.value ||
    !newPeriodClosesOn.value ||
    periodsStore.isSaving
  ) {
    return
  }

  createError.value = ''

  try {
    await periodsStore.extendPeriodDeadline(
      editingPeriodId.value,
      newPeriodClosesOn.value,
      currentEditor.value
    )

    closeCreateModal()
  } catch (error) {
    createError.value =
      error?.message ||
      'Nie udało się zmienić terminu.'
  }
}

const reopenCurrentPeriod = async () => {
  if (
    !editingPeriodId.value ||
    !newPeriodClosesOn.value ||
    periodsStore.isSaving
  ) {
    return
  }

  createError.value = ''

  try {
    await periodsStore.reopenPeriod(
      editingPeriodId.value,
      newPeriodClosesOn.value,
      currentEditor.value
    )

    closeCreateModal()
  } catch (error) {
    createError.value =
      error?.message ||
      'Nie udało się ponownie otworzyć okresu.'
  }
}
</script>
