import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isRestaurantContextCurrent,
  persistRestaurantListChange
} from '../src/utils/restaurantDataContext.js'

test('listener przyjmuje dane wyłącznie z aktualnej restauracji', () => {
  assert.equal(
    isRestaurantContextCurrent('restaurant-a', 'restaurant-a'),
    true
  )
  assert.equal(
    isRestaurantContextCurrent('restaurant-a', 'restaurant-b'),
    false
  )
  assert.equal(isRestaurantContextCurrent('restaurant-a', null), false)
})

test('odrzucony zapis przywraca poprzednią listę lokalną', async () => {
  const previousValue = [{ id: 'supplier-1', name: 'Hurtownia testowa' }]
  let localValue = previousValue

  await assert.rejects(
    persistRestaurantListChange({
      previousValue,
      nextValue: [],
      applyValue: value => { localValue = value },
      persistValue: async () => {
        throw new Error('permission-denied')
      }
    }),
    /permission-denied/
  )

  assert.deepEqual(localValue, previousValue)
})

test('udany zapis pozostawia nową listę lokalną', async () => {
  const previousValue = []
  const nextValue = [{ id: 'supplier-1', name: 'Nowa hurtownia' }]
  let localValue = previousValue

  await persistRestaurantListChange({
    previousValue,
    nextValue,
    applyValue: value => { localValue = value },
    persistValue: async () => true
  })

  assert.deepEqual(localValue, nextValue)
})
