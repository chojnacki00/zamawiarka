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
  assert.match(source, /Utworzono zaproszenie\./)
  assert.match(source, /role="status"/)
})

test('formularz pracownika pokazuje jeden prosty przepływ dostępu', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))

  assert.match(template, /Utwórz zaproszenie/)
  assert.match(template, /Zablokuj dostęp/)
  assert.match(template, /Przywróć dostęp/)
  assert.match(template, /Dostęp zablokowany/)
  assert.doesNotMatch(template, />Dodaj urządzenie</)
  assert.doesNotMatch(template, />Odłącz wszystkie urządzenia</)
  assert.doesNotMatch(template, /Brak aktywnych urządzeń/)
  assert.doesNotMatch(template, /Aktywne członkostwo/)
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
    /Konto z tym adresem już istnieje\. Zaloguj się lub skorzystaj z przypomnienia hasła\./
  )
})
