<template>
  <main class="screen-with-topbar positions-screen">
    <div class="zamawiarka-menu-topbar">
      <button class="zamawiarka-menu-back" type="button" @click="handleBack">←</button>
      <h2 class="zamawiarka-menu-title">STANOWISKA</h2>
    </div>

    <div class="scroll-area positions-scroll">
      <template v-if="!isFormOpen">
        <button class="primary-card-button" type="button" @click="openForm()">＋ Dodaj stanowisko</button>
        <p class="screen-copy">Domyślna stawka stanowiska jest używana przez pracownika, dopóki nie ustawisz mu stawki indywidualnej.</p>

        <div v-if="positionsStore.isLoading || employeesStore.isLoading" class="empty-state">Pobieranie stanowisk…</div>
        <div v-else-if="!positionsStore.positions.length" class="empty-state">Nie ma jeszcze stanowisk.</div>

        <section v-else class="positions-list">
          <article v-for="position in positionsStore.positions" :key="position.id" class="position-card" :class="{ inactive: position.active === false }">
            <button class="position-main" type="button" @click="openForm(position)">
              <span class="position-title-row">
                <i
                  class="position-list-color"
                  :style="{ backgroundColor: getPositionListColor(position) }"
                  aria-hidden="true"
                ></i>
                <span class="position-name">{{ position.nazwa }}</span>
              </span>
              <span class="position-rate">{{ formatRate(position.defaultHourlyRate) }}</span>
              <small>{{ position.active === false ? 'Nieaktywne' : 'Aktywne' }}</small>
            </button>
            <div class="position-actions">
              <button class="secondary-action" type="button" @click="toggleActive(position)">{{ position.active === false ? 'Aktywuj' : 'Dezaktywuj' }}</button>
              <button class="danger-action" type="button" :disabled="isPositionUsed(position.id)" :title="isPositionUsed(position.id) ? 'Stanowisko jest przypisane do pracownika' : 'Usuń stanowisko'" @click="confirmDelete(position)">Usuń</button>
            </div>
          </article>
        </section>
      </template>

      <form v-else class="editor-card floating-actions-content" @submit.prevent="savePosition">
        <div class="editor-heading">
          <span>USTAWIENIA STANOWISKA</span>
          <h3>{{ editingPositionId ? 'Edytuj stanowisko' : 'Nowe stanowisko' }}</h3>
        </div>
        <label class="form-field">
          <span>Nazwa stanowiska *</span>
          <div class="locked-placeholder position-placeholder" :class="{ filled: form.nazwa }"><input v-model="form.nazwa" class="notranslate position-name-input" type="text" autocomplete="off" translate="no" aria-label="Nazwa stanowiska"></div>
        </label>
        <label class="form-field">
          <span>Domyślna stawka godzinowa *</span>
          <div class="input-suffix">
            <input v-model.number="form.defaultHourlyRate" type="number" min="0" step="0.01" inputmode="decimal">
            <b>zł/h</b>
          </div>
        </label>
        <div class="form-field schedule-color-field">
          <span>Kolor w opublikowanym grafiku</span>
          <button
            class="schedule-color-trigger"
            type="button"
            :aria-expanded="isColorPaletteOpen"
            @click="isColorPaletteOpen = !isColorPaletteOpen"
          >
            <span
              class="schedule-color-swatch"
              :class="{ neutral: !selectedColorOption.value }"
              :style="selectedColorOption.value
                ? { backgroundColor: selectedColorOption.value }
                : {}"
            >{{ selectedColorOption.value ? '' : '—' }}</span>
            <strong>{{ selectedColorOption.label }}</strong>
            <span class="schedule-color-chevron">⌄</span>
          </button>
          <div
            v-if="isColorPaletteOpen"
            class="schedule-color-palette"
            role="listbox"
            aria-label="Kolor w opublikowanym grafiku"
          >
            <button
              v-for="colorOption in SCHEDULE_POSITION_COLOR_PALETTE"
              :key="colorOption.value || 'default'"
              class="schedule-color-option"
              :class="{ selected: form.scheduleColor === colorOption.value }"
              type="button"
              role="option"
              :aria-selected="form.scheduleColor === colorOption.value"
              @click="selectScheduleColor(colorOption.value)"
            >
              <span
                class="schedule-color-swatch"
                :class="{ neutral: !colorOption.value }"
                :style="colorOption.value
                  ? { backgroundColor: colorOption.value }
                  : {}"
              >{{ colorOption.value ? '' : '—' }}</span>
              <span>{{ colorOption.label }}</span>
              <b v-if="form.scheduleColor === colorOption.value">✓</b>
            </button>
          </div>
        </div>
        <label class="switch-row">
          <span><strong>Stanowisko aktywne</strong><small>Nieaktywnego stanowiska nie można przypisywać w nowych miejscach.</small></span>
          <input v-model="form.active" type="checkbox">
        </label>
        <div class="form-actions floating-form-actions">
          <button class="cancel-button floating-form-action cancel" type="button" aria-label="Anuluj" title="Anuluj" @click="cancelForm">×</button>
          <button class="save-button floating-form-action save" type="submit" aria-label="Zapisz" title="Zapisz" :disabled="!isFormValid || isSaving">{{ isSaving ? '…' : '✓' }}</button>
        </div>
      </form>
    </div>

    <div v-if="positionToDelete" class="app-dialog-overlay">
      <div class="app-dialog-card confirm-card">
        <div class="app-dialog-title">Usunąć stanowisko?</div>
        <p>{{ positionToDelete.nazwa }}</p>
        <div class="form-actions">
          <button class="cancel-button" type="button" @click="positionToDelete = null">Anuluj</button>
          <button class="delete-button" type="button" :disabled="isSaving" @click="executeDelete">Usuń</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSchedulePositionsStore } from '../stores/schedulePositionsStore.js'
