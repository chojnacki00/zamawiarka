<template>
  <main class="screen-with-topbar published-calendar-screen">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik')"
      >←</button>
      <h2 class="zamawiarka-menu-title">KALENDARZ ZMIAN</h2>
    </div>

    <div class="scroll-area published-calendar-scroll">
      <section class="published-calendar-card employee-panel">
        <div class="section-heading">
          <span>PODGLĄD PRACOWNIKA</span>
          <h3>Kalendarz — podgląd zmian</h3>
        </div>

        <label
          v-if="access.canSelectEmployee"
          class="employee-selector"
        >
          <span>Pracownik</span>
          <select v-model="selectedEmployeeId">
            <option value="">Wybierz pracownika</option>
            <option
              v-for="employee in selectableEmployees"
              :key="employee.id"
              :value="employee.id"
            >
              {{ getEmployeeName(employee) }}
            </option>
          </select>
        </label>

        <div v-else class="employee-readonly">
          <span>Pracownik</span>
          <strong>{{ ownEmployeeName }}</strong>
        </div>

        <div v-if="sessionEmployeeError" class="calendar-message error">
          Nie udało się rozpoznać pracownika dla tej sesji.
        </div>
      </section>

      <div v-if="isLoading" class="published-calendar-card calendar-state">
        Pobieranie opublikowanego grafiku...
      </div>

      <section
        v-else-if="loadError"
        class="published-calendar-card calendar-state error"
      >
        <strong>{{ loadError }}</strong>
        <button type="button" @click="refreshCalendar">Spróbuj ponownie</button>
      </section>

      <section v-else class="published-calendar-card calendar-panel">
        <div class="month-navigation">
          <button
            type="button"
            title="Poprzedni opublikowany miesiąc"
            aria-label="Poprzedni opublikowany miesiąc"
            :disabled="!previousMonthKey"
            @click="changeMonth(previousMonthKey)"
          >‹</button>
          <strong>{{ displayedMonthLabel }}</strong>
          <button
            type="button"
            title="Następny opublikowany miesiąc"
            aria-label="Następny opublikowany miesiąc"
            :disabled="!nextMonthKey"
            @click="changeMonth(nextMonthKey)"
          >›</button>
        </div>

        <div v-if="hasNoPublishedSchedules" class="calendar-message">
          Brak opublikowanego grafiku.
        </div>

        <div
          v-else-if="access.isAdmin && !selectedEmployeeId"
          class="calendar-message"
        >
          Wybierz pracownika, aby zobaczyć jego grafik.
        </div>

        <div class="calendar-weekdays" aria-hidden="true">
          <span
            v-for="weekday in PUBLISHED_CALENDAR_WEEKDAYS"
            :key="weekday"
          >{{ weekday }}</span>
        </div>

        <div class="calendar-grid" aria-label="Miesięczny kalendarz zmian">
          <div
            v-for="day in calendarDays"
            :key="day.dateKey"
            class="calendar-day"
            :class="{
              outside: !day.isCurrentMonth,
              inactive: !day.isPublished,
              published: day.isPublished
            }"
          >
            <span
              class="day-number"
              :class="{ today: day.isToday }"
            >{{ day.dayNumber }}</span>
            <span
              v-if="day.employeeShifts.length"
              class="shift-count-marker"
              :title="`${day.employeeShifts.length} zmian`"
              :aria-label="`${day.employeeShifts.length} zmian`"
            >
              {{ day.employeeShifts.length > 1
                ? day.employeeShifts.length
                : '' }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useEmployeesStore } from '../../stores/employeesStore.js'
import {
  PUBLISHED_CALENDAR_ERROR_CODES,
  usePublishedScheduleCalendarStore
} from '../../stores/publishedScheduleCalendarStore.js'
import { getEmployeeFullName } from '../../utils/employeeAssignments.js'
import {
  PUBLISHED_CALENDAR_WEEKDAYS,
  buildPublishedMonthGrid,
  chooseInitialPublishedMonth,
  getAdjacentPublishedMonth,
  getPublishedCalendarAccess,
  resolvePublishedCalendarEmployeeId
} from '../../utils/publishedScheduleCalendar.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const employeesStore = useEmployeesStore()
const calendarStore = usePublishedScheduleCalendarStore()
const displayedMonthKey = ref('')
const selectedEmployeeId = ref('')
const isLoading = ref(false)
const loadError = ref('')

