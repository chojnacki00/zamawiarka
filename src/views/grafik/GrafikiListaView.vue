<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">GRAFIKI</h2>
    </div>

    <div class="scroll-area schedule-list-scroll">
      <section class="schedule-list-header-card">
        <div>
          <h3>Grafiki nieopublikowane i opublikowane</h3>
          <p>
            Tutaj wrócisz do rozpoczętej pracy. Nieopublikowane grafiki nie są
            dostępne dla pracowników.
          </p>
        </div>

        <button
          class="schedule-list-create-button"
          type="button"
          @click="router.push('/grafik/tworzenie')"
        >
          + Utwórz grafik
        </button>
      </section>

      <div v-if="isLoading" class="schedule-list-state">
        Pobieranie grafików...
      </div>

      <div v-else-if="loadError" class="schedule-list-state error">
        {{ loadError }}
      </div>

      <div
        v-else-if="scheduleDraftsStore.schedules.length === 0"
        class="schedule-list-empty"
      >
        <div class="schedule-list-empty-icon">▦</div>
        <strong>Nie ma jeszcze zapisanych grafików</strong>
        <span>
          Utwórz pierwszy grafik dla wybranego zakresu dat.
        </span>
      </div>

      <div v-else class="schedule-list-items">
        <article
          v-for="schedule in scheduleDraftsStore.schedules"
          :key="schedule.id"
          class="schedule-list-item"
        >
          <button
            class="schedule-list-open-area"
            type="button"
            @click="openSchedule(schedule.id)"
          >
            <div class="schedule-list-item-top">
              <div class="schedule-list-item-name">
                {{ schedule.name || 'Grafik bez nazwy' }}
              </div>

              <span
                class="schedule-list-status"
                :class="getStatusClass(schedule)"
              >
                {{ getStatusLabel(schedule) }}
              </span>
            </div>

            <div class="schedule-list-range">
              {{ formatDate(schedule.dateFrom) }} –
              {{ formatDate(schedule.dateTo) }}
            </div>

            <div class="schedule-list-counts">
              <span>{{ schedule.daysCount || 0 }} dni</span>
              <span>{{ schedule.assignedCount || 0 }} obsadzonych</span>
              <span
                :class="{
                  'unfilled-alert': Number(schedule.unfilledCount) > 0
                }"
              >
                {{ schedule.unfilledCount || 0 }} nieobsadzonych
              </span>
            </div>
          </button>

          <div class="schedule-list-item-bottom">
            <span>
              Ostatni zapis: {{ formatUpdatedAt(schedule.updatedAt) }}
            </span>
            <div class="schedule-list-actions">
              <button
                v-if="canDeleteSchedule(schedule)"
                class="schedule-list-delete-button"
                type="button"
                @click="openDeleteConfirm(schedule)"
              >
                Usuń
              </button>
              <button
                class="schedule-list-open-button"
                type="button"
                @click="openSchedule(schedule.id)"
              >
                Otwórz ›
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div
      v-if="scheduleToDelete"
      class="app-dialog-overlay schedule-delete-overlay"
      @click.self="closeDeleteConfirm"
    >
      <div class="app-dialog-card schedule-delete-dialog">
        <div class="app-dialog-icon schedule-delete-icon">−</div>
        <div class="app-dialog-title">Usunąć grafik?</div>
        <div class="app-dialog-message">
          Grafik „{{ scheduleToDelete.name || 'Grafik bez nazwy' }}” oraz
          wszystkie jego dni zostaną trwale usunięte.
        </div>
        <div v-if="deleteError" class="schedule-delete-error">
          {{ deleteError }}
        </div>
        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            :disabled="isDeleting"
            @click="closeDeleteConfirm"
          >
            Anuluj
          </button>
          <button
            class="app-dialog-button app-dialog-delete"
            type="button"
            :disabled="isDeleting"
            @click="confirmDeleteSchedule"
          >
            {{ isDeleting ? 'Usuwanie...' : 'Usuń' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useScheduleDraftsStore } from '../../stores/scheduleDraftsStore.js'
import { canDeleteUnpublishedSchedule } from '../../utils/scheduleStructure.js'

const router = useRouter()
const scheduleDraftsStore = useScheduleDraftsStore()
const isLoading = ref(false)
const loadError = ref('')
const scheduleToDelete = ref(null)
const isDeleting = ref(false)
const deleteError = ref('')

onMounted(async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    await scheduleDraftsStore.fetchSchedules()
  } catch (error) {
    console.error('Błąd pobierania listy grafików:', error)
    loadError.value =
      error?.message || 'Nie udało się pobrać zapisanych grafików.'
  } finally {
    isLoading.value = false
  }
})

const openSchedule = scheduleId => {
  router.push(`/grafik/grafiki/${scheduleId}`)
}

const canDeleteSchedule = schedule => {
  return canDeleteUnpublishedSchedule(schedule)
}

const openDeleteConfirm = schedule => {
  scheduleToDelete.value = schedule
  deleteError.value = ''
}

const closeDeleteConfirm = () => {
  if (isDeleting.value) return

  scheduleToDelete.value = null
  deleteError.value = ''
}

