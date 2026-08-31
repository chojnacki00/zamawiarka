import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  after,
  before,
  beforeEach,
  test
} from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import emulatorConfig from '../firebase-emulators.json' with { type: 'json' }
import {
  cleanupDisconnectedDeviceSessions,
  cleanupExpiredInvitations,
  cleanupExpiredPairingCodes
} from '../src/services/temporaryDataCleanup.js'

let testEnv
const AUTH_TIME = 1700000000

const now = () => Timestamp.now()
const future = () => Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)
const past = () => Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)

const context = ({ uid, email, verified = true, authTime = AUTH_TIME }) => (
  testEnv.authenticatedContext(uid, {
    email,
    email_verified: verified,
    auth_time: authTime
  })
)

const seed = async documents => {
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const db = adminContext.firestore()
    const batch = writeBatch(db)
    documents.forEach(([path, data]) => batch.set(doc(db, path), data))
    await batch.commit()
  })
}

const memberData = ({
  uid,
  restaurantId,
  employeeId = null,
  permissionProfileId = null,
  invitationId = null,
  role = 'employee',
  status = 'active'
}) => ({
  authUid: uid,
  restaurantId,
  employeeId,
  permissionProfileId,
  invitationId,
  role,
  status,
  createdAt: now(),
  acceptedAt: now()
})

const seedEmployeeAccess = async ({
  restaurantId = 'restaurant-a',
  uid = 'employee-auth',
  employeeId = 'employee-1',
  profileId = 'profile-1',
  permissions = {},
  profileName = 'Profil pracownika',
  status = 'active'
} = {}) => {
  await seed([
    [`restaurants/${restaurantId}`, {
      id: restaurantId,
      name: restaurantId,
      ownerAuthUid: 'owner-auth',
      status: 'active'
    }],
    [`users/${restaurantId}/employees/${employeeId}`, {
      imie: 'Jan',
      nazwisko: 'Testowy',
      aktywny: true,
      permissionProfileId: profileId
    }],
    [`users/${restaurantId}/permissionProfiles/${profileId}`, {
      nazwa: profileName,
      uprawnienia: permissions
    }],
    [`restaurants/${restaurantId}/members/${uid}`, memberData({
      uid,
      restaurantId,
      employeeId,
      permissionProfileId: profileId,
      status
    })],
    [`restaurants/${restaurantId}/members/${uid}/deviceSessions/${AUTH_TIME}`, {
      deviceId: `device-${restaurantId}-${uid}`,
      restaurantId,
      employeeId,
      authUid: uid,
      deviceName: 'Urządzenie testowe',
      platform: 'Emulator',
      authTime: AUTH_TIME,
      status: 'active',
      addedAt: now(),
      lastActiveAt: now(),
      approvedAt: now(),
      approvedByAuthUid: 'owner-auth',
      invitationId: 'seed-invitation',
      disconnectedAt: null,
      disconnectedByAuthUid: null
    }]
  ])
}

const seedOwner = async ({
  restaurantId = 'restaurant-a',
  uid = 'owner-auth'
} = {}) => seed([
  [`restaurants/${restaurantId}`, {
    id: restaurantId,
    name: restaurantId,
    ownerAuthUid: uid,
    status: 'active'
  }],
  [`restaurants/${restaurantId}/members/${uid}`, memberData({
    uid,
    restaurantId,
    role: 'owner'
  })]
])

