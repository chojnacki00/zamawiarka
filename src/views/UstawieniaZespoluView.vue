<template>
  <main class="screen-with-topbar team-screen">
    <div class="zamawiarka-menu-topbar">
      <button class="zamawiarka-menu-back" type="button" @click="handleBack">←</button>
      <h2 class="zamawiarka-menu-title notranslate" translate="no">{{ employeeFormTitle }}</h2>
    </div>

    <div ref="scrollAreaRef" class="scroll-area team-scroll">
      <template v-if="!isFormOpen">
        <div class="team-toolbar">
          <button class="add-employee" type="button" @click="openForm()">＋ Dodaj pracownika</button>
          <label class="search-field"><span>⌕</span><input v-model="searchQuery" type="search" placeholder="Szukaj pracownika…"></label>
        </div>

        <div v-if="isLoading" class="empty-state">Wczytywanie danych…</div>
        <div v-else-if="!filteredEmployees.length" class="empty-state">Brak pracowników do wyświetlenia.</div>
        <section v-else class="employee-list">
          <article v-for="employee in filteredEmployees" :key="employee.id" class="employee-card" :class="{ inactive: employee.aktywny === false }">
            <button class="employee-main" type="button" @click="openForm(employee)">
              <strong>{{ employee.nazwisko }} {{ employee.imie }}</strong>
              <span class="employee-badges">
                <small>{{ employee.aktywny === false ? 'Nieaktywny' : 'Aktywny' }}</small>
                <small>{{ getPermissionProfileName(employee.permissionProfileId) }}</small>
                <small>{{ employee.positionAssignments.length }} stanowisk</small>
                <small v-if="employee.employeeGroupIds.length">{{ employee.employeeGroupIds.length }} grup</small>
              </span>
            </button>
            <button class="delete-icon" type="button" aria-label="Usuń pracownika" @click="employeeToDelete = employee">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </article>
        </section>
      </template>

      <form v-else class="employee-form floating-actions-content" @submit.prevent="saveEmployee">
        <section class="form-status-card">
          <span><strong>Konto aktywne</strong><small>Wyłączenie blokuje logowanie pracownika.</small></span>
          <input v-model="form.aktywny" type="checkbox">
        </section>

        <article :ref="element => setSectionElement('basic', element)" class="accordion-card" :class="{ open: openSections.basic }">
          <button class="accordion-toggle" type="button" @click="toggleSection('basic')"><span><b>1</b>Dane podstawowe</span><i>{{ openSections.basic ? '−' : '+' }}</i></button>
          <section v-if="openSections.basic" class="accordion-content">
            <div class="two-columns">
              <label class="form-field"><span>Imię *</span><input v-model="form.imie" type="text" autocomplete="given-name"></label>
              <label class="form-field"><span>Nazwisko *</span><input v-model="form.nazwisko" type="text" autocomplete="family-name"></label>
            </div>
            <label class="form-field"><span>Numer telefonu</span><input v-model="form.telefon" type="tel" inputmode="tel" autocomplete="tel" placeholder="Np. +48 500 000 000"></label>
            <label class="form-field"><span>Adres e-mail</span><input v-model="form.email" type="email" inputmode="email" autocomplete="email"></label>
            <label class="form-field"><span>PIN starszego logowania *</span><div class="pin-row"><input v-model="form.pin" class="pin-input" type="text" inputmode="numeric" maxlength="4"><button class="dice-button" type="button" aria-label="Wylosuj PIN" title="Wylosuj PIN" @click="generateRandomPin">🎲</button><button type="button" :disabled="!editingEmployeeId" @click="generatePairingCode">Paruj urządzenie</button></div></label>
            <p class="field-note">Mechanizm starszy pozostaje tymczasowo do czasu przetestowania kont Firebase pracowników.</p>
          </section>
        </article>

        <article :ref="element => setSectionElement('employment', element)" class="accordion-card" :class="{ open: openSections.employment }">
          <button class="accordion-toggle" type="button" @click="toggleSection('employment')"><span><b>2</b>Zatrudnienie i wynagrodzenie</span><i>{{ openSections.employment ? '−' : '+' }}</i></button>
          <section v-if="openSections.employment" class="accordion-content">
            <label class="form-field"><span>Rodzaj wynagrodzenia *</span><select v-model="form.compensation.type"><option value="hourly">Stawka godzinowa</option><option value="fixed_monthly">Stałe wynagrodzenie miesięczne</option></select></label>
            <template v-if="isHourlyCompensation">
              <label class="form-field rate-field"><span>Stawka ogólna *</span><div class="rate-input"><input v-model="form.compensation.generalHourlyRate" type="number" min="0.01" step="0.01" inputmode="decimal" required @wheel="blurFinancialInputOnWheel"><b>zł/h</b></div></label>
              <p class="field-note">Stawka ogólna będzie używana przy zmianach dodatkowych bez stanowiska oraz przy zmianach dodatkowych na stanowisku, którego pracownik nie ma przypisanego.</p>
            </template>
            <template v-else>
              <label class="form-field rate-field"><span>Miesięczne wynagrodzenie *</span><div class="rate-input monthly-rate-input"><input v-model="form.compensation.monthlySalary" type="number" min="0.01" step="0.01" inputmode="decimal" required @wheel="blurFinancialInputOnWheel"><b>zł/mies.</b></div></label>
              <p class="field-note">Stałe wynagrodzenie jest miesięczne i nie zależy od liczby zmian ani przepracowanych godzin.</p>
            </template>
            <label class="form-field"><span>Profil zatrudnienia</span><select v-model="form.employmentProfileId"><option :value="null">Bez profilu zatrudnienia</option><option v-for="profile in employmentProfilesStore.profiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option></select></label>
            <label class="form-field" :class="{ disabled: !form.employmentProfileId }"><span>Wymiar pracy</span><div class="range-heading"><strong>{{ form.employmentPercentage }}%</strong><small>Zakres 5–200%, krok 5%</small></div><input v-model.number="form.employmentPercentage" type="range" min="5" max="200" step="5" :disabled="!form.employmentProfileId"></label>
            <p v-if="!form.employmentProfileId" class="field-note">Bez profilu zatrudnienia nie obowiązują limity profilu, a wymiar pracy nie jest stosowany.</p>
            <p v-else class="field-note">Wymiar skaluje cel godzin, tolerancję i maksimum tygodniowe. Nie zmienia maksimum dziennego, odpoczynków, przerw ani pozostałych reguł profilu.</p>
            <div v-if="scaledEmploymentSummary" class="employment-summary">
              <strong>Przeliczone dla pracownika</strong>
              <span v-for="line in scaledEmploymentSummary.lines" :key="line.label"><b>{{ line.label }}:</b> {{ line.value }}</span>
              <small v-if="scaledEmploymentSummary.monthlyNote">Stały cel planistyczny dla każdego miesiąca. Nie uwzględnia różnic w liczbie dni roboczych ani świąt.</small>
            </div>
          </section>
        </article>

        <article :ref="element => setSectionElement('groups', element)" class="accordion-card" :class="{ open: openSections.groups }">
          <button class="accordion-toggle" type="button" @click="toggleSection('groups')"><span><b>3</b>Grupy pracownicze</span><i>{{ openSections.groups ? '−' : '+' }}</i></button>
          <section v-if="openSections.groups" class="accordion-content">
            <p class="field-note">Pracownik może należeć do kilku grup albo nie należeć do żadnej.</p>
            <div v-if="!selectableGroups.length" class="inline-empty">Brak grup do wyboru.</div>
            <label v-for="group in selectableGroups" :key="group.id" class="choice-row" :class="{ selected: form.employeeGroupIds.includes(group.id), inactive: group.active === false }"><input v-model="form.employeeGroupIds" type="checkbox" :value="group.id"><span><strong>{{ group.name }}</strong><small>{{ group.description || 'Brak opisu' }}</small></span></label>
          </section>
        </article>

        <article :ref="element => setSectionElement('positions', element)" class="accordion-card" :class="{ open: openSections.positions }">
          <button class="accordion-toggle" type="button" @click="toggleSection('positions')"><span><b>4</b>{{ isHourlyCompensation ? 'Stanowiska, kompetencje i stawki' : 'Stanowiska i kompetencje' }}</span><i>{{ openSections.positions ? '−' : '+' }}</i></button>
          <section v-if="openSections.positions" class="accordion-content">
            <button class="add-position" type="button" :disabled="!positionPickerPositions.length" @click="openPositionPicker">＋ Przypisz stanowisko</button>
            <div v-if="!form.positionAssignments.length" class="inline-empty">Brak przypisanych stanowisk.</div>
            <article v-for="assignment in form.positionAssignments" :key="assignment.positionId" class="assignment-card">
              <div class="assignment-heading"><span><strong>{{ getPosition(assignment.positionId)?.nazwa || 'Nieznane stanowisko' }}</strong><small v-if="getPosition(assignment.positionId)?.active === false">Stanowisko nieaktywne</small></span><button type="button" @click="removePositionAssignment(assignment.positionId)">Usuń</button></div>
              <div class="stars-row"><span>Kompetencje</span><div><button v-for="star in 5" :key="star" type="button" :class="{ active: assignment.competencyStars >= star }" @click="assignment.competencyStars = star">★</button></div></div>
              <template v-if="isHourlyCompensation">
                <label class="form-field rate-field"><span>Stawka godzinowa</span><div class="rate-input"><input :value="assignmentRateInputs[assignment.positionId] ?? ''" type="number" min="0.01" step="0.01" inputmode="decimal" @input="setAssignmentRateInput(assignment, $event.target.value)" @blur="commitAssignmentRate(assignment)" @wheel="blurFinancialInputOnWheel"><b>zł/h</b></div></label>
                <div class="rate-footer"><small>Domyślna stawka stanowiska: {{ formatRate(getPosition(assignment.positionId)?.defaultHourlyRate) }}</small><button v-if="assignment.hourlyRateOverride !== null" type="button" @click="restoreAssignmentRate(assignment)">Przywróć stawkę stanowiska</button></div>
              </template>
            </article>
          </section>
        </article>

        <article :ref="element => setSectionElement('permissions', element)" class="accordion-card" :class="{ open: openSections.permissions }">
          <button class="accordion-toggle" type="button" @click="toggleSection('permissions')"><span><b>5</b>Profil uprawnień</span><i>{{ openSections.permissions ? '−' : '+' }}</i></button>
          <section v-if="openSections.permissions" class="accordion-content">
            <label class="form-field"><span>Profil uprawnień *</span><select v-model="form.permissionProfileId"><option value="" disabled>Wybierz profil…</option><option v-for="profile in availablePermissionProfiles" :key="profile.id" :value="profile.id">{{ profile.nazwa }}</option></select></label>
            <p class="field-note">Profil określa dostęp pracownika do modułów aplikacji i jest wymagany.</p>
            <div v-if="editingEmployeeId" class="account-access-card">
              <strong>Dostęp i urządzenia</strong>
              <p v-if="!canUseFirebaseAccountAccess" class="field-note">Zarządzanie nowym dostępem wymaga zalogowania kontem Firebase z uprawnieniem do zespołu. Starsza sesja PIN nie może tworzyć zaproszeń.</p>
              <template v-else>
                <p v-if="accountAccess" class="account-access-status" :class="accountAccess.status">{{ accountAccess.status === 'active' ? 'Aktywne członkostwo' : accountAccess.status === 'pending' ? 'Oczekujące zaproszenie' : 'Dostęp zablokowany' }}</p>
                <template v-if="!accountAccess">
                  <button class="invite-button" type="button" :disabled="isAccountActionPending" @click="inviteEmployee">{{ isAccountActionPending ? 'Zapisywanie…' : 'Utwórz zaproszenie' }}</button>
                  <small>Zaproszenie użyje adresu e-mail zapisanego w danych pracownika. Aplikacja nie wysyła go automatycznie.</small>
                </template>
                <template v-else-if="accountAccess.status === 'active'">
                  <div class="device-actions">
                    <button class="invite-button" type="button" :disabled="isAccountActionPending" @click="inviteDevice">Dodaj urządzenie</button>
                    <button class="block-access-button" type="button" :disabled="isAccountActionPending || !activeDevices.length" @click="disconnectEveryDevice">Odłącz wszystkie urządzenia</button>
                  </div>
                  <div v-if="!activeDevices.length" class="inline-empty">Brak aktywnych urządzeń.</div>
                  <article v-for="device in activeDevices" :key="device.sessionId" class="device-card">
                    <span><strong>{{ device.deviceName || 'Urządzenie bez nazwy' }}</strong><small>{{ device.platform || 'Brak opisu platformy' }}</small><small>Dodano: {{ formatDeviceDate(device.addedAt) }} · Ostatnia aktywność: {{ formatDeviceDate(device.lastActiveAt) }}</small></span>
                    <button class="block-access-button" type="button" :disabled="isAccountActionPending" @click="disconnectOneDevice(device)">Odłącz</button>
                  </article>
                  <button class="block-access-button" type="button" :disabled="isAccountActionPending" @click="blockEmployeeAccess">Zablokuj dostęp do restauracji</button>
                </template>
                <template v-else-if="accountAccess.status === 'pending'">
                  <button class="invite-button" type="button" :disabled="isAccountActionPending" @click="inviteEmployee">Wygeneruj nowe zaproszenie</button>
                  <button class="block-access-button" type="button" :disabled="isAccountActionPending" @click="cancelEmployeeInvitation">Anuluj zaproszenie</button>
                  <small>Nowy link unieważni poprzednie zaproszenie.</small>
                </template>
                <p v-if="accountAccessMessage" class="account-access-message">{{ accountAccessMessage }}</p>
              </template>
            </div>
          </section>
        </article>

        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="form-actions floating-form-actions"><button class="cancel-button floating-form-action cancel" type="button" aria-label="Anuluj" title="Anuluj" @click="cancelForm">×</button><button class="save-button floating-form-action save" type="submit" aria-label="Zapisz" title="Zapisz" :disabled="isSaving">{{ isSaving ? '…' : '✓' }}</button></div>
      </form>
    </div>

    <div v-if="employeeToDelete" class="app-dialog-overlay"><div class="app-dialog-card dialog-card"><div class="app-dialog-title">Usunąć pracownika?</div><p>Usunięte zostaną również jego dyspozycje i przydziały wymagające tego pracownika.</p><strong>{{ employeeToDelete.imie }} {{ employeeToDelete.nazwisko }}</strong><div class="form-actions"><button class="cancel-button" type="button" @click="employeeToDelete = null">Anuluj</button><button class="danger-button" type="button" @click="executeDelete">Usuń</button></div></div></div>
    <div v-if="isPositionPickerOpen" class="app-dialog-overlay">
      <div class="app-dialog-card position-picker-card">
        <div class="app-dialog-title">Przypisz stanowiska</div>
        <p>Zaznacz stanowiska pracownika. Nowe przypisania otrzymają domyślnie 5 gwiazdek kompetencji.</p>
        <div class="position-picker-list">
          <label v-for="position in positionPickerPositions" :key="position.id" class="choice-row" :class="{ selected: positionPickerSelection.includes(position.id), inactive: position.active === false }">
            <input v-model="positionPickerSelection" type="checkbox" :value="position.id">
            <span><strong>{{ position.nazwa }}</strong><small v-if="isHourlyCompensation || position.active === false"><template v-if="isHourlyCompensation">{{ formatRate(position.defaultHourlyRate) }}</template><template v-if="isHourlyCompensation && position.active === false"> · </template><template v-if="position.active === false">stanowisko nieaktywne</template></small></span>
          </label>
        </div>
        <div class="form-actions"><button class="cancel-button" type="button" @click="closePositionPicker">Anuluj</button><button class="save-button" type="button" @click="applyPositionSelection">Zastosuj</button></div>
      </div>
    </div>
    <div v-if="pairingCode" class="app-dialog-overlay"><div class="app-dialog-card dialog-card"><div class="app-dialog-title">Kod parowania</div><p>Wpisz kod na urządzeniu pracownika. Jest ważny przez 3 minuty.</p><div class="pairing-code">{{ pairingCode }}</div><button class="save-button full" type="button" @click="pairingCode = ''">Gotowe</button></div></div>
    <div v-if="identityInvitation" class="app-dialog-overlay">
      <div class="app-dialog-card invitation-dialog">
        <button class="dialog-close" type="button" aria-label="Zamknij" @click="closeIdentityInvitation">×</button>
        <div class="app-dialog-title">{{ identityInvitation.purpose === invitationPurposes.DEVICE_ENROLLMENT ? 'Dodaj urządzenie' : 'Aktywuj konto pracownika' }}</div>
        <p>Zeskanuj kod na urządzeniu pracownika albo przekaż dokładnie ten sam link.</p>
        <img v-if="identityInvitation.qrDataUrl" class="invitation-qr" :src="identityInvitation.qrDataUrl" alt="Kod QR zaproszenia">
        <label class="form-field"><span>Link aktywacyjny</span><input :value="identityInvitation.link" type="text" readonly></label>
        <small>Ważne do: {{ formatDeviceDate(identityInvitation.expiresAt) }}</small>
        <button class="invite-button full" type="button" @click="copyActivationLink">Kopiuj link</button>
        <button class="block-access-button full" type="button" :disabled="isAccountActionPending" @click="cancelVisibleInvitation">Anuluj zaproszenie</button>
        <button class="invite-button full" type="button" :disabled="isAccountActionPending" @click="replaceVisibleInvitation">Wygeneruj nowe zaproszenie</button>
        <small>Aplikacja nie wysłała wiadomości e-mail. Link lub QR trzeba przekazać pracownikowi.</small>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase.js'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'
