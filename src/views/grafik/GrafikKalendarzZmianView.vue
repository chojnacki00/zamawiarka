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
      <div class="employee-control">
        <label
          v-if="access.canSelectEmployee"
          class="employee-selector"
        >
          <select
            v-model="selectedEmployeeId"
            aria-label="Pracownik"
          >
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

        <div
          v-else
          class="employee-readonly"
          aria-label="Pracownik"
        >
          {{ ownEmployeeName }}
        </div>

        <div v-if="sessionEmployeeError" class="calendar-message error">
          Nie udało się rozpoznać pracownika dla tej sesji.
        </div>
      </div>

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
.published-calendar-screen {
  overflow: hidden;
}

.published-calendar-screen > .zamawiarka-menu-topbar {
  margin-bottom: 8px;
  padding-bottom: 8px;
}

.published-calendar-scroll {
  display: flex;
  min-height: 0;
  padding-top: 0;
  padding-bottom: max(4px, env(safe-area-inset-bottom));
  flex-direction: column;
  overflow-y: hidden;
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

.employee-control,
.employee-selector,
.employee-readonly {
  width: 100%;
  max-width: 920px;
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
}

.employee-control {
  flex: 0 0 auto;
  margin-bottom: 8px;
}

.employee-selector {
  display: block;
}

.employee-selector select,
.employee-readonly {
  width: 100%;
  height: 44px;
  min-height: 44px;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1px solid #bfdbfe;
  border-radius: 13px;
  color: #1e3a8a;
  background: #eff6ff;
  font-size: 16px;
  font-weight: 750;
}

.employee-readonly {
  display: flex;
  align-items: center;
}

.calendar-panel {
  display: flex;
  min-height: 0;
  padding: 5px 6px 7px;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}

.month-navigation {
  display: grid;
  min-height: 44px;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.month-navigation button {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  color: #1d4ed8;
  background: #f8fafc;
  font-size: 26px;
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

.calendar-grid {
  min-height: 0;
  grid-template-rows: repeat(6, minmax(0, 1fr));
  flex: 1 1 auto;
}

.calendar-weekdays span {
  min-width: 0;
  padding: 3px 0 5px;
  color: #64748b;
  font-size: 10px;
  font-weight: 900;
  text-align: center;
}

.calendar-day {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 4px 3px;
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
  width: 26px;
  height: 26px;
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
  margin-top: 0;
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
  margin: 2px 0 6px;
  padding: 7px 10px;
  border-radius: 12px;
  color: #475569;
  background: #f1f5f9;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
}

.calendar-message.error {
  margin-top: 6px;
  color: #b91c1c;
  background: #fee2e2;
}

@media (max-width: 420px) {
  .calendar-panel {
    border-radius: 17px;
    padding-right: 4px;
    padding-left: 4px;
  }

  .calendar-day {
    padding: 3px 2px;
  }

  .day-number {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
}

@media (min-width: 760px) {
  .published-calendar-scroll {
    align-items: center;
  }

  .employee-control {
    margin-bottom: 10px;
  }

  .calendar-panel {
    width: 100%;
    max-height: 720px;
    padding: 10px 14px 14px;
    flex: 0 1 720px;
  }

  .calendar-day {
    padding: 8px;
  }

  .day-number {
    font-size: 14px;
  }
}

@media (max-width: 759px) and (max-height: 620px) {
  .published-calendar-scroll {
    overflow-y: auto;
  }

  .calendar-panel {
    min-height: 400px;
    flex: 0 0 400px;
  }
}
</style>