const identityInvitationDocuments = ({
  tokenHash = 'a'.repeat(64),
  restaurantId = 'restaurant-a',
  employeeId = 'employee-1',
  profileId = 'profile-1',
  email = 'employee@example.com',
  purpose = 'ACCOUNT_ACTIVATION',
  targetAuthUid = null,
  createdAt = null,
  expiresAt = null,
  status = 'pending',
  createdByAuthUid = 'owner-auth'
} = {}) => {
  const slotId = `${restaurantId}__${employeeId}__${purpose}`
  const emailHash = 'e'.repeat(64)
  const resolvedCreatedAt = createdAt || now()
  const resolvedExpiresAt = expiresAt || Timestamp.fromMillis(
    resolvedCreatedAt.toMillis() + (7 * 24 * 60 * 60 * 1000)
  )
  return [
    [`identityInvitations/${tokenHash}`, {
      id: tokenHash,
      tokenHash,
      slotId,
      purpose,
      restaurantId,
      employeeId,
      permissionProfileId: profileId,
      emailNormalized: email,
      emailHash,
      targetAuthUid,
      status,
      createdByAuthUid,
      createdAt: resolvedCreatedAt,
      expiresAt: resolvedExpiresAt
    }],
    [`activationInvitations/${tokenHash}`, {
      id: tokenHash,
      tokenHash,
      purpose,
      restaurantNameSnapshot: 'Restauracja testowa',
      maskedEmail: 'e***@example.com',
      emailHash,
      status,
      createdAt: resolvedCreatedAt,
      expiresAt: resolvedExpiresAt
    }],
    [`restaurants/${restaurantId}/identityInvitationSlots/${slotId}`, {
      id: slotId,
      tokenHash,
      restaurantId,
      employeeId,
      purpose,
      createdAt: resolvedCreatedAt,
      expiresAt: resolvedExpiresAt
    }]
  ]
}

const writeIdentityInvitation = async ({ db, options = {} }) => {
  const batch = writeBatch(db)
  identityInvitationDocuments(options).forEach(([path, data]) => {
    batch.set(doc(db, path), data)
  })
  await batch.commit()
}

const deviceSessionData = ({
  uid = 'employee-auth',
  restaurantId = 'restaurant-a',
  employeeId = 'employee-1',
  invitationId = 'a'.repeat(64),
  authTime = AUTH_TIME,
  approvedByAuthUid = 'owner-auth'
} = {}) => ({
  deviceId: `device-${uid}-${authTime}`,
  restaurantId,
  employeeId,
  authUid: uid,
  deviceName: 'Telefon testowy',
  platform: 'Emulator',
  authTime,
  status: 'active',
  addedAt: now(),
  lastActiveAt: now(),
  approvedAt: now(),
  approvedByAuthUid,
  invitationId,
  disconnectedAt: null,
  disconnectedByAuthUid: null
})

const acceptIdentityInvitation = async ({
  db,
  tokenHash = 'a'.repeat(64),
  uid = 'employee-auth',
  restaurantId = 'restaurant-a',
  employeeId = 'employee-1',
  profileId = 'profile-1',
  purpose = 'ACCOUNT_ACTIVATION',
  authTime = AUTH_TIME,
  deleteArtifacts = true
}) => {
  const slotId = `${restaurantId}__${employeeId}__${purpose}`
  const batch = writeBatch(db)
  if (purpose === 'ACCOUNT_ACTIVATION') {
    batch.set(doc(db, `restaurants/${restaurantId}/members/${uid}`), memberData({
      uid,
      restaurantId,
      employeeId,
      permissionProfileId: profileId,
      invitationId: tokenHash
    }))
  }
  batch.set(
    doc(db, `restaurants/${restaurantId}/members/${uid}/deviceSessions/${authTime}`),
    deviceSessionData({
      uid,
      restaurantId,
      employeeId,
      invitationId: tokenHash,
      authTime
    })
  )
  if (deleteArtifacts) {
    batch.delete(doc(db, `identityInvitations/${tokenHash}`))
    batch.delete(doc(db, `activationInvitations/${tokenHash}`))
    batch.delete(doc(
      db,
      `restaurants/${restaurantId}/identityInvitationSlots/${slotId}`
    ))
  }
  await batch.commit()
}

const publicHeader = ({ id = 'schedule-1' } = {}) => ({
  id,
  scheduleId: id,
  name: 'Grafik testowy',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-07',
  publicationStatus: 'published',
  publishedUntil: '2026-09-07',
  publishedDaysCount: 7,
  publishedRevision: 1,
  publishedAt: now(),
  lastPublishedAt: now(),
  schemaVersion: 1,
  updatedAt: now()
})

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: emulatorConfig.projectId,
    firestore: {
      host: emulatorConfig.host,
      port: emulatorConfig.firestorePort,
      rules: await readFile(
        new URL('../firestore.rules', import.meta.url),
        'utf8'
      )
    }
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

