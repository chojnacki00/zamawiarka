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
  runTransaction,
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
import { getCleanupFailureDetails } from '../src/utils/temporaryDataCleanup.js'

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
  const slotId = `${restaurantId}__${employeeId}`
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

const replaceIdentityInvitation = async ({
  db,
  options = {},
  restoreMembershipAuthUid = null
}) => {
  const documents = identityInvitationDocuments(options)
  const privateEntry = documents.find(([path]) => path.startsWith('identityInvitations/'))
  const publicEntry = documents.find(([path]) => path.startsWith('activationInvitations/'))
  const slotEntry = documents.find(([path]) => path.includes('/identityInvitationSlots/'))
  const slotRef = doc(db, slotEntry[0])
  const memberRef = restoreMembershipAuthUid
    ? doc(
        db,
        `restaurants/${options.restaurantId || 'restaurant-a'}/members/${restoreMembershipAuthUid}`
      )
    : null

  await runTransaction(db, async transaction => {
    const [slotSnapshot, memberSnapshot] = await Promise.all([
      transaction.get(slotRef),
      memberRef ? transaction.get(memberRef) : Promise.resolve(null)
    ])
    let oldPrivate = null
    let oldPublic = null
    if (slotSnapshot.exists()) {
      const oldTokenHash = slotSnapshot.data().tokenHash
      ;[oldPrivate, oldPublic] = await Promise.all([
        transaction.get(doc(db, `identityInvitations/${oldTokenHash}`)),
        transaction.get(doc(db, `activationInvitations/${oldTokenHash}`))
      ])
    }

    if (oldPrivate?.exists()) transaction.delete(oldPrivate.ref)
    if (oldPublic?.exists()) transaction.delete(oldPublic.ref)
    if (memberRef) {
      assert.equal(memberSnapshot?.exists(), true)
      transaction.update(memberRef, { status: 'active' })
    }
    transaction.set(doc(db, privateEntry[0]), privateEntry[1])
    transaction.set(doc(db, publicEntry[0]), publicEntry[1])
    transaction.set(slotRef, slotEntry[1])
  })
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
  const slotId = `${restaurantId}__${employeeId}`
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

const reactivateIdentityInvitation = async ({
  db,
  tokenHash = 'b'.repeat(64),
  restaurantId = 'restaurant-a',
  employeeId = 'employee-1',
  uid = 'employee-auth',
  authTime = AUTH_TIME,
  deviceName = 'Telefon ponownie zatwierdzony'
}) => {
  const slotId = `${restaurantId}__${employeeId}`
  const sessionRef = doc(
    db,
    `restaurants/${restaurantId}/members/${uid}/deviceSessions/${authTime}`
  )

  await runTransaction(db, async transaction => {
    const sessionSnapshot = await transaction.get(sessionRef)
    const existing = sessionSnapshot.data()
    const approvedAt = now()
    transaction.update(sessionRef, {
      ...existing,
      deviceName,
      platform: 'Emulator po reaktywacji',
      status: 'active',
      lastActiveAt: approvedAt,
      approvedAt,
      approvedByAuthUid: 'owner-auth',
      invitationId: tokenHash,
      disconnectedAt: null,
      disconnectedByAuthUid: null
    })
    transaction.delete(doc(db, `identityInvitations/${tokenHash}`))
    transaction.delete(doc(db, `activationInvitations/${tokenHash}`))
    transaction.delete(doc(
      db,
      `restaurants/${restaurantId}/identityInvitationSlots/${slotId}`
    ))
  })
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
  const marker = await assertSucceeds(getDoc(doc(
    db,
    `users/${uid}/app/state`
  )))
  assert.equal(marker.data().initialized, true)
  const batch = writeBatch(db)
  batch.set(doc(db, `accounts/${uid}`), {
    authUid: uid,
    email: 'owner@example.com',
    displayName: '',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  })
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

test('marker właściciela nie pozwala utworzyć samej restauracji bez konta i członkostwa', async () => {
  const uid = 'incomplete-owner'
  await seed([[`users/${uid}/app/state`, { initialized: true }]])
  const db = context({
    uid,
    email: 'incomplete@example.com'
  }).firestore()

  await assertFails(setDoc(doc(db, `restaurants/${uid}`), {
    id: uid,
    name: 'Niepełna restauracja',
    ownerAuthUid: uid,
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  }))
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

test('właściciel tworzy pierwsze zaproszenie bez authUid mimo niewielkiego wyprzedzenia zegara klienta', async () => {
  await seedOwner()
  await seed([
    ['users/restaurant-a/employees/employee-new', {
      aktywny: true,
      permissionProfileId: 'profile-new',
      email: 'new@example.com'
    }],
    ['users/restaurant-a/permissionProfiles/profile-new', { uprawnienia: {} }]
  ])
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  const createdAt = Timestamp.fromMillis(Date.now() + (2 * 60 * 1000))

  await assertSucceeds(replaceIdentityInvitation({
    db,
    options: {
      employeeId: 'employee-new',
      profileId: 'profile-new',
      email: 'new@example.com',
      targetAuthUid: null,
      createdAt
    }
  }))
})

test('manager zespołu tworzy pierwsze zaproszenie bez authUid', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([['users/restaurant-a/employees/employee-new', {
    aktywny: true,
    permissionProfileId: 'manager-profile',
    email: 'new@example.com'
  }]])
  const db = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()

  await assertSucceeds(replaceIdentityInvitation({
    db,
    options: {
      employeeId: 'employee-new',
      profileId: 'manager-profile',
      email: 'new@example.com',
      targetAuthUid: null,
      createdByAuthUid: 'manager-auth'
    }
  }))
})

test('właściciel tworzy zaproszenie urządzenia po odłączeniu wszystkich sesji pracownika', async () => {
  await seedOwner()
  await seedEmployeeAccess()
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  const memberRef = doc(db, 'restaurants/restaurant-a/members/employee-auth')
  const sessionRef = doc(
    db,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  )
  const membershipBefore = (await getDoc(memberRef)).data()

  await assertSucceeds(updateDoc(sessionRef, {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'owner-auth'
  }))
  await assertSucceeds(writeIdentityInvitation({
    db,
    options: {
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))

  const membershipAfter = (await getDoc(memberRef)).data()
  assert.deepEqual(membershipAfter, membershipBefore)
  assert.equal(membershipAfter.status, 'active')
  assert.equal(membershipAfter.authUid, 'employee-auth')
})

test('manager zespołu tworzy zaproszenie urządzenia dla aktywnego członka bez aktywnej sesji', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seedEmployeeAccess()
  const managerDb = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()
  const targetMemberRef = doc(
    managerDb,
    'restaurants/restaurant-a/members/employee-auth'
  )
  const membershipBefore = (await getDoc(targetMemberRef)).data()

  await assertSucceeds(updateDoc(doc(
    managerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ), {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'manager-auth'
  }))
  await assertSucceeds(writeIdentityInvitation({
    db: managerDb,
    options: {
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth',
      createdByAuthUid: 'manager-auth'
    }
  }))

  assert.deepEqual((await getDoc(targetMemberRef)).data(), membershipBefore)
})

test('zwykły pracownik nie tworzy zaproszenia urządzenia dla innego członka', async () => {
  await seedEmployeeAccess()
  await seedEmployeeAccess({
    uid: 'target-auth',
    employeeId: 'target-employee',
    profileId: 'target-profile'
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertFails(writeIdentityInvitation({
    db,
    options: {
      purpose: 'DEVICE_ENROLLMENT',
      employeeId: 'target-employee',
      profileId: 'target-profile',
      targetAuthUid: 'target-auth',
      createdByAuthUid: 'employee-auth'
    }
  }))
})

test('zaproszenie urządzenia odrzuca niezgodne lub nieaktywne członkostwo celu', async () => {
  await seedOwner()
  await seedEmployeeAccess()
  await seed([['users/restaurant-a/employees/employee-other', {
    aktywny: true,
    permissionProfileId: 'profile-1'
  }]])
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()

  await assertFails(writeIdentityInvitation({
    db: ownerDb,
    options: {
      employeeId: 'employee-other',
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    await updateDoc(doc(
      adminContext.firestore(),
      'restaurants/restaurant-a/members/employee-auth'
    ), { status: 'blocked' })
  })
  await assertFails(writeIdentityInvitation({
    db: ownerDb,
    options: {
      tokenHash: 'b'.repeat(64),
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))
})

test('nowe zaproszenie urządzenia zastępuje poprzedni token po odłączeniu sesji', async () => {
  const oldTokenHash = 'a'.repeat(64)
  const newTokenHash = 'b'.repeat(64)
  await seedOwner()
  await seedEmployeeAccess()
  await seed(identityInvitationDocuments({
    tokenHash: oldTokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth'
  }))
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  await assertSucceeds(updateDoc(doc(
    db,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ), {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'owner-auth'
  }))

  const batch = writeBatch(db)
  batch.delete(doc(db, `identityInvitations/${oldTokenHash}`))
  batch.delete(doc(db, `activationInvitations/${oldTokenHash}`))
  identityInvitationDocuments({
    tokenHash: newTokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth'
  }).forEach(([path, data]) => batch.set(doc(db, path), data))
  await assertSucceeds(batch.commit())
})

test('czyszczenie starego slotu kończy się przed utworzeniem nowego zaproszenia urządzenia', async () => {
  const oldTokenHash = 'a'.repeat(64)
  const newTokenHash = 'b'.repeat(64)
  await seedOwner()
  await seedEmployeeAccess()
  await seed(identityInvitationDocuments({
    tokenHash: oldTokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth',
    expiresAt: past()
  }))
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()
  await assertSucceeds(updateDoc(doc(
    db,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ), {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'owner-auth'
  }))

  const cleanup = await cleanupExpiredInvitations({
    db,
    restaurantId: 'restaurant-a'
  })
  assert.equal(cleanup.completed, true)
  assert.equal(cleanup.deletedCount, 1)
  await assertSucceeds(writeIdentityInvitation({
    db,
    options: {
      tokenHash: newTokenHash,
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))
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

test('nowe zaproszenie pracownika zastępuje poprzednie także przy zmianie rodzaju technicznego', async () => {
  const oldTokenHash = 'a'.repeat(64)
  const newTokenHash = 'b'.repeat(64)
  await seedOwner()
  await seedEmployeeAccess()
  await seed(identityInvitationDocuments({
    tokenHash: oldTokenHash,
    purpose: 'ACCOUNT_ACTIVATION'
  }))
  const db = context({ uid: 'owner-auth', email: 'owner@example.com' }).firestore()

  await assertSucceeds(replaceIdentityInvitation({
    db,
    options: {
      tokenHash: newTokenHash,
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${oldTokenHash}`
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      `activationInvitations/${oldTokenHash}`
    ))).exists(), false)
    const slot = await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
    ))
    assert.equal(slot.data().tokenHash, newTokenHash)
    assert.equal(slot.data().purpose, 'DEVICE_ENROLLMENT')
  })
})

test('dwa równoczesne zaproszenia kończą się jednym spójnym tokenem i slotem', async () => {
  const firstTokenHash = 'a'.repeat(64)
  const secondTokenHash = 'b'.repeat(64)
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

  await Promise.all([
    replaceIdentityInvitation({
      db,
      options: { tokenHash: firstTokenHash }
    }),
    replaceIdentityInvitation({
      db,
      options: { tokenHash: secondTokenHash }
    })
  ])

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    const slot = await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
    ))
    const winningToken = slot.data().tokenHash
    const losingToken = winningToken === firstTokenHash
      ? secondTokenHash
      : firstTokenHash
    assert.equal([firstTokenHash, secondTokenHash].includes(winningToken), true)
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${winningToken}`
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      `activationInvitations/${winningToken}`
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${losingToken}`
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      `activationInvitations/${losingToken}`
    ))).exists(), false)
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

test('istniejące konto z innej restauracji przyjmuje pierwsze zaproszenie do kolejnej', async () => {
  await seedEmployeeAccess({
    restaurantId: 'restaurant-b',
    uid: 'employee-auth',
    employeeId: 'employee-b',
    profileId: 'profile-b'
  })
  await seed([
    ...identityInvitationDocuments(),
    ['restaurants/restaurant-a', {
      id: 'restaurant-a',
      name: 'restaurant-a',
      ownerAuthUid: 'owner-auth',
      status: 'active'
    }],
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    ['users/restaurant-a/permissionProfiles/profile-1', { uprawnienia: {} }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertSucceeds(acceptIdentityInvitation({ db }))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/members/employee-auth'
    ))).data().status, 'active')
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-b/members/employee-auth'
    ))).data().status, 'active')
  })
})

test('blokada odłącza sesje i zaproszenie, a przywrócenie tworzy wyłącznie nową sesję', async () => {
  const oldTokenHash = 'a'.repeat(64)
  const newTokenHash = 'b'.repeat(64)
  const newAuthTime = AUTH_TIME + 200
  await seedOwner()
  await seedEmployeeAccess()
  await seedEmployeeAccess({
    restaurantId: 'restaurant-b',
    uid: 'employee-auth',
    employeeId: 'employee-b',
    profileId: 'profile-b'
  })
  await seed(identityInvitationDocuments({
    tokenHash: oldTokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth'
  }))
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const memberRef = doc(
    ownerDb,
    'restaurants/restaurant-a/members/employee-auth'
  )
  const oldSessionRef = doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  )
  const blockBatch = writeBatch(ownerDb)
  blockBatch.update(memberRef, { status: 'blocked' })
  blockBatch.update(oldSessionRef, {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'owner-auth'
  })
  blockBatch.delete(doc(ownerDb, `identityInvitations/${oldTokenHash}`))
  blockBatch.delete(doc(ownerDb, `activationInvitations/${oldTokenHash}`))
  blockBatch.delete(doc(
    ownerDb,
    'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
  ))

  await assertSucceeds(blockBatch.commit())
  assert.equal((await getDoc(memberRef)).data().status, 'blocked')
  assert.equal((await getDoc(oldSessionRef)).data().status, 'disconnected')
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-b/members/employee-auth'
    ))).data().status, 'active')
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${oldTokenHash}`
    ))).exists(), false)
  })

  await assertSucceeds(replaceIdentityInvitation({
    db: ownerDb,
    restoreMembershipAuthUid: 'employee-auth',
    options: {
      tokenHash: newTokenHash,
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))
  assert.equal((await getDoc(memberRef)).data().status, 'active')
  assert.equal((await getDoc(oldSessionRef)).data().status, 'disconnected')

  const employeeDb = context({
    uid: 'employee-auth',
    email: 'employee@example.com',
    authTime: newAuthTime
  }).firestore()
  await assertSucceeds(acceptIdentityInvitation({
    db: employeeDb,
    tokenHash: newTokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    authTime: newAuthTime
  }))
  const newSession = await getDoc(doc(
    employeeDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${newAuthTime}`
  ))
  assert.equal(newSession.data().status, 'active')
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const oldSession = await getDoc(doc(
      adminContext.firestore(),
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ))
    assert.equal(oldSession.data().status, 'disconnected')
  })
})

test('przywrócenie dostępu reaktywuje atomowo tylko bieżącą odłączoną sesję z tym samym auth_time', async () => {
  const tokenHash = 'c'.repeat(64)
  const otherAuthTime = AUTH_TIME + 100
  await seedOwner()
  await seedEmployeeAccess()
  await seed([[
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${otherAuthTime}`,
    deviceSessionData({ authTime: otherAuthTime })
  ]])

  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const memberRef = doc(
    ownerDb,
    'restaurants/restaurant-a/members/employee-auth'
  )
  const currentSessionRef = doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  )
  const otherSessionRef = doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${otherAuthTime}`
  )
  const originalSession = (await getDoc(currentSessionRef)).data()
  const blockBatch = writeBatch(ownerDb)
  blockBatch.update(memberRef, { status: 'blocked' })
  for (const sessionRef of [currentSessionRef, otherSessionRef]) {
    blockBatch.update(sessionRef, {
      status: 'disconnected',
      disconnectedAt: now(),
      disconnectedByAuthUid: 'owner-auth'
    })
  }
  await assertSucceeds(blockBatch.commit())

  await assertSucceeds(replaceIdentityInvitation({
    db: ownerDb,
    restoreMembershipAuthUid: 'employee-auth',
    options: {
      tokenHash,
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))
  assert.equal((await getDoc(memberRef)).data().status, 'active')
  assert.equal((await getDoc(currentSessionRef)).data().status, 'disconnected')

  const employeeDb = context({
    uid: 'employee-auth',
    email: 'employee@example.com',
    authTime: AUTH_TIME
  }).firestore()
  await assertSucceeds(reactivateIdentityInvitation({
    db: employeeDb,
    tokenHash
  }))

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    const currentSession = (await getDoc(doc(
      adminDb,
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ))).data()
    const otherSession = (await getDoc(doc(
      adminDb,
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${otherAuthTime}`
    ))).data()

    assert.equal(currentSession.status, 'active')
    assert.equal(currentSession.authTime, AUTH_TIME)
    assert.equal(currentSession.deviceId, originalSession.deviceId)
    assert.equal(currentSession.addedAt.toMillis(), originalSession.addedAt.toMillis())
    assert.equal(currentSession.deviceName, 'Telefon ponownie zatwierdzony')
    assert.equal(currentSession.invitationId, tokenHash)
    assert.equal(currentSession.disconnectedAt, null)
    assert.equal(currentSession.disconnectedByAuthUid, null)
    assert.equal(otherSession.status, 'disconnected')
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${tokenHash}`
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      `activationInvitations/${tokenHash}`
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
    ))).exists(), false)
  })

  await assertFails(reactivateIdentityInvitation({
    db: employeeDb,
    tokenHash
  }))
  assert.equal((await getDoc(doc(
    employeeDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ))).data().status, 'active')
})

test('odłączonej sesji nie można reaktywować bez ważnego zaproszenia', async () => {
  await seedEmployeeAccess()
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    await updateDoc(doc(
      adminContext.firestore(),
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ), {
      status: 'disconnected',
      disconnectedAt: now(),
      disconnectedByAuthUid: 'owner-auth'
    })
  })

  const employeeDb = context({
    uid: 'employee-auth',
    email: 'employee@example.com',
    authTime: AUTH_TIME
  }).firestore()
  await assertFails(reactivateIdentityInvitation({
    db: employeeDb,
    tokenHash: 'd'.repeat(64)
  }))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const session = await getDoc(doc(
      adminContext.firestore(),
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ))
    assert.equal(session.data().status, 'disconnected')
  })
})

test('inne konto nie może reaktywować bieżącej sesji pracownika', async () => {
  const tokenHash = 'e'.repeat(64)
  await seedEmployeeAccess()
  await seed(identityInvitationDocuments({
    tokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth'
  }))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    await updateDoc(doc(
      adminContext.firestore(),
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ), {
      status: 'disconnected',
      disconnectedAt: now(),
      disconnectedByAuthUid: 'owner-auth'
    })
  })

  const otherDb = context({
    uid: 'other-auth',
    email: 'employee@example.com',
    authTime: AUTH_TIME
  }).firestore()
  await assertFails(reactivateIdentityInvitation({
    db: otherDb,
    tokenHash
  }))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ))).data().status, 'disconnected')
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${tokenHash}`
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      `activationInvitations/${tokenHash}`
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
    ))).exists(), true)
  })
})

test('manager z can_manage_employees blokuje i przywraca dostęp pracownika', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seedEmployeeAccess()
  const managerDb = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()
  const memberRef = doc(
    managerDb,
    'restaurants/restaurant-a/members/employee-auth'
  )
  const sessionRef = doc(
    managerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  )
  const batch = writeBatch(managerDb)
  batch.update(memberRef, { status: 'blocked' })
  batch.update(sessionRef, {
    status: 'disconnected',
    disconnectedAt: now(),
    disconnectedByAuthUid: 'manager-auth'
  })
  await assertSucceeds(batch.commit())

  await assertSucceeds(replaceIdentityInvitation({
    db: managerDb,
    restoreMembershipAuthUid: 'employee-auth',
    options: {
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth',
      createdByAuthUid: 'manager-auth'
    }
  }))
  assert.equal((await getDoc(memberRef)).data().status, 'active')
  assert.equal((await getDoc(sessionRef)).data().status, 'disconnected')
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
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
    ))).exists(), false)
    assert.equal((await getDoc(doc(adminDb, `identityInvitations/${'d'.repeat(64)}`))).exists(), true)
  })
})

