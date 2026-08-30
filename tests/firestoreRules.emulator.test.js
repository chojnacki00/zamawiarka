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
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import emulatorConfig from '../firebase-emulators.json' with { type: 'json' }
import {
  cleanupExpiredInvitations,
  cleanupExpiredPairingCodes
} from '../src/services/temporaryDataCleanup.js'

let testEnv

const now = () => Timestamp.now()
const future = () => Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)
const past = () => Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)

const context = ({ uid, email, verified = true }) => (
  testEnv.authenticatedContext(uid, {
    email,
    email_verified: verified
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
    })]
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

const invitationData = ({
  id = 'invite-1',
  restaurantId = 'restaurant-a',
  employeeId = 'employee-1',
  profileId = 'profile-1',
  email = 'employee@example.com',
  expiresAt = future(),
  status = 'pending',
  invitedByAuthUid = 'owner-auth'
} = {}) => ({
  id,
  restaurantId,
  employeeId,
  permissionProfileId: profileId,
  email,
  emailNormalized: email,
  status,
  invitedByAuthUid,
  createdAt: now(),
  expiresAt,
  acceptedAt: null,
  acceptedByAuthUid: null
})

const acceptInvitationBatch = async ({
  db,
  uid = 'employee-auth',
  restaurantId = 'restaurant-a',
  employeeId = 'employee-1',
  profileId = 'profile-1',
  invitationId = 'invite-1',
  deleteInvitation = true
}) => {
  const batch = writeBatch(db)
  batch.set(
    doc(db, `restaurants/${restaurantId}/members/${uid}`),
    memberData({
      uid,
      restaurantId,
      employeeId,
      permissionProfileId: profileId,
      invitationId
    })
  )
  if (deleteInvitation) {
    batch.delete(doc(
      db,
      `restaurants/${restaurantId}/invitations/${invitationId}`
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

test('zaproszenie tworzy właściciel restauracji', async () => {
  await seedOwner()
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    ['users/restaurant-a/permissionProfiles/profile-1', {
      uprawnienia: {}
    }]
  ])
  const ownerDb = context({
    uid: 'owner-auth',
    email: 'owner@example.com'
  }).firestore()
  await assertSucceeds(setDoc(
    doc(ownerDb, 'restaurants/restaurant-a/invitations/invite-owner'),
    invitationData({ id: 'invite-owner' })
  ))
})

test('zaproszenie tworzy manager zespołu', async () => {
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  const managerDb = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()
  await assertSucceeds(setDoc(
    doc(managerDb, 'restaurants/restaurant-a/invitations/invite-manager'),
    invitationData({
      id: 'invite-manager',
      invitedByAuthUid: 'manager-auth'
    })
  ))
})

test('zaproszenia nie tworzy zwykły pracownik', async () => {
  await seedEmployeeAccess()
  await seed([[
    'users/restaurant-a/employees/invited-employee', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }
  ]])
  const employeeDb = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(setDoc(
    doc(employeeDb, 'restaurants/restaurant-a/invitations/invite-denied'),
    invitationData({
      id: 'invite-denied',
      employeeId: 'invited-employee',
      invitedByAuthUid: 'employee-auth'
    })
  ))
})

test('zaproszenia nie odczytuje osoba niezalogowana, z innym lub niezweryfikowanym e-mailem', async () => {
  await seed([[
    'restaurants/restaurant-a/invitations/invite-1',
    invitationData()
  ]])
  await assertFails(getDoc(doc(
    testEnv.unauthenticatedContext().firestore(),
    'restaurants/restaurant-a/invitations/invite-1'
  )))
  await assertFails(getDoc(doc(
    context({ uid: 'wrong', email: 'wrong@example.com' }).firestore(),
    'restaurants/restaurant-a/invitations/invite-1'
  )))
  await assertFails(getDoc(doc(
    context({
      uid: 'employee-auth',
      email: 'employee@example.com',
      verified: false
    }).firestore(),
    'restaurants/restaurant-a/invitations/invite-1'
  )))
})

test('właściwy zweryfikowany e-mail przyjmuje zaproszenie atomowo i usuwa je', async () => {
  await seed([
    ['restaurants/restaurant-a/invitations/invite-1', invitationData()],
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertSucceeds(acceptInvitationBatch({ db }))
  assert.equal((await getDoc(doc(
    db,
    'restaurants/restaurant-a/members/employee-auth'
  ))).exists(), true)
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    assert.equal((await getDoc(doc(
      adminContext.firestore(),
      'restaurants/restaurant-a/invitations/invite-1'
    ))).exists(), false)
  })
})

test('zaproszenie wygasłe lub anulowane nie tworzy członkostwa', async () => {
  await seed([
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }],
    ['restaurants/restaurant-a/invitations/expired', invitationData({
      id: 'expired',
      expiresAt: past()
    })],
    ['restaurants/restaurant-a/invitations/cancelled', invitationData({
      id: 'cancelled',
      status: 'cancelled'
    })]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(acceptInvitationBatch({ db, invitationId: 'expired' }))
  await assertFails(acceptInvitationBatch({ db, invitationId: 'cancelled' }))
})

test('zaproszenie nie pozwala zmienić restauracji, pracownika ani profilu', async () => {
  await seed([
    ['restaurants/restaurant-a/invitations/invite-1', invitationData()],
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(acceptInvitationBatch({
    db,
    restaurantId: 'restaurant-b'
  }))
  await assertFails(acceptInvitationBatch({ db, employeeId: 'employee-2' }))
  await assertFails(acceptInvitationBatch({ db, profileId: 'profile-admin' }))
})

test('przerwana akceptacja nie pozostawia częściowego członkostwa', async () => {
  await seed([
    ['restaurants/restaurant-a/invitations/invite-1', invitationData()],
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertFails(acceptInvitationBatch({ db, deleteInvitation: false }))
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    assert.equal((await getDoc(doc(
      adminContext.firestore(),
      'restaurants/restaurant-a/members/employee-auth'
    ))).exists(), false)
  })
})

test('samego zaproszenia nie można przyjąć drugi raz', async () => {
  await seed([
    ['restaurants/restaurant-a/invitations/invite-1', invitationData()],
    ['users/restaurant-a/employees/employee-1', {
      aktywny: true,
      permissionProfileId: 'profile-1'
    }]
  ])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()
  await assertSucceeds(acceptInvitationBatch({ db }))
  await assertFails(acceptInvitationBatch({ db }))
})

test('manager zespołu usuwa zaproszenie, ale nie zaproszenie innej restauracji', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ['restaurants/restaurant-a/invitations/expired-a', invitationData({
      id: 'expired-a',
      expiresAt: past()
    })],
    ['restaurants/restaurant-b/invitations/expired-b', invitationData({
      id: 'expired-b',
      restaurantId: 'restaurant-b',
      expiresAt: past()
    })]
  ])
  const db = context({
    uid: 'manager-auth',
    email: 'manager@example.com'
  }).firestore()

  await assertSucceeds(deleteDoc(doc(
    db,
    'restaurants/restaurant-a/invitations/expired-a'
  )))
  await assertFails(deleteDoc(doc(
    db,
    'restaurants/restaurant-b/invitations/expired-b'
  )))
})

