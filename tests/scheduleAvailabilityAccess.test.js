import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  getScheduleAvailabilityAccessPlan,
  normalizeAvailabilitySelectionForAccess,
  SCHEDULE_AVAILABILITY_ACCESS_MODE
} from '../src/utils/scheduleAvailabilityAccess.js'

test('zwykły pracownik nie uruchamia managerskich odczytów grafiku', () => {
  assert.deepEqual(getScheduleAvailabilityAccessPlan(), {
    mode: SCHEDULE_AVAILABILITY_ACCESS_MODE.OWN,
    loadEmployees: false,
    loadPositions: false,
    loadDemandModels: false,
    loadTeamAvailability: false
  })
})

test('manager otrzymuje dane potrzebne do kontroli obsady', () => {
  const plan = getScheduleAvailabilityAccessPlan({
    canManageSchedule: true
  })

  assert.equal(plan.mode, SCHEDULE_AVAILABILITY_ACCESS_MODE.MANAGER)
  assert.equal(plan.loadEmployees, true)
  assert.equal(plan.loadPositions, true)
  assert.equal(plan.loadDemandModels, true)
  assert.equal(plan.loadTeamAvailability, true)
})

test('odebranie uprawnienia przełącza widok na własne dyspozycje', () => {
  assert.deepEqual(normalizeAvailabilitySelectionForAccess({
    canManageSchedule: false,
    selectedViewMode: 'all',
    loggedEmployeeId: 'employee-julia'
  }), {
    selectedViewMode: 'mine',
    selectedEmployeeId: 'employee-julia'
  })
})

test('widok zatrzymuje managerskie listenery i nie liczy obsady przy zapisie własnym', async () => {
  const source = await readFile(new URL(
    '../src/views/grafik/GrafikKalendarzDyspozycjiView.vue',
    import.meta.url
  ), 'utf8')
  const ownSave = source.slice(
    source.indexOf('const saveAvailability ='),
    source.indexOf("const selectedAvailabilityType =", source.indexOf('const saveAvailability ='))
  )

  assert.match(source, /watch\(\s*canManageSchedule,[\s\S]*synchronizeScheduleAvailabilityAccess\(\)/)
  assert.match(source, /clearManagerScheduleAvailabilityData[\s\S]*employeesStore\.clearSensitiveData\(\)/)
  assert.match(source, /clearManagerScheduleAvailabilityData[\s\S]*demandModelsStore\.clearSensitiveData\(\)/)
  assert.match(source, /listenerRevision !== teamAvailabilityListenerRevision/)
  assert.match(source, /listenerRevision !== monthAvailabilityListenerRevision/)
  assert.doesNotMatch(ownSave, /fetchTeamAvailabilityRecordsForDay/)
  assert.doesNotMatch(ownSave, /validateEmployeeAvailabilityCoverage/)
})