test('sprzątanie wielu zaproszeń kończy bezpieczne pojedyncze partie', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ...identityInvitationDocuments({
      tokenHash: 'e'.repeat(64),
      employeeId: 'employee-2',
      expiresAt: past(),
      createdByAuthUid: 'manager-auth'
    }),
    ...identityInvitationDocuments({
      tokenHash: 'f'.repeat(64),
      employeeId: 'employee-3',
      expiresAt: past(),
      createdByAuthUid: 'manager-auth'
    })
  ])
  const db = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()

  const result = await cleanupExpiredInvitations({
    db,
    restaurantId: 'restaurant-a'
  })

  assert.equal(result.completed, true)
  assert.equal(result.deletedCount, 2)
  assert.equal(result.batchCount, 2)
})

test('brak uprawnienia daje kontrolowany błąd i nie usuwa danych', async () => {
  await seedEmployeeAccess({
    uid: 'worker-auth',
    employeeId: 'worker-employee',
    profileId: 'worker-profile',
    permissions: {}
  })
  await seed([['pairing_codes/expired-a', {
    companyUid: 'restaurant-a',
    expiresAt: past()
  }]])
  const db = context({
    uid: 'worker-auth',
    email: 'worker@example.com'
  }).firestore()

  const result = await cleanupExpiredPairingCodes({
    db,
    restaurantId: 'restaurant-a'
  })

  assert.equal(result.completed, false)
  assert.match(String(result.error?.code), /permission-denied/)
  assert.deepEqual(getCleanupFailureDetails({ pairingCodes: result }), [{
    operation: 'pairingCodes',
    collection: 'pairing_codes',
    code: result.error.code
  }])
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    assert.equal((await getDoc(doc(
      adminContext.firestore(),
      'pairing_codes/expired-a'
    ))).exists(), true)
  })
})