after(async () => {
  await testEnv.cleanup()
})

test('niezalogowany użytkownik nie odczytuje konta GM', async () => {
  await seed([['accounts/account-1', { authUid: 'account-1' }]])
  await assertFails(getDoc(doc(
    testEnv.unauthenticatedContext().firestore(),
    'accounts/account-1'
  )))
})

test('konto odczytuje własne dane, ale nie dane innego konta', async () => {
  await seed([
    ['accounts/account-1', { authUid: 'account-1' }],
    ['accounts/account-2', { authUid: 'account-2' }]
  ])
  const db = context({
    uid: 'account-1',
    email: 'one@example.com'
  }).firestore()
  await assertSucceeds(getDoc(doc(db, 'accounts/account-1')))
  await assertFails(getDoc(doc(db, 'accounts/account-2')))
})

test('konto nie zapisuje restaurantId, uprawnień ani danych uwierzytelniających', async () => {
  const db = context({
    uid: 'account-1',
    email: 'one@example.com'
  }).firestore()
  const base = {
    authUid: 'account-1',
    email: 'one@example.com',
    displayName: 'Jan Testowy',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  }
  for (const forbidden of [
    { restaurantId: 'restaurant-a' },
    { permissions: { can_manage_schedule: true } },
    { password: 'tajne' },
    { pin: '1234' },
    { firebaseToken: 'token' }
  ]) {
    await assertFails(setDoc(
      doc(db, 'accounts/account-1'),
      { ...base, ...forbidden }
    ))
  }
})

test('stary właściciel wykonuje bootstrap tylko z dokumentem app/state', async () => {
  const uid = 'legacy-owner'
  await seed([[`users/${uid}/app/state`, { initialized: true }]])
  const db = context({
    uid,
    email: 'owner@example.com'
  }).firestore()
  const batch = writeBatch(db)
  batch.set(doc(db, `restaurants/${uid}`), {
    id: uid,
    name: 'Stara restauracja',
    ownerAuthUid: uid,
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  })
  batch.set(
    doc(db, `restaurants/${uid}/members/${uid}`),
    memberData({ uid, restaurantId: uid, role: 'owner' })
  )
  await assertSucceeds(batch.commit())
})

test('nowe konto bez app/state nie wykonuje bootstrapu właściciela', async () => {
  const uid = 'new-account'
  const db = context({ uid, email: 'new@example.com' }).firestore()
  await assertFails(setDoc(doc(db, `restaurants/${uid}`), {
    id: uid,
    name: 'Nieuprawniona restauracja',
    ownerAuthUid: uid,
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  }))
})

test('konto nie wykonuje bootstrapu cudzej restauracji', async () => {
  await seed([['users/account-1/app/state', { initialized: true }]])
  const db = context({
    uid: 'account-1',
    email: 'one@example.com'
  }).firestore()
  await assertFails(setDoc(doc(db, 'restaurants/restaurant-other'), {
    id: 'restaurant-other',
    name: 'Cudza restauracja',
    ownerAuthUid: 'account-1',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  }))
})

test('bootstrap nie nadpisuje istniejącego właściciela', async () => {
  await seed([
    ['users/account-1/app/state', { initialized: true }],
    ['restaurants/account-1', {
      id: 'account-1',
      name: 'Istniejąca',
      ownerAuthUid: 'other-owner',
      status: 'active'
    }]
  ])
  const db = context({
    uid: 'account-1',
    email: 'one@example.com'
  }).firestore()
  await assertFails(updateDoc(doc(db, 'restaurants/account-1'), {
    ownerAuthUid: 'account-1'
  }))
})

