<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="handleBack"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        EDYCJA SZABLONU
      </h2>
    </div>

    <div class="scroll-area">
      <div class="schedule-template-header">
        <input
         v-model="templateName"
         type="text"
         class="schedule-template-name-input"
         placeholder="Nazwa szablonu"
          maxlength="60"
          />

        <div class="schedule-template-hint">
          Ustaw zapotrzebowanie na stanowiska dla każdego dnia tygodnia
        </div>
      </div>

      <div
        v-if="schedulePositionsStore.isLoading"
        class="schedule-loading"
      >
        Pobieranie stanowisk...
      </div>

      <div
        v-else-if="schedulePositionsStore.positions.length === 0"
        class="empty-state"
      >
        <div class="empty-title">
          Brak stanowisk do grafiku
        </div>

        <div class="empty-subtitle">
          Najpierw dodaj stanowiska w głównych ustawieniach aplikacji
        </div>
      </div>

      <div
        v-else
        class="schedule-days-list"
      >
        <section
          v-for="day in days"
          :key="day.key"
          class="schedule-day-card"
          :class="{ active: day.isOpen }"
       >
          <div
            class="schedule-day-header"
            :class="{ active: day.isOpen }"
          >
            <button
              class="schedule-day-toggle-main"
              type="button"
              @click="toggleDay(day.key)"
            >
              <div class="schedule-day-main">
                <div class="schedule-day-name">
                  {{ day.label }}
                </div>

                <div class="schedule-day-summary-row">
                  <div class="schedule-day-summary">
                    {{ getDaySummary(day) }}
                  </div>

                  <div class="schedule-day-hours">
                    {{ getDayTotalTime(day) }}
                  </div>
                </div>
              </div>
            </button>

            <button
              class="schedule-copy-day-header-button"
              type="button"
              :title="`Kopiuj ${day.label}`"
              :aria-label="`Kopiuj ${day.label}`"
              @click.stop="openCopyDayModal(day.key)"
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
                aria-hidden="true"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>

            <button
              class="schedule-day-toggle-arrow"
              type="button"
              :title="day.isOpen ? 'Zwiń dzień' : 'Rozwiń dzień'"
              :aria-label="day.isOpen ? 'Zwiń dzień' : 'Rozwiń dzień'"
              @click="toggleDay(day.key)"
            >
              <span
                class="schedule-day-arrow"
                :class="{ open: day.isOpen }"
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
          </div>

          <div
            v-if="day.isOpen"
            class="schedule-day-content"
          >
            <div
              v-if="day.vacancies.length === 0"
              class="schedule-empty-day"
            >
              Brak zapotrzebowania na ten dzień
            </div>

            <div
              v-else
              class="schedule-vacancies-list"
            >
              <div
                v-for="vacancy in day.vacancies"
                :key="vacancy.id"
                class="schedule-vacancy-row"
              >
                <button
                  class="schedule-position-select-button notranslate"
                  :class="{
                    'schedule-position-select-button-filled': vacancy.positionId
                  }"
                  type="button"
                  translate="no"
                  @click="openPositionPicker(vacancy)"
                >
                  <span>
                    {{
                      vacancy.positionId
                        ? getPositionName(vacancy.positionId)
                        : 'Wybierz stanowisko'
                    }}
                  </span>

                  <span class="schedule-position-select-arrow">
                    ›
                  </span>
                </button>

<div class="schedule-time-row">
  <label class="schedule-time-field">
    <span class="schedule-time-label">Od</span>

    <div class="schedule-time-input-wrap">
      <input
        :id="`time-from-${vacancy.id}`"
        v-model="vacancy.from"
        type="time"
        class="schedule-vacancy-time"
        aria-label="Godzina rozpoczęcia"
      />

      <button
        class="schedule-time-picker-button"
        type="button"
        title="Wybierz godzinę rozpoczęcia"
        @click="openTimePicker(vacancy, 'from')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </button>
    </div>
  </label>

  <label class="schedule-time-field">
    <span class="schedule-time-label">Do</span>

    <div class="schedule-time-input-wrap">
      <input
        :id="`time-to-${vacancy.id}`"
        v-model="vacancy.to"
        type="time"
        class="schedule-vacancy-time"
        aria-label="Godzina zakończenia"
      />

      <button
        class="schedule-time-picker-button"
        type="button"
        title="Wybierz godzinę zakończenia"
        @click="openTimePicker(vacancy, 'to')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </button>
    </div>
  </label>