import { useEmployeeGroupsStore } from '../stores/employeeGroupsStore.js'
import { useEmployeesStore } from '../stores/employeesStore.js'
import { usePermissionProfilesStore } from '../stores/permissionProfilesStore.js'
import { useScheduleEmploymentProfilesStore } from '../stores/scheduleEmploymentProfilesStore.js'
import { useSchedulePositionsStore } from '../stores/schedulePositionsStore.js'
import { cleanupExpiredPairingCodes } from '../services/temporaryDataCleanup.js'
import { buildActivationUrl } from '../config/publicAppUrl.js'
import { INVITATION_PURPOSES } from '../utils/identityInvitations.js'
import {
  COMPENSATION_TYPES,
  getEffectiveHourlyRate,
  normalizeMoneyValue
} from '../utils/employeeAssignments.js'
import {
  getScaledEmploymentProfile,
  roundHours
} from '../utils/employmentRules.js'

const router = useRouter()
const accountSessionStore = useAccountSessionStore()
const employeeAuthStore = useEmployeeAuthStore()
const groupsStore = useEmployeeGroupsStore()
const employeesStore = useEmployeesStore()
const permissionProfilesStore = usePermissionProfilesStore()
const employmentProfilesStore = useScheduleEmploymentProfilesStore()
const positionsStore = useSchedulePositionsStore()