const getTodayDateKey = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayDateKey = getTodayDateKey()
const currentMonthKey = todayDateKey.slice(0, 7)
const access = computed(() => getPublishedCalendarAccess({
  hasEmployeeSession: Boolean(employeeAuthStore.currentEmployee),
  employeeId: employeeAuthStore.currentEmployee?.id,
  employeePermissions:
    employeeAuthStore.currentEmployee?.uprawnienia || {},
  hasAdminSession: Boolean(getAuth().currentUser)
}))
const sessionEmployeeError = computed(() => (
  Boolean(employeeAuthStore.currentEmployee) &&
  !access.value.ownEmployeeId
))
const ownEmployeeName = computed(() => (
  getEmployeeName(employeeAuthStore.currentEmployee) ||
  'Nieznany pracownik'
))
const selectableEmployees = computed(() => (
  [...employeesStore.employees]
    .filter(employee => employee.aktywny !== false)
    .sort((first, second) => (
      getEmployeeName(first).localeCompare(
        getEmployeeName(second),
        'pl'
      )
    ))
))
const publishedMonthKeys = computed(() => (
  calendarStore.calendarIndex.publishedMonthKeys || []
))
const hasNoPublishedSchedules = computed(() => (
  publishedMonthKeys.value.length === 0
))
const previousMonthKey = computed(() => getAdjacentPublishedMonth({
  currentMonthKey: displayedMonthKey.value,
  publishedMonthKeys: publishedMonthKeys.value,
  offset: -1
}))
const nextMonthKey = computed(() => getAdjacentPublishedMonth({
  currentMonthKey: displayedMonthKey.value,
  publishedMonthKeys: publishedMonthKeys.value,
  offset: 1
}))
const displayedMonthLabel = computed(() => {
  if (!displayedMonthKey.value) return ''

  const [year, month] = displayedMonthKey.value
    .split('-')
    .map(Number)
  const date = new Date(year, month - 1, 1)
  const label = new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(date)

  return label.charAt(0).toUpperCase() + label.slice(1)
})
const authorizedEmployeeId = computed(() => (
  resolvePublishedCalendarEmployeeId({
    access: access.value,
    requestedEmployeeId: selectedEmployeeId.value
  })
))
const calendarDays = computed(() => {
  if (!displayedMonthKey.value) return []

  const grid = buildPublishedMonthGrid({
    monthKey: displayedMonthKey.value,
    todayDateKey
  })
  const monthDays = calendarStore.getMonthDays(
    displayedMonthKey.value
  )

  return grid.map(day => {
    const publicDay = day.isCurrentMonth
      ? monthDays[day.dateKey] || null
      : null
    const employeeShifts = publicDay && authorizedEmployeeId.value
      ? calendarStore.getAuthorizedEmployeeShifts({
          dateKey: day.dateKey,
          requestedEmployeeId: selectedEmployeeId.value
        })
      : []

    return {
      ...day,
      isPublished: Boolean(publicDay),
      publicDay,
      employeeShifts
    }
  })
})

const getEmployeeName = employee => (
  getEmployeeFullName(employee) ||
  String(employee?.displayName || '').trim()
)

const getLoadErrorMessage = error => {
  if (
    error?.code ===
    PUBLISHED_CALENDAR_ERROR_CODES.INCONSISTENT_DATA
  ) {
    return 'Nie udało się pobrać pełnych danych opublikowanego grafiku. Odśwież widok lub skontaktuj się z managerem.'
  }

  return 'Nie udało się pobrać opublikowanego grafiku. Spróbuj ponownie.'
}

const loadDisplayedMonth = async ({ force = false } = {}) => {
  if (!publishedMonthKeys.value.includes(displayedMonthKey.value)) return
  await calendarStore.fetchMonth(displayedMonthKey.value, { force })
}