test('publiczne zaproszenie ujawnia tylko bezpieczny podgląd, a prywatne wymaga zgodnego konta', async () => {
  await seed(identityInvitationDocuments())
  const publicRef = doc(
    testEnv.unauthenticatedContext().firestore(),
    `activationInvitations/${'a'.repeat(64)}`
  )
  const publicSnapshot = await assertSucceeds(getDoc(publicRef))
  assert.equal(publicSnapshot.data().maskedEmail, 'e***@example.com')
  assert.equal('emailNormalized' in publicSnapshot.data(), false)
  await assertFails(getDoc(doc(
    testEnv.unauthenticatedContext().firestore(),
    `identityInvitations/${'a'.repeat(64)}`
  )))
  await assertFails(getDoc(doc(
    context({ uid: 'wrong', email: 'wrong@example.com' }).firestore(),
    `identityInvitations/${'a'.repeat(64)}`
  )))
})

test('właściciel atomowo tworzy prywatne, publiczne i indeksowane zaproszenie', async () => {
  await seedOwner()
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1',
      email: 'employee@example.com'
    }],
    ['users/restaurant-a/permissionProfiles/profile-1', { uprawnienia: {} }]
  ])
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  await assertSucceeds(writeIdentityInvitation({ db }))
})

test('reguły nie pozwalają przesunąć siedmiodniowej ważności zaproszenia w przyszłość', async () => {
  await seedOwner()
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1',
      email: 'employee@example.com'
    }],
    ['users/restaurant-a/permissionProfiles/profile-1', { uprawnienia: {} }]
  ])
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  const futureCreatedAt = Timestamp.fromMillis(
    Date.now() + (24 * 60 * 60 * 1000)
  )
  await assertFails(writeIdentityInvitation({
    db,
    options: { createdAt: futureCreatedAt }
  }))
})

test('nowe zaproszenie tego samego celu atomowo unieważnia poprzedni token', async () => {
  await seedOwner()
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    ['users/restaurant-a/permissionProfiles/profile-1', { uprawnienia: {} }],
    ...identityInvitationDocuments({ tokenHash: 'a'.repeat(64) })
  ])
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  const batch = writeBatch(db)
  batch.delete(doc(db, `identityInvitations/${'a'.repeat(64)}`))
  batch.delete(doc(db, `activationInvitations/${'a'.repeat(64)}`))
  identityInvitationDocuments({ tokenHash: 'b'.repeat(64) })
    .forEach(([path, data]) => batch.set(doc(db, path), data))
  await assertSucceeds(batch.commit())
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(adminDb, `identityInvitations/${'a'.repeat(64)}`))).exists(), false)
    assert.equal((await getDoc(doc(adminDb, `identityInvitations/${'b'.repeat(64)}`))).exists(), true)
  })
})

test('manager zespołu tworzy zaproszenie, a zwykły pracownik nie', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const managerDb = context({ uid: 'manager-auth', email: 'manager@example.com' }).firestore()
  await assertSucceeds(writeIdentityInvitation({
    db: managerDb,
    options: { createdByAuthUid: 'manager-auth' }
  }))

  await testEnv.clearFirestore()
  await seedEmployeeAccess()
  await seed([['users/restaurant-a/employees/invited', {
    aktywny: true,
    permissionProfileId: 'profile-1'
  }]])
  const employeeDb = context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore()
  await assertFails(getDocs(collection(
    employeeDb,
    'restaurants/restaurant-a/members/employee-auth/deviceSessions'
  )))
  await assertFails(writeIdentityInvitation({
    db: employeeDb,
    options: {
      tokenHash: 'b'.repeat(64),
      employeeId: 'invited',
      createdByAuthUid: 'employee-auth'
    }
  }))
})

test('pierwsza aktywacja atomowo tworzy członkostwo i zatwierdza tylko bieżącą sesję', async () => {
  await seed([
    ...identityInvitationDocuments(),
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore()
  await assertSucceeds(acceptIdentityInvitation({ db }))
  await assertSucceeds(getDoc(doc(db, 'restaurants/restaurant-a')))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(adminDb, `identityInvitations/${'a'.repeat(64)}`))).exists(), false)
    assert.equal((await getDoc(doc(adminDb, `activationInvitations/${'a'.repeat(64)}`))).exists(), false)
  })
})

