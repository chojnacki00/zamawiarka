import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('pole nazwy grupy ma jawny kolor tekstu, kursora i placeholdera', async () => {
  const source = await readSource(
    'src/views/UstawieniaGrupPracowniczychView.vue'
  )
  assert.match(source, /-webkit-text-fill-color:\s*#111827/)
  assert.match(source, /caret-color:\s*#0ea5e9/)
  assert.match(source, /::placeholder/)
})

test('akcje zaproszenia mają efekt naciśnięcia i widoczne potwierdzenia', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  assert.match(source, /:active:not\(:disabled\)/)
  assert.match(source, /Skopiowano link\./)
  assert.match(source, /Anulowano zaproszenie\./)
  assert.match(source, /Zaproszenie utworzono\./)
  assert.match(source, /role="status"/)
})

test('formularz pracownika pokazuje jeden prosty przepływ dostępu', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))

  assert.match(template, /Dodaj urządzenie/)
  assert.match(template, /Usuń urządzenie/)
  assert.doesNotMatch(template, /Zablokuj dostęp/)
  assert.doesNotMatch(template, /Przywróć dostęp/)
  assert.doesNotMatch(template, /Dostęp zablokowany/)
  assert.doesNotMatch(template, />Odłącz wszystkie urządzenia</)
  assert.doesNotMatch(template, /Brak aktywnych urządzeń/)
  assert.doesNotMatch(template, /Aktywne członkostwo/)
  assert.doesNotMatch(template, /PIN starszego logowania/)
  assert.doesNotMatch(template, /Paruj urządzenie/)
})

test('wyłączenie konta wymaga potwierdzenia i chroni historię', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))
  const cancelHandler = source.slice(
    source.indexOf('const closeAccountDisableConfirmation'),
    source.indexOf('const updateEmployeeAccountActive')
  )

  assert.match(template, /Czy wyłączyć konto pracownika\?/)
  assert.match(template, /Dotychczasowe grafiki, historia i rozpoczęte dokumenty pozostaną zachowane\./)
  assert.match(template, /@click="disableEmployeeAccount"/)
  assert.doesNotMatch(cancelHandler, /setEmployeeAccountActive/)
  assert.match(source, /await accountSessionStore\.setEmployeeAccountActive/)
  assert.match(source, /if \(!editingEmployeeId\.value \|\| isAccountActionPending\.value\) return/)
})

test('lista urządzeń pokazuje wyłącznie opis użytkowy', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))
  const devices = template.slice(
    template.indexOf('class="devices-section"'),
    template.indexOf('accountAccessMessage', template.indexOf('class="devices-section"'))
  )

  assert.match(devices, /Urządzenia \(\{\{ employeeDevices\.length \}\}\)/)
  assert.match(devices, /device\.name/)
  assert.match(devices, /formatDeviceDate\(device\.dateValue\)/)
  assert.match(devices, /Usuń urządzenie/)
  assert.match(devices, /class="delete-icon remove-device-button"/)
  assert.match(devices, /<svg[^>]+stroke="currentColor"/)
  assert.doesNotMatch(devices, /authUid|authTime|deviceId|statusLabel/)

  const styles = source.slice(source.indexOf('<style scoped>'))
  assert.match(styles, /\.device-summary\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/)
  assert.match(styles, /\.device-summary strong\s*\{[^}]*text-overflow:\s*ellipsis/)
  assert.match(styles, /\.remove-device-button\s*\{[^}]*grid-column:\s*2/)
})

test('dodanie urządzenia wyjaśnia wpływ nowego zaproszenia', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))

  assert.match(
    template,
    /Nowe zaproszenie unieważni poprzedni niewykorzystany link\. Dodane urządzenia pozostaną bez zmian\./
  )
})

test('usunięcie urządzenia i pracownika wymaga opisanych potwierdzeń', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))
  const cancelDeviceHandler = source.slice(
    source.indexOf('const closeRemoveDeviceConfirmation'),
    source.indexOf('const removeSelectedDevice')
  )

  assert.match(template, /Czy usunąć urządzenie „\{\{ deviceToRemove\.name \}\}”\?/)
  assert.match(template, /Jego ponowne dodanie będzie wymagało nowego zaproszenia\./)
  assert.match(cancelDeviceHandler, /deviceToRemove\.value = null/)
  assert.doesNotMatch(cancelDeviceHandler, /removeEmployeeDevice|delete/)
  assert.match(template, /Czy usunąć pracownika z zespołu\?/)
  assert.match(template, /Dotychczasowe grafiki i historia pozostaną zachowane\./)
  assert.match(template, />\{\{ isAccountActionPending \? 'Usuwanie…' : 'Usuń z zespołu' \}\}</)
})