test('zwykły pracownik nie anuluje cudzego zaproszenia', async () => {
  await seedEmployeeAccess()
  await seed([[
    'restaurants/restaurant-a/invitations/invite-other',
    invitationData({
      id: 'invite-other',
      email: 'other@example.com'
    })
  ]])
  const db = context({
    uid: 'employee-auth',
    email: 'employee@example.com'
  }).firestore()

  await assertFails(deleteDoc(doc(
    db,
    'restaurants/restaurant-a/invitations/invite-other'
  )))
})

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

test('serwis usuwa wygasłe zaproszenia i zachowuje aktywne', async () => {
  await seedEmployeeAccess({
    uid: 'manager-auth',
    employeeId: 'manager-employee',
    profileId: 'manager-profile',
    permissions: { can_manage_employees: true }
  })
  await seed([
    ['restaurants/restaurant-a/invitations/expired', invitationData({
      id: 'expired',
      expiresAt: past()
    })],
    ['restaurants/restaurant-a/invitations/active', invitationData({
      id: 'active'
    })]
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
  assert.equal(result.deletedCount, 1)
  await testEnv.withSecurityRulesDisabled(async adminContext => {
    const adminDb = adminContext.firestore()
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/invitations/expired'
    ))).exists(), false)
    assert.equal((await getDoc(doc(
      adminDb,
      'restaurants/restaurant-a/invitations/active'
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