import { useEmployeesStore } from '../stores/employeesStore.js'
import { useScheduleDemandModelsStore } from '../stores/scheduleDemandModelsStore.js'
import {
  SCHEDULE_POSITION_COLOR_PALETTE,
  getSchedulePositionColorOption,
  normalizeSchedulePositionColor
} from '../utils/schedulePositionColors.js'

const router = useRouter()
const positionsStore = useSchedulePositionsStore()
const employeesStore = useEmployeesStore()
const demandModelsStore = useScheduleDemandModelsStore()
const isFormOpen = ref(false)
const editingPositionId = ref(null)
const isSaving = ref(false)
const positionToDelete = ref(null)
const isColorPaletteOpen = ref(false)
const form = ref({
  nazwa: '',
  defaultHourlyRate: 0,
  scheduleColor: null,
  active: true,
  displayOrder: 1
})

const isFormValid = computed(() => form.value.nazwa.trim().length > 0 && Number.isFinite(Number(form.value.defaultHourlyRate)) && Number(form.value.defaultHourlyRate) >= 0)
const selectedColorOption = computed(() => (
  getSchedulePositionColorOption(form.value.scheduleColor)
))

onMounted(async () => {
  await Promise.all([positionsStore.fetchPositions(), employeesStore.fetchEmployees(), demandModelsStore.fetchModels()])
})

const formatRate = value => `${Number(value || 0).toFixed(2).replace('.', ',')} zł/h`
const getPositionListColor = position => (
  getSchedulePositionColorOption(position?.scheduleColor).value ||
  getSchedulePositionColorOption('#E5E7EB').value
)
const isPositionUsed = positionId => (
  employeesStore.employees.some(employee => employee.positionAssignments?.some(assignment => assignment.positionId === positionId))
  || demandModelsStore.models.some(model => Object.values(model.days || {}).some(vacancies => (
    (Array.isArray(vacancies) ? vacancies : []).some(vacancy => vacancy?.positionId === positionId)
  )))
)

const handleBack = () => {
  if (isFormOpen.value) cancelForm()
  else router.push('/ustawienia')
}

const openForm = (position = null) => {
  editingPositionId.value = position?.id || null
  form.value = position
    ? {
        nazwa: position.nazwa || '',
        defaultHourlyRate: Number(position.defaultHourlyRate) || 0,
        scheduleColor: normalizeSchedulePositionColor(
          position.scheduleColor
        ),
        active: position.active !== false,
        displayOrder: Number(position.displayOrder) || 1
      }
    : {
        nazwa: '',
        defaultHourlyRate: 0,
        scheduleColor: null,
        active: true,
        displayOrder: positionsStore.positions.length + 1
      }
  isColorPaletteOpen.value = false
  isFormOpen.value = true
}

const cancelForm = () => {
  isFormOpen.value = false
  editingPositionId.value = null
  isColorPaletteOpen.value = false
}

const selectScheduleColor = value => {
  form.value.scheduleColor = normalizeSchedulePositionColor(value)
  isColorPaletteOpen.value = false
}

const savePosition = async () => {
  if (!isFormValid.value || isSaving.value) return
  isSaving.value = true
  try {
    if (editingPositionId.value) await positionsStore.updatePosition(editingPositionId.value, form.value)
    else await positionsStore.addPosition(form.value)
    cancelForm()
  } catch (error) {
    alert('Nie udało się zapisać stanowiska.')
  } finally {
    isSaving.value = false
  }
}

const toggleActive = async position => {
  try {
    await positionsStore.setPositionActive(position.id, position.active === false)
  } catch (error) {
    alert('Nie udało się zmienić aktywności stanowiska.')
  }
}

const confirmDelete = position => {
  if (!isPositionUsed(position.id)) positionToDelete.value = position
}

