import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('lista urządzeń zawiera wyłącznie aktywne sesje', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const devices = source.slice(
    source.indexOf('const getEmployeeDevices'),
    source.indexOf('const removeEmployeeDevice')
  )

  assert.match(devices, /\.filter\(device => device\.status === 'active'\)/)
  assert.match(devices, /right\.addedAt/)
  assert.match(devices, /left\.addedAt/)
})

test('usunięcie urządzenia kasuje dokładny dokument bez zmiany członkostwa', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const removal = source.slice(
    source.indexOf('const removeEmployeeDevice'),
    source.indexOf('const removeAllEmployeeDevices')
  )

  assert.match(removal, /'deviceSessions',[\s\S]*sessionId/)
  assert.match(removal, /batch\.delete\(sessionRef\)/)
  assert.doesNotMatch(removal, /status:\s*'disconnected'|memberRef|membership/)
})

test('wyłączenie konta najpierw atomowo blokuje pracownika i członkostwo', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const transition = source.slice(
    source.indexOf('const setEmployeeAccountActive'),
    source.indexOf('const archiveEmployeeFromTeam')
  )

  assert.match(transition, /aktywny:\s*active === true/)
  assert.match(transition, /status:\s*active === true \? 'active' : 'blocked'/)
  assert.ok(
    transition.indexOf('await batch.commit()') <
      transition.indexOf('removeEmployeeAccessArtifacts'),
    'Blokada pracownika i członkostwa musi poprzedzać czyszczenie urządzeń.'
  )
  assert.match(transition, /employee-access\/cleanup-incomplete/)
})

test('bezpośrednia zmiana aktywności w store używa wspólnego cyklu konta', async () => {
  const source = await readSource('src/stores/employeesStore.js')
  const update = source.slice(
    source.indexOf('const updateEmployee'),
    source.indexOf('const deleteEmployee')
  )

  assert.match(update, /wasActive !== normalizedEmployee\.aktywny/)
  assert.match(update, /setEmployeeAccountActive\(\{[\s\S]*active: normalizedEmployee\.aktywny/)
})

test('ponowne włączenie nie przywraca urządzeń ani zaproszeń', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const transition = source.slice(
    source.indexOf('const setEmployeeAccountActive'),
    source.indexOf('const archiveEmployeeFromTeam')
  )
  const activeBranch = transition.slice(
    transition.indexOf('if (active === true)'),
    transition.indexOf('try {', transition.indexOf('if (active === true)'))
  )

  assert.match(activeBranch, /removedDevices:\s*0/)
  assert.match(activeBranch, /removedInvitations:\s*0/)
  assert.doesNotMatch(activeBranch, /createInvitation|deviceSessions|status:\s*'active'/)
})

test('usunięcie z zespołu archiwizuje dokument pracownika', async () => {
  const [accountSource, employeeSource] = await Promise.all([
    readSource('src/stores/accountSessionStore.js'),
    readSource('src/stores/employeesStore.js')
  ])
  const archive = accountSource.slice(
    accountSource.indexOf('const archiveEmployeeFromTeam'),
    accountSource.indexOf('const blockRestaurantAccess')
  )
  const removal = employeeSource.slice(
    employeeSource.indexOf('const deleteEmployee'),
    employeeSource.indexOf('const clearSensitiveData')
  )

  assert.match(archive, /active:\s*false/)
  assert.match(archive, /archive:\s*true/)
  assert.match(removal, /archiveEmployeeFromTeam/)
  assert.doesNotMatch(removal, /cleanupEmployeeReferences|deleteDoc/)
})

test('archiwalny pracownik znika tylko z aktywnej listy zespołu', async () => {
  const [viewSource, employeeSource] = await Promise.all([
    readSource('src/views/UstawieniaZespoluView.vue'),
    readSource('src/stores/employeesStore.js')
  ])
  const filtered = viewSource.slice(
    viewSource.indexOf('const filteredEmployees'),
    viewSource.indexOf('const availablePermissionProfiles')
  )

  assert.match(filtered, /employee\.archived !== true/)
  assert.match(employeeSource, /archived:\s*employee\?\.archived === true/)
})

test('stare grafiki i dyspozycje nie są usuwane przy archiwizacji', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const lifecycle = source.slice(
    source.indexOf('const removeEmployeeAccessArtifacts'),
    source.indexOf('const configureLocalPin')
  )

  assert.doesNotMatch(
    lifecycle,
    /grafik_dni|grafik_dyspozycyjnosc|publishedShifts|workingShifts|orders/
  )
})

test('nieaktywny pracownik nie trafia do nowych grafików', async () => {
  const [creationSource, draftSource] = await Promise.all([
    readSource('src/views/grafik/GrafikTworzenieView.vue'),
    readSource('src/views/grafik/GrafikRoboczyView.vue')
  ])

  assert.match(creationSource, /\.filter\(employee => employee\.aktywny !== false\)/)
  assert.match(draftSource, /\.filter\(e => e\.aktywny !== false\)/)
})

test('legacy logowania i lokalna blokada PIN pozostają dostępne', async () => {
  const [routerSource, pinSource, legacySource] = await Promise.all([
    readSource('src/router.js'),
    readSource('src/views/LocalPinLockView.vue'),
    readSource('src/views/PinLoginView.vue')
  ])

  assert.match(routerSource, /path:\s*'\/logowanie'/)
  assert.match(routerSource, /path:\s*LOCAL_PIN_LOCK_PATH/)
  assert.match(pinSource, /Wpisz 4-cyfrowy PIN/)
  assert.match(legacySource, /kod parowania/i)
})
