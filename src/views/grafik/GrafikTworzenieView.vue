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
        TWORZENIE GRAFIKU
      </h2>
    </div>

    <div class="scroll-area schedule-create-scroll">
      <section class="schedule-create-card">
        <div class="schedule-create-step">
          KROK 1
        </div>

        <h3 class="schedule-create-heading">
          Wybierz zakres grafiku
        </h3>

        <p class="schedule-create-description">
          Wybierz daty w celu sprawdzenia, czy każdy dzień zakresu ma
          przypisany model zapotrzebowania.
        </p>

        <div class="schedule-create-date-grid">
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
              :disabled="isAnalyzing"
              @click="openDatePicker('from')"
            >
              <span>{{ formatDate(dateFrom) }}</span>
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
              :disabled="isAnalyzing"
              @click="openDatePicker('to')"
            >
              <span>{{ formatDate(dateTo) }}</span>
              <span class="availability-period-date-button-icon">📅</span>
            </button>
          </div>
        </div>

        <button
          class="schedule-create-primary-button"
          type="button"
          :disabled="isAnalyzing || !dateFrom || !dateTo"
          @click="analyzeRange"
        >
          {{ isAnalyzing ? 'Sprawdzanie...' : 'Sprawdź zakres' }}
        </button>

        <div
          v-if="analysisError"
          class="schedule-create-error"
        >
          {{ analysisError }}
        </div>
      </section>

      <section
        v-if="analysisResult"
        class="schedule-create-results"
      >
        <div
          class="schedule-create-status"
          :class="analysisResult.ready ? 'ready' : 'blocked'"
        >
          <div class="schedule-create-status-icon">
            {{ analysisResult.ready ? '✓' : '!' }}
          </div>

          <div>
            <strong>
              {{
                analysisResult.ready
                  ? 'Zakres jest gotowy'
                  : 'Generator nie może być uruchomiony'
              }}
            </strong>

            <span>
              Sprawdzono {{ formatDaysCount(analysisResult.daysCount) }}.
              {{
                analysisResult.ready
                  ? 'Można przejść do generowania obsady.'
                  : 'Uzupełnij wybrany zakres. Zawiera dni, które nie mają przypisanego modelu zapotrzebowania.'
              }}
            </span>
          </div>
        </div>

        <div
          v-if="analysisResult.modelGroups.length > 1"
          class="schedule-create-notice"
        >
          <strong>
            Zakres zawiera {{ analysisResult.modelGroups.length }} modele
            zapotrzebowania.
          </strong>

          <span>
            Generator zastosuje model przypisany do konkretnego dnia.
            Podział znajduje się poniżej.
          </span>
        </div>

        <div
          v-if="analysisResult.missingDates.length > 0"
          class="schedule-create-problem-card"
        >
          <div class="schedule-create-result-title">
            Dni bez przypisanego modelu
          </div>

          <div class="schedule-create-result-dates">
            {{ formatDateRanges(analysisResult.missingDates) }}
          </div>

          <div class="schedule-create-result-help">
            Przypisz model zapotrzebowania poprzez otwarcie okresu
            dyspozycji dla wskazanych dni.
          </div>
        </div>

        <div
          v-if="analysisResult.unknownModelGroups.length > 0"
          class="schedule-create-problem-card"
        >
          <div class="schedule-create-result-title">
            Przypisano nieistniejący model
          </div>

          <div
            v-for="group in analysisResult.unknownModelGroups"
            :key="group.modelId"
            class="schedule-create-unknown-model"
          >
            <strong>ID: {{ group.modelId }}</strong>
            <span>{{ formatDateRanges(group.dates) }}</span>
          </div>

          <div class="schedule-create-result-help">
            Model mógł zostać usunięty. Przed generowaniem przypisz tym
            dniom istniejący model zapotrzebowania.
          </div>
        </div>

        <div
          v-if="analysisResult.modelGroups.length > 0"
          class="schedule-create-models-card"
        >
          <div class="schedule-create-result-title">
            Modele używane w wybranym zakresie
          </div>

          <div class="schedule-create-model-list">
            <div
              v-for="group in analysisResult.modelGroups"
              :key="group.modelId"
              class="schedule-create-model-row"
            >
              <div class="schedule-create-model-name">
                {{ group.modelName }}
              </div>

              <div class="schedule-create-model-dates">
                {{ formatDateRanges(group.dates) }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="analysisResult.ready"
          class="schedule-create-next-step"
        >
          <strong>Kontrola modeli zakończona.</strong>
          <span>
            Teraz można pobrać dyspozycje, kompetencje i wymagane
            wakaty dla wybranego zakresu.
          </span>

          <button
            class="schedule-create-input-button"
            type="button"
            :disabled="isPreparingInput"
            @click="prepareGeneratorInput"
          >
            {{
              isPreparingInput
                ? 'Przygotowywanie...'
                : 'Przygotuj dane generatora'
            }}
          </button>

          <div
            v-if="generatorInputError"
            class="schedule-create-error"
          >
            {{ generatorInputError }}
          </div>
        </div>
      </section>

      <section
        v-if="generatorInputResult"
        class="schedule-generator-input"
      >
        <div class="schedule-create-step">
          KROK 2
        </div>

        <h3 class="schedule-create-heading">
          Dane wejściowe generatora
        </h3>

        <p class="schedule-create-description">
          To jest kontrola możliwości obsady. Na tym etapie żaden
          pracownik nie jest jeszcze przypisywany i grafik nie jest
          zapisywany.
        </p>

        <div class="schedule-generator-summary-grid">
          <div class="schedule-generator-summary-item">
            <strong>{{ generatorInputResult.daysCount }}</strong>
            <span>Dni</span>
          </div>

          <div class="schedule-generator-summary-item">
            <strong>{{ generatorInputResult.totalSlots }}</strong>
            <span>Wymagane zmiany</span>
          </div>

          <div class="schedule-generator-summary-item">
            <strong>{{ generatorInputResult.activeEmployeesCount }}</strong>
            <span>Aktywni pracownicy</span>
          </div>

          <div class="schedule-generator-summary-item">
            <strong>{{ generatorInputResult.availabilityEntriesCount }}</strong>
            <span>Zapisane dyspozycje</span>
          </div>
        </div>

        <div
          v-if="generatorInputResult.shortageCount > 0"
          class="schedule-generator-alert shortage"
        >
          <strong>
            Możliwy brak obsady: {{ generatorInputResult.shortageCount }}
            {{ formatShiftWord(generatorInputResult.shortageCount) }}.
          </strong>

          <span>
            Generator pozostawi te wakaty jako nieobsadzone i pokaże je
            managerowi do ręcznego rozstrzygnięcia.
          </span>
        </div>

        <div
          v-else-if="generatorInputResult.preferredOffNeededCount > 0"
          class="schedule-generator-alert preferred"
        >
          <strong>
            Pełna obsada wymaga użycia
            {{ generatorInputResult.preferredOffNeededCount }}
            {{ formatPreferredRequestWord(generatorInputResult.preferredOffNeededCount) }}.
          </strong>

          <span>
            Są to pracownicy z prośbą o wolne. Generator będzie traktował
            ich jako rozwiązanie awaryjne i wyraźnie oznaczy ostrzeżenie.
          </span>
        </div>

        <div
          v-else
          class="schedule-generator-alert complete"
        >
          <strong>Dane pozwalają na pełną obsadę zakresu.</strong>
          <span>
            Nie znaleziono braków wymagających użycia próśb o wolne.
          </span>
        </div>

        <div
          v-if="generatorInputResult.managerOverridesCount > 0"
          class="schedule-generator-manager-info"
        >
          W analizie uwzględniono
          {{ generatorInputResult.managerOverridesCount }}
          {{ formatManagerCorrectionWord(generatorInputResult.managerOverridesCount) }}
          managera jako wersje nadrzędne.
        </div>

        <button
          class="schedule-generator-days-toggle"
          type="button"
          :aria-expanded="showDayControlList"
          @click="toggleDayControlList"
        >
          <span>Kontrola poszczególnych dni</span>
          <span
            class="schedule-generator-toggle-arrow"
            :class="{ expanded: showDayControlList }"
            aria-hidden="true"
          >
            ›
          </span>
        </button>

        <div
          v-if="showDayControlList"
          class="schedule-generator-days-list"
        >
          <article
            v-for="day in generatorInputResult.daySummaries"
            :key="day.date"
            class="schedule-generator-day"
            :class="day.status"
          >
            <button
              class="schedule-generator-day-toggle"
              type="button"
              :aria-expanded="isDayDetailsExpanded(day.date)"
              @click="toggleDayDetails(day.date)"
            >
              <div class="schedule-generator-day-heading">
                <div>
                  <div class="schedule-generator-day-date">
                    {{ formatDateWithWeekday(day.date) }}
                  </div>

                  <div class="schedule-generator-day-model">
                    {{ day.modelName }}
                  </div>
                </div>

                <div
                  class="schedule-generator-day-status"
                  :class="day.status"
                >
                  {{ getDayInputStatusLabel(day) }}
                </div>
              </div>

              <span
                class="schedule-generator-toggle-arrow"
                :class="{ expanded: isDayDetailsExpanded(day.date) }"
                aria-hidden="true"
              >
                ›
              </span>
            </button>

            <div
              v-if="isDayDetailsExpanded(day.date)"
              class="schedule-generator-day-details"
            >
              <div class="schedule-generator-required-row">
                Wymagane wakaty: {{ day.slotsCount }}
              </div>

              <div class="schedule-generator-availability-row">
                <span>
                  Pełna dyspozycja: {{ day.hardMatchedCount }}
                </span>
                <span>
                  Prośba o wolne: {{ day.preferredOffNeededCount }}
                </span>
              </div>

              <div
                v-if="day.shiftGroups.length > 0"
                class="schedule-generator-shift-list"
              >
                <div
                  v-for="shift in day.shiftGroups"
                  :key="shift.id"
                  class="schedule-generator-shift-row"
                  :class="{ shortage: shift.shortageCount > 0 }"
                >
                  <div class="schedule-generator-shift-main">
                    <strong>{{ shift.positionName }}</strong>
                    <span>{{ shift.from }}–{{ shift.to }}</span>
                  </div>

                  <div class="schedule-generator-shift-result">
                    <span>Wakaty: {{ shift.slotsCount }}</span>
                    <strong v-if="shift.shortageCount > 0">
                      Brak obsady: {{ shift.shortageCount }}
                    </strong>
                    <strong v-else>Obsada możliwa</strong>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="schedule-generator-empty-day"
              >
                Model nie przewiduje zapotrzebowania na ten dzień.
              </div>
            </div>
          </article>
        </div>

        <div class="schedule-draft-create-card">
          <div class="schedule-create-step">
            KROK 3
          </div>

          <h3 class="schedule-create-heading">
            Utwórz grafik roboczy
          </h3>

          <p class="schedule-create-description">
            Zapisz szkielet grafiku w Firebase. Powstanie osobny dokument
            każdego dnia, a wszystkie wakaty pozostaną na razie
            nieobsadzone.
          </p>

          <div class="supplier-form-group">
            <label class="supplier-form-label" for="schedule-draft-name">
              Nazwa grafiku
            </label>

            <input
              id="schedule-draft-name"
              v-model.trim="draftName"
              class="supplier-form-input"
              type="text"
              maxlength="80"
              :disabled="scheduleDraftsStore.isCreating"
            >
          </div>

          <div
            v-if="draftCreateError"
            class="schedule-create-error schedule-draft-create-error"
          >
            {{ draftCreateError }}
          </div>

          <button
            class="schedule-create-primary-button schedule-draft-create-button"
            type="button"
            :disabled="scheduleDraftsStore.isCreating || !draftName"
            @click="createScheduleDraft"
          >
            {{
              scheduleDraftsStore.isCreating
                ? 'Zapisywanie grafiku...'
                : 'Utwórz grafik roboczy'
            }}
          </button>
        </div>
      </section>
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
          class="schedule-create-error schedule-create-calendar-error"
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
      v-if="showDraftCreatedModal"
      class="app-dialog-overlay"
    >
      <div class="app-dialog-card schedule-draft-created-dialog">
        <div class="app-dialog-icon">✓</div>

        <div class="app-dialog-title">
          Grafik roboczy został utworzony
        </div>

        <div class="app-dialog-message">
          Zapisano nagłówek grafiku i {{ generatorInputResult?.daysCount || 0 }}
          dokumentów dni. Grafik nie jest jeszcze widoczny dla pracowników.
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-ok"
            type="button"
            @click="openCreatedDraft"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged
} from 'firebase/auth'
import { db } from '../../firebase.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useEmployeesStore } from '../../stores/employeesStore.js'
import { useSchedulePositionsStore } from '../../stores/schedulePositionsStore.js'
import { useScheduleDemandModelsStore } from '../../stores/scheduleDemandModelsStore.js'
import { useScheduleDraftsStore } from '../../stores/scheduleDraftsStore.js'