const scrollAreaRef = ref(null)
const isFormOpen = ref(false)
const editingEmployeeId = ref(null)
const isSaving = ref(false)
const searchQuery = ref('')
const isPositionPickerOpen = ref(false)
const positionPickerSelection = ref([])
const employeeToDelete = ref(null)
const pairingCode = ref('')
const formError = ref('')
const closedSections = () => ({ basic: false, employment: false, groups: false, positions: false, permissions: false })
const openSections = ref(closedSections())
const sectionElements = ref({})
const assignmentRateInputs = ref({})
const accountAccess = ref(null)
const employeeDevices = ref([])
const identityInvitation = ref(null)
const invitationPurposes = INVITATION_PURPOSES
const accountAccessMessage = ref('')
const isAccountActionPending = ref(false)
const activeDevices = computed(() => employeeDevices.value.filter(
  device => device.status === 'active'
))

const createEmptyForm = () => ({
  imie: '',
  nazwisko: '',
  telefon: '',
  email: '',
  pin: '',
  aktywny: true,
  employmentProfileId: null,
  employmentPercentage: 100,
  employeeGroupIds: [],
  compensation: {
    type: COMPENSATION_TYPES.HOURLY,
    generalHourlyRate: null,
    monthlySalary: null
  },
  positionAssignments: [],
  permissionProfileId: ''
})
const form = ref(createEmptyForm())

