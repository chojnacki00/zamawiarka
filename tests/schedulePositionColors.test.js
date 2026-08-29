import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_SCHEDULE_POSITION_COLOR,
  SCHEDULE_POSITION_COLOR_PALETTE,
  getSchedulePositionColorOption,
  isValidSchedulePositionColor,
  normalizeSchedulePositionColor
} from '../src/utils/schedulePositionColors.js'

test('paleta ma stabilne wartości, etykiety i czytelny kolor tekstu', () => {
  assert.ok(SCHEDULE_POSITION_COLOR_PALETTE.length >= 8)
  assert.ok(SCHEDULE_POSITION_COLOR_PALETTE.every(option => (
    Object.hasOwn(option, 'value') &&
    typeof option.label === 'string' &&
    typeof option.textColor === 'string'
  )))
  assert.equal(SCHEDULE_POSITION_COLOR_PALETTE[0].value, null)
})

test('prawidłowy kolor z palety jest akceptowany', () => {
  assert.equal(normalizeSchedulePositionColor('#86EFAC'), '#86EFAC')
  assert.equal(normalizeSchedulePositionColor('#86efac'), '#86EFAC')
  assert.equal(isValidSchedulePositionColor('#86EFAC'), true)
})

test('wartość spoza palety jest normalizowana do braku koloru', () => {
  assert.equal(
    normalizeSchedulePositionColor('#123456'),
    DEFAULT_SCHEDULE_POSITION_COLOR
  )
  assert.equal(isValidSchedulePositionColor('#123456'), false)
})

test('stanowisko bez koloru pozostaje prawidłowe', () => {
  assert.equal(normalizeSchedulePositionColor(null), null)
  assert.equal(normalizeSchedulePositionColor(undefined), null)
  assert.equal(getSchedulePositionColorOption(null).label, 'Domyślny')
})
