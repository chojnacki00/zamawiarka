<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button class="zamawiarka-menu-back" type="button" @click="router.push('/grafik/grafiki')">←</button>
      <h2 class="zamawiarka-menu-title">EDYCJA GRAFIKU</h2>
    </div>

    <div class="scroll-area editor-page">
      <div v-if="isLoading" class="editor-state">Pobieranie grafiku...</div>
      <div v-else-if="loadError" class="editor-state error">{{ loadError }}</div>

      <template v-else-if="schedule">
        <section class="editor-header">
          <div class="heading-row">
            <div>
              <div class="kicker">WERSJA ROBOCZA</div>
              <h3>{{ schedule.name }}</h3>
              <p>{{ formatDate(schedule.dateFrom) }} – {{ formatDate(schedule.dateTo) }}</p>
            </div>
            <span class="status-badge">Roboczy</span>
          </div>

          <div class="summary-grid">
            <div><strong>{{ days.length }}</strong><span>Dni</span></div>
            <div><strong>{{ schedule.vacanciesCount || 0 }}</strong><span>Wakaty</span></div>
            <div><strong>{{ schedule.assignedCount || 0 }}</strong><span>Obsadzone wakaty</span></div>
            <div><strong>{{ schedule.unfilledCount || 0 }}</strong><span>Nieobsadzonych</span></div>
            <div><strong>{{ schedule.extraShiftsCount || 0 }}</strong><span>Dodatkowych</span></div>
          </div>
        </section>

        <section class="matrix-card">
          <div class="matrix-toolbar">
            <div>
              <strong>Tabela grafiku</strong>
              <span>Kliknij zmianę, wakat, zielony „+” albo kreskę w pustym polu.</span>
            </div>
            <div class="toolbar-actions">
              <span v-if="saveState" class="save-state" :class="saveState">{{ saveStateLabel }}</span>
              <button type="button" @click="scrollMatrix(-7)">‹ 7 dni</button>
              <button type="button" @click="scrollMatrix(7)">7 dni ›</button>
            </div>
          </div>

          <div ref="matrixScroll" class="matrix-scroll">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="person-cell corner">Pracownik</th>
                  <th
                    v-for="day in days"
                    :key="day.id"
                    class="day-head"
                    :class="{ 'day-incomplete': hasUnfilledShifts(day) }"
                  >
                    <span>{{ formatWeekday(day.date) }}</span>
                    <strong>{{ formatDayMonth(day.date) }}</strong>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr class="unfilled-row">
                  <th class="person-cell"><strong>Brak obsady</strong><span>{{ totalUnfilled }} wakatów</span></th>
                  <td
                    v-for="day in days"
                    :key="day.id"
                    :class="{ 'day-incomplete-cell': hasUnfilledShifts(day) }"
                  >
                    <div class="matrix-cell-content">
                      <button
                        v-for="shift in getUnfilledShifts(day)"
                        :key="shift.id"
                        class="shift-pill unfilled"
                        type="button"
                        :style="getShiftStyle(shift)"
                        @click="openShift(day, shift)"
                      >
                        <strong>{{ shift.from }}–{{ shift.to }}</strong>
                        <span>{{ getPositionName(shift) }}</span>
                        <em>Brak obsady</em>
                      </button>
                      <span v-if="getUnfilledShifts(day).length === 0" class="empty-mark">—</span>
                    </div>
                  </td>
                </tr>

                <tr v-for="employee in activeEmployees" :key="employee.id">
                  <th class="person-cell">
                    <strong>{{ getEmployeeName(employee) }}</strong>
                    <span>{{ formatMinutes(getEmployeeMinutes(employee.id)) }}</span>
                  </th>
                  <td
                    v-for="day in days"
                    :key="day.id"
                    :class="{ 'day-incomplete-cell': hasUnfilledShifts(day) }"
                  >
                    <div class="matrix-cell-content">
                      <button
                        v-for="shift in getEmployeeShifts(day, employee.id)"
                        :key="shift.id"
                        class="shift-pill assigned"
                        :class="getShiftClasses(shift)"
                        type="button"
                        :style="getShiftStyle(shift)"
                        @click="openShift(day, shift)"
                      >
                        <strong>{{ shift.from }}–{{ shift.to }}</strong>
                        <span>{{ getPositionName(shift) }}</span>
                        <em v-if="isExtraShift(shift)">Dodatkowa</em>
                        <em v-else-if="shift.assignmentSource === 'OVERRIDE'">⚠ Z pominięciem ograniczeń</em>
                        <i
                          v-if="getExtraAvailabilityMarker(shift)"
                          class="extra-availability-marker"
                          :class="getExtraAvailabilityMarker(shift).className"
                          :title="getExtraAvailabilityMarker(shift).label"
                          :aria-label="getExtraAvailabilityMarker(shift).label"
                        >!</i>
                      </button>
                      <div class="cell-add-actions">
                        <button
                          v-if="canEmployeeFillAnyUnfilled(employee, day)"
                          class="add-button vacancy-add"
                          type="button"
                          title="Obsadź wakat"
                          @click="openEmployeeDay(employee, day)"
                        >+</button>
                        <button
                          v-else
                          class="add-button extra-add"
                          type="button"
                          title="Dodatkowa zmiana"
                          @click="openExtraShift(employee, day)"
                        >—</button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="editor-state error">Nie znaleziono tego grafiku.</div>
    </div>

    <div v-if="editorMode" class="app-dialog-overlay editor-modal-overlay" @click.self="closeEditorModal">
      <div class="app-dialog-card editor-modal">
        <template v-if="editorMode === 'shift' && selectedShift && selectedDay">
          <div class="modal-kicker">{{ formatDateWithWeekday(selectedDay.date) }}</div>
          <div class="app-dialog-title modal-title">{{ getPositionName(selectedShift) }}</div>
          <div class="modal-time">{{ selectedShift.from }}–{{ selectedShift.to }}</div>

          <template v-if="selectedShift.employeeId && !showCandidates">
            <div class="current-assignment">
              <span>Przypisany pracownik</span>
              <strong>{{ getEmployeeNameById(selectedShift.employeeId) }}</strong>
              <small>{{ getAssignmentSourceLabel(selectedShift.assignmentSource) }}</small>
            </div>
            <div v-if="selectedShift.warnings?.length" class="assignment-warnings">
              <strong>Ostrzeżenia</strong>
              <span v-for="warning in selectedShift.warnings" :key="warning">{{ warning }}</span>
            </div>
            <div class="main-actions">
              <button class="change-button" type="button" @click="showCandidates = true">Zmień pracownika</button>
              <button class="remove-button" type="button" @click="showRemoveConfirm = true">Usuń z grafiku</button>
            </div>
          </template>

          <template v-else>
            <div class="section-title">{{ selectedShift.employeeId ? 'Wybierz nowego pracownika' : 'Wybierz pracownika' }}</div>
            <div v-if="candidateList.length" class="candidate-list">
              <article v-for="candidate in candidateList" :key="candidate.employee.id" class="candidate-card">
                <div class="candidate-main">
                  <div><strong>{{ getEmployeeName(candidate.employee) }}</strong><span>{{ formatStars(candidate.competency) }}</span></div>
                  <span class="candidate-status" :class="candidate.statusClass">{{ candidate.statusLabel }}</span>
                </div>
                <div v-if="candidate.otherShiftLabel" class="other-shift">{{ candidate.otherShiftLabel }}</div>
                <button
                  type="button"
                  :class="{ 'override-action': candidate.warnings.length }"
                  :disabled="isSaving"
                  @click="attemptAssignment(candidate, selectedDay, selectedShift)"
                >
                  {{ candidate.warnings.length ? 'Wstaw mimo ograniczeń' : 'Wstaw' }}
                </button>
              </article>
            </div>
            <div v-else class="empty-list">Brak aktywnych pracowników mających przypisane to stanowisko.</div>
          </template>
        </template>

        <template v-else-if="editorMode === 'employeeDay' && selectedEmployee && selectedDay">
          <div class="modal-kicker">{{ formatDateWithWeekday(selectedDay.date) }}</div>
          <div class="app-dialog-title modal-title">{{ getEmployeeName(selectedEmployee) }}</div>
          <div class="section-title">Wybierz nieobsadzoną zmianę</div>
          <div v-if="employeeAvailableShifts.length" class="employee-shift-list">
            <article v-for="item in employeeAvailableShifts" :key="item.shift.id" class="employee-shift-card">
              <div><strong>{{ getPositionName(item.shift) }}</strong><span>{{ item.shift.from }}–{{ item.shift.to }}</span></div>
              <span class="candidate-status" :class="item.candidate.statusClass">{{ item.candidate.statusLabel }}</span>
              <button
                type="button"
                :class="{ 'override-action': item.candidate.warnings.length }"
                :disabled="isSaving"
                @click="attemptAssignment(item.candidate, selectedDay, item.shift)"
              >
                {{ item.candidate.warnings.length ? 'Wstaw mimo ograniczeń' : 'Wstaw' }}
              </button>
            </article>
          </div>
          <div v-else class="empty-list">W tym dniu nie ma nieobsadzonego wakatu zgodnego ze stanowiskami tego pracownika.</div>
        </template>

        <template v-else-if="editorMode === 'extra' && selectedEmployee && selectedDay">
          <div class="modal-kicker">{{ formatDateWithWeekday(selectedDay.date) }}</div>
          <div class="app-dialog-title modal-title">Dodatkowa zmiana</div>
          <div class="extra-employee-name">{{ getEmployeeName(selectedEmployee) }}</div>

          <div class="extra-mode-buttons">
            <button
              type="button"
              :class="{ active: extraMode === 'template' }"
              @click="extraMode = 'template'"
            >
              Istniejąca zmiana
            </button>
            <button
              type="button"
              :class="{ active: extraMode === 'custom' }"
              @click="extraMode = 'custom'"
            >
              Własne godziny
            </button>
          </div>

          <template v-if="extraMode === 'template'">
            <div class="section-title">Wybierz zmianę z tego dnia</div>
            <div v-if="extraShiftTemplates.length" class="employee-shift-list">
              <article v-for="templateShift in extraShiftTemplates" :key="templateShift.templateKey" class="employee-shift-card extra-template-card">
                <div>
                  <strong>{{ getPositionName(templateShift) }}</strong>
                  <span>{{ templateShift.from }}–{{ templateShift.to }}</span>
                </div>
                <button type="button" :disabled="isSaving" @click="attemptExtraTemplate(templateShift)">
                  Dodaj taką zmianę
                </button>
              </article>
            </div>
            <div v-else class="empty-list">W tym dniu nie ma zmiany ze stanowiskiem, którą można skopiować.</div>
          </template>

          <template v-else>
            <div class="section-title">Ustaw godziny bez stanowiska</div>
            <div class="custom-time-grid">
              <div>
                <span>Od</span>
                <button type="button" @click="openExtraTimePicker('from')">{{ extraTimeFrom }}</button>
              </div>
              <div>
                <span>Do</span>
                <button type="button" @click="openExtraTimePicker('to')">{{ extraTimeTo }}</button>
              </div>
            </div>
            <button class="create-extra-button" type="button" :disabled="isSaving" @click="attemptCustomExtra">
              Dodaj zmianę dodatkową
            </button>
          </template>
        </template>

        <div v-if="editorError" class="modal-error">{{ editorError }}</div>
        <div class="app-dialog-actions close-actions">
          <button class="app-dialog-button app-dialog-cancel" type="button" :disabled="isSaving" @click="closeEditorModal">Zamknij</button>
        </div>
      </div>
    </div>

    <div v-if="showOverrideConfirm && pendingAssignment" class="app-dialog-overlay confirm-overlay">
      <div class="app-dialog-card confirm-dialog">
        <div class="app-dialog-icon warning-icon">!</div>
        <div class="app-dialog-title">Wstawić mimo ograniczeń?</div>
        <div class="app-dialog-message">{{ getEmployeeName(pendingAssignment.candidate.employee) }} nie spełnia wszystkich warunków tej zmiany.</div>
        <div class="warning-list"><span v-for="warning in pendingAssignment.candidate.warnings" :key="warning">{{ warning }}</span></div>
        <div class="app-dialog-actions">
          <button class="app-dialog-button app-dialog-cancel" type="button" :disabled="isSaving" @click="cancelOverride">Anuluj</button>
          <button class="app-dialog-button confirm-button" type="button" :disabled="isSaving" @click="confirmOverride">{{ isSaving ? 'Zapisywanie...' : 'Wstaw' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showRemoveConfirm && selectedShift" class="app-dialog-overlay confirm-overlay">
      <div class="app-dialog-card confirm-dialog">
        <div class="app-dialog-icon remove-icon">−</div>
        <div class="app-dialog-title">
          {{
            isExtraShift(selectedShift)
              ? 'Usunąć zmianę dodatkową?'
              : 'Usunąć pracownika ze zmiany?'
          }}
        </div>
        <div class="app-dialog-message">
          {{
            isExtraShift(selectedShift)
              ? 'Zmiana dodatkowa zostanie całkowicie usunięta z grafiku.'
              : 'Wakat pozostanie jako nieobsadzony i będzie można przypisać do niego inną osobę.'
          }}
        </div>
        <div class="app-dialog-actions">
          <button class="app-dialog-button app-dialog-cancel" type="button" :disabled="isSaving" @click="showRemoveConfirm = false">Anuluj</button>
          <button class="app-dialog-button app-dialog-delete" type="button" :disabled="isSaving" @click="removeSelectedAssignment">{{ isSaving ? 'Usuwanie...' : 'Usuń' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showTimePickerModal" class="app-dialog-overlay time-picker-overlay" @click.self="closeTimePicker">
      <div class="app-dialog-card schedule-time-dialog">
        <div class="app-dialog-icon">🕒</div>
        <div class="app-dialog-title">Wybierz godzinę</div>
        <div class="app-dialog-message">Ustaw godzinę i minuty.</div>

        <div class="schedule-time-picker-grid">
          <div class="schedule-time-picker-column">
            <div class="schedule-time-picker-label">Godzina</div>
            <div class="schedule-time-wheel">
              <button
                v-for="hour in hours"
                :key="hour"
                type="button"
                class="schedule-time-wheel-option"
                :class="{ 'schedule-time-wheel-option-active': selectedHour === hour }"
                @click="selectedHour = hour"
              >{{ hour }}</button>
            </div>
          </div>
          <div class="schedule-time-picker-separator">:</div>
          <div class="schedule-time-picker-column">
            <div class="schedule-time-picker-label">Minuty</div>
            <div class="schedule-time-wheel">
              <button
                v-for="minute in minutes"
                :key="minute"
                type="button"
                class="schedule-time-wheel-option"
                :class="{ 'schedule-time-wheel-option-active': selectedMinute === minute }"
                @click="selectedMinute = minute"
              >{{ minute }}</button>
            </div>
          </div>
        </div>

        <div class="schedule-time-picker-preview">{{ selectedHour }}:{{ selectedMinute }}</div>
        <div class="app-dialog-actions">
          <button class="app-dialog-button app-dialog-cancel" type="button" @click="closeTimePicker">Anuluj</button>
          <button class="app-dialog-button app-dialog-ok" type="button" @click="applySelectedTime">Ustaw</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEmployeesStore } from '../../stores/employeesStore.js'
import { useSchedulePositionsStore } from '../../stores/schedulePositionsStore.js'
import { useScheduleDraftsStore } from '../../stores/scheduleDraftsStore.js'

const route = useRoute()
const router = useRouter()
const employeesStore = useEmployeesStore()
const positionsStore = useSchedulePositionsStore()
const scheduleDraftsStore = useScheduleDraftsStore()

const isLoading = ref(false)
const loadError = ref('')
const editorError = ref('')
const editorMode = ref(null)
const selectedDay = ref(null)
const selectedShift = ref(null)
const selectedEmployee = ref(null)
const showCandidates = ref(false)
const showOverrideConfirm = ref(false)
const showRemoveConfirm = ref(false)
const pendingAssignment = ref(null)
const isSaving = ref(false)
const saveState = ref('')
const matrixScroll = ref(null)
const extraMode = ref('template')
const extraTimeFrom = ref('00:00')
const extraTimeTo = ref('00:00')
const showTimePickerModal = ref(false)
const activeTimeField = ref(null)
const selectedHour = ref('00')
const selectedMinute = ref('00')
let saveStateTimer = null

const hours = Array.from(
  { length: 24 },
  (_, index) => String(index).padStart(2, '0')
)
const minutes = ['00', '15', '30', '45']

const schedule = computed(() => scheduleDraftsStore.currentSchedule)
const days = computed(() => scheduleDraftsStore.currentDays)
const activeEmployees = computed(() => [...(employeesStore.employees || [])].filter(e => e.aktywny !== false).sort((a, b) => getEmployeeName(a).localeCompare(getEmployeeName(b), 'pl')))
const employeesById = computed(() => new Map(activeEmployees.value.map(e => [e.id, e])))
const positionsById = computed(() => new Map((positionsStore.positions || []).map(p => [p.id, p])))
const availabilityByDateEmployee = computed(() => {
  const map = new Map()
  scheduleDraftsStore.availabilityEntries.forEach(entry => {
    if (entry.date && entry.employeeId) map.set(`${entry.date}_${entry.employeeId}`, entry)
  })
  return map
})
const totalUnfilled = computed(() => days.value.reduce((sum, day) => sum + getUnfilledShifts(day).length, 0))
const candidateList = computed(() => {
  if (!selectedDay.value || !selectedShift.value) return []
  return activeEmployees.value
    .filter(employee => employee.id !== selectedShift.value.employeeId && Number(employee.kompetencje?.[selectedShift.value.positionId]) >= 1)
    .map(employee => getCandidateInfo(employee, selectedDay.value, selectedShift.value))
    .sort(compareCandidates)
})
const employeeAvailableShifts = computed(() => {
  if (!selectedDay.value || !selectedEmployee.value) return []
  return getUnfilledShifts(selectedDay.value)
    .filter(shift => Number(selectedEmployee.value.kompetencje?.[shift.positionId]) >= 1)
    .map(shift => ({ shift, candidate: getCandidateInfo(selectedEmployee.value, selectedDay.value, shift) }))
    .sort((a, b) => compareCandidates(a.candidate, b.candidate) || a.shift.from.localeCompare(b.shift.from))
})
const extraShiftTemplates = computed(() => {
  if (!selectedDay.value) return []

  const templates = new Map()
  const workingShifts = selectedDay.value.workingShifts || []

  workingShifts
    .filter(shift => !isExtraShift(shift) && shift.positionId)
    .forEach(shift => {
      const templateKey =
        `${shift.positionId}_${shift.from}_${shift.to}`

      if (!templates.has(templateKey)) {
        templates.set(templateKey, {
          ...shift,
          id: `template_${templateKey}`,
          templateKey,
          employeeId: null
        })
      }
    })

  return [...templates.values()].sort((first, second) => {
    return (
      first.from.localeCompare(second.from) ||
      getPositionName(first).localeCompare(getPositionName(second), 'pl')
    )
  })
})
const saveStateLabel = computed(() => saveState.value === 'saving' ? 'Zapisywanie...' : saveState.value === 'error' ? 'Błąd zapisu' : 'Zapisano')

onMounted(async () => {
  isLoading.value = true
  try {
    const scheduleId = String(route.params.id || '')
    const loaded = await scheduleDraftsStore.fetchSchedule(scheduleId)
    if (!loaded) return
    await Promise.all([
      scheduleDraftsStore.fetchScheduleDays(scheduleId),
      scheduleDraftsStore.fetchAvailability(loaded.dateFrom, loaded.dateTo),
      employeesStore.fetchEmployees(),
      positionsStore.fetchPositions()
    ])
  } catch (error) {
    console.error('Błąd pobierania edytora grafiku:', error)
    loadError.value = error?.message || 'Nie udało się pobrać grafiku.'
  } finally {
    isLoading.value = false
  }
})

const getEmployeeName = employee => employee ? (`${employee.imie || ''} ${employee.nazwisko || ''}`.trim() || employee.name || 'Pracownik bez nazwy') : 'Nieznany pracownik'
const getEmployeeNameById = id => getEmployeeName(employeesById.value.get(id))
const getPositionName = shift => {
  const position = positionsById.value.get(shift?.positionId)
  return position?.nazwa || position?.name || shift?.positionNameSnapshot || 'Nieznane stanowisko'
}
const getPositionColor = id => {
  const position = positionsById.value.get(id)
  return position?.kolor || position?.color || '#64748b'
}
const getShiftStyle = shift => ({ '--position-color': getPositionColor(shift.positionId) })
const isExtraShift = shift => shift?.origin === 'MANUAL_EXTRA'
const getUnfilledShifts = day => (day?.workingShifts || []).filter(shift => !shift.employeeId)
const hasUnfilledShifts = day => getUnfilledShifts(day).length > 0
const getEmployeeShifts = (day, employeeId) => (day?.workingShifts || []).filter(shift => shift.employeeId === employeeId)
const canEmployeeFillAnyUnfilled = (employee, day) => getUnfilledShifts(day).some(shift => Number(employee.kompetencje?.[shift.positionId]) >= 1)
const getShiftClasses = shift => {
  if (isExtraShift(shift)) {
    return { extra: true }
  }

  const availabilityType = shift?.decision?.availabilityType

  return {
    'availability-unavailable': availabilityType === 'unavailable',
    'availability-preferred-off': availabilityType === 'preferred_off',
    'availability-partial': availabilityType === 'partial',
    'availability-full': ![
      'unavailable',
      'preferred_off',
      'partial'
    ].includes(availabilityType)
  }
}
const getExtraAvailabilityMarker = shift => {
  if (!isExtraShift(shift)) return null

  const availabilityType = shift?.decision?.availabilityType

  if (availabilityType === 'unavailable') {
    return {
      className: 'unavailable',
      label: 'Pracownik zaznaczył: nie mogę pracować'
    }
  }

  if (availabilityType === 'preferred_off') {
    return {
      className: 'preferred-off',
      label: 'Pracownik zgłosił prośbę o wolne'
    }
  }

  if (availabilityType === 'partial') {
    return {
      className: 'partial',
      label: 'Pracownik podał dyspozycję w godzinach'
    }
  }

  return null
}

const getTimeMinutes = value => {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
}
const getTimeRange = (from, to) => {
  const start = getTimeMinutes(from)
  let end = getTimeMinutes(to)
  if (start === null || end === null || start === end) return null
  if (end < start) end += 1440
  return { start, end }
}
const getShiftMinutes = shift => {
  const range = getTimeRange(shift?.from, shift?.to)
  return range ? range.end - range.start : 0
}
const getEmployeeMinutes = id => days.value.reduce((total, day) => total + getEmployeeShifts(day, id).reduce((sum, shift) => sum + getShiftMinutes(shift), 0), 0)
const formatMinutes = minutes => `${String(Math.round((minutes / 60) * 10) / 10).replace('.', ',')} h`
const rangesOverlap = (a, b) => {
  const first = getTimeRange(a?.from, a?.to)
  const second = getTimeRange(b?.from, b?.to)
  return Boolean(first && second && first.start < second.end && second.start < first.end)
}

const getEffectiveAvailability = record => {
  if (record?.managerEntry) return { entry: record.managerEntry, source: 'manager' }
  if (record?.employeeEntry) return { entry: record.employeeEntry, source: 'employee' }
  if (record?.type) return { entry: record, source: 'employee' }
  return { entry: { type: 'full' }, source: 'default' }
}
const getAvailabilityInfo = (employee, day, shift) => {
  const record = availabilityByDateEmployee.value.get(`${day.date}_${employee.id}`) || null
  const effective = getEffectiveAvailability(record)
  const type = effective.entry?.type || 'full'
  const warnings = []
  let statusLabel = 'Dostępny'
  let statusClass = 'available'
  let rank = 0

  if (type === 'unavailable') {
    statusLabel = 'Nie może pracować'; statusClass = 'blocked'; rank = 4
    warnings.push('Pracownik oznaczył, że nie może pracować.')
  } else if (type === 'preferred_off') {
    statusLabel = 'Prośba o wolne'; statusClass = 'preferred'; rank = 2
    warnings.push('Pracownik poprosił o wolne.')
  } else if (type === 'partial') {
    const from = effective.entry?.timeFrom || '--:--'
    const to = effective.entry?.timeTo || '--:--'
    const availabilityRange = getTimeRange(from, to)
    const shiftRange = getTimeRange(shift.from, shift.to)
    const covers = Boolean(availabilityRange && shiftRange && availabilityRange.start <= shiftRange.start && availabilityRange.end >= shiftRange.end)
    statusLabel = `Dostępny ${from}–${to}`; statusClass = covers ? 'partial' : 'blocked'; rank = covers ? 1 : 3
    if (!covers) warnings.push(`Dyspozycja ${from}–${to} nie obejmuje całej zmiany.`)
  }
  if (effective.source === 'manager') statusLabel += ' · poprawka managera'
  return { type, source: effective.source, statusLabel, statusClass, rank, warnings }
}
const getCandidateInfo = (employee, day, shift) => {
  const availability = getAvailabilityInfo(employee, day, shift)
  const otherShifts = getEmployeeShifts(day, employee.id).filter(item => item.id !== shift.id)
  const warnings = [...availability.warnings]
  let otherShiftLabel = ''
  let rank = availability.rank
  let statusClass = availability.statusClass
  const competency = Number(employee.kompetencje?.[shift.positionId]) || 0

  if (shift.positionId && competency < 1) {
    warnings.push('Pracownik nie ma przypisanego tego stanowiska.')
    rank = 5
    statusClass = 'blocked'
  }

  if (otherShifts.length) {
    const hasOverlap = otherShifts.some(item => rangesOverlap(item, shift))

    otherShiftLabel = otherShifts
      .map(item => {
        const typeLabel = isExtraShift(item)
          ? 'Ma już zmianę dodatkową'
          : 'Ma już zmianę'

        return `${typeLabel} ${item.from}–${item.to}`
      })
      .join('. ')

    warnings.push(
      hasOverlap
        ? 'Pracownik ma już inną zmianę w tych godzinach.'
        : 'Pracownik ma już zmianę w tym dniu.'
    )
    rank = 5
    statusClass = 'blocked'
  }
  return {
    employee,
    competency,
    availabilityType: availability.type,
    availabilitySource: availability.source,
    statusLabel: availability.statusLabel,
    statusClass,
    rank,
    warnings,
    otherShiftLabel
  }
}
const compareCandidates = (a, b) => a.rank - b.rank || b.competency - a.competency || getEmployeeName(a.employee).localeCompare(getEmployeeName(b.employee), 'pl')
const formatStars = value => {
  const stars = Math.max(1, Math.min(5, Math.round(Number(value) || 1)))
  return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`
}

const openShift = (day, shift) => {
  editorError.value = ''; selectedDay.value = day; selectedShift.value = shift; selectedEmployee.value = null
  showCandidates.value = !shift.employeeId; editorMode.value = 'shift'
}
const openEmployeeDay = (employee, day) => {
  editorError.value = ''; selectedEmployee.value = employee; selectedDay.value = day; selectedShift.value = null
  showCandidates.value = false; editorMode.value = 'employeeDay'
}
const openExtraShift = (employee, day) => {
  const firstTemplate = (day.workingShifts || []).find(
    shift => !isExtraShift(shift)
  )

  editorError.value = ''
  selectedEmployee.value = employee
  selectedDay.value = day
  selectedShift.value = null
  showCandidates.value = false
  extraMode.value = 'template'
  extraTimeFrom.value = firstTemplate?.from || '00:00'
  extraTimeTo.value = firstTemplate?.to || '00:00'
  editorMode.value = 'extra'
}
const closeEditorModal = () => {
  if (isSaving.value) return
  editorMode.value = null; selectedDay.value = null; selectedShift.value = null; selectedEmployee.value = null
  showCandidates.value = false; editorError.value = ''; extraMode.value = 'template'
  showTimePickerModal.value = false; activeTimeField.value = null
}
const closeEditorModalAfterSave = () => {
  editorMode.value = null; selectedDay.value = null; selectedShift.value = null; selectedEmployee.value = null
  showCandidates.value = false; editorError.value = ''; extraMode.value = 'template'
  showTimePickerModal.value = false; activeTimeField.value = null
}
const attemptAssignment = (candidate, day, shift) => {
  pendingAssignment.value = {
    operation: 'assign',
    candidate,
    day,
    shift
  }
  if (candidate.warnings.length) showOverrideConfirm.value = true
  else saveAssignment(pendingAssignment.value)
}
const attemptExtraTemplate = templateShift => {
  if (!selectedEmployee.value || !selectedDay.value) return

  const candidate = getCandidateInfo(
    selectedEmployee.value,
    selectedDay.value,
    templateShift
  )
  const operation = {
    operation: 'extra',
    candidate,
    day: selectedDay.value,
    shift: templateShift,
    extraData: {
      positionId: templateShift.positionId,
      positionNameSnapshot: getPositionName(templateShift),
      from: templateShift.from,
      to: templateShift.to
    }
  }

  pendingAssignment.value = operation

  if (candidate.warnings.length) {
    showOverrideConfirm.value = true
  } else {
    saveExtraAssignment(operation)
  }
}
const attemptCustomExtra = () => {
  if (!selectedEmployee.value || !selectedDay.value) return

  if (extraTimeFrom.value === extraTimeTo.value) {
    editorError.value =
      'Godzina rozpoczęcia i zakończenia muszą być różne.'
    return
  }

  const virtualShift = {
    id: 'custom-extra-preview',
    positionId: null,
    positionNameSnapshot: 'Bez stanowiska',
    from: extraTimeFrom.value,
    to: extraTimeTo.value,
    employeeId: null
  }
  const candidate = getCandidateInfo(
    selectedEmployee.value,
    selectedDay.value,
    virtualShift
  )
  const operation = {
    operation: 'extra',
    candidate,
    day: selectedDay.value,
    shift: virtualShift,
    extraData: {
      positionId: null,
      positionNameSnapshot: 'Bez stanowiska',
      from: extraTimeFrom.value,
      to: extraTimeTo.value
    }
  }

  pendingAssignment.value = operation

  if (candidate.warnings.length) {
    showOverrideConfirm.value = true
  } else {
    saveExtraAssignment(operation)
  }
}
const cancelOverride = () => {
  if (!isSaving.value) { showOverrideConfirm.value = false; pendingAssignment.value = null }
}
const confirmOverride = async () => {
  if (!pendingAssignment.value) return
  showOverrideConfirm.value = false

  if (pendingAssignment.value.operation === 'extra') {
    await saveExtraAssignment(pendingAssignment.value)
  } else {
    await saveAssignment(pendingAssignment.value)
  }
}
const saveAssignment = async payload => {
  if (isSaving.value || !schedule.value) return
  isSaving.value = true; editorError.value = ''; setSaveState('saving')
  try {
    await scheduleDraftsStore.updateWorkingShift({
      scheduleId: schedule.value.id,
      dayId: payload.day.id,
      shiftId: payload.shift.id,
      employeeId: payload.candidate.employee.id,
      warnings: payload.candidate.warnings,
      decision: {
        competency: payload.candidate.competency,
        availabilityType: payload.candidate.availabilityType,
        availabilitySource: payload.candidate.availabilitySource,
        availabilityLabel: payload.candidate.statusLabel
      }
    })
    pendingAssignment.value = null; showOverrideConfirm.value = false; closeEditorModalAfterSave(); setSaveState('saved')
  } catch (error) {
    console.error('Błąd przypisywania pracownika:', error)
    editorError.value = error?.message || 'Nie udało się przypisać pracownika.'; setSaveState('error')
  } finally { isSaving.value = false }
}
const saveExtraAssignment = async payload => {
  if (isSaving.value || !schedule.value) return

  isSaving.value = true
  editorError.value = ''
  setSaveState('saving')

  try {
    await scheduleDraftsStore.addExtraShift({
      scheduleId: schedule.value.id,
      dayId: payload.day.id,
      employeeId: payload.candidate.employee.id,
      positionId: payload.extraData.positionId,
      positionNameSnapshot:
        payload.extraData.positionNameSnapshot,
      from: payload.extraData.from,
      to: payload.extraData.to,
      warnings: payload.candidate.warnings,
      decision: {
        competency: payload.candidate.competency,
        availabilityType: payload.candidate.availabilityType,
        availabilitySource: payload.candidate.availabilitySource,
        availabilityLabel: payload.candidate.statusLabel
      }
    })

    pendingAssignment.value = null
    showOverrideConfirm.value = false
    closeEditorModalAfterSave()
    setSaveState('saved')
  } catch (error) {
    console.error('Błąd dodawania zmiany dodatkowej:', error)
    editorError.value =
      error?.message || 'Nie udało się dodać zmiany dodatkowej.'
    setSaveState('error')
  } finally {
    isSaving.value = false
  }
}
const removeSelectedAssignment = async () => {
  if (isSaving.value || !schedule.value || !selectedDay.value || !selectedShift.value) return
  isSaving.value = true; editorError.value = ''; setSaveState('saving')
  try {
    if (isExtraShift(selectedShift.value)) {
      await scheduleDraftsStore.removeExtraShift({
        scheduleId: schedule.value.id,
        dayId: selectedDay.value.id,
        shiftId: selectedShift.value.id
      })
    } else {
      await scheduleDraftsStore.updateWorkingShift({
        scheduleId: schedule.value.id,
        dayId: selectedDay.value.id,
        shiftId: selectedShift.value.id,
        employeeId: null
      })
    }
    showRemoveConfirm.value = false; closeEditorModalAfterSave(); setSaveState('saved')
  } catch (error) {
    console.error('Błąd usuwania pracownika:', error)
    showRemoveConfirm.value = false; editorError.value = error?.message || 'Nie udało się usunąć pracownika.'; setSaveState('error')
  } finally { isSaving.value = false }
}
const setSaveState = state => {
  saveState.value = state
  if (saveStateTimer) clearTimeout(saveStateTimer)
  if (state !== 'saving') saveStateTimer = setTimeout(() => { saveState.value = '' }, 2600)
}
const scrollMatrix = offset => matrixScroll.value?.scrollBy({ left: offset * 132, behavior: 'smooth' })
const getAssignmentSourceLabel = source => source === 'OVERRIDE' ? 'Z pominięciem ograniczeń' : source === 'AUTO' ? 'Przydział generatora' : 'Ręczne przypisanie managera'
const openExtraTimePicker = field => {
  activeTimeField.value = field

  const currentValue = field === 'from'
    ? extraTimeFrom.value
    : extraTimeTo.value
  const [hour = '00', minute = '00'] = currentValue.split(':')

  selectedHour.value = hour
  selectedMinute.value = minutes.includes(minute) ? minute : '00'
  showTimePickerModal.value = true
}
const closeTimePicker = () => {
  showTimePickerModal.value = false
  activeTimeField.value = null
}
const applySelectedTime = () => {
  if (!activeTimeField.value) return

  const value = `${selectedHour.value}:${selectedMinute.value}`

  if (activeTimeField.value === 'from') {
    extraTimeFrom.value = value
  } else {
    extraTimeTo.value = value
  }

  closeTimePicker()
}

const getDateFromKey = key => {
  if (!key) return null
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const formatDate = key => {
  const date = getDateFromKey(key)
  return date ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : 'Brak daty'
}
const formatDateWithWeekday = key => {
  const date = getDateFromKey(key)
  if (!date) return key
  const value = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  return value.charAt(0).toUpperCase() + value.slice(1)
}
const formatWeekday = key => {
  const date = getDateFromKey(key)
  const weekdayLabels = ['nd.', 'pn.', 'wt.', 'śr.', 'czw.', 'pt.', 'sb.']
  return date ? weekdayLabels[date.getDay()] : ''
}
const formatDayMonth = key => {
  const date = getDateFromKey(key)
  return date ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit' }).format(date) : key
}
</script>

<style scoped>
.editor-page{padding-top:4px}.editor-header,.matrix-card,.editor-state{width:100%;max-width:1180px;margin-right:auto;margin-left:auto;box-sizing:border-box}.editor-header,.matrix-card{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.07)}.editor-header{padding:20px}.heading-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.kicker,.modal-kicker{margin-bottom:6px;color:#1d4ed8;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.heading-row h3{margin:0 0 5px;color:#111827;font-size:23px}.heading-row p{margin:0;color:#64748b;font-size:14px;font-weight:650}.status-badge{flex:0 0 auto;padding:6px 10px;border-radius:999px;color:#1d4ed8;background:#dbeafe;font-size:11px;font-weight:900;text-transform:uppercase}.summary-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:16px}.summary-grid div{display:flex;align-items:center;flex-direction:column;padding:11px 8px;border-radius:13px;background:#f8fafc}.summary-grid strong{color:#111827;font-size:20px}.summary-grid span{margin-top:3px;color:#64748b;font-size:11px;font-weight:700}.matrix-card{margin-top:14px;overflow:hidden}.matrix-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 17px;border-bottom:1px solid #e2e8f0}.matrix-toolbar>div:first-child{display:flex;flex-direction:column;gap:3px}.matrix-toolbar strong{color:#111827;font-size:15px}.matrix-toolbar span{color:#64748b;font-size:12px}.toolbar-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.toolbar-actions button{min-height:35px;padding:0 10px;border:1px solid #cbd5e1;border-radius:10px;color:#334155;background:#fff;font-size:12px;font-weight:750}.save-state{padding:5px 8px;border-radius:9px;font-weight:800}.save-state.saving{color:#854d0e;background:#fef3c7}.save-state.saved{color:#166534;background:#dcfce7}.save-state.error{color:#b91c1c;background:#fee2e2}.extra-legend{display:flex;align-items:center;gap:5px;color:#1d4ed8!important;font-weight:800}.extra-legend b{display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:7px;color:#fff;background:#2563eb;font-size:16px}.matrix-scroll{max-height:calc(100dvh - 285px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.matrix-table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}.matrix-table th,.matrix-table td{box-sizing:border-box;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}.matrix-table thead th{position:sticky;z-index:4;top:0;height:54px;background:#f8fafc}.day-head{width:132px;min-width:132px;padding:7px 6px;color:#475569;text-align:center}.day-head span,.day-head strong{display:block}.day-head span{font-size:11px;text-transform:uppercase}.day-head strong{margin-top:2px;color:#111827;font-size:13px}.person-cell{position:sticky;z-index:3;left:0;width:154px;min-width:154px;max-width:154px;padding:10px;background:#fff;text-align:left}.corner{z-index:6!important;background:#f8fafc!important;color:#475569;font-size:12px;text-transform:uppercase}.person-cell strong,.person-cell span{display:block}.person-cell strong{color:#111827;font-size:12px;line-height:1.3}.person-cell span{margin-top:3px;color:#64748b;font-size:11px}.matrix-table td{width:132px;min-width:132px;height:74px;padding:5px;vertical-align:top;background:#fff}.unfilled-row td,.unfilled-row .person-cell{background:#fff8f8}.matrix-cell-content{display:flex;min-height:62px;flex-direction:column;gap:5px}.shift-pill{width:100%;padding:7px 7px 7px 9px;border:0;border-left:4px solid var(--position-color);border-radius:10px;color:#1f2937;background:color-mix(in srgb,var(--position-color) 15%,white);text-align:left}.shift-pill:active{transform:scale(.98)}.shift-pill strong,.shift-pill span,.shift-pill em{display:block}.shift-pill strong{font-size:11px}.shift-pill span{margin-top:2px;overflow:hidden;font-size:10px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.shift-pill em{margin-top:3px;color:#b91c1c;font-size:9px;font-style:normal;font-weight:800}.shift-pill.unfilled{border-top:1px solid #fecaca;border-right:1px solid #fecaca;border-bottom:1px solid #fecaca;background:#fff1f2}.shift-pill.extra{border:1px solid #60a5fa;border-left:4px solid #2563eb;color:#1e3a8a;background:#dbeafe}.shift-pill.extra em{color:#1d4ed8}.cell-add-actions{display:flex;justify-content:center;gap:6px;margin-top:auto}.add-button{width:28px;min-height:26px;border:0;border-radius:9px;color:#fff;font-size:18px;font-weight:700}.vacancy-add{background:#22c55e}.extra-add{background:#2563eb}.empty-mark{margin:auto;color:#cbd5e1;font-size:16px}.editor-state{padding:28px 20px;border:1px solid #e2e8f0;border-radius:20px;color:#64748b;background:#fff;text-align:center}.editor-state.error{color:#b91c1c;background:#fff7f7}.editor-modal-overlay{z-index:3000}.editor-modal{width:min(94vw,560px);max-height:min(86dvh,760px);overflow-y:auto;text-align:left}.modal-title{margin-bottom:2px;text-align:left}.modal-time,.extra-employee-name{color:#475569;font-size:16px;font-weight:800}.current-assignment{display:flex;flex-direction:column;gap:4px;margin-top:17px;padding:14px;border-radius:15px;background:#f1f5f9}.current-assignment span,.current-assignment small{color:#64748b;font-size:11px;font-weight:700}.current-assignment strong{color:#111827;font-size:17px}.assignment-warnings,.warning-list{display:flex;flex-direction:column;gap:5px;margin-top:11px;padding:12px;border:1px solid #fed7aa;border-radius:13px;color:#9a3412;background:#fff7ed;font-size:12px}.main-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px}.main-actions button,.candidate-card>button,.employee-shift-card>button,.create-extra-button{min-height:42px;border:0;border-radius:12px;font-size:13px;font-weight:800}.change-button,.candidate-card>button,.employee-shift-card>button,.create-extra-button{color:#fff;background:#2563eb}.remove-button{color:#b91c1c;background:#fee2e2}.section-title{margin:18px 0 9px;color:#334155;font-size:13px;font-weight:900;text-transform:uppercase}.candidate-list,.employee-shift-list{display:grid;gap:9px}.candidate-card,.employee-shift-card{padding:12px;border:1px solid #e2e8f0;border-radius:15px;background:#fff}.candidate-main{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.candidate-main>div,.employee-shift-card>div{display:flex;flex-direction:column;gap:3px}.candidate-main strong,.employee-shift-card strong{color:#111827;font-size:14px}.candidate-main>div>span{color:#d97706;font-size:13px}.candidate-status{display:inline-block;padding:5px 7px;border-radius:8px;font-size:10px;font-weight:850;line-height:1.25;text-align:center}.candidate-status.available{color:#166534;background:#dcfce7}.candidate-status.partial{color:#1d4ed8;background:#dbeafe}.candidate-status.preferred{color:#92400e;background:#fef3c7}.candidate-status.blocked{color:#b91c1c;background:#fee2e2}.other-shift{margin-top:8px;padding:7px 9px;border-radius:9px;color:#b91c1c;background:#fef2f2;font-size:11px;font-weight:800}.candidate-card>button,.employee-shift-card>button{width:100%;margin-top:10px}.employee-shift-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}.employee-shift-card>div>span{color:#64748b;font-size:12px}.employee-shift-card>button{grid-column:1/-1}.extra-mode-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.extra-mode-buttons button{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;color:#475569;background:#fff;font-size:12px;font-weight:800}.extra-mode-buttons button.active{border-color:#2563eb;color:#1d4ed8;background:#dbeafe}.custom-time-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.custom-time-grid>div{display:flex;flex-direction:column;gap:6px}.custom-time-grid span{color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}.custom-time-grid button{min-height:48px;border:1.5px solid #93c5fd;border-radius:13px;color:#1d4ed8;background:#eff6ff;font-size:20px;font-weight:850}.create-extra-button{width:100%;margin-top:14px}.empty-list{padding:18px 14px;border-radius:13px;color:#64748b;background:#f8fafc;font-size:13px;line-height:1.45;text-align:center}.modal-error{margin-top:12px;padding:10px 12px;border-radius:11px;color:#b91c1c;background:#fee2e2;font-size:12px;font-weight:700}.close-actions{margin-top:14px}.confirm-overlay{z-index:4000}.confirm-dialog{width:min(92vw,430px)}.warning-icon{color:#fff;background:#d97706}.remove-icon{color:#fff;background:#ef4444}.confirm-button{color:#fff;background:#d97706}.time-picker-overlay{z-index:4100}@media(max-width:660px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.matrix-toolbar{align-items:stretch;flex-direction:column}.toolbar-actions{justify-content:flex-start}.save-state{margin-right:auto}.matrix-scroll{max-height:calc(100dvh - 330px)}.person-cell{width:124px;min-width:124px;max-width:124px}.day-head,.matrix-table td{width:122px;min-width:122px}.main-actions{grid-template-columns:1fr}}
.day-head.day-incomplete {
  color: #b91c1c;
  background: #fff1f2;
  box-shadow:
    inset 2px 0 #ef4444,
    inset -2px 0 #ef4444,
    inset 0 2px #ef4444;
}

.day-head.day-incomplete strong {
  color: #b91c1c;
}

.day-incomplete-cell {
  box-shadow:
    inset 2px 0 #fecaca,
    inset -2px 0 #fecaca;
}

.matrix-table tbody tr:last-child .day-incomplete-cell {
  box-shadow:
    inset 2px 0 #fecaca,
    inset -2px 0 #fecaca,
    inset 0 -2px #ef4444;
}

.shift-pill.availability-full {
  border-color: #22c55e;
  color: #14532d;
  background: #dcfce7;
}

.shift-pill.availability-full em {
  color: #166534;
}

.shift-pill.availability-unavailable {
  border-color: #ef4444;
  color: #7f1d1d;
  background: #fee2e2;
}

.shift-pill.availability-unavailable em {
  color: #b91c1c;
}

.shift-pill.availability-preferred-off {
  border-color: #d4a72c;
  color: #713f12;
  background: #fef3c7;
}

.shift-pill.availability-preferred-off em {
  color: #92400e;
}

.shift-pill.availability-partial {
  border-color: #3b82f6;
  color: #1e3a8a;
  background: #dbeafe;
}

.shift-pill.availability-partial em {
  color: #1d4ed8;
}

.shift-pill.extra {
  border: 1px solid #c084fc;
  border-left: 4px solid #9333ea;
  padding-right: 28px;
  color: #581c87;
  background: #f3e8ff;
}

.shift-pill.extra em {
  color: #7e22ce;
}

.candidate-card > button.override-action,
.employee-shift-card > button.override-action {
  color: #fecaca;
}

.extra-add {
  width: 32px;
  min-height: 24px;
  border: 1px solid transparent;
  color: #94a3b8;
  background: transparent;
  font-size: 20px;
  line-height: 1;
}

.extra-add:hover,
.extra-add:focus-visible {
  border-color: #d8b4fe;
  color: #7e22ce;
  background: #f3e8ff;
}

.shift-pill {
  position: relative;
}

.extra-availability-marker {
  position: absolute;
  top: 5px;
  right: 5px;
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
}

.extra-availability-marker.unavailable {
  background: #ef4444;
}

.extra-availability-marker.preferred-off {
  color: #713f12;
  background: #facc15;
}

.extra-availability-marker.partial {
  background: #3b82f6;
}

/* Modal po kliknięciu zielonego plusa:
   status ma własny wiersz, aby długi komunikat nie nachodził na zmianę. */
.employee-shift-card {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.employee-shift-card > div {
  min-width: 0;
}

.employee-shift-card > .candidate-status {
  max-width: 100%;
  justify-self: start;
  white-space: normal;
  text-align: left;
}

.employee-shift-card > button {
  grid-column: 1;
}
</style>
