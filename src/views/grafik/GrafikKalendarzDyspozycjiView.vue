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


  <div class="schedule-calendar-actions">
  <button
  type="button"
  class="schedule-multi-select-button"
  :class="{ active: isMultiSelectMode }"
  title="Tryb zaznaczania"
  @click="toggleMultiSelectMode"
>
  ☑️
</button>
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
  selected: day && formatDateKey(day) === selectedDateKey,
  multiSelected:
    day &&
    selectedDateKeys.includes(formatDateKey(day))
}"
    >
      <template v-if="day">
  <span class="schedule-calendar-day-number">
    {{ day.getDate() }}
  </span>


  <span
  v-if="getAvailabilityForDay(day)"
  class="schedule-availability-status-dot"
  :class="`status-${getAvailabilityForDay(day).type}`"
></span>
  


  <span
    v-if="isMultiSelectMode"
    class="schedule-calendar-checkbox"
    :class="{
      checked: selectedDateKeys.includes(formatDateKey(day))
    }"
  >
    <span
      v-if="selectedDateKeys.includes(formatDateKey(day))"
      class="schedule-calendar-checkbox-mark"
    >
      ✓
    </span>
  </span>
</template>
    </div>
  </div>
</div>




<div
  v-if="selectedDateKey || selectedDateKeys.length > 0"
  class="schedule-selected-day-panel"
>
  <div class="schedule-selected-day-label">
  {{
    selectedDateKeys.length > 0
      ? 'Zaznaczone dni'
      : 'Wybrany dzień'
  }}
</div>

<div class="schedule-selected-day-date">
  {{
    selectedDateKeys.length > 0
      ? selectedDatesLabel
      : selectedDateLabel
  }}
</div>

  <div class="schedule-availability-options">
  <button
    v-for="option in availabilityOptions"
    :key="option.value"
    type="button"
    class="schedule-availability-option"
    :class="[
  `color-${option.color}`,
  {
    active: selectedAvailabilityType === option.value
  }
]"
    @click="selectedAvailabilityType = option.value"
  >
    <span class="schedule-availability-option-icon">
      {{ option.icon }}
    </span>

    <span class="schedule-availability-option-content">
      <span class="schedule-availability-option-title">
        {{ option.label }}
      </span>

      <span class="schedule-availability-option-description">
        {{ option.description }}
      </span>
    </span>
  </button>
</div>



<div
  v-if="selectedAvailabilityType === 'partial'"
  class="schedule-availability-time-range"
>
  <label class="schedule-availability-time-field">
    <span class="schedule-availability-time-label">
      Od
    </span>

    <div class="schedule-time-input-wrap">
      <input
        v-model="availabilityTimeFrom"
        type="time"
        class="schedule-availability-time-input"
        aria-label="Godzina rozpoczęcia dyspozycyjności"
      >

      <button
        class="schedule-time-picker-button"
        type="button"
        title="Wybierz godzinę rozpoczęcia"
        @click="openAvailabilityTimePicker('from')"
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

  <label class="schedule-availability-time-field">
    <span class="schedule-availability-time-label">
      Do
    </span>

    <div class="schedule-time-input-wrap">
      <input
        v-model="availabilityTimeTo"
        type="time"
        class="schedule-availability-time-input"
        aria-label="Godzina zakończenia dyspozycyjności"
      >

      <button
        class="schedule-time-picker-button"
        type="button"
        title="Wybierz godzinę zakończenia"
        @click="openAvailabilityTimePicker('to')"
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





<div class="schedule-availability-note">
  <div class="schedule-availability-note-header">
    <label class="schedule-availability-note-label">
      Notatka
    </label>

    <span class="schedule-availability-note-counter">
      {{ availabilityNote.length }}/{{ availabilityNoteMaxLength }}
    </span>
  </div>

  <textarea
    v-model="availabilityNote"
    :maxlength="availabilityNoteMaxLength"
    class="schedule-availability-note-input"
    placeholder="Opcjonalna krótka informacja..."
    rows="3"
  ></textarea>
</div>

<button
  type="button"
  class="schedule-availability-save-button"
  :disabled="isSavingAvailability"
  :class="{ disabled: isSavingAvailability }"
  @click="saveAvailability"
>
  {{
    isSavingAvailability
      ? 'Zapisywanie...'
      : 'Zapisz dyspozycyjność'
  }}
</button>




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


<div
  v-if="showAvailabilityTimePickerModal"
  class="app-dialog-overlay"
  @click.self="closeAvailabilityTimePicker"
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
              'schedule-time-wheel-option-active':
                selectedHour === hour
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
              'schedule-time-wheel-option-active':
                selectedMinute === minute
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
        @click="closeAvailabilityTimePicker"
      >
        Anuluj
      </button>

      <button
        class="app-dialog-button app-dialog-ok"
        type="button"
        @click="applyAvailabilityTime"
      >
        Ustaw
      </button>
    </div>
  </div>