const router = useRouter()
const authStore = useAuthStore()
const employeeAuthStore = useEmployeeAuthStore()
const employeesStore = useEmployeesStore()
const positionsStore = useSchedulePositionsStore()
const demandModelsStore = useScheduleDemandModelsStore()
const scheduleDraftsStore = useScheduleDraftsStore()

const dateFrom = ref('')
const dateTo = ref('')
const isAnalyzing = ref(false)
const analysisError = ref('')
const analysisResult = ref(null)
const isPreparingInput = ref(false)
const generatorInputError = ref('')
const generatorInputResult = ref(null)
const showDayControlList = ref(false)
const expandedDayKeys = ref([])
const draftName = ref('')
const draftCreateError = ref('')
const createdDraftId = ref(null)
const showDraftCreatedModal = ref(false)

let analyzedDayDocumentsByDate = new Map()

const showDatePickerModal = ref(false)
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

onMounted(() => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  dateFrom.value = formatDateKey(firstDay)
  dateTo.value = formatDateKey(lastDay)
})

const getRestaurantId = () => {
  return new Promise(resolve => {
    if (employeeAuthStore.restaurantId) {
      resolve(employeeAuthStore.restaurantId)
      return
    }

    if (authStore.currentCompany?.uid) {
      resolve(authStore.currentCompany.uid)
      return
    }

    const auth = getAuth()

    if (auth.currentUser) {
      resolve(auth.currentUser.uid)
      return
    }

    let unsubscribe = () => {}

    unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      resolve(user ? user.uid : null)
    })
  })
}