const isLoading = computed(() => employeesStore.isLoading || positionsStore.isLoading || groupsStore.isLoading || permissionProfilesStore.isLoading || employmentProfilesStore.isLoading)
const employeeFormTitle = computed(() => {
  if (!isFormOpen.value) return 'ZESPÓŁ'
  const fullName = `${form.value.imie} ${form.value.nazwisko}`.trim()
  return fullName ? fullName.toLocaleUpperCase('pl') : 'IMIĘ I NAZWISKO'
})
const filteredEmployees = computed(() => {
  const search = searchQuery.value.trim().toLocaleLowerCase('pl')
  return [...employeesStore.employees].filter(employee => !search || `${employee.imie} ${employee.nazwisko} ${employee.telefon}`.toLocaleLowerCase('pl').includes(search)).sort((first, second) => {
    const activityDifference = Number(first.aktywny === false) - Number(second.aktywny === false)
    return activityDifference || `${first.nazwisko} ${first.imie}`.localeCompare(`${second.nazwisko} ${second.imie}`, 'pl')
  })
})
const availablePermissionProfiles = computed(() => {
  if (!employeeAuthStore.currentEmployee) return permissionProfilesStore.profiles
  return permissionProfilesStore.profiles.filter(profile => Object.entries(profile.uprawnienia || {}).every(([key, enabled]) => !enabled || employeeAuthStore.hasPermission(key)))
})
const selectableGroups = computed(() => groupsStore.groups.filter(group => group.active !== false || form.value.employeeGroupIds.includes(group.id)))
const positionPickerPositions = computed(() => positionsStore.positions.filter(position => position.active !== false || form.value.positionAssignments.some(assignment => assignment.positionId === position.id)))
const isHourlyCompensation = computed(() => (
  form.value.compensation.type ===
  COMPENSATION_TYPES.HOURLY
))
const canUseFirebaseAccountAccess = computed(() => Boolean(
  accountSessionStore.authUser &&
  accountSessionStore.currentRestaurantId
))
const formatSettlementPeriodUnit = period => {
  const amount = Number(period?.amount) || 1
  if (period?.unit === 'day') return `${amount} dni`
  if (period?.unit === 'week') return `${amount} tyg.`
  return `${amount} mies.`
}
const getTargetUnitLabel = profile => {
  if (profile.targetHours?.unit === 'week') return 'tydzień'
  if (profile.targetHours?.unit === 'month') return 'miesiąc'
  return `okres rozliczeniowy (${formatSettlementPeriodUnit(profile.settlementPeriod)})`
}
const scaledEmploymentSummary = computed(() => {
  const profile = employmentProfilesStore.profiles.find(item => item.id === form.value.employmentProfileId)
  const scaled = getScaledEmploymentProfile(form.value, profile)
  if (!scaled) return null

  const lines = []
  if (scaled.targetHours?.applies) {
    const unit = getTargetUnitLabel(scaled)
    const targetHours = Number(scaled.targetHours.amount) || 0
    lines.push({
      label: 'Cel',
      value: `${roundHours(targetHours)} h / ${unit}`
    })

    if (scaled.targetTolerance?.applies) {
      const minusHours = Number(
        scaled.targetTolerance.minusHours
      ) || 0
      const plusHours = Number(
        scaled.targetTolerance.plusHours
      ) || 0
      lines.push({
        label: 'Zakres celu',
        value: `${roundHours(Math.max(0, targetHours - minusHours))}–${roundHours(targetHours + plusHours)} h / ${unit}`
      })
      lines.push({
        label: 'Tolerancja',
        value: `−${roundHours(minusHours)}/+${roundHours(plusHours)} h`
      })
    }
  }

  if (scaled.maximumWeeklyHours?.applies) {
    lines.push({
      label: 'Maksimum tygodniowe',
      value: `${roundHours(scaled.maximumWeeklyHours.hours)} h`
    })
  }

  if (!lines.length) return null
  return {
    lines,
    monthlyNote: scaled.targetHours?.applies &&
      scaled.targetHours.unit === 'month'
  }
})

onMounted(async () => {
  await Promise.all([employeesStore.fetchEmployees(), positionsStore.fetchPositions(), groupsStore.fetchGroups(), permissionProfilesStore.fetchProfiles(), employmentProfilesStore.fetchProfiles()])
  void accountSessionStore.cleanupCurrentRestaurantTemporaryData()
    .then(result => {
      if (
        result &&
        (!result.invitations.completed || !result.pairingCodes.completed)
      ) {
        console.warn('Nie wszystkie dane tymczasowe zostały wyczyszczone.')
      }
    })
})

const toggleSection = section => {
  const shouldOpen = !openSections.value[section]
  openSections.value = { ...closedSections(), [section]: shouldOpen }
  if (shouldOpen) scrollToSection(section)
}
const openOnlySection = section => {
  openSections.value = { ...closedSections(), [section]: true }
  scrollToSection(section)
}
const setSectionElement = (section, element) => {
  if (element) sectionElements.value[section] = element
}
const scrollToSection = async section => {
  await nextTick()
  sectionElements.value[section]?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}
