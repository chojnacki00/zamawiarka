<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik/szablony')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        EDYCJA SZABLONU
      </h2>
    </div>

    <div class="scroll-area">
      <div class="schedule-template-header">
        <div class="schedule-template-name">
          {{ templateName }}
        </div>

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
          <button
          class="schedule-day-header"
          :class="{ active: day.isOpen }"
          type="button"
          @click="toggleDay(day.key)"
>
            <div class="schedule-day-main">
              <div class="schedule-day-name">
                {{ day.label }}
              </div>

              <div class="schedule-day-summary">
                {{ getDaySummary(day) }}
              </div>
            </div>

            <div
              class="schedule-day-arrow"
              :class="{ open: day.isOpen }"
            >
              ▾
            </div>
          </button>

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
                <select
                 v-model="vacancy.positionId"
                 class="schedule-vacancy-select"
                 :class="{ 'schedule-vacancy-select-filled': vacancy.positionId }"
                >
                  <option value="">
                    Wybierz stanowisko
                  </option>

                  <option
                    v-for="position in schedulePositionsStore.positions"
                    :key="position.id"
                    :value="position.id"
                  >
                    {{ position.nazwa }}
                  </option>
                </select>

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

                <button
                  class="schedule-vacancy-delete"
                  type="button"
                  title="Usuń wakat"
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

            <button
              class="schedule-add-vacancy"
              type="button"
              @click="addVacancy(day.key)"
            >
              + Dodaj stanowisko
            </button>
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
        <label class="schedule-time-picker-label">
          Godzina
        </label>

        <select
          v-model="selectedHour"
          class="schedule-time-picker-select"
        >
          <option
            v-for="hour in hours"
            :key="hour"
            :value="hour"
          >
            {{ hour }}
          </option>
        </select>
      </div>

      <div class="schedule-time-picker-separator">
        :
      </div>

      <div class="schedule-time-picker-column">
        <label class="schedule-time-picker-label">
          Minuty
        </label>

        <select
          v-model="selectedMinute"
          class="schedule-time-picker-select"
        >
          <option
            v-for="minute in minutes"
            :key="minute"
            :value="minute"
          >
            {{ minute }}
          </option>
        </select>
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




  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
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
    isOpen: true,
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

onMounted(async () => {
  if (schedulePositionsStore.positions.length === 0) {
    await schedulePositionsStore.fetchPositions()
  }

  if (!editedModelId.value) return

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
          to: vacancy.to || '00:00'
        }))
      : []
  })
})

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
  to: '00:00'
})
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

function getDaySummary(day) {
  const count = day.vacancies.length

  if (count === 0) {
    return 'Brak zapotrzebowania'
  }

  if (count === 1) {
    return '1 stanowisko'
  }

  if (count >= 2 && count <= 4) {
    return `${count} stanowiska`
  }

  return `${count} stanowisk`
}

async function saveTemplate() {
  if (scheduleDemandModelsStore.isSaving) return

  const hasIncompleteVacancy = days.value.some(day =>
    day.vacancies.some(vacancy =>
      !vacancy.positionId ||
      !vacancy.from ||
      !vacancy.to
    )
  )

  if (hasIncompleteVacancy) {
    alert('Uzupełnij stanowisko oraz godziny we wszystkich pozycjach.')
    return
  }

  const templateData = {
    name: templateName.value.trim(),
    active: true,
    days: Object.fromEntries(
      days.value.map(day => [
        day.key,
        day.vacancies.map(vacancy => ({
          id: vacancy.id,
          positionId: vacancy.positionId,
          from: vacancy.from,
          to: vacancy.to
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