</div>

                <div class="schedule-vacancy-footer">
                  <div class="schedule-vacancy-people">
                    <span class="schedule-vacancy-people-label">
                      Liczba osób
                    </span>

                    <div class="schedule-vacancy-people-controls">
                      <button
                        class="schedule-vacancy-people-button"
                        type="button"
                        aria-label="Zmniejsz liczbę osób"
                        :disabled="Number(vacancy.requiredPeople) <= 1"
                        @click="decreaseRequiredPeople(vacancy)"
                      >
                        −
                      </button>

                      <input
                        v-model.number="vacancy.requiredPeople"
                        class="schedule-vacancy-people-input"
                        type="number"
                        min="1"
                        max="99"
                        inputmode="numeric"
                        aria-label="Liczba potrzebnych osób"
                        @blur="normalizeRequiredPeople(vacancy)"
                      >

                      <button
                        class="schedule-vacancy-people-button"
                        type="button"
                        aria-label="Zwiększ liczbę osób"
                        :disabled="Number(vacancy.requiredPeople) >= 99"
                        @click="increaseRequiredPeople(vacancy)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    class="schedule-vacancy-delete"
                    type="button"
                    title="Usuń pozycję"
                    aria-label="Usuń pozycję"
                    @click="removeVacancy(day.key, vacancy.id)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
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

            <div class="schedule-day-actions">
              <button
                class="schedule-add-vacancy"
                type="button"
                @click="addVacancy(day.key)"
              >
                + Dodaj stanowisko
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div
      v-if="schedulePositionsStore.positions.length > 0"
      class="schedule-save-bar"
    >
      <button
        class="schedule-save-button"
        type="button"
        :disabled="scheduleDemandModelsStore.isSaving"
        @click="saveTemplate"
    >
        {{
         scheduleDemandModelsStore.isSaving
         ? 'Zapisywanie...'
         : isEditMode
          ? 'Zapisz zmiany'
          : 'Zapisz szablon'
        }}
      </button>
    </div>


    <div
      v-if="showPositionPickerModal"
      class="app-dialog-overlay"
      @click.self="closePositionPicker"
    >
      <div class="app-dialog-card schedule-position-dialog">
        <div class="app-dialog-icon">
          👤
        </div>

        <div class="app-dialog-title">
          Wybierz stanowisko
        </div>

        <div class="app-dialog-message">
          Dotknij stanowiska, aby je przypisać.
        </div>

        <div
          class="schedule-position-options notranslate"
          translate="no"
        >
          <button
            v-for="position in schedulePositionsStore.positions"
            :key="position.id"
            class="schedule-position-option"
            :class="{
              'schedule-position-option-active':
                activePositionVacancy?.positionId === position.id
            }"
            type="button"
            @click="selectPosition(position.id)"
          >
            <span>{{ position.nazwa }}</span>

            <span
              v-if="activePositionVacancy?.positionId === position.id"
              class="schedule-position-option-check"
            >
              ✓
            </span>
          </button>
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            @click="closePositionPicker"
          >
            Anuluj
          </button>

          <button
            class="app-dialog-button schedule-position-clear-button"
            type="button"
            :disabled="!activePositionVacancy?.positionId"
            @click="clearSelectedPosition"
          >
            Wyczyść
          </button>
        </div>
      </div>
    </div>


    <div
      v-if="showCopyDayModal"
      class="app-dialog-overlay"
      @click.self="closeCopyDayModal"
    >
      <div class="app-dialog-card schedule-copy-day-dialog">
        <div class="app-dialog-icon">
          📋
        </div>

        <div class="app-dialog-title">
          Kopiuj: {{ getCopySourceDayLabel() }}
        </div>

        <div class="app-dialog-message">
          Wybierz dni docelowe. Ich obecna zawartość zostanie zastąpiona.
        </div>

        <div class="schedule-copy-day-options">
          <button
            v-for="targetDay in getCopyTargetDays()"
            :key="targetDay.key"
            class="schedule-copy-day-option"
            :class="{
              'schedule-copy-day-option-active':
                selectedCopyDayKeys.includes(targetDay.key)
            }"
            type="button"
            @click="toggleCopyTargetDay(targetDay.key)"
          >
            <span>{{ targetDay.label }}</span>

            <span class="schedule-copy-day-checkbox">
              {{
                selectedCopyDayKeys.includes(targetDay.key)
                  ? '✓'
                  : ''
              }}
            </span>
          </button>
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            @click="closeCopyDayModal"
          >
            Anuluj
          </button>

          <button
            class="app-dialog-button app-dialog-ok"
            type="button"
            :disabled="selectedCopyDayKeys.length === 0"
            @click="copyDayToSelectedDays"
          >
            Kopiuj
          </button>
        </div>
      </div>
    </div>


    <div
      v-if="showTimePickerModal"
      class="app-dialog-overlay"
      @click.self="closeTimePicker"
      >
       <div class="app-dialog-card schedule-time-dialog">
      <div class="app-dialog-icon">
      🕒
      </div>

      <div class="app-dialog-title">
      Wybierz godzinę
      </div>

      <div class="app-dialog-message">
      Ustaw godzinę i minuty.
      </div>

      <div class="schedule-time-picker-grid">
  <div class="schedule-time-picker-column">
    <div class="schedule-time-picker-label">
      Godzina
    </div>

    <div class="schedule-time-wheel">
      <button
        v-for="hour in hours"
        :key="hour"
        type="button"
        class="schedule-time-wheel-option"
        :class="{
          'schedule-time-wheel-option-active': selectedHour === hour
        }"
        @click="selectedHour = hour"
      >
        {{ hour }}
      </button>
    </div>
  </div>

  <div class="schedule-time-picker-separator">
    :
  </div>

  <div class="schedule-time-picker-column">
    <div class="schedule-time-picker-label">
      Minuty
    </div>

    <div class="schedule-time-wheel">
      <button
        v-for="minute in minutes"
        :key="minute"
        type="button"
        class="schedule-time-wheel-option"
        :class="{
          'schedule-time-wheel-option-active': selectedMinute === minute
        }"
        @click="selectedMinute = minute"
      >
        {{ minute }}
      </button>
    </div>
  </div>
