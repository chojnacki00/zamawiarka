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
