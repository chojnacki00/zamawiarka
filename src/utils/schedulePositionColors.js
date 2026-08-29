export const DEFAULT_SCHEDULE_POSITION_COLOR = null

export const SCHEDULE_POSITION_COLOR_PALETTE = Object.freeze([
  Object.freeze({
    value: null,
    label: 'Domyślny',
    textColor: '#334155'
  }),
  Object.freeze({
    value: '#E5E7EB',
    label: 'Szary',
    textColor: '#1F2937'
  }),
  Object.freeze({
    value: '#FDE68A',
    label: 'Żółty',
    textColor: '#78350F'
  }),
  Object.freeze({
    value: '#FDBA74',
    label: 'Pomarańczowy',
    textColor: '#7C2D12'
  }),
  Object.freeze({
    value: '#FCA5A5',
    label: 'Czerwony',
    textColor: '#7F1D1D'
  }),
  Object.freeze({
    value: '#F9A8D4',
    label: 'Różowy',
    textColor: '#831843'
  }),
  Object.freeze({
    value: '#C4B5FD',
    label: 'Fioletowy',
    textColor: '#4C1D95'
  }),
  Object.freeze({
    value: '#93C5FD',
    label: 'Niebieski',
    textColor: '#1E3A8A'
  }),
  Object.freeze({
    value: '#67E8F9',
    label: 'Turkusowy',
    textColor: '#164E63'
  }),
  Object.freeze({
    value: '#86EFAC',
    label: 'Zielony',
    textColor: '#14532D'
  })
])

const colorOptionsByValue = new Map(
  SCHEDULE_POSITION_COLOR_PALETTE.map(option => [
    option.value,
    option
  ])
)

export const normalizeSchedulePositionColor = value => {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_SCHEDULE_POSITION_COLOR
  }

  const normalizedValue = String(value).trim().toUpperCase()
  return colorOptionsByValue.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_SCHEDULE_POSITION_COLOR
}

export const isValidSchedulePositionColor = value => (
  value === null ||
  value === undefined ||
  value === '' ||
  normalizeSchedulePositionColor(value) !== null
)

export const getSchedulePositionColorOption = value => (
  colorOptionsByValue.get(normalizeSchedulePositionColor(value)) ||
  colorOptionsByValue.get(DEFAULT_SCHEDULE_POSITION_COLOR)
)