const handleBack = () => { if (isFormOpen.value) cancelForm(); else router.push('/ustawienia') }
const getPermissionProfileName = profileId => permissionProfilesStore.profiles.find(profile => profile.id === profileId)?.nazwa || 'Brak profilu'
const getPosition = positionId => positionsStore.positions.find(position => position.id === positionId)
const formatRate = value => `${Number(value || 0).toFixed(2).replace('.', ',')} zł/h`
const getDisplayedRate = assignment => assignment.hourlyRateOverride ?? Number(getPosition(assignment.positionId)?.defaultHourlyRate || 0)
const formatMoneyInput = value => {
  const normalizedValue = normalizeMoneyValue(value)
  return normalizedValue === null ? '' : String(normalizedValue)
}
const syncAssignmentRateInputs = () => {
  const currentInputs = assignmentRateInputs.value
  assignmentRateInputs.value = Object.fromEntries(
    form.value.positionAssignments.map(assignment => [
      assignment.positionId,
      Object.prototype.hasOwnProperty.call(
        currentInputs,
        assignment.positionId
      )
        ? currentInputs[assignment.positionId]
        : formatMoneyInput(getDisplayedRate(assignment))
    ])
  )
}

const openForm = (employee = null) => {
  editingEmployeeId.value = employee?.id || null
  form.value = employee
    ? {
        ...createEmptyForm(),
        ...employee,
        compensation: {
          ...createEmptyForm().compensation,
          ...employee.compensation
        },
        employeeGroupIds: [...employee.employeeGroupIds],
        positionAssignments: employee.positionAssignments.map(
          assignment => ({ ...assignment })
        )
      }
    : createEmptyForm()
  assignmentRateInputs.value = {}
  syncAssignmentRateInputs()
  if (!employee) generateRandomPin()
  openSections.value = closedSections()
  formError.value = ''
  accountAccess.value = null
  employeeDevices.value = []
  identityInvitation.value = null
  accountAccessMessage.value = ''
  isPositionPickerOpen.value = false
  positionPickerSelection.value = []
  isFormOpen.value = true
  if (employee?.id && canUseFirebaseAccountAccess.value) {
    loadEmployeeAccountAccess(employee.id)
  }
}

const cancelForm = () => {
  isFormOpen.value = false
  editingEmployeeId.value = null
  formError.value = ''
  accountAccess.value = null
  employeeDevices.value = []
  identityInvitation.value = null
  accountAccessMessage.value = ''
  nextTick(() => {
    if (scrollAreaRef.value) scrollAreaRef.value.scrollTop = 0
  })
}
const generateRandomPin = () => { form.value.pin = String(Math.floor(1000 + Math.random() * 9000)) }
const openPositionPicker = () => {
  positionPickerSelection.value = form.value.positionAssignments.map(assignment => assignment.positionId)
  isPositionPickerOpen.value = true
}
const closePositionPicker = () => { isPositionPickerOpen.value = false; positionPickerSelection.value = [] }
const applyPositionSelection = () => {
  const selectedIds = new Set(positionPickerSelection.value)
  const existingAssignments = new Map(form.value.positionAssignments.map(assignment => [assignment.positionId, assignment]))
  form.value.positionAssignments = positionPickerPositions.value
    .filter(position => selectedIds.has(position.id))
    .map(position => existingAssignments.get(position.id) || { positionId: position.id, competencyStars: 5, hourlyRateOverride: null })
  syncAssignmentRateInputs()
  closePositionPicker()
}
const removePositionAssignment = positionId => {
  form.value.positionAssignments = form.value.positionAssignments.filter(
    assignment => assignment.positionId !== positionId
  )
  syncAssignmentRateInputs()
}
const setAssignmentRateInput = (assignment, value) => {
  assignmentRateInputs.value = {
    ...assignmentRateInputs.value,
    [assignment.positionId]: value
  }
}
const commitAssignmentRate = assignment => {
  const rawValue = assignmentRateInputs.value[assignment.positionId]
  if (String(rawValue ?? '').trim() === '') {
    assignment.hourlyRateOverride = null
    setAssignmentRateInput(
      assignment,
      formatMoneyInput(getDisplayedRate(assignment))
    )
    return true
  }

  const parsed = normalizeMoneyValue(rawValue)
  if (parsed === null) return false

  const defaultRate = normalizeMoneyValue(
    getPosition(assignment.positionId)?.defaultHourlyRate
  ) ?? 0
  assignment.hourlyRateOverride = Math.abs(parsed - defaultRate) >= 0.005
    ? Math.max(0, parsed)
    : null
  setAssignmentRateInput(
    assignment,
    formatMoneyInput(getDisplayedRate(assignment))
  )
  return true
}
const restoreAssignmentRate = assignment => {
  assignment.hourlyRateOverride = null
  setAssignmentRateInput(
    assignment,
    formatMoneyInput(getDisplayedRate(assignment))
  )
}
const blurFinancialInputOnWheel = event => {
  if (event.currentTarget === document.activeElement) {
    event.currentTarget.blur()
  }
}

const validateForm = () => {
  form.value.positionAssignments.forEach(commitAssignmentRate)
  if (!form.value.imie.trim() || !form.value.nazwisko.trim() || form.value.pin.trim().length !== 4) { openOnlySection('basic'); return 'Uzupełnij imię, nazwisko i czterocyfrowy PIN.' }
  if (isHourlyCompensation.value) {
    const generalHourlyRate = normalizeMoneyValue(
      form.value.compensation.generalHourlyRate
    )

    if (!Number.isFinite(generalHourlyRate) || generalHourlyRate <= 0) {
      openOnlySection('employment')
      return 'Uzupełnij prawidłową stawkę ogólną większą od zera.'
    }

    const assignmentWithoutRate = form.value.positionAssignments.find(
      assignment => {
        const position = getPosition(assignment.positionId)
        const effectiveRate = getEffectiveHourlyRate(
          form.value,
          position
        )
        return !Number.isFinite(effectiveRate) || effectiveRate <= 0
      }
    )

    if (assignmentWithoutRate) {
      openOnlySection('positions')
      const positionName = getPosition(
        assignmentWithoutRate.positionId
      )?.nazwa || 'Nieznane stanowisko'
      return `Uzupełnij stawkę dla stanowiska „${positionName}”.`
    }
  } else {
    const monthlySalary = normalizeMoneyValue(
      form.value.compensation.monthlySalary
    )

    if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
      openOnlySection('employment')
      return 'Uzupełnij prawidłowe miesięczne wynagrodzenie większe od zera.'
    }
  }
  if (!form.value.permissionProfileId) { openOnlySection('permissions'); return 'Wybierz wymagany profil uprawnień.' }
  if (form.value.employmentProfileId && (form.value.employmentPercentage < 5 || form.value.employmentPercentage > 200 || form.value.employmentPercentage % 5 !== 0)) { openOnlySection('employment'); return 'Wymiar pracy musi mieścić się w zakresie 5–200% i być wielokrotnością 5%.' }
  return ''
}