const analyzeRange = async () => {
  if (
    isAnalyzing.value ||
    !dateFrom.value ||
    !dateTo.value
  ) {
    return
  }

  analysisError.value = ''
  analysisResult.value = null
  generatorInputError.value = ''
  generatorInputResult.value = null
  showDayControlList.value = false
  expandedDayKeys.value = []
  analyzedDayDocumentsByDate = new Map()

  if (dateFrom.value > dateTo.value) {
    analysisError.value =
      'Data końcowa nie może być wcześniejsza od daty początkowej.'
    return
  }

  isAnalyzing.value = true

  try {
    const restaurantId = await getRestaurantId()

    if (!restaurantId) {
      throw new Error('Nie udało się rozpoznać restauracji.')
    }

    const daysQuery = query(
      collection(
        db,
        'users',
        restaurantId,
        'dyspozycje_dni'
      ),
      where('date', '>=', dateFrom.value),
      where('date', '<=', dateTo.value)
    )

    const [daysSnapshot] = await Promise.all([
      getDocs(daysQuery),
      demandModelsStore.fetchModels()
    ])

    const dayDocumentsByDate = new Map(
      daysSnapshot.docs.map(documentSnapshot => {
        const data = documentSnapshot.data()

        return [
          data.date || documentSnapshot.id,
          {
            id: documentSnapshot.id,
            ...data
          }
        ]
      })
    )

    analyzedDayDocumentsByDate = dayDocumentsByDate

    const modelsById = new Map(
      demandModelsStore.models.map(model => [model.id, model])
    )

    const allDates = getDateKeysInRange(
      dateFrom.value,
      dateTo.value
    )

    const missingDates = []
    const datesByModelId = new Map()

    allDates.forEach(dateKey => {
      const dayDocument = dayDocumentsByDate.get(dateKey)
      const modelId = dayDocument?.demandModelId || null

      if (!modelId) {
        missingDates.push(dateKey)
        return
      }

      if (!datesByModelId.has(modelId)) {
        datesByModelId.set(modelId, [])
      }

      datesByModelId.get(modelId).push(dateKey)
    })

    const modelGroups = []
    const unknownModelGroups = []

    datesByModelId.forEach((dates, modelId) => {
      const model = modelsById.get(modelId)

      if (!model) {
        unknownModelGroups.push({
          modelId,
          dates
        })
        return
      }

      modelGroups.push({
        modelId,
        modelName: model.name || 'Model bez nazwy',
        dates
      })
    })

    modelGroups.sort((first, second) => {
      return first.dates[0].localeCompare(second.dates[0])
    })

    unknownModelGroups.sort((first, second) => {
      return first.dates[0].localeCompare(second.dates[0])
    })

    analysisResult.value = {
      daysCount: allDates.length,
      missingDates,
      modelGroups,
      unknownModelGroups,
      ready:
        missingDates.length === 0 &&
        unknownModelGroups.length === 0
    }
  } catch (error) {
    console.error('Błąd sprawdzania zakresu grafiku:', error)

    analysisError.value =
      error?.message ||
      'Nie udało się sprawdzić danych dla wybranego zakresu.'
  } finally {
    isAnalyzing.value = false
  }
}