test('częściowy błąd jednej restauracji nie cofa poprawnego sprzątania drugiej', async () => {
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
    ['pairing_codes/expired-b', {
      companyUid: 'restaurant-b',
      expiresAt: past()
    }]
  ])
  const db = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()

  const ownResult = await cleanupExpiredPairingCodes({
    db,
    restaurantId: 'restaurant-a'
  })
  const foreignResult = await cleanupExpiredPairingCodes({
    db,
    restaurantId: 'restaurant-b'
  })

  assert.equal(ownResult.completed, true)
  assert.equal(ownResult.deletedCount, 1)
  assert.equal(foreignResult.completed, false)
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      'pairing_codes/expired-a'
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      'pairing_codes/expired-b'
    ))).exists(), true)
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
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/members/worker-auth/deviceSessions/old-session'
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/members/worker-auth/deviceSessions/recent-session'
    ))).exists(), true)
  })
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

test('konto Firebase pracownika nie otrzymuje praw właściciela', async () => {
  await seedEmployeeAccess({
    permissions: {
      can_view_zamawiarka: true,
      can_view_schedule: true,
      can_manage_schedule: true
    }
  })
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertFails(updateDoc(doc(db, 'restaurants/restaurant-a'), {
    name: 'Nieuprawniona zmiana właścicielska'
  }))
})