const refreshCalendar = async () => {
  if (isLoading.value || !access.value.canAccess) return

  isLoading.value = true
  loadError.value = ''

  try {
    const index = await calendarStore.fetchHeaders({ force: true })
    const currentDisplayedMonth = displayedMonthKey.value

    displayedMonthKey.value = index.publishedMonthKeys.includes(
      currentDisplayedMonth
    )
      ? currentDisplayedMonth
      : chooseInitialPublishedMonth({
          currentMonthKey,
          publishedMonthKeys: index.publishedMonthKeys
        })

    await loadDisplayedMonth({ force: true })
  } catch (error) {
    console.error('Błąd odczytu opublikowanego kalendarza:', error)
    console.error('Szczegóły danych publicznych:', error?.cause || error)
    loadError.value = getLoadErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const changeMonth = async monthKey => {
  if (!monthKey || isLoading.value) return

  displayedMonthKey.value = monthKey
  isLoading.value = true
  loadError.value = ''

  try {
    await loadDisplayedMonth()
  } catch (error) {
    console.error('Błąd odczytu miesiąca opublikowanego grafiku:', error)
    console.error('Szczegóły danych publicznych:', error?.cause || error)
    loadError.value = getLoadErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!access.value.canAccess) {
    router.replace('/grafik')
    return
  }

  if (sessionEmployeeError.value) return

  selectedEmployeeId.value = access.value.defaultEmployeeId || ''

  if (access.value.canSelectEmployee) {
    await employeesStore.fetchEmployees()
  }

  await refreshCalendar()
})
</script>

<style scoped>
.published-calendar-scroll {
  padding-top: 4px;
}

.published-calendar-card {
  width: 100%;
  max-width: 920px;
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.employee-panel {
  padding: 18px;
}

.section-heading > span,
.employee-selector > span,
.employee-readonly > span {
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.section-heading h3 {
  margin: 5px 0 16px;
  color: #111827;
  font-size: 21px;
}

.employee-selector,
.employee-readonly {
  display: grid;
  gap: 7px;
}

.employee-selector select,
.employee-readonly strong {
  width: 100%;
  min-height: 50px;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1px solid #bfdbfe;
  border-radius: 13px;
  color: #1e3a8a;
  background: #eff6ff;
  font-size: 16px;
  font-weight: 750;
}

.employee-readonly strong {
  display: flex;
  align-items: center;
}

.calendar-panel {
  margin-top: 14px;
  padding: 14px 10px 18px;
  overflow: hidden;
}

.month-navigation {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.month-navigation button {
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  color: #1d4ed8;
  background: #f8fafc;
  font-size: 29px;
  line-height: 1;
}

.month-navigation button:disabled {
  color: #cbd5e1;
  background: #f8fafc;
  opacity: 0.65;
}

.month-navigation strong {
  min-width: 0;
  color: #111827;
  font-size: 18px;
  text-align: center;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekdays span {
  min-width: 0;
  padding: 7px 0 9px;
  color: #64748b;
  font-size: 10px;
  font-weight: 900;
  text-align: center;
}

.calendar-day {
  position: relative;
  min-width: 0;
  min-height: 72px;
  padding: 7px 5px;
  box-sizing: border-box;
  color: #1f2937;
  background: #ffffff;
}

.calendar-day:nth-child(7n + 2),
.calendar-day:nth-child(7n + 3),
.calendar-day:nth-child(7n + 4),
.calendar-day:nth-child(7n + 5),
.calendar-day:nth-child(7n + 6),
.calendar-day:nth-child(7n + 7) {
  border-left: 1px solid #e5e7eb;
}

.calendar-day:nth-child(n + 8) {
  border-top: 1px solid #e5e7eb;
}

.calendar-day.inactive {
  color: #94a3b8;
  background: #f8fafc;
}

.calendar-day.outside {
  color: #d1d5db;
  background: #fcfcfd;
}

.calendar-day.published {
  background: #ffffff;
}

.day-number {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
}

.day-number.today {
  color: #1d4ed8;
  background: #dbeafe;
  box-shadow: inset 0 0 0 1px #93c5fd;
}

.shift-count-marker {
  position: absolute;
  right: 7px;
  bottom: 8px;
  display: inline-flex;
  width: 17px;
  height: 17px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #ffffff;
  background: #64748b;
  font-size: 9px;
  font-weight: 900;
}

.shift-count-marker:empty {
  width: 8px;
  height: 8px;
  right: 10px;
  bottom: 11px;
}

.calendar-state {
  margin-top: 14px;
  padding: 26px 18px;
  color: #64748b;
  text-align: center;
}

.calendar-state.error {
  display: grid;
  justify-items: center;
  gap: 14px;
  color: #b91c1c;
  background: #fff7f7;
}

.calendar-state button {
  min-height: 42px;
  padding: 0 15px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: #2563eb;
  font-weight: 800;
}

.calendar-message {
  margin: 5px 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #475569;
  background: #f1f5f9;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
}

.calendar-message.error {
  margin-top: 13px;
  color: #b91c1c;
  background: #fee2e2;
}

@media (max-width: 420px) {
  .employee-panel {
    padding: 15px;
  }

  .calendar-panel {
    padding-right: 5px;
    padding-left: 5px;
  }

  .calendar-day {
    min-height: 62px;
    padding: 5px 3px;
  }

  .day-number {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }
}

@media (min-width: 760px) {
  .calendar-panel {
    padding: 20px 22px 24px;
  }

  .calendar-day {
    min-height: 96px;
    padding: 10px;
  }

  .day-number {
    font-size: 14px;
  }
}
</style>