const demandDayKeys = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

const getDemandDayKey = dateKey => {
  const date = getDateFromKey(dateKey)

  return date
    ? demandDayKeys[date.getDay()] || null
    : null
}

const getRequiredPeople = vacancy => {
  const requiredPeople = Math.trunc(
    Number(vacancy?.requiredPeople)
  )

  return Number.isFinite(requiredPeople) && requiredPeople >= 1
    ? requiredPeople
    : 1
}

const getTimeMinutes = timeValue => {
  if (!timeValue) {
    return null
  }

  const [hours, minutes] = timeValue.split(':').map(Number)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null
  }

  return hours * 60 + minutes
}

const getTimeRange = (timeFrom, timeTo) => {
  const start = getTimeMinutes(timeFrom)
  let end = getTimeMinutes(timeTo)

  if (start === null || end === null || start === end) {
    return null
  }

  if (end < start) {
    end += 24 * 60
  }

  return { start, end }
}

const getEffectiveAvailability = availabilityRecord => {
  if (availabilityRecord?.managerEntry) {
    return availabilityRecord.managerEntry
  }

  if (availabilityRecord?.employeeEntry) {
    return availabilityRecord.employeeEntry
  }

  if (availabilityRecord?.type) {
    return availabilityRecord
  }

  return null
}

const doesAvailabilityCoverDemand = (
  availability,
  demandFrom,
  demandTo
) => {
  const availabilityType = availability?.type || 'full'

  if (availabilityType === 'unavailable') {
    return false
  }

  if (
    availabilityType === 'full' ||
    availabilityType === 'preferred_off'
  ) {
    return true
  }

  if (availabilityType !== 'partial') {
    return true
  }

  const demandRange = getTimeRange(demandFrom, demandTo)
  const availabilityRange = getTimeRange(
    availability.timeFrom,
    availability.timeTo
  )

  if (!demandRange || !availabilityRange) {
    return false
  }

  return (
    availabilityRange.start <= demandRange.start &&
    availabilityRange.end >= demandRange.end
  )
}

const getPositionName = positionId => {
  const position = positionsStore.positions.find(
    item => item.id === positionId
  )

  return position?.nazwa || 'Nieznane stanowisko'
}