test('pracownik bez zarządzania ustawieniami nie zapisuje słowników Zamawiarki', async () => {
  await seedEmployeeAccess({
    permissions: {
      can_view_zamawiarka: true,
      can_view_schedule: true,
      can_manage_schedule: true
    }
  })
  await seed([['users/restaurant-a/app/state', {
    suppliers: [],
    warehouses: [],
    units: [],
    categories: [],
    orderTimings: [],
    whoOrders: [],
    fcSettings: {},
    dishCategories: []
  }]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const stateRef = doc(db, 'users/restaurant-a/app/state')

  for (const forbiddenUpdate of [
    { suppliers: [{ id: 'supplier-1', name: 'Hurtownia' }] },
    { warehouses: [{ id: 'warehouse-1', name: 'Magazyn' }] },
    { units: [{ id: 'unit-1', name: 'kg' }] },
    { categories: [{ id: 'category-1', name: 'Nabiał' }] },
    { orderTimings: [{ id: 'timing-1', name: 'Poniedziałek' }] },
    { whoOrders: [{ id: 'person-1', name: 'Manager' }] }
  ]) {
    await assertFails(updateDoc(stateRef, forbiddenUpdate))
  }

  await assertFails(setDoc(doc(
    db,
    'users/restaurant-a/towary/product-1'
  ), { id: 'product-1', name: 'Towar' }))
})

test('can_edit_menu nie pozwala zmieniać słowników Zamawiarki w app/state', async () => {
  await seedEmployeeAccess({ permissions: { can_edit_menu: true } })
  await seed([['users/restaurant-a/app/state', {
    suppliers: [],
    fcSettings: {},
    dishCategories: []
  }]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const stateRef = doc(db, 'users/restaurant-a/app/state')

  await assertFails(updateDoc(stateRef, {
    suppliers: [{ id: 'supplier-1', name: 'Hurtownia' }]
  }))
  await assertSucceeds(updateDoc(stateRef, {
    fcSettings: { target: 30 }
  }))
})

test('właściwe uprawnienie oraz właściciel zapisują ustawienia', async () => {
  await seedEmployeeAccess({ permissions: { can_edit_products: true } })
  await seed([['users/restaurant-a/app/state', { suppliers: [] }]])
  const employeeDb = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertSucceeds(updateDoc(
    doc(employeeDb, 'users/restaurant-a/app/state'),
    { suppliers: [{ id: 'supplier-1', name: 'Hurtownia' }] }
  ))

  await testEnv.clearFirestore()
  await seedOwner()
  await seed([['users/restaurant-a/app/state', { suppliers: [] }]])
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  await assertSucceeds(updateDoc(
    doc(ownerDb, 'users/restaurant-a/app/state'),
    {
      suppliers: [{ id: 'supplier-owner', name: 'Właściciel' }],
      fcSettings: { target: 31 }
    }
  ))
})

test('właściciel i uprawniony pracownik współdzielą ten sam stan restauracji', async () => {
  await seedEmployeeAccess({ permissions: { can_edit_products: true } })
  await seedOwner()
  await seed([['users/restaurant-a/app/state', {
    initialized: true,
    suppliers: [{ id: 'supplier-1', name: 'Hurtownia testowa' }],
    warehouses: [{ id: 'warehouse-1', name: 'Magazyn' }]
  }]])

  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const employeeDb = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const sharedPath = 'users/restaurant-a/app/state'

  const ownerBefore = await assertSucceeds(getDoc(doc(ownerDb, sharedPath)))
  const employeeBefore = await assertSucceeds(getDoc(doc(employeeDb, sharedPath)))
  assert.deepEqual(employeeBefore.data().suppliers, ownerBefore.data().suppliers)

  await assertSucceeds(updateDoc(doc(employeeDb, sharedPath), {
    suppliers: [
      { id: 'supplier-1', name: 'Hurtownia po edycji' },
      { id: 'supplier-2', name: 'Druga hurtownia' }
    ]
  }))
  let ownerAfter = await assertSucceeds(getDoc(doc(ownerDb, sharedPath)))
  assert.equal(ownerAfter.data().suppliers.length, 2)
  assert.equal(ownerAfter.data().suppliers[0].name, 'Hurtownia po edycji')

  await assertSucceeds(updateDoc(doc(employeeDb, sharedPath), {
    suppliers: [{ id: 'supplier-2', name: 'Druga hurtownia' }]
  }))
  ownerAfter = await assertSucceeds(getDoc(doc(ownerDb, sharedPath)))
  assert.deepEqual(ownerAfter.data().suppliers, [
    { id: 'supplier-2', name: 'Druga hurtownia' }
  ])
})

test('pracownik nie czyta app/state spod authUid ani obcej restauracji', async () => {
  await seedEmployeeAccess({ permissions: { can_edit_products: true } })
  await seed([['users/restaurant-b/app/state', {
    suppliers: [{ id: 'foreign' }]
  }]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertFails(getDoc(doc(db, 'users/employee-auth/app/state')))
  await assertFails(getDoc(doc(db, 'users/restaurant-b/app/state')))
  await assertFails(updateDoc(doc(db, 'users/employee-auth/app/state'), {
    suppliers: []
  }))
})

test('usunięcie ostatniej hurtowni zapisuje pustą listę i zachowuje resztę app/state', async () => {
  await seedEmployeeAccess({ permissions: { can_edit_products: true } })
  await seed([['users/restaurant-a/app/state', {
    initialized: true,
    suppliers: [{ id: 'supplier-1', name: 'Ostatnia hurtownia' }],
    warehouses: [{ id: 'warehouse-1', name: 'Magazyn' }],
    units: [{ id: 'unit-1', name: 'kg' }],
    fcSettings: { target: 30 }
  }]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const stateRef = doc(db, 'users/restaurant-a/app/state')

  await assertSucceeds(updateDoc(stateRef, { suppliers: [] }))
  const snapshot = await assertSucceeds(getDoc(stateRef))

  assert.deepEqual(snapshot.data().suppliers, [])
  assert.deepEqual(snapshot.data().warehouses, [
    { id: 'warehouse-1', name: 'Magazyn' }
  ])
  assert.deepEqual(snapshot.data().units, [{ id: 'unit-1', name: 'kg' }])
  assert.deepEqual(snapshot.data().fcSettings, { target: 30 })
  assert.equal(snapshot.data().initialized, true)
})

test('zablokowane członkostwo traci zapis ustawień', async () => {
  await seedEmployeeAccess({
    status: 'blocked',
    permissions: { can_edit_products: true }
  })
  await seed([['users/restaurant-a/app/state', { suppliers: [] }]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertFails(updateDoc(
    doc(db, 'users/restaurant-a/app/state'),
    { suppliers: [{ id: 'supplier-1', name: 'Hurtownia' }] }
  ))
})

test('zmiana profilu uprawnień działa w tej samej sesji Firebase', async () => {
  await seedEmployeeAccess({
    permissions: { can_view_zamawiarka: true }
  })
  await seed([['users/restaurant-a/app/state', { suppliers: [] }]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  const stateRef = doc(db, 'users/restaurant-a/app/state')

  await assertFails(updateDoc(stateRef, {
    suppliers: [{ id: 'supplier-1', name: 'Przed zmianą' }]
  }))

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    await updateDoc(doc(
      adminContext.firestore(),
      'users/restaurant-a/permissionProfiles/profile-1'
    ), {
      'uprawnienia.can_edit_products': true
    })
  })

  await assertSucceeds(updateDoc(stateRef, {
    suppliers: [{ id: 'supplier-1', name: 'Po zmianie' }]
  }))
})

test('nowe zaproszenie urządzenia nie usuwa już aktywnego urządzenia', async () => {
  await seedOwner()
  await seedEmployeeAccess()
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const sessionPath =
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`

  await assertSucceeds(writeIdentityInvitation({
    db: ownerDb,
    options: {
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))

  const session = await assertSucceeds(getDoc(doc(ownerDb, sessionPath)))
  assert.equal(session.exists(), true)
  assert.equal(session.data().status, 'active')
})

test('usunięcie jednego urządzenia nie zmienia członkostwa ani drugiego urządzenia', async () => {
  const secondAuthTime = AUTH_TIME + 100
  await seedOwner()
  await seedEmployeeAccess()
  await seed([[
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${secondAuthTime}`,
    deviceSessionData({ authTime: secondAuthTime })
  ]])
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const memberRef = doc(
    ownerDb,
    'restaurants/restaurant-a/members/employee-auth'
  )
  const membershipBefore = (await getDoc(memberRef)).data()

  await assertSucceeds(deleteDoc(doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  )))

  assert.deepEqual((await getDoc(memberRef)).data(), membershipBefore)
  assert.equal((await getDoc(doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${secondAuthTime}`
  ))).data().status, 'active')
  await assertFails(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-a'
  )))
  await assertSucceeds(getDoc(doc(
    context({
      uid: 'employee-auth',
      email: 'employee@example.com',
      authTime: secondAuthTime
    }).firestore(),
    'restaurants/restaurant-a'
  )))
})

test('urządzenie usuwa właściciel lub manager zespołu, ale nie zwykły pracownik', async () => {
  await seedOwner()
  await seedEmployeeAccess()
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seedEmployeeAccess({
    uid: 'limited-auth',
    employeeId: 'limited-employee',
    profileId: 'limited-profile',
    permissions: { can_view_schedule: true }
  })
  const sessionPath =
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`

  await assertFails(deleteDoc(doc(
    context({ uid: 'limited-auth', email: 'limited@example.com' }).firestore(),
    sessionPath
  )))
  await assertFails(deleteDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    sessionPath
  )))
  await assertSucceeds(deleteDoc(doc(
    context({ uid: 'manager-auth', email: 'manager@example.com' }).firestore(),
    sessionPath
  )))
})

test('wyłączenie konta odcina dostęp przed usunięciem urządzeń i zaproszeń', async () => {
  const tokenHash = 'f'.repeat(64)
  await seedOwner()
  await seedEmployeeAccess()
  await seed(identityInvitationDocuments({
    tokenHash,
    purpose: 'DEVICE_ENROLLMENT',
    targetAuthUid: 'employee-auth'
  }))
  await seed([
    ['users/restaurant-a/grafiki/schedule-1', {
      id: 'schedule-1',
      employeeNameSnapshot: 'Jan Testowy'
    }],
    ['users/restaurant-a/grafik_dyspozycyjnosc/availability-1', {
      employeeId: 'employee-1',
      date: '2026-09-10'
    }]
  ])
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const employeeRef = doc(ownerDb, 'users/restaurant-a/employees/employee-1')
  const memberRef = doc(
    ownerDb,
    'restaurants/restaurant-a/members/employee-auth'
  )
  const accessBatch = writeBatch(ownerDb)
  accessBatch.update(employeeRef, { aktywny: false })
  accessBatch.update(memberRef, { status: 'blocked' })
  await assertSucceeds(accessBatch.commit())

  await assertFails(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-a'
  )))

  const cleanupBatch = writeBatch(ownerDb)
  cleanupBatch.delete(doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  ))
  cleanupBatch.delete(doc(ownerDb, `identityInvitations/${tokenHash}`))
  cleanupBatch.delete(doc(ownerDb, `activationInvitations/${tokenHash}`))
  cleanupBatch.delete(doc(
    ownerDb,
    'restaurants/restaurant-a/identityInvitationSlots/restaurant-a__employee-1'
  ))
  await assertSucceeds(cleanupBatch.commit())

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      `identityInvitations/${tokenHash}`
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      'users/restaurant-a/employees/employee-1'
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      'users/restaurant-a/grafiki/schedule-1'
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      'users/restaurant-a/grafik_dyspozycyjnosc/availability-1'
    ))).exists(), true)
  })
})

