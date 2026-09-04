import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isRestaurantContextCurrent,
  isRestaurantDataReadyForWrite,
  isRestaurantSnapshotCurrent,
  persistRestaurantDataWhenReady,
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

test('opóźniony odczyt blokuje każdy zapis przed zakończeniem hydracji', async () => {
  let writes = 0
  let status = 'loading'
  let loadedRestaurantId = null
  let finishRead
  const delayedRead = new Promise(resolve => { finishRead = resolve })
    .then(state => {
      status = 'ready'
      loadedRestaurantId = 'restaurant-a'
      return state
    })

  await assert.rejects(
    persistRestaurantDataWhenReady({
      status,
      loadedRestaurantId,
      currentRestaurantId: 'restaurant-a',
      persistValue: async () => { writes += 1 }
    }),
    /Zapis został zablokowany/
  )

  assert.equal(writes, 0)

  finishRead({ suppliers: [{ id: 'supplier-1' }] })
  await delayedRead

  await persistRestaurantDataWhenReady({
    status,
    loadedRestaurantId,
    currentRestaurantId: 'restaurant-a',
    persistValue: async () => { writes += 1 }
  })

  assert.equal(writes, 1)
})

test('błąd odczytu nie może uruchomić zapisu', async () => {
  let writes = 0

  await assert.rejects(
    persistRestaurantDataWhenReady({
      status: 'error',
      loadedRestaurantId: null,
      currentRestaurantId: 'restaurant-a',
      persistValue: async () => { writes += 1 }
    }),
    /Zapis został zablokowany/
  )

  assert.equal(writes, 0)
})

test('brak dokumentu nie jest traktowany jako poprawnie załadowany stan', () => {
  assert.equal(isRestaurantDataReadyForWrite({
    status: 'missing',
    loadedRestaurantId: null,
    currentRestaurantId: 'restaurant-a'
  }), false)
})

test('spóźniony kontekst poprzedniej restauracji nie może zapisać danych', async () => {
  let writes = 0

  await assert.rejects(
    persistRestaurantDataWhenReady({
      status: 'ready',
      loadedRestaurantId: 'restaurant-a',
      currentRestaurantId: 'restaurant-b',
      persistValue: async () => { writes += 1 }
    }),
    /Zapis został zablokowany/
  )

  assert.equal(writes, 0)
})

test('spóźniony snapshot poprzedniej restauracji nie zmienia stanu ani nie planuje zapisu', () => {
  let localValue = [{ id: 'supplier-b' }]
  let scheduledWrites = 0

  if (isRestaurantSnapshotCurrent({
    status: 'ready',
    listenerRestaurantId: 'restaurant-a',
    loadedRestaurantId: 'restaurant-b',
    currentRestaurantId: 'restaurant-b'
  })) {
    localValue = [{ id: 'supplier-a' }]
    scheduledWrites += 1
  }

  assert.deepEqual(localValue, [{ id: 'supplier-b' }])
  assert.equal(scheduledWrites, 0)
})

test('całkowicie pusty stan przed pierwszym odczytem nadal nie może zostać zapisany', async () => {
  const emptyState = {
    suppliers: [],
    warehouses: [],
    units: [],
    categories: []
  }
  let persistedState = null

  await assert.rejects(
    persistRestaurantDataWhenReady({
      status: 'idle',
      loadedRestaurantId: null,
      currentRestaurantId: 'restaurant-a',
      persistValue: async () => { persistedState = emptyState }
    }),
    /Zapis został zablokowany/
  )

  assert.equal(persistedState, null)
})

test('po hydracji zapis aktualnej restauracji jest dozwolony', async () => {
  let writes = 0

  await persistRestaurantDataWhenReady({
    status: 'ready',
    loadedRestaurantId: 'restaurant-a',
    currentRestaurantId: 'restaurant-a',
    persistValue: async () => { writes += 1 }
  })

  assert.equal(writes, 1)
})