const buildDayInputSummary = ({
  dateKey,
  demandModel,
  availabilityByEmployee,
  activeEmployees
}) => {
  const dayKey = getDemandDayKey(dateKey)
  const vacancies = Array.isArray(demandModel.days?.[dayKey])
    ? demandModel.days[dayKey]
    : []
  const slots = []

  vacancies.forEach((vacancy, vacancyIndex) => {
    if (
      !vacancy?.positionId ||
      !vacancy?.from ||
      !vacancy?.to ||
      vacancy.from === vacancy.to
    ) {
      return
    }

    const requiredPeople = getRequiredPeople(vacancy)
    const shiftGroupId =
      `${dateKey}-${vacancy.id || `vacancy-${vacancyIndex}`}`

    for (
      let slotIndex = 0;
      slotIndex < requiredPeople;
      slotIndex += 1
    ) {
      slots.push({
        id:
          `${shiftGroupId}-slot-${slotIndex + 1}`,
        shiftGroupId,
        positionId: vacancy.positionId,
        positionName: getPositionName(vacancy.positionId),
        from: vacancy.from,
        to: vacancy.to,
        candidateIds: [],
        hardCandidateIds: []
      })
    }
  })

  slots.forEach(slot => {
    const candidates = activeEmployees
      .filter(employee => {
        const competency = Number(
          employee.kompetencje?.[slot.positionId]
        )

        if (!Number.isFinite(competency) || competency < 1) {
          return false
        }

        const availabilityRecord =
          availabilityByEmployee[employee.id] || null
        const effectiveAvailability =
          getEffectiveAvailability(availabilityRecord)

        return doesAvailabilityCoverDemand(
          effectiveAvailability,
          slot.from,
          slot.to
        )
      })
      .map(employee => {
        const availabilityRecord =
          availabilityByEmployee[employee.id] || null
        const effectiveAvailability =
          getEffectiveAvailability(availabilityRecord)

        return {
          employeeId: employee.id,
          isPreferredOff:
            effectiveAvailability?.type === 'preferred_off',
          competency: Number(
            employee.kompetencje?.[slot.positionId]
          ) || 0,
          sortName:
            `${employee.nazwisko || ''} ${employee.imie || ''}`.trim()
        }
      })
      .sort((first, second) => {
        if (first.isPreferredOff !== second.isPreferredOff) {
          return first.isPreferredOff ? 1 : -1
        }

        if (first.competency !== second.competency) {
          return second.competency - first.competency
        }

        return first.sortName.localeCompare(second.sortName, 'pl')
      })

    slot.candidateIds = candidates.map(
      candidate => candidate.employeeId
    )
    slot.hardCandidateIds = candidates
      .filter(candidate => !candidate.isPreferredOff)
      .map(candidate => candidate.employeeId)
  })

  const orderedSlots = [...slots].sort((first, second) => {
    if (
      first.hardCandidateIds.length !==
      second.hardCandidateIds.length
    ) {
      return (
        first.hardCandidateIds.length -
        second.hardCandidateIds.length
      )
    }

    return first.candidateIds.length - second.candidateIds.length
  })

  const slotsById = new Map(
    slots.map(slot => [slot.id, slot])
  )
  const employeeToSlot = new Map()

  const tryAssignSlot = (
    slotId,
    allowPreferredOff,
    visitedEmployeeIds
  ) => {
    const slot = slotsById.get(slotId)

    if (!slot) {
      return false
    }

    const candidateIds = allowPreferredOff
      ? slot.candidateIds
      : slot.hardCandidateIds

    for (const employeeId of candidateIds) {
      if (visitedEmployeeIds.has(employeeId)) {
        continue
      }

      visitedEmployeeIds.add(employeeId)

      const previousSlotId = employeeToSlot.get(employeeId)

      if (
        !previousSlotId ||
        tryAssignSlot(
          previousSlotId,
          allowPreferredOff,
          visitedEmployeeIds
        )
      ) {
        employeeToSlot.set(employeeId, slotId)
        return true
      }
    }

    return false
  }

  orderedSlots.forEach(slot => {
    tryAssignSlot(slot.id, false, new Set())
  })

  const hardMatchedCount = new Set(
    employeeToSlot.values()
  ).size
  let assignedSlotIds = new Set(employeeToSlot.values())

  orderedSlots.forEach(slot => {
    if (assignedSlotIds.has(slot.id)) {
      return
    }

    tryAssignSlot(slot.id, true, new Set())
    assignedSlotIds = new Set(employeeToSlot.values())
  })

  const matchedCount = assignedSlotIds.size
  const shortageSlotIds = new Set(
    slots
      .filter(slot => !assignedSlotIds.has(slot.id))
      .map(slot => slot.id)
  )
  const shiftGroupsById = new Map()

  slots.forEach(slot => {
    if (!shiftGroupsById.has(slot.shiftGroupId)) {
      shiftGroupsById.set(slot.shiftGroupId, {
        id: slot.shiftGroupId,
        positionId: slot.positionId,
        positionName: slot.positionName,
        from: slot.from,
        to: slot.to,
        slotsCount: 0,
        shortageCount: 0
      })
    }

    const group = shiftGroupsById.get(slot.shiftGroupId)
    group.slotsCount += 1

    if (shortageSlotIds.has(slot.id)) {
      group.shortageCount += 1
    }
  })

  const shiftGroups = [...shiftGroupsById.values()]
    .sort((first, second) => {
      return (
        first.from.localeCompare(second.from) ||
        first.to.localeCompare(second.to) ||
        first.positionName.localeCompare(second.positionName, 'pl')
      )
    })
  const shortageCount = slots.length - matchedCount
  const preferredOffNeededCount =
    matchedCount - hardMatchedCount
  const status = slots.length === 0
    ? 'empty'
    : shortageCount > 0
      ? 'shortage'
      : preferredOffNeededCount > 0
        ? 'preferred'
        : 'complete'

  return {
    date: dateKey,
    modelId: demandModel.id,
    modelName: demandModel.name || 'Model bez nazwy',
    slotsCount: slots.length,
    matchedCount,
    hardMatchedCount,
    shortageCount,
    preferredOffNeededCount,
    shiftGroups,
    status
  }
}

