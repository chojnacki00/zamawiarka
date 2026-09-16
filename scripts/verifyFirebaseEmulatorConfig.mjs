import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const [centralConfig, firebaseConfig] = await Promise.all([
  readJson(new URL('../firebase-emulators.json', import.meta.url)),
  readJson(new URL('../firebase.json', import.meta.url))
])

assert.match(
  centralConfig.projectId,
  /^demo-/,
  'Projekt Emulatorów musi używać identyfikatora zaczynającego się od demo-.'
)
assert.notEqual(
  centralConfig.projectId,
  'gastromanager-ddcc9',
  'Testy nie mogą używać produkcyjnego projectId.'
)
assert.equal(firebaseConfig.emulators.auth.host, centralConfig.host)
assert.equal(firebaseConfig.emulators.auth.port, centralConfig.authPort)
assert.equal(firebaseConfig.emulators.firestore.host, centralConfig.host)
assert.equal(
  firebaseConfig.emulators.firestore.port,
  centralConfig.firestorePort
)
assert.equal(firebaseConfig.emulators.ui.host, centralConfig.host)
assert.equal(firebaseConfig.emulators.ui.port, centralConfig.uiPort)

console.log(
  `Konfiguracja Emulatorów jest spójna: ${centralConfig.projectId}.`
)