</div>


<div
  v-if="saveResultModal.visible"
  class="app-dialog-overlay"
>
  <div
    class="app-dialog-card schedule-save-result-dialog"
    :class="{
      success: saveResultModal.type === 'success',
      error: saveResultModal.type === 'error'
    }"
  >
    <div class="schedule-save-result-icon">
      {{
        saveResultModal.type === 'success'
          ? '✓'
          : '!'
      }}
    </div>

    <div class="app-dialog-title">
      {{
        saveResultModal.type === 'success'
          ? 'Gotowe'
          : 'Błąd zapisu'
      }}
    </div>

    <div class="app-dialog-message">
      {{ saveResultModal.message }}
    </div>
  </div>
</div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useEmployeesStore } from '../../stores/employeesStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const employeesStore = useEmployeesStore()
const authStore = useAuthStore()

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


const selectedDatesLabel = computed(() => {
  if (selectedDateKeys.value.length === 0) {
    return ''
  }

  const sortedDateKeys = [...selectedDateKeys.value].sort()

  const groupedDates = new Map()

  sortedDateKeys.forEach(dateKey => {
    const [year, month, day] = dateKey
      .split('-')
      .map(Number)

    const monthKey = `${String(month).padStart(2, '0')}/${year}`

    if (!groupedDates.has(monthKey)) {
      groupedDates.set(monthKey, [])
    }

    groupedDates.get(monthKey).push(day)
  })

  return [...groupedDates.entries()]
    .map(([monthYear, days]) => {
      return `(${days.join(', ')})/${monthYear}`
    })
    .join(' • ')
})



const selectedDateKey = ref(null)

const isMultiSelectMode = ref(false)
const selectedDateKeys = ref([])

const availabilityOptions = [
  {
    value: 'full',
    label: 'Mogę cały dzień',
    description: 'Pełna dostępność',
    icon: '✓',
    color: 'green'
  },
  {
    value: 'partial',
    label: 'Tylko w godzinach',
    description: 'Podaj dostępne godziny',
    icon: '◷',
    color: 'blue'
  },
  {
    value: 'preferred_off',
    label: 'Chciałbym wolne',
    description: 'Preferowany dzień wolny',
    icon: '♡',
    color: 'orange'
  },
  {
    value: 'unavailable',
    label: 'Nie mogę pracować',
    description: 'Brak dostępności',
    icon: '×',
    color: 'red'
  }
]


const availabilityEmployeeId = computed(() => {
  if (selectedViewMode.value === 'mine') {
    return loggedEmployeeId.value
  }

  if (selectedViewMode.value === 'employee') {
    return selectedEmployeeId.value
  }

  return null
})

const availabilityRestaurantId = computed(() => {
  return (
    employeeAuthStore.restaurantId ||
    authStore.currentCompany?.uid ||
    null
  )
})





const datesSelectedForAvailability = computed(() => {
  if (selectedDateKeys.value.length > 0) {
    return [...selectedDateKeys.value].sort()
  }

  if (selectedDateKey.value) {
    return [selectedDateKey.value]
  }

  return []
})

const isSavingAvailability = ref(false)
const saveResultModal = ref({
  visible: false,
  type: 'success',
  message: ''
})

let saveResultModalTimeout = null

const showSaveResultModal = (type, message) => {
  if (saveResultModalTimeout) {
    clearTimeout(saveResultModalTimeout)
  }

  saveResultModal.value = {
    visible: true,
    type,
    message
  }

  saveResultModalTimeout = setTimeout(() => {
    saveResultModal.value.visible = false
  }, 1000)
}
const availabilityRecords = ref({})
const isLoadingAvailability = ref(false)
const loadAvailability = async () => {
  const restaurantId = availabilityRestaurantId.value
  const employeeId = availabilityEmployeeId.value

  if (!restaurantId || !employeeId) {
    availabilityRecords.value = {}
    return
  }

  isLoadingAvailability.value = true

  try {
    const availabilityQuery = query(
      collection(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc'
      ),
      where('employeeId', '==', employeeId)
    )

    const snapshot = await getDocs(availabilityQuery)

    availabilityRecords.value = snapshot.docs.reduce(
      (records, documentSnapshot) => {
        const data = documentSnapshot.data()

        if (data.date) {
          records[data.date] = {
            id: documentSnapshot.id,
            ...data
          }
        }

        return records
      },
      {}
    )
  } catch (error) {
    console.error(
      'Błąd pobierania dyspozycyjności:',
      error
    )

    availabilityRecords.value = {}
  } finally {
    isLoadingAvailability.value = false
  }
}


const getAvailabilityForDay = (day) => {
  if (!day) return null

  return availabilityRecords.value[formatDateKey(day)] || null
}