const prepareGeneratorInput = async () => {
  if (
    isPreparingInput.value ||
    !analysisResult.value?.ready
  ) {
    return
  }

  generatorInputError.value = ''
  generatorInputResult.value = null
  showDayControlList.value = false
  expandedDayKeys.value = []
  isPreparingInput.value = true

  try {
    const restaurantId = await getRestaurantId()

    if (!restaurantId) {
      throw new Error('Nie udało się rozpoznać restauracji.')
    }

    const availabilityQuery = query(
      collection(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc'
      ),
      where('date', '>=', dateFrom.value),
      where('date', '<=', dateTo.value)
    )

    const [availabilitySnapshot] = await Promise.all([
      getDocs(availabilityQuery),
      employeesStore.fetchEmployees(),
      positionsStore.fetchPositions()
    ])

    const activeEmployees = [...(employeesStore.employees || [])]
      .filter(employee => employee.aktywny !== false)
    const activeEmployeeIds = new Set(
      activeEmployees.map(employee => employee.id)
    )
    const availabilityByDate = {}
    let availabilityEntriesCount = 0
    let managerOverridesCount = 0

    availabilitySnapshot.docs.forEach(documentSnapshot => {
      const data = documentSnapshot.data()

      if (
        !data.date ||
        !data.employeeId ||
        !activeEmployeeIds.has(data.employeeId)
      ) {
        return
      }

      if (!availabilityByDate[data.date]) {
        availabilityByDate[data.date] = {}
      }

      availabilityByDate[data.date][data.employeeId] = {
        id: documentSnapshot.id,
        ...data
      }
      availabilityEntriesCount += 1

      if (data.managerEntry) {
        managerOverridesCount += 1
      }
    })

    const modelsById = new Map(
      demandModelsStore.models.map(model => [model.id, model])
    )
    const allDates = getDateKeysInRange(
      dateFrom.value,
      dateTo.value
    )
    const daySummaries = allDates.map(dateKey => {
      const dayDocument =
        analyzedDayDocumentsByDate.get(dateKey)
      const demandModel = modelsById.get(
        dayDocument?.demandModelId
      )

      if (!demandModel) {
        throw new Error(
          `Nie znaleziono modelu dla dnia ${formatDate(dateKey)}.`
        )
      }

      return buildDayInputSummary({
        dateKey,
        demandModel,
        availabilityByEmployee:
          availabilityByDate[dateKey] || {},
        activeEmployees
      })
    })

    generatorInputResult.value = {
      daysCount: daySummaries.length,
      totalSlots: daySummaries.reduce(
        (sum, day) => sum + day.slotsCount,
        0
      ),
      shortageCount: daySummaries.reduce(
        (sum, day) => sum + day.shortageCount,
        0
      ),
      preferredOffNeededCount: daySummaries.reduce(
        (sum, day) => sum + day.preferredOffNeededCount,
        0
      ),
      activeEmployeesCount: activeEmployees.length,
      availabilityEntriesCount,
      managerOverridesCount,
      daySummaries
    }

    draftName.value = getDefaultDraftName()
    draftCreateError.value = ''
    createdDraftId.value = null
  } catch (error) {
    console.error(
      'Błąd przygotowania danych generatora:',
      error
    )

    generatorInputError.value =
      error?.message ||
      'Nie udało się przygotować danych generatora.'
  } finally {
    isPreparingInput.value = false
  }
}

const openDatePicker = target => {
  datePickerTarget.value = target
  datePickerError.value = ''

  const selectedDateKey =
    target === 'from'
      ? dateFrom.value
      : dateTo.value

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
    dateFrom.value = selectedDateKey

    if (!dateTo.value || dateTo.value < selectedDateKey) {
      dateTo.value = selectedDateKey
    }

    invalidateAnalysis()
    closeDatePicker()
    return
  }

  if (dateFrom.value && selectedDateKey < dateFrom.value) {
    datePickerError.value =
      'Data końcowa nie może być wcześniejsza od daty początkowej.'
    return
  }

  dateTo.value = selectedDateKey
  invalidateAnalysis()
  closeDatePicker()
}

const invalidateAnalysis = () => {
  analysisResult.value = null
  analysisError.value = ''
  generatorInputResult.value = null
  generatorInputError.value = ''
  showDayControlList.value = false
  expandedDayKeys.value = []
  draftName.value = ''
  draftCreateError.value = ''
  createdDraftId.value = null
  analyzedDayDocumentsByDate = new Map()
}

const getDefaultDraftName = () => {
  if (!dateFrom.value || !dateTo.value) {
    return 'Grafik roboczy'
  }

  return `Grafik ${formatShortDate(dateFrom.value)} – ${formatShortDate(dateTo.value)}`
}

const createScheduleDraft = async () => {
  if (
    scheduleDraftsStore.isCreating ||
    !generatorInputResult.value ||
    !draftName.value
  ) {
    return
  }

  draftCreateError.value = ''

  try {
    createdDraftId.value = await scheduleDraftsStore.createDraft({
      name: draftName.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      daySummaries: generatorInputResult.value.daySummaries
    })

    if (!createdDraftId.value) {
      throw new Error('Nie udało się utworzyć grafiku roboczego.')
    }

    showDraftCreatedModal.value = true
  } catch (error) {
    console.error('Błąd tworzenia grafiku roboczego:', error)

    draftCreateError.value =
      error?.message ||
      'Nie udało się zapisać grafiku roboczego.'
  }
}

const openCreatedDraft = () => {
  if (!createdDraftId.value) {
    return
  }

  showDraftCreatedModal.value = false
  router.push(`/grafik/grafiki/${createdDraftId.value}`)
}

const toggleDayControlList = () => {
  showDayControlList.value = !showDayControlList.value
}

const toggleDayDetails = dateKey => {
  if (expandedDayKeys.value.includes(dateKey)) {
    expandedDayKeys.value = expandedDayKeys.value.filter(
      key => key !== dateKey
    )
    return
  }

  expandedDayKeys.value = [
    ...expandedDayKeys.value,
    dateKey
  ]
}

const isDayDetailsExpanded = dateKey => {
  return expandedDayKeys.value.includes(dateKey)
}

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

const addDaysToDateKey = (dateKey, daysToAdd) => {
  const date = getDateFromKey(dateKey)
  date.setDate(date.getDate() + daysToAdd)

  return formatDateKey(date)
}