const executeDelete = async () => {
  if (!positionToDelete.value || isSaving.value) return
  isSaving.value = true
  try {
    await positionsStore.deletePosition(positionToDelete.value.id)
    positionToDelete.value = null
  } catch (error) {
    alert('Nie udało się usunąć stanowiska.')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.positions-scroll { padding: 18px; }
.primary-card-button { width: 100%; padding: 15px; border: 1px solid #bae6fd; border-radius: 14px; background: #e0f2fe; color: #0369a1; font-size: 16px; font-weight: 700; }
.screen-copy { margin: 14px 2px 20px; color: #6b7280; font-size: 13px; line-height: 1.5; }
.empty-state { padding: 32px 16px; color: #9ca3af; text-align: center; }
.positions-list { display: grid; gap: 12px; }
.position-card, .editor-card { padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; background: white; box-shadow: 0 4px 15px rgba(15, 23, 42, .05); }
.position-card.inactive { opacity: .62; }
.position-main { width: 100%; padding: 0; border: 0; background: transparent; text-align: left; }
.position-title-row { display: flex; min-width: 0; align-items: center; gap: 9px; }
.position-list-color { display: block; width: 13px; height: 13px; flex: 0 0 13px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #cbd5e1; }
.position-name { display: block; color: #111827; font-size: 17px; font-weight: 700; }
.position-rate { display: block; margin-top: 5px; color: #0369a1; font-size: 14px; font-weight: 700; }
.position-main small { display: block; margin-top: 4px; color: #6b7280; }
.position-actions, .form-actions { display: flex; gap: 10px; margin-top: 16px; }
.position-actions button, .form-actions button { flex: 1; min-height: 42px; border-radius: 11px; font-weight: 700; }
.secondary-action, .cancel-button { border: 1px solid #d1d5db; background: white; color: #374151; }
.danger-action, .delete-button { border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; }
.danger-action:disabled { opacity: .4; }
.editor-heading span { color: #0ea5e9; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.editor-heading h3 { margin: 5px 0 22px; font-size: 22px; }
.form-field { display: grid; gap: 7px; margin-bottom: 18px; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.form-field input { width: 100%; box-sizing: border-box; padding: 13px; border: 1px solid #d1d5db; border-radius: 11px; font-size: 16px; }
.locked-placeholder { position: relative; border-radius: 11px; background: #fff; }.locked-placeholder input { position: relative; z-index: 1; background: transparent; }.locked-placeholder::after { position: absolute; z-index: 2; top: 50%; left: 13px; transform: translateY(-50%); color: #9ca3af; font-size: 16px; font-weight: 400; text-transform: none; pointer-events: none; }.position-placeholder::after { content: "Np. Pizzer"; }.locked-placeholder.filled::after { display: none; }
.position-name-input { color: #111827; caret-color: #0ea5e9; -webkit-text-fill-color: #111827; }
.position-name-input:focus { border-color: #38bdf8; outline: none; box-shadow: 0 0 0 3px rgba(14, 165, 233, .14); }
.position-placeholder:focus-within::after { color: #94a3b8; }
.input-suffix { position: relative; }
.input-suffix input { padding-right: 58px; }
.input-suffix b { position: absolute; top: 50%; right: 13px; transform: translateY(-50%); color: #6b7280; font-size: 13px; text-transform: none; }
.schedule-color-field { position: relative; }
.schedule-color-trigger { display: grid; width: 100%; min-height: 52px; padding: 7px 12px; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 10px; border: 1px solid #d1d5db; border-radius: 12px; color: #334155; background: #fff; text-align: left; }
.schedule-color-trigger strong { font-size: 15px; }
.schedule-color-chevron { color: #94a3b8; font-size: 20px; }
.schedule-color-swatch { display: inline-grid; width: 34px; height: 34px; box-sizing: border-box; place-items: center; border: 2px solid rgba(255,255,255,.9); border-radius: 50%; box-shadow: 0 0 0 1px #cbd5e1, 0 2px 5px rgba(15,23,42,.12); color: #64748b; font-size: 18px; font-weight: 800; }
.schedule-color-swatch.neutral { background: #f8fafc; }
.schedule-color-palette { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 3px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; box-shadow: 0 10px 24px rgba(15,23,42,.09); }
.schedule-color-option { display: grid; min-width: 0; min-height: 50px; padding: 7px 9px; grid-template-columns: 34px minmax(0, 1fr) 18px; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 11px; color: #475569; background: #fff; text-align: left; }
.schedule-color-option.selected { border-color: #38bdf8; color: #0369a1; background: #f0f9ff; }
.schedule-color-option > span:nth-child(2) { overflow: hidden; font-size: 12px; font-weight: 750; text-overflow: ellipsis; text-transform: none; white-space: nowrap; }
.schedule-color-option b { color: #0284c7; font-size: 15px; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px; border-radius: 12px; background: #f9fafb; }
.switch-row span { display: grid; gap: 4px; }
.switch-row small { color: #6b7280; line-height: 1.35; }
.switch-row input { width: 22px; height: 22px; accent-color: #0ea5e9; }
.save-button { border: 0; background: #0ea5e9; color: white; }
.save-button:disabled { opacity: .45; }
.confirm-card { max-width: 340px; }
.confirm-card p { color: #6b7280; text-align: center; }
@media (max-width: 380px) { .schedule-color-palette { grid-template-columns: 1fr; } }
@media (min-width: 700px) { .positions-scroll { max-width: 680px; margin: 0 auto; } }
</style>