test('akceptacja odrzuca niezweryfikowany i niezgodny e-mail oraz zachowuje token', async () => {
  await seed([
    ...identityInvitationDocuments(),
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  await assertFails(acceptIdentityInvitation({
    db: context({
      uid: 'employee-auth', email: 'employee@example.com', verified: false
    }).firestore()
  }))
  await assertFails(acceptIdentityInvitation({
    db: context({ uid: 'employee-auth', email: 'wrong@example.com' }).firestore()
  }))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    assert.equal((await getDoc(doc(
      adminContext.firestore(),
      `identityInvitations/${'a'.repeat(64)}`
    ))).exists(), true)
  })
})

test('zaproszenie jest jednorazowe i nie działa bez atomowego usunięcia artefaktów', async () => {
  await seed([
    ...identityInvitationDocuments(),
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore()
  await assertFails(acceptIdentityInvitation({ db, deleteArtifacts: false }))
  await assertSucceeds(acceptIdentityInvitation({ db }))
  await assertFails(acceptIdentityInvitation({ db }))
})

test('wygasłe i anulowane zaproszenie nie tworzy konta ani urządzenia', async () => {
  await seed([
    ...identityInvitationDocuments({
      tokenHash: 'f'.repeat(64),
      expiresAt: past()
    }),
    ...identityInvitationDocuments({
      tokenHash: 'g'.repeat(64),
      employeeId: 'employee-2',
      status: 'cancelled'
    }),
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    ['users/restaurant-a/employees/employee-2', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore()
  await assertFails(acceptIdentityInvitation({ db, tokenHash: 'f'.repeat(64) }))
  await assertFails(acceptIdentityInvitation({
    db,
    tokenHash: 'g'.repeat(64),
    employeeId: 'employee-2'
  }))
})

test('zaproszenie urządzenia działa tylko dla istniejącego właściwego authUid', async () => {
  const newAuthTime = AUTH_TIME + 100
  await seedEmployeeAccess()
  await seed(identityInvitationDocuments({
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth'
  }))
  await assertFails(acceptIdentityInvitation({
    db: context({
      uid: 'other-auth', email: 'employee@example.com', authTime: newAuthTime
    }).firestore(),
    uid: 'other-auth',
    purpose: 'DEVICE_ENROLLMENT',
    authTime: newAuthTime
  }))
  const db = context({
    uid: 'employee-auth', email: 'employee@example.com', authTime: newAuthTime
  }).firestore()
  await assertSucceeds(acceptIdentityInvitation({
    db,
    purpose: 'DEVICE_ENROLLMENT',
    authTime: newAuthTime
  }))
})

test('samo hasło bez zaproszenia nie zatwierdza nowej sesji urządzenia', async () => {
  await seedEmployeeAccess()
  const secondAuthTime = AUTH_TIME + 100
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com',
    authTime: secondAuthTime
  }).firestore()
  await assertFails(setDoc(doc(
    db,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${secondAuthTime}`
  ), deviceSessionData({ authTime: secondAuthTime, invitationId: 'missing' })))
  await assertFails(getDoc(doc(db, 'restaurants/restaurant-a')))
})

test('pracownik nie listuje urządzeń, a manager bez uprawnienia ich nie odłącza', async () => {
  await seedEmployeeAccess()
  const employeeDb = context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore()
  await assertFails(getDoc(doc(
    employeeDb,
    `restaurants/restaurant-a/members/other-auth/deviceSessions/${AUTH_TIME}`
  )))

  await seedEmployeeAccess({
    uid: 'limited-manager',
    employeeId: 'limited-employee',
    profileId: 'limited-profile',
    permissions: { can_view_schedule: true }
  })
  const limitedDb = context({
    uid: 'limited-manager', email: 'limited@example.com'
  }).firestore()
  await assertFails(updateDoc(doc(
    limitedDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ), {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'limited-manager'
  }))
})

test('odłączenie wszystkich sesji dotyczy tylko wskazanej restauracji', async () => {
  const secondAuthTime = AUTH_TIME + 100
  await seedEmployeeAccess()
  await seedEmployeeAccess({ restaurantId: 'restaurant-b' })
  await seedOwner()
  await seed([[
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${secondAuthTime}`,
    deviceSessionData({ authTime: secondAuthTime })
  ]])
  const managerDb = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  const batch = writeBatch(managerDb)
  for (const authTime of [AUTH_TIME, secondAuthTime]) {
    batch.update(doc(
      managerDb,
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${authTime}`
    ), {
      status: 'disconnected',
      disconnectedAt: now(),
      disconnectedByAuthUid: 'owner-auth'
    })
  }
  await assertSucceeds(batch.commit())
  await assertFails(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-a'
  )))
  await assertSucceeds(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-b'
  )))
})

test('odłączenie jednej sesji blokuje ją, ale druga sesja i druga restauracja pozostają aktywne', async () => {
  const secondAuthTime = AUTH_TIME + 100
  await seedEmployeeAccess()
  await seedEmployeeAccess({ restaurantId: 'restaurant-b' })
  await seed([[
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${secondAuthTime}`,
    deviceSessionData({ authTime: secondAuthTime })
  ]])
  const managerDb = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  await seedOwner()
  await assertSucceeds(updateDoc(doc(
    managerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ), {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'owner-auth'
  }))
  await assertFails(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-a'
  )))
  await assertSucceeds(getDoc(doc(
    context({
      uid: 'employee-auth', email: 'employee@example.com', authTime: secondAuthTime
    }).firestore(),
    'restaurants/restaurant-a'
  )))
  await assertSucceeds(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-b'
  )))
})