test('modal zaproszenia ma tylko przekazanie, kopiowanie i anulowanie', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))

  assert.match(template, /Przekaż pracownikowi link lub pokaż kod QR\./)
  assert.match(template, /Kopiuj link/)
  assert.match(template, /Anuluj zaproszenie/)
  assert.doesNotMatch(template, /Wyślij ponownie|Wygeneruj nowe zaproszenie/)
  assert.match(source, /Zaproszenie utworzono\. Przekaż pracownikowi link lub kod QR\./)
})

test('ekrany dostępu używają tekstów użytkowych i opisanych pól PIN', async () => {
  const [accountSource, teamSource, loginSource, activationSource, pinSource] = await Promise.all([
    readSource('src/views/AccountAccessView.vue'),
    readSource('src/views/UstawieniaZespoluView.vue'),
    readSource('src/views/LoginView.vue'),
    readSource('src/views/ActivationView.vue'),
    readSource('src/views/LocalPinLockView.vue')
  ])
  const accountTemplate = accountSource.slice(0, accountSource.indexOf('<script setup>'))
  const teamTemplate = teamSource.slice(0, teamSource.indexOf('<script setup>'))

  for (const source of [
    accountTemplate,
    teamTemplate,
    loginSource.slice(0, loginSource.indexOf('<script setup>')),
    activationSource.slice(0, activationSource.indexOf('<script setup>')),
    pinSource.slice(0, pinSource.indexOf('<script setup>'))
  ]) assert.doesNotMatch(source, />[^<]*Firebase/)
  assert.match(accountTemplate, /Dostęp do tej restauracji został zablokowany\./)
  assert.match(accountTemplate, /Skontaktuj się z managerem, aby ponownie uzyskać dostęp\./)
  assert.match(accountTemplate, /<span>Wpisz PIN<\/span>/)
  assert.match(accountTemplate, /<span>Powtórz PIN<\/span>/)
  assert.match(accountTemplate, /PIN jest zapisany wyłącznie na tym urządzeniu\./)
  assert.match(accountTemplate, /pin\.length !== 4 \|\| pin !== pinConfirmation/)
})

test('aktywacja pozwala wybrać istniejące konto i przypomnieć hasło bez nazw technicznych', async () => {
  const source = await readSource('src/views/ActivationView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))

  assert.match(template, />Utwórz konto</)
  assert.match(template, />Mam już konto</)
  assert.match(template, />Nie pamiętam hasła</)
  assert.doesNotMatch(template, />\s*(?:ACCOUNT_ACTIVATION|DEVICE_ENROLLMENT)/)
  assert.doesNotMatch(template, />[^<]*Firebase/)
  assert.match(
    source,
    /Konto z tym adresem e-mail już istnieje\. Wróć i wybierz „Mam już konto”\./
  )
})

test('prawidłowe nazwanie urządzenia nie proponuje zmiany konta', async () => {
  const source = await readSource('src/views/ActivationView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))
  const deviceStep = template.slice(
    template.indexOf(`step === 'device'`),
    template.indexOf('</template>', template.indexOf(`step === 'device'`))
  )

  assert.match(deviceStep, /Zatwierdź urządzenie/)
  assert.doesNotMatch(deviceStep, /Użyj innego konta/)
})

test('niezgodne konto ma osobny stan i bezpieczną zmianę logowania', async () => {
  const source = await readSource('src/views/ActivationView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))
  const mismatchStep = template.slice(
    template.indexOf(`step === 'account-mismatch'`),
    template.indexOf('</template>', template.indexOf(`step === 'account-mismatch'`))
  )

  assert.match(
    mismatchStep,
    /To zaproszenie jest przypisane do innego konta\./
  )
  assert.match(
    mismatchStep,
    /Wyloguj i zaloguj właściwe konto/
  )
  assert.match(
    source,
    /error\?\.code === 'activation\/account-mismatch'/
  )
  assert.match(
    source,
    /getDoc\(doc\(db, 'identityInvitations', tokenHash\)\)/
  )
})
