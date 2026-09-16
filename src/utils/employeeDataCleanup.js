import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { getEmployeeFullName } from './employeeAssignments.js'

const BATCH_SIZE = 400
const HISTORY_TRANSACTION_SIZE = 100

const commitOperations = async operations => {
  for (let start = 0; start < operations.length; start += BATCH_SIZE) {
    const batch = writeBatch(db)
    operations.slice(start, start + BATCH_SIZE).forEach(operation => {
      if (operation.type === 'delete') batch.delete(operation.ref)
      else batch.update(operation.ref, operation.data)
    })
    await batch.commit()
  }
}

const addMissingEmployeeSnapshots = (
  shifts,
  employeeNamesById
) => {
  let changed = false
  const nextShifts = (Array.isArray(shifts) ? shifts : []).map(shift => {
    const employeeName = employeeNamesById.get(shift?.employeeId)
    const currentSnapshot = String(
      shift?.employeeNameSnapshot || ''
    ).trim()

    if (!employeeName || currentSnapshot) return shift

    changed = true
    return {
      ...shift,
      employeeNameSnapshot: employeeName
    }
  })

  return { shifts: nextShifts, changed }
}

const secureScheduleHistory = async (
  scheduleDayDocuments,
  employeeNamesById
) => {
  const documentsToUpdate = scheduleDayDocuments.filter(
    documentSnapshot => {
      const data = documentSnapshot.data()
      return [
        ...(Array.isArray(data.workingShifts)
          ? data.workingShifts
          : []),
        ...(Array.isArray(data.publishedShifts)
          ? data.publishedShifts
          : [])
      ].some(shift => (
        employeeNamesById.has(shift?.employeeId) &&
        !String(shift?.employeeNameSnapshot || '').trim()
      ))
    }
  )
  let changedScheduleDays = 0

  for (
    let start = 0;
    start < documentsToUpdate.length;
    start += HISTORY_TRANSACTION_SIZE
  ) {
    const chunk = documentsToUpdate.slice(
      start,
      start + HISTORY_TRANSACTION_SIZE
    )
    const changedInTransaction = await runTransaction(
      db,
      async transaction => {
        const currentSnapshots = []

        for (const documentSnapshot of chunk) {
          currentSnapshots.push(
            await transaction.get(documentSnapshot.ref)
          )
        }

        let changedDocuments = 0

        currentSnapshots.forEach(currentSnapshot => {
          if (!currentSnapshot.exists()) return

          const data = currentSnapshot.data()
          const working = addMissingEmployeeSnapshots(
            data.workingShifts,
            employeeNamesById
          )
          const published = addMissingEmployeeSnapshots(
            data.publishedShifts,
            employeeNamesById
          )
          const update = {}

          if (working.changed) {
            update.workingShifts = working.shifts
          }

          if (published.changed) {
            update.publishedShifts = published.shifts
          }

          if (!Object.keys(update).length) return

          transaction.update(currentSnapshot.ref, {
            ...update,
            updatedAt: serverTimestamp()
          })
          changedDocuments += 1
        })

        return changedDocuments
      }
    )

    changedScheduleDays += changedInTransaction
  }

  return changedScheduleDays
}

export const cleanupEmployeeReferences = async (restaurantId, employeeIds) => {
  const removedEmployeeIds = new Set(employeeIds)
  if (!restaurantId || !removedEmployeeIds.size) {
    return { employees: 0, availability: 0, pairingCodes: 0, scheduleDays: 0, schedules: 0, metadata: 0 }
  }

  const collectionRef = name => collection(db, 'users', restaurantId, name)
  const removedEmployeeIdList = [...removedEmployeeIds]
  const employeeDocumentSnapshots = await Promise.all(
    removedEmployeeIdList.map(employeeId => getDoc(
      doc(db, 'users', restaurantId, 'employees', employeeId)
    ))
  )
  const employeeNamesById = new Map()

  employeeDocumentSnapshots.forEach((employeeSnapshot, index) => {
    const employeeId = removedEmployeeIdList[index]

    if (!employeeSnapshot.exists()) {
      throw new Error(
        'Nie znaleziono danych pracownika. Usuwanie zostało przerwane.'
      )
    }

    const employeeName = getEmployeeFullName(employeeSnapshot.data())

    if (!employeeName) {
      throw new Error(
        'Nie udało się ustalić nazwy pracownika. Usuwanie zostało przerwane.'
      )
    }

    employeeNamesById.set(employeeId, employeeName)
  })

  const [availabilitySnapshot, pairingSnapshot, scheduleDaysSnapshot] = await Promise.all([
    getDocs(collectionRef('grafik_dyspozycyjnosc')),
    getDocs(collection(db, 'pairing_codes')),
    getDocs(collectionRef('grafik_dni'))
  ])

  let changedScheduleDays = 0

  try {
    changedScheduleDays = await secureScheduleHistory(
      scheduleDaysSnapshot.docs,
      employeeNamesById
    )
  } catch (error) {
    console.error(
      'Błąd zabezpieczania historii grafików przed usunięciem pracownika:',
      error
    )
    throw new Error(
      'Nie udało się zabezpieczyć historii grafików. Pracownik nie został usunięty. Spróbuj ponownie.'
    )
  }

  const operations = []
  let availability = 0
  let pairingCodes = 0

  availabilitySnapshot.docs.forEach(documentSnapshot => {
    if (!removedEmployeeIds.has(documentSnapshot.data().employeeId)) return
    operations.push({ type: 'delete', ref: documentSnapshot.ref })
    availability += 1
  })

  pairingSnapshot.docs.forEach(documentSnapshot => {
    const data = documentSnapshot.data()
    if (data.companyUid !== restaurantId || !removedEmployeeIds.has(data.employeeId || data.empId)) return
    operations.push({ type: 'delete', ref: documentSnapshot.ref })
    pairingCodes += 1
  })

  const metadataCollections = [
    ['grafik_okresy_dyspozycji', ['createdById', 'updatedById']],
    ['dyspozycje_dni', ['updatedById']],
    ['grafik_profile_zatrudnienia', ['updatedBy']],
    ['grafik_ustawienia', ['updatedBy']]
  ]
  let metadata = 0

  for (const [collectionName, fields] of metadataCollections) {
    const snapshot = await getDocs(collectionRef(collectionName))
    snapshot.docs.forEach(documentSnapshot => {
      const data = documentSnapshot.data()
      const update = {}
      fields.forEach(field => {
        if (removedEmployeeIds.has(data[field])) update[field] = null
      })
      if (!Object.keys(update).length) return
      operations.push({ type: 'update', ref: documentSnapshot.ref, data: { ...update, updatedAt: serverTimestamp() } })
      metadata += 1
    })
  }

  employeeIds.forEach(employeeId => operations.push({
    type: 'delete',
    ref: doc(db, 'users', restaurantId, 'employees', employeeId)
  }))

  await commitOperations(operations)
  return {
    employees: employeeIds.length,
    availability,
    pairingCodes,
    scheduleDays: changedScheduleDays,
    schedules: 0,
    metadata
  }
}