</div>

     <div class="schedule-time-picker-preview">
      {{ selectedHour }}:{{ selectedMinute }}
      </div>

       <div class="app-dialog-actions">
      <button
        class="app-dialog-button app-dialog-cancel"
        type="button"
        @click="closeTimePicker"
      >
        Anuluj
      </button>

      <button
        class="app-dialog-button app-dialog-ok"
        type="button"
        @click="applySelectedTime"
      >
        Ustaw
      </button>
    </div>
  </div>
</div>


<div
  v-if="showUnsavedChangesModal"
  class="app-dialog-overlay"
  @click.self="closeUnsavedChangesModal"
>
  <div class="app-dialog-card">
    <div class="app-dialog-icon schedule-unsaved-dialog-icon">
      !
    </div>

    <div class="app-dialog-title">
      Niezapisane zmiany
    </div>

    <div class="app-dialog-message">
      Masz niezapisane zmiany w szablonie.

      Czy na pewno chcesz wyjść bez zapisywania?
    </div>

    <div class="app-dialog-actions">
      <button
        class="app-dialog-button app-dialog-cancel"
        type="button"
        @click="closeUnsavedChangesModal"
      >
        Zostań
      </button>

      <button
        class="app-dialog-button app-dialog-delete"
        type="button"
        @click="leaveWithoutSaving"
      >
        Wyjdź bez zapisywania
      </button>
    </div>
  </div>
</div>



<div
  v-if="showValidationModal"
  class="app-dialog-overlay"
  @click.self="closeValidationModal"