const saveEmployee = async () => {
  formError.value = validateForm()
  if (formError.value || isSaving.value) return
  isSaving.value = true
  try {
    const payload = {
      ...form.value,
      employmentPercentage: form.value.employmentProfileId
        ? form.value.employmentPercentage
        : 100,
      employeeGroupIds: [...form.value.employeeGroupIds],
      compensation: { ...form.value.compensation },
      positionAssignments: form.value.positionAssignments.map(
        assignment => ({ ...assignment })
      )
    }
    if (editingEmployeeId.value) {
      await employeesStore.updateEmployee(editingEmployeeId.value, payload)
      await accountSessionStore.syncEmployeeMembershipProfile({
        employeeId: editingEmployeeId.value,
        permissionProfileId: payload.permissionProfileId
      })
    } else {
      await employeesStore.addEmployee(payload)
    }
    cancelForm()
    searchQuery.value = ''
  } catch (error) { formError.value = 'Nie udało się zapisać pracownika.' }
  finally { isSaving.value = false }
}

const loadEmployeeAccountAccess = async employeeId => {
  if (!employeeId) return

  try {
    accountAccess.value = await accountSessionStore
      .getEmployeeAccountAccess(employeeId)
    employeeDevices.value = accountAccess.value?.accessType === 'membership'
      ? await accountSessionStore.getEmployeeDevices(accountAccess.value.authUid)
      : []
  } catch (error) {
    console.error('Błąd odczytu dostępu pracownika:', error)
    accountAccessMessage.value =
      'Nie udało się sprawdzić dostępu do konta.'
  }
}

const getAccountActionError = (error, fallback) => (
  error?.code ? fallback : (error?.message || fallback)
)

const inviteEmployee = async () => {
  if (!editingEmployeeId.value || isAccountActionPending.value) return

  isAccountActionPending.value = true
  accountAccessMessage.value = ''
  try {
    await showIdentityInvitation(await accountSessionStore.createInvitation({
      employee: { id: editingEmployeeId.value },
      purpose: INVITATION_PURPOSES.ACCOUNT_ACTIVATION
    }))
    await loadEmployeeAccountAccess(editingEmployeeId.value)
    accountAccessMessage.value =
      'Zaproszenie zapisano. Przekaż pracownikowi link aktywacyjny — aplikacja nie wysłała wiadomości z zaproszeniem.'
  } catch (error) {
    accountAccessMessage.value = getAccountActionError(
      error,
      'Nie udało się zapisać zaproszenia.'
    )
  } finally {
    isAccountActionPending.value = false
  }
}

const copyActivationLink = async () => {
  if (!identityInvitation.value?.link) return

  try {
    await navigator.clipboard.writeText(identityInvitation.value.link)
    accountAccessMessage.value = 'Link aktywacyjny skopiowano.'
  } catch (error) {
    console.error('Nie udało się skopiować linku aktywacyjnego:', error)
    accountAccessMessage.value =
      'Nie udało się skopiować linku. Zaznacz go i skopiuj ręcznie.'
  }
}

const showIdentityInvitation = async invitation => {
  const link = buildActivationUrl({ token: invitation.token })
  identityInvitation.value = {
    ...invitation,
    link,
    qrDataUrl: await QRCode.toDataURL(link, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256
    })
  }
}

const closeIdentityInvitation = () => {
  identityInvitation.value = null
}

const inviteDevice = async () => {
  if (!accountAccess.value?.authUid || isAccountActionPending.value) return
  isAccountActionPending.value = true
  accountAccessMessage.value = ''
  try {
    await showIdentityInvitation(await accountSessionStore.createInvitation({
      employee: { id: editingEmployeeId.value },
      purpose: INVITATION_PURPOSES.DEVICE_ENROLLMENT,
      targetAuthUid: accountAccess.value.authUid
    }))
  } catch (error) {
    accountAccessMessage.value = getAccountActionError(
      error,
      'Nie udało się utworzyć zaproszenia urządzenia.'
    )
  } finally {
    isAccountActionPending.value = false
  }
}

const replaceVisibleInvitation = async () => {
  const purpose = identityInvitation.value?.purpose
  if (!purpose) return
  if (purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT) {
    await inviteDevice()
  } else {
    await inviteEmployee()
  }
}

const cancelVisibleInvitation = async () => {
  const invitationId = identityInvitation.value?.id
  if (!invitationId || isAccountActionPending.value) return
  isAccountActionPending.value = true
  try {
    await accountSessionStore.cancelInvitation({
      invitationId,
      employeeId: editingEmployeeId.value
    })
    closeIdentityInvitation()
    await loadEmployeeAccountAccess(editingEmployeeId.value)
    accountAccessMessage.value = 'Zaproszenie zostało anulowane i usunięte.'
  } catch (error) {
    accountAccessMessage.value = getAccountActionError(
      error,
      'Nie udało się anulować zaproszenia.'
    )
  } finally {
    isAccountActionPending.value = false
  }
}

const formatDeviceDate = value => {
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value))
  return Number.isNaN(date.getTime()) ? 'brak danych' : date.toLocaleString('pl-PL')
}

const disconnectOneDevice = async device => {
  if (!accountAccess.value?.authUid || isAccountActionPending.value) return
  isAccountActionPending.value = true
  try {
    await accountSessionStore.disconnectDevice({
      authUid: accountAccess.value.authUid,
      sessionId: device.sessionId
    })
    employeeDevices.value = await accountSessionStore
      .getEmployeeDevices(accountAccess.value.authUid)
    accountAccessMessage.value = 'Urządzenie zostało odłączone.'
  } catch (error) {
    accountAccessMessage.value = getAccountActionError(
      error,
      'Nie udało się odłączyć urządzenia.'
    )
  } finally {
    isAccountActionPending.value = false
  }
}

const disconnectEveryDevice = async () => {
  if (!accountAccess.value?.authUid || isAccountActionPending.value) return
  isAccountActionPending.value = true
  try {
    const count = await accountSessionStore.disconnectAllDevices(
      accountAccess.value.authUid
    )
    employeeDevices.value = await accountSessionStore
      .getEmployeeDevices(accountAccess.value.authUid)
    accountAccessMessage.value = `Odłączono urządzenia: ${count}.`
  } catch (error) {
    accountAccessMessage.value = getAccountActionError(
      error,
      'Nie udało się odłączyć urządzeń.'
    )
  } finally {
    isAccountActionPending.value = false
  }
}

