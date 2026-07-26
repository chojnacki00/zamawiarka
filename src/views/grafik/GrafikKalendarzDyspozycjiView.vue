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
        KALENDARZ DYSPOZYCYJNOŚCI
      </h2>
    </div>

    <div class="scroll-area">
  <div
    v-if="canManageSchedule"
    class="schedule-view-switcher"
  >
    <button
      type="button"
      class="schedule-view-switcher-button"
      :class="{ active: selectedViewMode === 'mine' }"
      @click="setViewMode('mine')"
    >
      Moja
    </button>

    <button
      type="button"
      class="schedule-view-switcher-button"
      :class="{ active: selectedViewMode === 'employee' }"
      @click="setViewMode('employee')"
    >
      Pracownik
    </button>

    <button
      type="button"
      class="schedule-view-switcher-button"
      :class="{ active: selectedViewMode === 'all' }"
      @click="setViewMode('all')"
    >
      Wszyscy
    </button>
  </div>


   <div
    v-if="canManageSchedule && selectedViewMode === 'employee'"
    style="width: 100%; max-width: 420px; margin: 0 auto 18px;"
  >
    <label
      style="display: block; margin-bottom: 7px; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase;"
    >
      Wybierz pracownika
    </label>

    <select
      v-model="selectedEmployeeId"
      translate="no"
      class="notranslate"
      style="width: 100%; min-height: 48px; padding: 0 42px 0 14px; border: 1px solid #dbe3ee; border-radius: 14px; background: white; color: #1e293b; font-size: 15px; font-weight: 700; outline: none;"
    >
      <option :value="null" disabled>
        Wybierz osobę...
      </option>

      <option
        v-for="employee in activeEmployees"
        :key="employee.id"
        :value="employee.id"
      >
        {{ employee.nazwisko }} {{ employee.imie }}
      </option>
    </select>
  </div>


  <div class="schedule-month-header">
  <button
    type="button"
    class="schedule-month-arrow"
    title="Poprzedni miesiąc"
    @click="changeMonth(-1)"
  >
    ‹
  </button>

  <div class="schedule-month-title">
    {{ displayedMonthLabel }}
  </div>

  <button
    type="button"
    class="schedule-month-arrow"
    title="Następny miesiąc"
    @click="changeMonth(1)"
  >
    ›
  </button>
</div>



<div class="schedule-calendar">
  <div class="schedule-weekdays">
    <div
      v-for="weekDay in weekDays"
      :key="weekDay"
      class="schedule-weekday"
    >
      {{ weekDay }}
    </div>
  </div>

  <div class="schedule-calendar-grid">
    <div
      v-for="(day, index) in calendarDays"
      :key="day ? day.toISOString() : `empty-${index}`"
      class="schedule-calendar-cell"
      @click="selectCalendarDay(day)"
     :class="{
  empty: !day,
  today: day && formatDateKey(day) === todayDateKey,
  selected: day && formatDateKey(day) === selectedDateKey
}"
    >
      <span v-if="day">
        {{ day.getDate() }}
      </span>
    </div>
  </div>
</div>




<div
  v-if="selectedDateKey"
  class="schedule-selected-day-panel"
>
  <div class="schedule-selected-day-label">
    Wybrany dzień
  </div>

  <div class="schedule-selected-day-date">
    {{ selectedDateLabel }}
  </div>

  <div class="schedule-selected-day-hint">
    W kolejnym kroku dodamy tutaj ustawienia dyspozycyjności.
  </div>
</div>




  <div class="empty-state">
    <div class="empty-title">
      {{
        selectedViewMode === 'all'
          ? 'Dyspozycyjność całego zespołu'
          : selectedViewMode === 'employee'
            ? 'Dyspozycyjność pracownika'
            : 'Moja dyspozycyjność'
      }}
    </div>

    <div class="empty-subtitle">
      Tutaj pojawi się kalendarz dyspozycyjności.
    </div>
  </div>
</div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useEmployeesStore } from '../../stores/employeesStore.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const employeesStore = useEmployeesStore()

onMounted(async () => {
  await employeesStore.fetchEmployees()
})

const canManageSchedule = computed(() => {
  if (!employeeAuthStore.currentEmployee) {
    return true
  }

  return employeeAuthStore.hasPermission(
    'can_manage_schedule'
  )
})

const loggedEmployeeId = computed(() => {
  return employeeAuthStore.currentEmployee?.id || null
})

const selectedEmployeeId = ref(
  employeeAuthStore.currentEmployee?.id || null
)

const selectedViewMode = ref('mine')

const setViewMode = (mode) => {
  selectedViewMode.value = mode

  if (mode === 'mine') {
    selectedEmployeeId.value = loggedEmployeeId.value
  }
}



const selectedDateLabel = computed(() => {
  if (!selectedDateKey.value) {
    return ''
  }

  const [year, month, day] = selectedDateKey.value
    .split('-')
    .map(Number)

  const selectedDate = new Date(
    year,
    month - 1,
    day
  )

  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Warsaw'
  }).format(selectedDate)
})




const selectedDateKey = ref(null)

const selectCalendarDay = (day) => {
  if (!day) return

  selectedDateKey.value = formatDateKey(day)
}



const displayedMonth = ref(
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
)

const displayedMonthLabel = computed(() => {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(displayedMonth.value)
})

const changeMonth = (offset) => {
  displayedMonth.value = new Date(
    displayedMonth.value.getFullYear(),
    displayedMonth.value.getMonth() + offset,
    1
  )
}



const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const todayDateKey = new Intl.DateTimeFormat(
  'en-CA',
  {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
).format(new Date())





const weekDays = [
  'Pn',
  'Wt',
  'Śr',
  'Cz',
  'Pt',
  'Sb',
  'Nd'
]

const calendarDays = computed(() => {
  const year = displayedMonth.value.getFullYear()
  const month = displayedMonth.value.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  const firstWeekDay =
    (firstDayOfMonth.getDay() + 6) % 7

  const days = []

  for (let i = 0; i < firstWeekDay; i += 1) {
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





const activeEmployees = computed(() => {
  return [...(employeesStore.employees || [])]
    .filter(employee => employee.aktywny !== false)
    .sort((a, b) => {
      const lastNameA = (a.nazwisko || '').toLowerCase()
      const lastNameB = (b.nazwisko || '').toLowerCase()

      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB, 'pl')
      }

      return (a.imie || '').localeCompare(
        b.imie || '',
        'pl'
      )
    })
})



</script>