>
  <div class="app-dialog-card">
    <div class="app-dialog-icon schedule-validation-dialog-icon">
      !
    </div>

    <div class="app-dialog-title">
      Uzupełnij dane
    </div>

    <div class="app-dialog-message">
    W każdej dodanej pozycji wybierz stanowisko, ustaw liczbę osób (minimum 1) oraz różne godziny rozpoczęcia i zakończenia.
    </div>

    <div class="app-dialog-actions">
      <button
        class="app-dialog-button app-dialog-ok"
        type="button"
        @click="closeValidationModal"
      >
        Rozumiem
      </button>
    </div>
  </div>
</div>


  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSchedulePositionsStore } from '../../stores/schedulePositionsStore'
import { useScheduleDemandModelsStore } from '../../stores/scheduleDemandModelsStore'

const router = useRouter()
const route = useRoute()
const schedulePositionsStore = useSchedulePositionsStore()
const scheduleDemandModelsStore = useScheduleDemandModelsStore()
const showTimePickerModal = ref(false)
const activeTimeTarget = ref(null)
const selectedHour = ref('00')
const selectedMinute = ref('00')
const hasUnsavedChanges = ref(false)
const isInitialDataLoaded = ref(false)
const showUnsavedChangesModal = ref(false)
const showValidationModal = ref(false)
const showPositionPickerModal = ref(false)
const activePositionVacancy = ref(null)
const showCopyDayModal = ref(false)
const copySourceDayKey = ref(null)
const selectedCopyDayKeys = ref([])

const hours = Array.from(
  { length: 24 },
  (_, index) => String(index).padStart(2, '0')
)

const minutes = ['00', '15', '30', '45']

const editedModelId = ref(
  typeof route.params.id === 'string'
    ? route.params.id
    : null
)

const isEditMode = ref(Boolean(editedModelId.value))

const templateName = ref(
  typeof route.query.name === 'string' && route.query.name.trim()
    ? route.query.name.trim()
    : 'Nowy szablon'
)

const days = ref([
  {
    key: 'monday',
    label: 'Poniedziałek',
    isOpen: false,
    vacancies: []
  },
  {
    key: 'tuesday',
    label: 'Wtorek',
    isOpen: false,
    vacancies: []
  },
  {
    key: 'wednesday',
    label: 'Środa',
    isOpen: false,
    vacancies: []
  },
  {
    key: 'thursday',
    label: 'Czwartek',
    isOpen: false,
    vacancies: []
  },
  {
    key: 'friday',
    label: 'Piątek',
    isOpen: false,
    vacancies: []
  },
  {
    key: 'saturday',
    label: 'Sobota',
    isOpen: false,
    vacancies: []
  },
  {
    key: 'sunday',
    label: 'Niedziela',
    isOpen: false,
    vacancies: []
  }
])

const editableTemplateState = computed(() => {
  return {
    templateName: templateName.value,
    days: days.value.map(day => ({
      key: day.key,
      vacancies: day.vacancies
    }))
  }
})

watch(
  editableTemplateState,
  () => {
    if (!isInitialDataLoaded.value) return

    hasUnsavedChanges.value = true
  },
  {
    deep: true
  }
)

onMounted(async () => {
  if (schedulePositionsStore.positions.length === 0) {
    await schedulePositionsStore.fetchPositions()
  }

  if (!editedModelId.value) {
  await nextTick()
  isInitialDataLoaded.value = true
  hasUnsavedChanges.value = false
  return
}

  const model = await scheduleDemandModelsStore.fetchModelById(
    editedModelId.value
  )

  if (!model) {
    alert('Nie znaleziono szablonu grafiku.')
    router.push('/grafik/szablony')
    return
  }

  templateName.value = model.name || 'Szablon grafiku'

  days.value.forEach(day => {
    const savedVacancies = model.days?.[day.key]

    day.vacancies = Array.isArray(savedVacancies)
      ? savedVacancies.map(vacancy => ({
          id: vacancy.id || crypto.randomUUID(),
          positionId: vacancy.positionId || '',
          from: vacancy.from || '00:00',
          to: vacancy.to || '00:00',
          requiredPeople: getRequiredPeople(vacancy)
        }))
      : []
  })
  await nextTick()
isInitialDataLoaded.value = true
hasUnsavedChanges.value = false
})