// Testy starego modelu zastąpiono aktywnymi testami tokenów jednorazowych.
test('kod parowania usuwa wyłącznie manager właściwej restauracji', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ['pairing_codes/code-a', {
      companyUid: 'restaurant-a',
      expiresAt: past()
    }],
    ['pairing_codes/code-b', {
      companyUid: 'restaurant-b',
      expiresAt: past()
    }]
  ])
  const managerDb = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()

  await assertSucceeds(deleteDoc(doc(managerDb, 'pairing_codes/code-a')))
  await assertFails(deleteDoc(doc(managerDb, 'pairing_codes/code-b')))
  await assertFails(getDoc(doc(
    testEnv.unauthenticatedContext().firestore(),
    'pairing_codes/code-b'
  )))
})

test('sprzątanie usuwa wygasłe zaproszenie wraz z publicznym dokumentem i slotem', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ...identityInvitationDocuments({
      tokenHash: 'c'.repeat(64),
      expiresAt: past(),
      createdByAuthUid: 'manager-auth'
    }),
    ...identityInvitationDocuments({
      tokenHash: 'd'.repeat(64),
      employeeId: 'employee-2',
      createdByAuthUid: 'manager-auth'
    })
  ])
  const db = context({ uid: 'manager-auth', email: 'manager@example.com' }).firestore()
  const result = await cleanupExpiredInvitations({ db, restaurantId: 'restaurant-a' })
  assert.equal(result.completed, true)
  assert.equal(result.deletedCount, 1)
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(adminDb, `identityInvitations/${'c'.repeat(64)}`))).exists(), false)
    assert.equal((await getDoc(doc(adminDb, `activationInvitations/${'c'.repeat(64)}`))).exists(), false)
    assert.equal((await getDoc(doc(adminDb, `identityInvitations/${'d'.repeat(64)}`))).exists(), true)
  })
})

test('sprzątanie usuwa odłączone sesje dopiero po 90 dniach', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seedEmployeeAccess({ uid: 'worker-auth' })
  const oldDate = Timestamp.fromMillis(Date.now() - (100 * 24 * 60 * 60 * 1000))
  await seed([
    ['restaurants/restaurant-a/members/worker-auth/deviceSessions/old-session', {
      ...deviceSessionData({ uid: 'worker-auth' }),
      status: 'disconnected',
      disconnectedAt: oldDate,
      disconnectedByAuthUid: 'manager-auth'
    }],
    ['restaurants/restaurant-a/members/worker-auth/deviceSessions/recent-session', {
      ...deviceSessionData({ uid: 'worker-auth', authTime: AUTH_TIME + 1 }),
      status: 'disconnected',
      disconnectedAt: now(),
      disconnectedByAuthUid: 'manager-auth'
    }]
  ])
  const db = context({ uid: 'manager-auth', email: 'manager@example.com' }).firestore()
  const result = await cleanupDisconnectedDeviceSessions({
    db,
    restaurantId: 'restaurant-a'
  })
  assert.equal(result.completed, true)
  assert.equal(result.deletedCount, 1)
})

