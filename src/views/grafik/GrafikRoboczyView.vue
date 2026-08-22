<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik/grafiki')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">GRAFIK ROBOCZY</h2>
    </div>

    <div class="scroll-area schedule-draft-scroll">
      <div v-if="isLoading" class="schedule-draft-state">
        Pobieranie grafiku...
      </div>

      <div v-else-if="loadError" class="schedule-draft-state error">
        {{ loadError }}
      </div>

      <template v-else-if="schedule">
        <section class="schedule-draft-header-card">
          <div class="schedule-draft-heading-row">
            <div>
              <div class="schedule-draft-kicker">WERSJA ROBOCZA</div>
              <h3>{{ schedule.name }}</h3>
              <p>
                {{ formatDate(schedule.dateFrom) }} –
                {{ formatDate(schedule.dateTo) }}
              </p>
            </div>

            <span class="schedule-draft-status">Roboczy</span>
          </div>

          <div class="schedule-draft-info">
            Grafik jest zapisany, ale nie jest jeszcze widoczny dla
            pracowników. Każdy dzień ma własny dokument w Firebase.
          </div>

          <div class="schedule-draft-summary">
            <div>
              <strong>{{ days.length }}</strong>
              <span>Zapisane dni</span>
            </div>
            <div>
              <strong>{{ schedule.vacanciesCount || 0 }}</strong>
              <span>Wszystkie wakaty</span>
            </div>
            <div>
              <strong>{{ schedule.assignedCount || 0 }}</strong>
              <span>Obsadzonych</span>
            </div>
            <div>
              <strong>{{ schedule.unfilledCount || 0 }}</strong>
              <span>Nieobsadzonych</span>
            </div>
          </div>
        </section>

        <section class="schedule-draft-next-card">
          <strong>Szkielet grafiku jest gotowy.</strong>
          <span>
            W kolejnym etapie ten widok zmienimy w tabelę pracowników i dni,
            a następnie dodamy ręczne przydzielanie oraz generator.
          </span>
        </section>

        <section class="schedule-draft-days">
          <article
            v-for="day in days"
            :key="day.id"
            class="schedule-draft-day"
          >
            <div class="schedule-draft-day-header">
              <div>
                <strong>{{ formatDateWithWeekday(day.date) }}</strong>
                <span>{{ day.demandModelNameSnapshot }}</span>
              </div>

              <span>
                {{ day.workingShifts?.length || 0 }}
                {{ formatVacancyWord(day.workingShifts?.length || 0) }}
              </span>
            </div>

            <div
              v-if="getShiftGroups(day).length > 0"
              class="schedule-draft-shifts"
            >
              <div
                v-for="group in getShiftGroups(day)"
                :key="group.id"
                class="schedule-draft-shift"
              >
                <div>
                  <strong>{{ group.positionName }}</strong>
                  <span>{{ group.from }}–{{ group.to }}</span>
                </div>

                <span class="schedule-draft-unfilled">
                  Nieobsadzone: {{ group.count }}
                </span>
              </div>
            </div>

            <div v-else class="schedule-draft-no-demand">
              Brak zapotrzebowania w tym dniu.
            </div>
          </article>
        </section>
      </template>

      <div v-else class="schedule-draft-state error">
        Nie znaleziono tego grafiku.
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScheduleDraftsStore } from '../../stores/scheduleDraftsStore.js'

const route = useRoute()
const router = useRouter()
const scheduleDraftsStore = useScheduleDraftsStore()
const isLoading = ref(false)
const loadError = ref('')

const schedule = computed(() => scheduleDraftsStore.currentSchedule)
const days = computed(() => scheduleDraftsStore.currentDays)

onMounted(async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const scheduleId = String(route.params.id || '')

    await Promise.all([
      scheduleDraftsStore.fetchSchedule(scheduleId),
      scheduleDraftsStore.fetchScheduleDays(scheduleId)
    ])
  } catch (error) {
    console.error('Błąd pobierania grafiku roboczego:', error)
    loadError.value =
      error?.message || 'Nie udało się pobrać grafiku roboczego.'
  } finally {
    isLoading.value = false
  }
})