const blockEmployeeAccess = async () => {
  if (!accountAccess.value?.authUid || isAccountActionPending.value) return

  isAccountActionPending.value = true
  accountAccessMessage.value = ''
  try {
    await accountSessionStore.blockRestaurantAccess(
      accountAccess.value.authUid
    )
    accountAccess.value = {
      ...accountAccess.value,
      status: 'blocked'
    }
    accountAccessMessage.value =
      'Dostęp tego konta do restauracji został zablokowany.'
  } catch (error) {
    accountAccessMessage.value =
      'Nie udało się zablokować dostępu.'
  } finally {
    isAccountActionPending.value = false
  }
}

const cancelEmployeeInvitation = async () => {
  if (
    !accountAccess.value?.id ||
    !editingEmployeeId.value ||
    isAccountActionPending.value
  ) return

  isAccountActionPending.value = true
  accountAccessMessage.value = ''
  try {
    await accountSessionStore.cancelInvitation({
      invitationId: accountAccess.value.id,
      employeeId: editingEmployeeId.value
    })
    accountAccess.value = null
    accountAccessMessage.value = 'Zaproszenie zostało anulowane i usunięte.'
  } catch (error) {
    accountAccessMessage.value = getAccountActionError(
      error,
      'Nie udało się anulować zaproszenia.'
    )
  } finally {
    isAccountActionPending.value = false
  }
}

const executeDelete = async () => {
  if (!employeeToDelete.value) return
  try { await employeesStore.deleteEmployee(employeeToDelete.value.id); employeeToDelete.value = null }
  catch (error) {
    alert(
      error?.message ||
      'Nie udało się usunąć pracownika.'
    )
  }
}

const generatePairingCode = async () => {
  if (!editingEmployeeId.value) return
  let restaurantId
  try {
    restaurantId = employeeAuthStore.requireRestaurantId()
  } catch (error) {
    alert(error.message)
    return
  }
  try {
    const cleanupResult = await cleanupExpiredPairingCodes({
      db,
      restaurantId
    })
    if (!cleanupResult.completed) {
      console.warn(
        'Nie udało się wyczyścić wygasłych kodów parowania:',
        cleanupResult.error
      )
    }
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await setDoc(doc(db, 'pairing_codes', code), { companyUid: restaurantId, employeeId: editingEmployeeId.value, employeeName: form.value.imie, createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + 3 * 60 * 1000) })
    pairingCode.value = code
  } catch (error) { alert('Nie udało się utworzyć kodu parowania.') }
}
</script>