function handleBack() {
  if (!hasUnsavedChanges.value) {
    router.push('/grafik/szablony')
    return
  }

  showUnsavedChangesModal.value = true
}

function closeUnsavedChangesModal() {
  showUnsavedChangesModal.value = false
}

function leaveWithoutSaving() {
  showUnsavedChangesModal.value = false
  hasUnsavedChanges.value = false

  router.push('/grafik/szablony')
}

function closeValidationModal() {
  showValidationModal.value = false
}




function toggleDay(dayKey) {
  const selectedDay = days.value.find(item => item.key === dayKey)

  if (!selectedDay) return

  const shouldOpen = !selectedDay.isOpen

  days.value.forEach(day => {
    day.isOpen = false
  })

  selectedDay.isOpen = shouldOpen
}



function addVacancy(dayKey) {
  const day = days.value.find(item => item.key === dayKey)

  if (!day) return

  day.vacancies.push({
  id: crypto.randomUUID(),
  positionId: '',
  from: '00:00',
  to: '00:00',
  requiredPeople: 1
})
}

function getPositionName(positionId) {
  const position = schedulePositionsStore.positions.find(
    item => item.id === positionId
  )

  return position?.nazwa || 'Nieznane stanowisko'
}

function openPositionPicker(vacancy) {
  activePositionVacancy.value = vacancy
  showPositionPickerModal.value = true
}

function closePositionPicker() {
  showPositionPickerModal.value = false
  activePositionVacancy.value = null
}

function selectPosition(positionId) {
  if (!activePositionVacancy.value) return

  activePositionVacancy.value.positionId = positionId
  closePositionPicker()
}

function clearSelectedPosition() {
  if (!activePositionVacancy.value) return

  activePositionVacancy.value.positionId = ''
  closePositionPicker()
}

function openCopyDayModal(dayKey) {
  copySourceDayKey.value = dayKey
  selectedCopyDayKeys.value = []
  showCopyDayModal.value = true
}

function closeCopyDayModal() {
  showCopyDayModal.value = false
  copySourceDayKey.value = null
  selectedCopyDayKeys.value = []
}

function getCopySourceDayLabel() {
  return days.value.find(
    day => day.key === copySourceDayKey.value
  )?.label || ''
}

function getCopyTargetDays() {
  return days.value.filter(
    day => day.key !== copySourceDayKey.value
  )
}

function toggleCopyTargetDay(dayKey) {
  if (selectedCopyDayKeys.value.includes(dayKey)) {
    selectedCopyDayKeys.value = selectedCopyDayKeys.value.filter(
      key => key !== dayKey
    )
    return
  }

  selectedCopyDayKeys.value.push(dayKey)
}

function copyDayToSelectedDays() {
  const sourceDay = days.value.find(
    day => day.key === copySourceDayKey.value
  )

  if (!sourceDay || selectedCopyDayKeys.value.length === 0) {
    return
  }

  days.value.forEach(targetDay => {
    if (!selectedCopyDayKeys.value.includes(targetDay.key)) {
      return
    }

    targetDay.vacancies = sourceDay.vacancies.map(vacancy => ({
      id: crypto.randomUUID(),
      positionId: vacancy.positionId,
      from: vacancy.from,
      to: vacancy.to,
      requiredPeople: getRequiredPeople(vacancy)
    }))
  })

  closeCopyDayModal()
}

function getRequiredPeople(vacancy) {
  const value = Math.trunc(Number(vacancy?.requiredPeople))

  return Number.isFinite(value) && value >= 1
    ? Math.min(99, value)
    : 1
}

function normalizeRequiredPeople(vacancy) {
  vacancy.requiredPeople = getRequiredPeople(vacancy)
}

function increaseRequiredPeople(vacancy) {
  vacancy.requiredPeople = Math.min(
    99,
    getRequiredPeople(vacancy) + 1
  )
}

function decreaseRequiredPeople(vacancy) {
  vacancy.requiredPeople = Math.max(
    1,
    getRequiredPeople(vacancy) - 1
  )
}