const confirmDeleteSchedule = async () => {
  if (!scheduleToDelete.value || isDeleting.value) return

  isDeleting.value = true
  deleteError.value = ''

  try {
    await scheduleDraftsStore.deleteSchedule(
      scheduleToDelete.value.id
    )
    scheduleToDelete.value = null
  } catch (error) {
    console.error('Błąd usuwania grafiku:', error)
    deleteError.value =
      error?.message || 'Nie udało się usunąć grafiku.'
  } finally {
    isDeleting.value = false
  }
}

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

const formatUpdatedAt = timestamp => {
  const date = timestamp?.toDate?.()

  if (!date) return 'przed chwilą'

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getStatusLabel = schedule => {
  if (schedule?.publicationStatus === 'partially_published') {
    return `Częściowo opublikowany do ${formatDate(
      schedule.publishedUntil
    )}`
  }

  if (schedule?.publicationStatus === 'published') return 'Opublikowany'
  return 'Nieopublikowany'
}

const getStatusClass = schedule => {
  if (schedule?.publicationStatus === 'partially_published') {
    return 'partially-published'
  }

  if (schedule?.publicationStatus === 'published') return 'published'
  return 'unpublished'
}
</script>

<style scoped>
.schedule-list-scroll {
  padding-top: 4px;
}

.schedule-list-header-card,
.schedule-list-items,
.schedule-list-empty,
.schedule-list-state {
  width: 100%;
  max-width: 840px;
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
}

.schedule-list-header-card {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.schedule-list-kicker {
  margin-bottom: 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.schedule-list-header-card h3 {
  margin: 0 0 7px;
  color: #111827;
  font-size: 22px;
}

.schedule-list-header-card p {
  max-width: 560px;
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.45;
}

.schedule-list-create-button {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 17px;
  border: 0;
  border-radius: 14px;
  color: #ffffff;
  background: #0f766e;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.schedule-list-items {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.schedule-list-item {
  width: 100%;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 19px;
  color: inherit;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
  text-align: left;
  cursor: pointer;
}

.schedule-list-item:active {
  transform: scale(0.992);
}

.schedule-list-item-top,
.schedule-list-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.schedule-list-item-name {
  color: #111827;
  font-size: 17px;
  font-weight: 850;
}

.schedule-list-status {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.schedule-list-status.unpublished {
  color: #1d4ed8;
  background: #dbeafe;
}

.schedule-list-status.published {
  color: #166534;
  background: #dcfce7;
}

.schedule-list-status.partially-published {
  color: #92400e;
  background: #fef3c7;
  text-transform: none;
}

.schedule-list-range {
  margin-top: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 650;
}

.schedule-list-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 13px;
}

.schedule-list-counts span {
  padding: 5px 8px;
  border-radius: 9px;
  color: #475569;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 700;
}

.schedule-list-item-bottom {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
  color: #64748b;
  font-size: 12px;
}

.schedule-list-item-bottom strong {
  color: #0f766e;
  font-size: 13px;
}

.schedule-list-state,
.schedule-list-empty {
  margin-top: 16px;
  padding: 28px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  color: #64748b;
  background: #ffffff;
  text-align: center;
}

.schedule-list-state.error {
  color: #b91c1c;
  background: #fff7f7;
}

.schedule-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.schedule-list-empty-icon {
  color: #0f766e;
  font-size: 34px;
}

.schedule-list-empty strong {
  color: #111827;
  font-size: 17px;
}

.schedule-list-empty span {
  max-width: 430px;
  font-size: 14px;
  line-height: 1.45;
}

.schedule-list-item {
  padding: 0;
  overflow: hidden;
  cursor: default;
}

.schedule-list-open-area {
  width: 100%;
  padding: 18px 18px 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.schedule-list-counts span.unfilled-alert {
  color: #b91c1c;
  background: #fee2e2;
}

.schedule-list-item-bottom {
  margin: 15px 18px 0;
  padding: 12px 0 15px;
}

.schedule-list-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.schedule-list-actions button {
  min-height: 35px;
  padding: 0 11px;
  border: 0;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.schedule-list-delete-button {
  color: #b91c1c;
  background: #fee2e2;
}

.schedule-list-open-button {
  color: #0f766e;
  background: #ccfbf1;
}

.schedule-delete-overlay {
  z-index: 4000;
}

.schedule-delete-dialog {
  width: min(92vw, 430px);
}

.schedule-delete-icon {
  color: #ffffff;
  background: #ef4444;
}

.schedule-delete-error {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 11px;
  color: #b91c1c;
  background: #fee2e2;
  font-size: 12px;
  font-weight: 750;
}

@media (max-width: 620px) {
  .schedule-list-header-card {
    align-items: stretch;
    flex-direction: column;
  }

  .schedule-list-create-button {
    width: 100%;
  }

  .schedule-list-item-top {
    align-items: flex-start;
  }

  .schedule-list-item-bottom {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .schedule-list-actions {
    width: 100%;
  }

  .schedule-list-actions button {
    flex: 1;
  }
}
</style>
