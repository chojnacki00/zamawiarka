const normalizeRestaurantId = value => String(value || '').trim()

export const isRestaurantContextCurrent = (
  listenerRestaurantId,
  currentRestaurantId
) => (
  Boolean(normalizeRestaurantId(listenerRestaurantId)) &&
  normalizeRestaurantId(listenerRestaurantId) ===
    normalizeRestaurantId(currentRestaurantId)
)

export const persistRestaurantListChange = async ({
  previousValue,
  nextValue,
  applyValue,
  persistValue
}) => {
  applyValue(nextValue)

  try {
    await persistValue(nextValue)
    return true
  } catch (error) {
    applyValue(previousValue)
    throw error
  }
}