const getDateFromKey = dateKey => {
  if (!dateKey) return null

  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatDate = dateKey => {
  const date = getDateFromKey(dateKey)

  if (!date) return 'Brak daty'

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

const formatDateWithWeekday = dateKey => {
  const date = getDateFromKey(dateKey)

  if (!date) return dateKey

  const value = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)

  return value.charAt(0).toUpperCase() + value.slice(1)
}

const formatVacancyWord = count => {
  if (count === 1) return 'wakat'

  const lastTwoDigits = count % 100
  const lastDigit = count % 10

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
  ) {
    return 'wakaty'
  }

  return 'wakatów'
}

const getShiftGroups = day => {
  const groups = new Map()
  const shifts = Array.isArray(day?.workingShifts)
    ? day.workingShifts
    : []

  shifts.forEach(shift => {
    const groupId = shift.shiftGroupId || shift.id

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        positionName:
          shift.positionNameSnapshot || 'Nieznane stanowisko',
        from: shift.from,
        to: shift.to,
        count: 0
      })
    }

    groups.get(groupId).count += 1
  })

  return [...groups.values()]
}
</script>

<style scoped>
.schedule-draft-scroll {
  padding-top: 4px;
}

.schedule-draft-header-card,
.schedule-draft-next-card,
.schedule-draft-days,
.schedule-draft-state {
  width: 100%;
  max-width: 840px;
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
}

.schedule-draft-header-card {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.schedule-draft-heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.schedule-draft-kicker {
  margin-bottom: 6px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.schedule-draft-heading-row h3 {
  margin: 0 0 5px;
  color: #111827;
  font-size: 23px;
}

.schedule-draft-heading-row p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
}

.schedule-draft-status {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  color: #1d4ed8;
  background: #dbeafe;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.schedule-draft-info {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 13px;
  color: #475569;
  background: #f1f5f9;
  font-size: 13px;
  line-height: 1.45;
}

.schedule-draft-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.schedule-draft-summary div {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 12px 8px;
  border-radius: 13px;
  background: #f8fafc;
  text-align: center;
}

.schedule-draft-summary strong {
  color: #111827;
  font-size: 20px;
}

.schedule-draft-summary span {
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.schedule-draft-next-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 14px;
  padding: 15px 17px;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  color: #166534;
  background: #f0fdf4;
  font-size: 13px;
  line-height: 1.45;
}

.schedule-draft-days {
  display: grid;
  gap: 11px;
  margin-top: 14px;
}

.schedule-draft-day {
  padding: 17px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
}

.schedule-draft-day-header,
.schedule-draft-shift {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.schedule-draft-day-header > div,
.schedule-draft-shift > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.schedule-draft-day-header strong {
  color: #111827;
  font-size: 15px;
}

.schedule-draft-day-header > div > span {
  color: #64748b;
  font-size: 12px;
}

.schedule-draft-day-header > span {
  flex: 0 0 auto;
  color: #475569;
  font-size: 12px;
  font-weight: 750;
}

.schedule-draft-shifts {
  display: grid;
  gap: 8px;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
}

.schedule-draft-shift {
  padding: 10px 11px;
  border-radius: 12px;
  background: #f8fafc;
}

.schedule-draft-shift strong {
  color: #1f2937;
  font-size: 13px;
}

.schedule-draft-shift > div > span {
  color: #64748b;
  font-size: 12px;
}

.schedule-draft-unfilled {
  flex: 0 0 auto;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 800;
}

.schedule-draft-no-demand {
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.schedule-draft-state {
  padding: 28px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  color: #64748b;
  background: #ffffff;
  text-align: center;
}

.schedule-draft-state.error {
  color: #b91c1c;
  background: #fff7f7;
}

@media (max-width: 620px) {
  .schedule-draft-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .schedule-draft-day-header,
  .schedule-draft-shift {
    align-items: flex-start;
  }
}
</style>