function openTimePicker(vacancy, field) {
  activeTimeTarget.value = {
    vacancy,
    field
  }

  const currentValue = vacancy[field] || '00:00'
  const [hour = '00', minute = '00'] = currentValue.split(':')

  selectedHour.value = hour
  selectedMinute.value = minutes.includes(minute)
    ? minute
    : '00'

  showTimePickerModal.value = true
}

function closeTimePicker() {
  showTimePickerModal.value = false
  activeTimeTarget.value = null
}

function applySelectedTime() {
  if (!activeTimeTarget.value) return

  const { vacancy, field } = activeTimeTarget.value

  vacancy[field] = `${selectedHour.value}:${selectedMinute.value}`

  closeTimePicker()
}





function removeVacancy(dayKey, vacancyId) {
  const day = days.value.find(item => item.key === dayKey)

  if (!day) return

  day.vacancies = day.vacancies.filter(
    vacancy => vacancy.id !== vacancyId
  )
}


function calculateVacancyMinutes(vacancy) {
  if (
    !vacancy?.from ||
    !vacancy?.to ||
    vacancy.from === vacancy.to
  ) {
    return 0
  }

  const [fromHour, fromMinute] =
    vacancy.from.split(':').map(Number)

  const [toHour, toMinute] =
    vacancy.to.split(':').map(Number)

  const startMinutes =
    fromHour * 60 + fromMinute

  let endMinutes =
    toHour * 60 + toMinute

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }

  return endMinutes - startMinutes
}

function getDayTotalTime(day) {
  const totalMinutes = day.vacancies.reduce(
    (total, vacancy) =>
      total +
      calculateVacancyMinutes(vacancy) *
      getRequiredPeople(vacancy),
    0
  )

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0 && minutes === 0) {
    return '0 godz.'
  }

  if (minutes === 0) {
    return `${hours} godz.`
  }

  if (hours === 0) {
    return `${minutes} min`
  }

  return `${hours} godz. ${minutes} min`
}



function getDaySummary(day) {
  const count = day.vacancies.reduce(
    (total, vacancy) => total + getRequiredPeople(vacancy),
    0
  )

  if (count === 0) {
    return 'Brak zapotrzebowania'
  }

  if (count === 1) {
    return '1 osoba'
  }

  if (count >= 2 && count <= 4) {
    return `${count} osoby`
  }

  return `${count} osób`
}

async function saveTemplate() {
  if (scheduleDemandModelsStore.isSaving) return

    const trimmedTemplateName = templateName.value.trim()

  if (!trimmedTemplateName) {
    alert('Wpisz nazwę szablonu.')
    return
  }

  const hasInvalidVacancy = days.value.some(day =>
  day.vacancies.some(vacancy =>
    !vacancy.positionId ||
    !vacancy.from ||
    !vacancy.to ||
    vacancy.from === vacancy.to ||
    !Number.isInteger(Number(vacancy.requiredPeople)) ||
    Number(vacancy.requiredPeople) < 1 ||
    Number(vacancy.requiredPeople) > 99
  )
)

if (hasInvalidVacancy) {
  showValidationModal.value = true
  return
}

  const templateData = {
    name: trimmedTemplateName,
    active: true,
    days: Object.fromEntries(
      days.value.map(day => [
        day.key,
        day.vacancies.map(vacancy => ({
          id: vacancy.id,
          positionId: vacancy.positionId,
          from: vacancy.from,
          to: vacancy.to,
          requiredPeople: Number(vacancy.requiredPeople)
        }))
      ])
    )
  }

  try {
    if (isEditMode.value && editedModelId.value) {
      await scheduleDemandModelsStore.updateModel(
        editedModelId.value,
        templateData
      )
    } else {
      await scheduleDemandModelsStore.addModel(templateData)
    }

    router.push('/grafik/szablony')
  } catch (error) {
    alert(
      isEditMode.value
        ? 'Nie udało się zapisać zmian w szablonie.'
        : 'Nie udało się zapisać szablonu grafiku.'
    )
  }
}
</script>