test('serwis kodów usuwa tylko wygasłe kody wskazanej restauracji', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ['pairing_codes/expired-a', {
      companyUid: 'restaurant-a',
      expiresAt: past()
    }],
    ['pairing_codes/active-a', {
      companyUid: 'restaurant-a',
      expiresAt: future()
    }],
    ['pairing_codes/expired-b', {
      companyUid: 'restaurant-b',
      expiresAt: past()
    }]
  ])
  const db = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()

  const result = await cleanupExpiredPairingCodes({
    db,
    restaurantId: 'restaurant-a'
  })

  assert.equal(result.completed, true)
  assert.equal(result.deletedCount, 1)
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      'pairing_codes/expired-a'
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      'pairing_codes/active-a'
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      'pairing_codes/expired-b'
    ))).exists(), true)
  })
})

test('jedno konto zachowuje niezależne członkostwa w dwóch restauracjach', async () => {
  await seedEmployeeAccess({ restaurantId: 'restaurant-a' })
  await seedEmployeeAccess({
    restaurantId: 'restaurant-b',
    employeeId: 'employee-8',
    profileId: 'profile-8'
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const memberA = await assertSucceeds(getDoc(doc(
    db,
    'restaurants/restaurant-a/members/employee-auth'
  )))
  const memberB = await assertSucceeds(getDoc(doc(
    db,
    'restaurants/restaurant-b/members/employee-auth'
  )))
  assert.equal(memberA.data().employeeId, 'employee-1')
  assert.equal(memberB.data().employeeId, 'employee-8')
  assert.equal(memberB.data().permissionProfileId, 'profile-8')
})

test('konto bez członkostwa nie odczytuje restauracji', async () => {
  await seed([['restaurants/restaurant-a', { id: 'restaurant-a' }]])
  const db = context({ uid: 'outsider', email: 'out@example.com' }).firestore()
  await assertFails(getDoc(doc(db, 'restaurants/restaurant-a')))
})

test('zablokowanie restauracji A nie blokuje aktywnej restauracji B', async () => {
  await seedEmployeeAccess({ restaurantId: 'restaurant-a', status: 'blocked' })
  await seedEmployeeAccess({ restaurantId: 'restaurant-b' })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(getDoc(doc(db, 'restaurants/restaurant-a')))
  await assertSucceeds(getDoc(doc(db, 'restaurants/restaurant-b')))
})

test('zwykły pracownik nie zmienia statusu ani profilu członkostwa', async () => {
  await seedEmployeeAccess()
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const memberRef = doc(
    db,
    'restaurants/restaurant-a/members/employee-auth'
  )
  await assertFails(updateDoc(memberRef, { status: 'blocked' }))
  await assertFails(updateDoc(memberRef, {
    permissionProfileId: 'profile-admin'
  }))
})

test('can_view_schedule czyta publiczny grafik i własną dyspozycyjność', async () => {
  await seedEmployeeAccess({
    permissions: { can_view_schedule: true }
  })
  await seed([
    ['users/restaurant-a/grafiki_opublikowane/schedule-1', publicHeader()],
    ['users/restaurant-a/grafik_dyspozycyjnosc/availability-1', {
      employeeId: 'employee-1'
    }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertSucceeds(getDoc(doc(
    db,
    'users/restaurant-a/grafiki_opublikowane/schedule-1'
  )))
  await assertSucceeds(getDoc(doc(
    db,
    'users/restaurant-a/grafik_dyspozycyjnosc/availability-1'
  )))
})

test('can_view_schedule nie zarządza, nie publikuje i nie czyta snapshotu roboczego', async () => {
  await seedEmployeeAccess({
    permissions: { can_view_schedule: true }
  })
  await seed([
    ['users/restaurant-a/grafiki/schedule-1', { name: 'Roboczy' }],
    ['users/restaurant-a/grafik_aktualizacje/context-1', {
      scheduleId: 'schedule-1',
      recordType: 'planning_context'
    }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(getDoc(doc(db, 'users/restaurant-a/grafiki/schedule-1')))
  await assertFails(getDoc(doc(
    db,
    'users/restaurant-a/grafik_aktualizacje/context-1'
  )))
  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/grafiki/schedule-2'
  ), { name: 'Niedozwolony' }))
  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/grafiki_opublikowane/schedule-2'
  ), publicHeader({ id: 'schedule-2' })))
})

test('can_manage_schedule wymaga również podstawowego can_view_schedule', async () => {
  await seedEmployeeAccess({
    permissions: { can_manage_schedule: true }
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/grafiki/schedule-1'
  ), { name: 'Niedozwolony' }))
})

test('nazwa profilu nie nadaje uprawnień grafiku', async () => {
  await seedEmployeeAccess({
    profileName: 'Administrator grafiku',
    permissions: {}
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/grafiki/schedule-1'
  ), { name: 'Niedozwolony' }))
})