<style scoped>
.team-scroll { background: #f6f7f9; }.team-toolbar { position: sticky; top: 0; z-index: 5; padding: 16px; border-bottom: 1px solid #e5e7eb; background: rgba(246,247,249,.95); backdrop-filter: blur(14px); }.add-employee { width: 100%; padding: 14px; border: 1px solid #bae6fd; border-radius: 14px; background: #e0f2fe; color: #0369a1; font-size: 16px; font-weight: 750; }.search-field { position: relative; display: block; margin-top: 11px; }.search-field span { position: absolute; top: 9px; left: 13px; color: #9ca3af; font-size: 22px; }.search-field input { width: 100%; box-sizing: border-box; padding: 12px 14px 12px 40px; border: 1px solid #d1d5db; border-radius: 12px; background: white; font-size: 16px; }.employee-list { display: grid; gap: 10px; padding: 14px 16px 24px; }.employee-card { display: flex; align-items: center; gap: 10px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 15px; background: white; box-shadow: 0 3px 12px rgba(15,23,42,.04); }.employee-card.inactive { opacity: .58; }.employee-main { display: grid; flex: 1; min-width: 0; gap: 8px; padding: 0; border: 0; background: transparent; text-align: left; }.employee-main strong { color: #111827; font-size: 16px; }.employee-badges { display: flex; flex-wrap: wrap; gap: 5px; }.employee-badges small { padding: 3px 7px; border-radius: 6px; background: #f1f5f9; color: #475569; font-weight: 650; }.delete-icon { display: grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; padding: 0; border: 1px solid #fecaca; border-radius: 10px; background: #fef2f2; color: #dc2626; }.empty-state, .inline-empty { padding: 28px 14px; color: #9ca3af; text-align: center; }.employee-form { display: grid; gap: 11px; padding: 14px 14px 32px; }.form-status-card, .accordion-card { border: 1px solid #e5e7eb; border-radius: 16px; background: white; box-shadow: 0 3px 12px rgba(15,23,42,.04); }.form-status-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 15px; }.form-status-card span { display: grid; gap: 3px; }.form-status-card small { color: #6b7280; }.form-status-card input { width: 23px; height: 23px; accent-color: #10b981; }.accordion-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 16px; border: 0; background: transparent; color: #111827; font-size: 15px; font-weight: 750; text-align: left; }.accordion-toggle span { display: flex; align-items: center; gap: 10px; }.accordion-toggle b { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 8px; background: #e0f2fe; color: #0284c7; font-size: 12px; }.accordion-toggle i { color: #94a3b8; font-size: 22px; font-style: normal; }.accordion-content { padding: 0 16px 16px; border-top: 1px solid #f1f5f9; }.two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.form-field { display: grid; gap: 7px; margin-top: 15px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }.form-field input, .form-field select { width: 100%; box-sizing: border-box; min-height: 46px; padding: 11px 12px; border: 1px solid #cbd5e1; border-radius: 11px; background: white; color: #0f172a; font-size: 16px; text-transform: none; }.form-field.disabled { opacity: .48; }.pin-row { display: grid; grid-template-columns: 86px 46px minmax(0, 1fr); gap: 7px; }.pin-row .pin-input { width: 86px; text-align: center; letter-spacing: .12em; }.pin-row button, .add-position { min-height: 44px; padding: 0 12px; border: 1px solid #bae6fd; border-radius: 10px; background: #f0f9ff; color: #0369a1; font-weight: 700; }.pin-row .dice-button { padding: 0; font-size: 21px; }.range-heading { display: flex; align-items: center; justify-content: space-between; }.range-heading strong { color: #0284c7; font-size: 20px; }.range-heading small { color: #94a3b8; text-transform: none; }.form-field input[type="range"] { padding: 0; accent-color: #0ea5e9; }.field-note { margin: 12px 0 0; color: #64748b; font-size: 13px; line-height: 1.5; }.choice-row { display: flex; align-items: center; gap: 11px; min-height: 72px; box-sizing: border-box; margin-top: 10px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; }.choice-row.selected { border-color: #7dd3fc; background: #f0f9ff; }.choice-row.inactive { opacity: .58; }.choice-row input { width: 20px; height: 20px; flex: 0 0 20px; accent-color: #0ea5e9; }.choice-row span { display: grid; min-width: 0; gap: 2px; }.choice-row small { display: -webkit-box; overflow: hidden; min-height: 32px; color: #64748b; line-height: 16px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.add-position { width: 100%; margin-top: 10px; }.add-position:disabled { opacity: .4; }.assignment-card { margin-top: 12px; padding: 13px; border: 1px solid #e2e8f0; border-radius: 13px; background: #f8fafc; }.assignment-heading, .stars-row, .rate-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.assignment-heading span { display: grid; gap: 2px; }.assignment-heading small { color: #dc2626; }.assignment-heading button, .rate-footer button { padding: 6px 8px; border: 0; background: transparent; color: #dc2626; font-size: 12px; font-weight: 700; }.stars-row { margin-top: 13px; color: #64748b; font-size: 13px; font-weight: 700; }.stars-row button { padding: 1px; border: 0; background: transparent; color: #cbd5e1; font-size: 25px; }.stars-row button.active { color: #eab308; }.rate-field { margin-top: 12px; }.rate-input { position: relative; }.rate-input input { padding-right: 52px; }.rate-input b { position: absolute; top: 50%; right: 12px; transform: translateY(-50%); color: #64748b; text-transform: none; }.rate-footer { align-items: flex-start; margin-top: 8px; }.rate-footer small { color: #64748b; line-height: 1.35; }.rate-footer button { color: #0284c7; text-align: right; }.form-error { margin: 2px 0; padding: 12px; border: 1px solid #fecaca; border-radius: 11px; background: #fef2f2; color: #b91c1c; font-size: 13px; }.form-actions { display: flex; gap: 10px; margin-top: 8px; }.form-actions button, .full { flex: 1; min-height: 48px; border-radius: 12px; font-weight: 750; }.cancel-button { border: 1px solid #cbd5e1; background: white; color: #475569; }.save-button { border: 0; background: #0ea5e9; color: white; }.danger-button { border: 0; background: #ef4444; color: white; }.dialog-card { max-width: 340px; text-align: center; }.dialog-card p, .position-picker-card p { color: #64748b; line-height: 1.45; }.position-picker-card { width: min(390px, calc(100vw - 28px)); max-height: min(680px, calc(100vh - 40px)); overflow: auto; }.position-picker-list { margin-top: 14px; }.pairing-code { margin: 18px 0; color: #0369a1; font-size: 36px; font-weight: 800; letter-spacing: .16em; }.full { width: 100%; padding: 0 20px; }
.employment-summary { display: grid; gap: 5px; margin-top: 12px; padding: 12px; border-radius: 11px; background: #f0f9ff; color: #075985; font-size: 13px; }
.employment-summary span { line-height: 1.4; }
.employment-summary span b { color: #0c4a6e; }
.employment-summary small { margin-top: 3px; color: #64748b; line-height: 1.45; }
.monthly-rate-input input { padding-right: 82px; }
.account-access-card { display: grid; gap: 10px; margin-top: 16px; padding: 14px; border: 1px solid #dbeafe; border-radius: 13px; background: #f8fafc; }
.account-access-card > strong { color: #0f172a; }
.account-access-card > small { color: #64748b; line-height: 1.45; }
.activation-link-box { display: grid; gap: 9px; padding: 11px; border: 1px solid #bfdbfe; border-radius: 11px; background: #eff6ff; }
.activation-link-box input { color: #1e3a8a; background: #fff; font-size: 13px; }
.activation-link-box small { color: #475569; line-height: 1.45; }
.account-access-status { margin: 0; padding: 8px 10px; border-radius: 9px; color: #475569; background: #e2e8f0; font-size: 13px; font-weight: 700; }
.account-access-status.active { color: #047857; background: #d1fae5; }
.account-access-status.pending { color: #92400e; background: #fef3c7; }
.account-access-status.blocked { color: #b91c1c; background: #fee2e2; }
.invite-button, .block-access-button { min-height: 44px; padding: 10px 13px; border-radius: 10px; font-weight: 750; }
.invite-button { border: 1px solid #bae6fd; background: #e0f2fe; color: #0369a1; }
.block-access-button { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; }
.invite-button:disabled, .block-access-button:disabled { opacity: .55; }
.account-access-message { margin: 0; color: #475569; font-size: 13px; line-height: 1.45; }
.device-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.device-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px; border: 1px solid #dbeafe; border-radius: 11px; background: #fff; }
.device-card.disconnected { opacity: .58; }.device-card span { display: grid; min-width: 0; gap: 3px; }.device-card small { color: #64748b; font-size: 11px; line-height: 1.35; }.device-card button { flex: 0 0 auto; }
.invitation-dialog { position: relative; display: grid; width: min(390px, calc(100vw - 28px)); max-height: calc(100dvh - 32px); box-sizing: border-box; gap: 11px; overflow: auto; text-align: center; }
.invitation-dialog p, .invitation-dialog small { margin: 0; color: #64748b; line-height: 1.45; }.invitation-qr { width: min(256px, 75vw); height: auto; justify-self: center; border-radius: 12px; }.dialog-close { position: sticky; top: 0; z-index: 2; justify-self: end; width: 36px; height: 36px; margin-bottom: -38px; border: 0; border-radius: 50%; color: #fff; background: #ef4444; font-size: 24px; line-height: 1; }
.search-field input { color: #111827; caret-color: #0ea5e9; -webkit-text-fill-color: #111827; }
.search-field input::placeholder { color: #94a3b8; opacity: 1; -webkit-text-fill-color: #94a3b8; }
.accordion-card { overflow: hidden; scroll-margin-top: 14px; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
.accordion-card.open { border-color: #7dd3fc; background: #f0f9ff; box-shadow: 0 5px 18px rgba(14, 165, 233, .13); }
.accordion-card.open .accordion-toggle { background: #e8f7ff; }
.accordion-card.open .accordion-content { background: rgba(255, 255, 255, .8); }
@media (max-width: 380px) { .two-columns, .device-actions { grid-template-columns: 1fr; }.pin-row { grid-template-columns: 82px 44px minmax(0, 1fr); }.pin-row .pin-input { width: 82px; }.pin-row button { padding: 0 7px; font-size: 12px; } }
@media (min-width: 760px) { .employee-form, .employee-list, .team-toolbar { max-width: 720px; margin-right: auto; margin-left: auto; box-sizing: border-box; } }
</style>