const getDateKeysInRange = (rangeFrom, rangeTo) => {
  const dates = []
  let currentDateKey = rangeFrom

  while (currentDateKey <= rangeTo) {
    dates.push(currentDateKey)
    currentDateKey = addDaysToDateKey(currentDateKey, 1)
  }

  return dates
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

const formatShortDate = dateKey => {
  const date = getDateFromKey(dateKey)

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

const formatDateRanges = dateKeys => {
  if (!dateKeys || dateKeys.length === 0) {
    return 'Brak'
  }

  const sortedDates = [...dateKeys].sort()
  const ranges = []
  let rangeStart = sortedDates[0]
  let rangeEnd = sortedDates[0]

  for (let index = 1; index < sortedDates.length; index += 1) {
    const dateKey = sortedDates[index]

    if (dateKey === addDaysToDateKey(rangeEnd, 1)) {
      rangeEnd = dateKey
      continue
    }

    ranges.push({ from: rangeStart, to: rangeEnd })
    rangeStart = dateKey
    rangeEnd = dateKey
  }

  ranges.push({ from: rangeStart, to: rangeEnd })

  return ranges
    .map(range => {
      if (range.from === range.to) {
        return formatShortDate(range.from)
      }

      return (
        `${formatShortDate(range.from)} – ` +
        `${formatShortDate(range.to)}`
      )
    })
    .join(', ')
}

const formatDaysCount = count => {
  if (count === 1) {
    return '1 dzień'
  }

  const lastTwoDigits = count % 100
  const lastDigit = count % 10

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
  ) {
    return `${count} dni`
  }

  return `${count} dni`
}

const formatDateWithWeekday = dateKey => {
  const date = getDateFromKey(dateKey)

  if (!date) {
    return dateKey
  }

  const formatted = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const formatShiftWord = count => {
  if (count === 1) {
    return 'zmiana'
  }

  const lastTwoDigits = count % 100
  const lastDigit = count % 10

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
  ) {
    return 'zmiany'
  }

  return 'zmian'
}

const formatPreferredRequestWord = count => {
  return count === 1
    ? 'prośby o wolne'
    : 'próśb o wolne'
}

const formatManagerCorrectionWord = count => {
  if (count === 1) {
    return 'poprawkę'
  }

  const lastTwoDigits = count % 100
  const lastDigit = count % 10

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
  ) {
    return 'poprawki'
  }

  return 'poprawek'
}

const getDayInputStatusLabel = day => {
  if (day.status === 'empty') {
    return 'Brak zapotrzebowania'
  }

  if (day.status === 'shortage') {
    return `Brak obsady: ${day.shortageCount}`
  }

  if (day.status === 'preferred') {
    return 'Potrzebne prośby o wolne'
  }

  return 'Obsada możliwa'
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
      ? dateFrom.value
      : dateTo.value

  return formatDateKey(day) === selectedDateKey
}
</script>

<style scoped>
.schedule-create-scroll {
  padding-top: 4px;
}

.schedule-create-card,
.schedule-create-results,
.schedule-generator-input {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  box-sizing: border-box;
}