test('manager grafiku może tworzyć, publikować, rozszerzać, wycofywać i usuwać', async () => {
  await seedEmployeeAccess({
    permissions: {
      can_view_schedule: true,
      can_manage_schedule: true
    }
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const scheduleRef = doc(db, 'users/restaurant-a/grafiki/schedule-1')
  const publicRef = doc(
    db,
    'users/restaurant-a/grafiki_opublikowane/schedule-1'
  )
  await assertSucceeds(setDoc(scheduleRef, { name: 'Roboczy' }))
  await assertSucceeds(setDoc(publicRef, publicHeader()))
  await assertSucceeds(updateDoc(publicRef, {
    publishedRevision: 2,
    updatedAt: now()
  }))
  await assertSucceeds(deleteDoc(publicRef))
  await assertSucceeds(deleteDoc(scheduleRef))
})

test('publiczna projekcja odrzuca niedozwolone pola', async () => {
  await seedEmployeeAccess({
    permissions: {
      can_view_schedule: true,
      can_manage_schedule: true
    }
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/grafiki_opublikowane/schedule-1'
  ), {
    ...publicHeader(),
    planningWarnings: ['tajne'],
    godMode: true
  }))
})

test('pracownik restauracji A nie odczytuje grafiku restauracji B', async () => {
  await seedEmployeeAccess({
    permissions: { can_view_schedule: true }
  })
  await seed([[
    'users/restaurant-b/grafiki_opublikowane/schedule-1',
    publicHeader()
  ]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(getDoc(doc(
    db,
    'users/restaurant-b/grafiki_opublikowane/schedule-1'
  )))
})

test('zablokowane członkostwo odcina grafik przy aktywnej sesji Auth', async () => {
  await seedEmployeeAccess({
    status: 'blocked',
    permissions: { can_view_schedule: true }
  })
  await seed([[
    'users/restaurant-a/grafiki_opublikowane/schedule-1',
    publicHeader()
  ]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(getDoc(doc(
    db,
    'users/restaurant-a/grafiki_opublikowane/schedule-1'
  )))
})

test('legacy PIN, Pinia i localStorage nie zastępują request.auth', async () => {
  await seedEmployeeAccess({
    permissions: {
      can_view_schedule: true,
      can_manage_schedule: true
    }
  })
  const fakeBrowserState = {
    sessionMode: 'legacy_pin',
    restaurantId: 'restaurant-a',
    can_manage_schedule: true
  }
  assert.equal(fakeBrowserState.can_manage_schedule, true)
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/grafiki/schedule-pin'
  ), { name: 'Niedozwolony' }))
  await assertFails(getDoc(doc(db, 'users/employee-auth/app/state')))
})