test('ponowne włączenie konta nie przywraca urządzeń i pozwala utworzyć nowe zaproszenie', async () => {
  await seedOwner()
  await seedEmployeeAccess({ status: 'blocked' })
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    await updateDoc(doc(
      adminDb,
      'users/restaurant-a/employees/employee-1'
    ), { aktywny: false })
    await deleteDoc(doc(
      adminDb,
      `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
    ))
  })
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const activationBatch = writeBatch(ownerDb)
  activationBatch.update(
    doc(ownerDb, 'users/restaurant-a/employees/employee-1'),
    { aktywny: true }
  )
  activationBatch.update(
    doc(ownerDb, 'restaurants/restaurant-a/members/employee-auth'),
    { status: 'active' }
  )
  await assertSucceeds(activationBatch.commit())

  await assertFails(getDoc(doc(
    context({ uid: 'employee-auth', email: 'employee@example.com' }).firestore(),
    'restaurants/restaurant-a'
  )))
  await assertSucceeds(writeIdentityInvitation({
    db: ownerDb,
    options: {
      purpose: 'DEVICE_ENROLLMENT',
      targetAuthUid: 'employee-auth'
    }
  }))
})

test('archiwizacja zachowuje dokument pracownika i historię, ale usuwa dostęp', async () => {
  await seedOwner()
  await seedEmployeeAccess()
  await seed([
    ['users/restaurant-a/grafiki/schedule-history', {
      id: 'schedule-history',
      employeeId: 'employee-1',
      employeeNameSnapshot: 'Jan Testowy'
    }],
    ['users/restaurant-a/orders/order-history', {
      id: 'order-history',
      createdByEmployeeId: 'employee-1'
    }]
  ])
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  const archiveBatch = writeBatch(ownerDb)
  archiveBatch.update(
    doc(ownerDb, 'users/restaurant-a/employees/employee-1'),
    { aktywny: false, archived: true, archivedAt: now() }
  )
  archiveBatch.update(
    doc(ownerDb, 'restaurants/restaurant-a/members/employee-auth'),
    { status: 'blocked' }
  )
  await assertSucceeds(archiveBatch.commit())
  await assertSucceeds(deleteDoc(doc(
    ownerDb,
    `restaurants/restaurant-a/members/employee-auth/deviceSessions/${AUTH_TIME}`
  )))

  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    const employee = await getDoc(doc(
      adminDb,
      'users/restaurant-a/employees/employee-1'
    ))
    assert.equal(employee.exists(), true)
    assert.equal(employee.data().aktywny, false)
    assert.equal(employee.data().archived, true)
    assert.equal((await getDoc(doc(
      adminDb,
      'users/restaurant-a/grafiki/schedule-history'
    ))).exists(), true)
    assert.equal((await getDoc(doc(
      adminDb,
      'users/restaurant-a/orders/order-history'
    ))).exists(), true)
  })
})