.schedule-create-card {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.schedule-create-step {
  margin-bottom: 7px;
  color: #f97316;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.schedule-create-heading {
  margin: 0 0 8px;
  color: #111827;
  font-size: 22px;
  line-height: 1.2;
}

.schedule-create-description {
  margin: 0 0 18px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.schedule-create-date-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.schedule-create-primary-button {
  width: 100%;
  min-height: 50px;
  margin-top: 16px;
  border: none;
  border-radius: 16px;
  background: #007aff;
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.schedule-create-primary-button:active {
  transform: scale(0.985);
}

.schedule-create-primary-button:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
}

.schedule-create-error {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.schedule-create-calendar-error {
  margin-top: 12px;
}

.schedule-create-results {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-create-status,
.schedule-create-notice,
.schedule-create-problem-card,
.schedule-create-models-card,
.schedule-create-next-step {
  padding: 16px;
  border-radius: 18px;
  box-sizing: border-box;
}

.schedule-create-status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid;
}

.schedule-create-status.ready {
  border-color: #86efac;
  background: #f0fdf4;
  color: #166534;
}

.schedule-create-status.blocked {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #991b1b;
}

.schedule-create-status-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  font-size: 19px;
  font-weight: 900;
}

.schedule-create-status strong,
.schedule-create-status span,
.schedule-create-notice strong,
.schedule-create-notice span,
.schedule-create-next-step strong,
.schedule-create-next-step span {
  display: block;
}

.schedule-create-status strong,
.schedule-create-notice strong,
.schedule-create-next-step strong {
  margin-bottom: 4px;
  font-size: 15px;
}

.schedule-create-status span,
.schedule-create-notice span,
.schedule-create-next-step span {
  font-size: 13px;
  line-height: 1.45;
}

.schedule-create-notice {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e40af;
}

.schedule-create-problem-card {
  border: 1px solid #fecaca;
  background: #ffffff;
}

.schedule-create-models-card {
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.schedule-create-result-title {
  margin-bottom: 9px;
  color: #111827;
  font-size: 15px;
  font-weight: 850;
}

.schedule-create-result-dates,
.schedule-create-model-dates,
.schedule-create-unknown-model span {
  color: #475569;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
}

.schedule-create-result-help {
  margin-top: 10px;
  color: #991b1b;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
}

.schedule-create-unknown-model {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fef2f2;
}

.schedule-create-unknown-model strong,
.schedule-create-unknown-model span {
  display: block;
}

.schedule-create-unknown-model strong {
  margin-bottom: 3px;
  color: #991b1b;
  font-size: 12px;
}

.schedule-create-model-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-create-model-row {
  padding: 12px 13px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.schedule-create-model-name {
  margin-bottom: 4px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 850;
}

.schedule-create-next-step {
  border: 1px solid #bbf7d0;
  background: #ecfdf5;
  color: #166534;
}

.schedule-create-input-button {
  width: 100%;
  min-height: 46px;
  margin-top: 14px;
  border: none;
  border-radius: 14px;
  background: #16a34a;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.schedule-create-input-button:active {
  transform: scale(0.985);
}

.schedule-create-input-button:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
}

.schedule-generator-input {
  margin-top: 18px;
  padding: 20px;
  border: 1px solid #dbeafe;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.schedule-generator-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 14px;
}

.schedule-generator-summary-item {
  min-width: 0;
  padding: 13px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  text-align: center;
}

.schedule-generator-summary-item strong,
.schedule-generator-summary-item span {
  display: block;
}

.schedule-generator-summary-item strong {
  margin-bottom: 3px;
  color: #0f172a;
  font-size: 21px;
  font-weight: 900;
}

.schedule-generator-summary-item span {
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.25;
}

.schedule-generator-alert {
  padding: 14px 15px;
  border: 1px solid;
  border-radius: 16px;
}

.schedule-generator-alert strong,
.schedule-generator-alert span {
  display: block;
}

.schedule-generator-alert strong {
  margin-bottom: 4px;
  font-size: 14px;
}

.schedule-generator-alert span {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.schedule-generator-alert.shortage {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #991b1b;
}

.schedule-generator-alert.preferred {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #92400e;
}

.schedule-generator-alert.complete {
  border-color: #86efac;
  background: #f0fdf4;
  color: #166534;
}

.schedule-generator-manager-info {
  margin-top: 10px;
  padding: 11px 13px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.schedule-generator-days-toggle {
  width: 100%;
  min-height: 50px;
  margin: 18px 0 9px;
  padding: 0 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #dbe4ef;
  border-radius: 15px;
  background: #f8fafc;
  color: #111827;
  font-size: 16px;
  font-weight: 850;
  text-align: left;
  cursor: pointer;
}

.schedule-generator-days-toggle:active,
.schedule-generator-day-toggle:active {
  transform: scale(0.99);
}

.schedule-generator-toggle-arrow {
  flex-shrink: 0;
  color: #64748b;
  font-size: 24px;
  font-weight: 500;
  line-height: 1;
  transform: rotate(0deg);
  transition: transform 0.18s ease;
}

.schedule-generator-toggle-arrow.expanded {
  transform: rotate(90deg);
}

.schedule-generator-days-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.schedule-generator-day {
  border: 1px solid #e2e8f0;
  border-left-width: 5px;
  border-radius: 16px;
  background: #ffffff;
}

.schedule-generator-day.complete {
  border-left-color: #22c55e;
}

.schedule-generator-day.preferred {
  border-left-color: #f59e0b;
  background: #fffdf7;
}

.schedule-generator-day.shortage {
  border-color: #fecaca;
  border-left-color: #ef4444;
  background: #fffafa;
}

.schedule-generator-day.empty {
  border-left-color: #94a3b8;
  background: #f8fafc;
}

.schedule-generator-day-toggle {
  width: 100%;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.schedule-generator-day-heading {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.schedule-generator-day-date {
  color: #111827;
  font-size: 14px;
  font-weight: 850;
}

.schedule-generator-day-model {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}

.schedule-generator-day-status {
  flex-shrink: 0;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 850;
  text-align: center;
}

.schedule-generator-day-status.complete {
  background: #dcfce7;
  color: #166534;
}

.schedule-generator-day-status.preferred {
  background: #fef3c7;
  color: #92400e;
}

.schedule-generator-day-status.shortage {
  background: #fee2e2;
  color: #991b1b;
}

.schedule-generator-day-status.empty {
  background: #e2e8f0;
  color: #475569;
}

.schedule-generator-day-details {
  padding: 0 14px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.schedule-generator-required-row {
  padding-top: 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
}

.schedule-generator-availability-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-generator-availability-row span {
  padding: 5px 8px;
  border-radius: 9px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 750;
}

.schedule-generator-shift-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.schedule-generator-shift-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
}

.schedule-generator-shift-row.shortage {
  background: #fef2f2;
  color: #991b1b;
}

.schedule-generator-shift-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.schedule-generator-shift-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-generator-shift-main span {
  color: #64748b;
  font-weight: 650;
}

.schedule-generator-shift-row.shortage .schedule-generator-shift-main span {
  color: #b91c1c;
}

.schedule-generator-shift-result {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}

.schedule-generator-shift-result span {
  font-weight: 700;
}

.schedule-generator-shift-result strong {
  color: #15803d;
  font-size: 11px;
}

.schedule-generator-shift-row.shortage .schedule-generator-shift-result strong {
  color: #b91c1c;
}

.schedule-generator-empty-day {
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}

@media (max-width: 520px) {
  .schedule-create-date-grid {
    grid-template-columns: 1fr;
  }

  .schedule-create-card {
    padding: 17px;
  }

  .schedule-generator-input {
    padding: 17px;
  }

  .schedule-generator-summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .schedule-generator-day-heading {
    flex-direction: column;
    gap: 8px;
  }

  .schedule-generator-day-status {
    align-self: flex-start;
  }

  .schedule-generator-shift-row {
    align-items: flex-start;
  }
}
.schedule-draft-create-card {
  margin-top: 22px;
  padding: 20px;
  border: 1px solid #dbeafe;
  border-radius: 20px;
  background: #f8fbff;
}

.schedule-draft-create-error {
  margin-top: 12px;
}

.schedule-draft-create-button {
  width: 100%;
  margin-top: 16px;
}

.schedule-draft-created-dialog .app-dialog-icon {
  color: #ffffff;
  background: #34c759;
}

.schedule-draft-created-dialog .app-dialog-title,
.schedule-draft-created-dialog .app-dialog-message {
  text-align: center;
}
</style>