const loadAvailabilityIntoForm = (dateKey) => {
  const record = availabilityRecords.value[dateKey]

  if (!record) {
    selectedAvailabilityType.value = 'full'
    availabilityTimeFrom.value = '00:00'
    availabilityTimeTo.value = '00:00'
    availabilityNote.value = ''
    return
  }

  selectedAvailabilityType.value = record.type || 'full'
  availabilityTimeFrom.value = record.timeFrom || '00:00'
  availabilityTimeTo.value = record.timeTo || '00:00'
  availabilityNote.value = record.note || ''
}





watch(
  availabilityEmployeeId,
  async () => {
    await loadAvailability()
  },
  { immediate: true }
)




const saveAvailability = async () => {
  if (isSavingAvailability.value) return

  const restaurantId = availabilityRestaurantId.value
  const employeeId = availabilityEmployeeId.value
  const selectedDates = datesSelectedForAvailability.value

  if (!restaurantId) {
    alert('Nie udało się rozpoznać restauracji.')
    return
  }

  if (!employeeId) {
    alert('Wybierz pracownika.')
    return
  }

  if (selectedDates.length === 0) {
    alert('Wybierz co najmniej jeden dzień.')
    return
  }

  if (
    selectedAvailabilityType.value === 'partial' &&
    availabilityTimeFrom.value === availabilityTimeTo.value
  ) {
    alert('Godziny „od” i „do” muszą być różne.')
    return
  }

  isSavingAvailability.value = true

  try {
    const batch = writeBatch(db)

    selectedDates.forEach(dateKey => {
      const documentId = `${employeeId}_${dateKey}`

      const availabilityRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc',
        documentId
      )

      if (selectedAvailabilityType.value === 'full') {
        batch.delete(availabilityRef)
        return
      }

      const availabilityData = {
        employeeId,
        date: dateKey,
        type: selectedAvailabilityType.value,
        note: availabilityNote.value.trim(),
        updatedAt: serverTimestamp()
      }

      if (selectedAvailabilityType.value === 'partial') {
        availabilityData.timeFrom = availabilityTimeFrom.value
        availabilityData.timeTo = availabilityTimeTo.value
      }

      batch.set(
        availabilityRef,
        availabilityData,
        { merge: true }
      )
    })

    await batch.commit()
    await loadAvailability()

    showSaveResultModal(
  'success',
  selectedDates.length === 1
    ? 'Zapisano dyspozycyjność'
    : `Zapisano dyspozycyjność dla ${selectedDates.length} dni`
)
  } catch (error) {
    console.error(
      'Błąd zapisu dyspozycyjności:',
      error
    )

    showSaveResultModal(
  'error',
  'Nie udało się zapisać dyspozycyjności'
)
  } finally {
    isSavingAvailability.value = false
  }
}




const selectedAvailabilityType = ref('full')
const availabilityTimeFrom = ref('00:00')
const availabilityTimeTo = ref('00:00')
const showAvailabilityTimePickerModal = ref(false)
const availabilityTimePickerTarget = ref(null)

const selectedHour = ref('00')
const selectedMinute = ref('00')

const hours = Array.from(
  { length: 24 },
  (_, index) => String(index).padStart(2, '0')
)

const minutes = Array.from(
  { length: 60 },
  (_, index) => String(index).padStart(2, '0')
)

const openAvailabilityTimePicker = (target) => {
  availabilityTimePickerTarget.value = target

  const currentTime =
    target === 'from'
      ? availabilityTimeFrom.value
      : availabilityTimeTo.value

  const [hour = '00', minute = '00'] =
    currentTime.split(':')

  selectedHour.value = hour
  selectedMinute.value = minute

  showAvailabilityTimePickerModal.value = true
}

const closeAvailabilityTimePicker = () => {
  showAvailabilityTimePickerModal.value = false
  availabilityTimePickerTarget.value = null
}

const applyAvailabilityTime = () => {
  const selectedTime =
    `${selectedHour.value}:${selectedMinute.value}`

  if (availabilityTimePickerTarget.value === 'from') {
    availabilityTimeFrom.value = selectedTime
  }

  if (availabilityTimePickerTarget.value === 'to') {
    availabilityTimeTo.value = selectedTime
  }

  closeAvailabilityTimePicker()
}
const availabilityNote = ref('')
const availabilityNoteMaxLength = 60

const toggleMultiSelectMode = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value

  if (isMultiSelectMode.value) {
    selectedDateKey.value = null
    selectedDateKeys.value = []
    return
  }

  selectedDateKeys.value = []
}

const selectCalendarDay = (day) => {
  if (!day) return

  const dateKey = formatDateKey(day)

  if (isMultiSelectMode.value) {
    const dayIndex = selectedDateKeys.value.indexOf(dateKey)

    if (dayIndex === -1) {
      selectedDateKeys.value.push(dateKey)
    } else {
      selectedDateKeys.value.splice(dayIndex, 1)
    }

    return
  }

  selectedDateKey.value = dateKey
  loadAvailabilityIntoForm(dateKey)
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