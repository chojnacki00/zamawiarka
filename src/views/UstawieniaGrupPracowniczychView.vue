<template>
  <main class="screen-with-topbar groups-screen">
    <div class="zamawiarka-menu-topbar">
      <button class="zamawiarka-menu-back" type="button" @click="handleBack">←</button>
      <h2 class="zamawiarka-menu-title">GRUPY PRACOWNICZE</h2>
    </div>
    <div class="scroll-area groups-scroll">
      <template v-if="!isEditorOpen">
        <section class="intro-card">Grupy pracownicze pozwalają porządkować zespół, filtrować pracowników oraz w przyszłości kierować do wybranych grup grafiki, powiadomienia i dokumenty.</section>
        <button class="add-button" type="button" @click="openEditor()">＋ Dodaj grupę</button>
        <div v-if="groupsStore.isLoading || employeesStore.isLoading" class="empty-state">Pobieranie grup…</div>
        <div v-else-if="!groupsStore.groups.length" class="empty-state">Nie ma jeszcze grup pracowniczych.</div>
        <section v-else class="groups-list">
          <article v-for="group in groupsStore.groups" :key="group.id" class="group-card" :class="{ inactive: group.active === false }">
            <button class="group-main" type="button" @click="openEditor(group)">
              <strong>{{ group.name }}</strong>
              <span>{{ group.description || 'Bez opisu' }}</span>
              <small>{{ getGroupUsage(group.id) }} pracowników · {{ group.active === false ? 'nieaktywna' : 'aktywna' }}</small>
            </button>
            <div class="group-actions">
              <button type="button" @click="toggleActive(group)">{{ group.active === false ? 'Aktywuj' : 'Dezaktywuj' }}</button>
              <button class="danger" type="button" :disabled="getGroupUsage(group.id) > 0" @click="confirmDelete(group)">Usuń</button>
            </div>
          </article>
        </section>
      </template>

      <form v-else class="editor-card floating-actions-content" @submit.prevent="saveGroup">
        <div class="editor-heading"><span>GRUPA PRACOWNICZA</span><h3>{{ form.id ? 'Edytuj grupę' : 'Nowa grupa' }}</h3></div>
        <label class="form-field"><span>Nazwa grupy *</span><div class="locked-placeholder group-placeholder" :class="{ filled: form.name }"><input v-model="form.name" class="notranslate" type="text" autocomplete="off" translate="no" aria-label="Nazwa grupy"></div></label>
        <label class="form-field"><span>Opis</span><textarea v-model="form.description" rows="4" placeholder="Opcjonalny opis grupy"></textarea></label>
        <label class="form-field"><span>Kolejność wyświetlania</span><input v-model.number="form.displayOrder" type="number" min="1" step="1" inputmode="numeric"></label>
        <label class="switch-row"><span><strong>Grupa aktywna</strong><small>Nieaktywnej grupy nie przypiszesz nowym pracownikom.</small></span><input v-model="form.active" type="checkbox"></label>
        <div class="form-actions floating-form-actions"><button class="cancel floating-form-action" type="button" aria-label="Anuluj" title="Anuluj" @click="closeEditor">×</button><button class="save floating-form-action" type="submit" aria-label="Zapisz" title="Zapisz" :disabled="!form.name.trim() || isSaving">{{ isSaving ? '…' : '✓' }}</button></div>
      </form>
    </div>
    <div v-if="groupToDelete" class="app-dialog-overlay">
      <div class="app-dialog-card confirm-card"><div class="app-dialog-title">Usunąć grupę?</div><p>{{ groupToDelete.name }}</p><div class="form-actions"><button class="cancel" type="button" @click="groupToDelete = null">Anuluj</button><button class="danger" type="button" @click="executeDelete">Usuń</button></div></div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeGroupsStore } from '../stores/employeeGroupsStore.js'
import { useEmployeesStore } from '../stores/employeesStore.js'

const router = useRouter()
const groupsStore = useEmployeeGroupsStore()
const employeesStore = useEmployeesStore()
const isEditorOpen = ref(false)
const isSaving = ref(false)
const groupToDelete = ref(null)
const createEmptyForm = () => ({ id: null, name: '', description: '', active: true, displayOrder: groupsStore.groups.length + 1 })
const form = ref(createEmptyForm())

onMounted(async () => { await Promise.all([groupsStore.fetchGroups(), employeesStore.fetchEmployees()]) })
const getGroupUsage = groupId => employeesStore.employees.filter(employee => employee.employeeGroupIds?.includes(groupId)).length
const handleBack = () => { if (isEditorOpen.value) closeEditor(); else router.push('/ustawienia') }
const openEditor = (group = null) => { form.value = group ? { ...group } : createEmptyForm(); isEditorOpen.value = true }
const closeEditor = () => { isEditorOpen.value = false; form.value = createEmptyForm() }
const saveGroup = async () => {
  if (!form.value.name.trim() || isSaving.value) return
  isSaving.value = true
  try { await groupsStore.saveGroup(form.value); closeEditor() }
  catch (error) { alert('Nie udało się zapisać grupy.') }
  finally { isSaving.value = false }
}
const toggleActive = async group => {
  try { await groupsStore.saveGroup({ ...group, active: group.active === false }) }
  catch (error) { alert('Nie udało się zmienić aktywności grupy.') }
}
const confirmDelete = group => { if (getGroupUsage(group.id) === 0) groupToDelete.value = group }
const executeDelete = async () => {
  if (!groupToDelete.value) return
  try { await groupsStore.deleteGroup(groupToDelete.value.id); groupToDelete.value = null }
  catch (error) { alert('Nie udało się usunąć grupy.') }
}
</script>

<style scoped>
.groups-scroll { padding: 18px; }
.intro-card { margin-bottom: 14px; padding: 16px; border: 1px solid #bae6fd; border-radius: 15px; background: #f0f9ff; color: #075985; font-size: 14px; line-height: 1.55; }
.add-button { width: 100%; margin-bottom: 20px; padding: 15px; border: 1px solid #bae6fd; border-radius: 14px; background: #e0f2fe; color: #0369a1; font-size: 16px; font-weight: 700; }
.empty-state { padding: 32px 16px; color: #9ca3af; text-align: center; }
.groups-list { display: grid; gap: 12px; }
.group-card, .editor-card { padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; background: white; box-shadow: 0 4px 15px rgba(15, 23, 42, .05); }
.group-card.inactive { opacity: .62; }
.group-main { display: grid; width: 100%; gap: 5px; padding: 0; border: 0; background: transparent; text-align: left; }
.group-main strong { color: #111827; font-size: 17px; }.group-main span { color: #6b7280; font-size: 14px; }.group-main small { color: #0284c7; font-weight: 700; }
.group-actions, .form-actions { display: flex; gap: 10px; margin-top: 16px; }
.group-actions button, .form-actions button { flex: 1; min-height: 42px; border: 1px solid #d1d5db; border-radius: 11px; background: white; color: #374151; font-weight: 700; }
.group-actions .danger, .form-actions .danger { border-color: #fecaca; background: #fef2f2; color: #dc2626; }.group-actions button:disabled { opacity: .4; }
.editor-heading span { color: #0ea5e9; font-size: 11px; font-weight: 800; letter-spacing: .08em; }.editor-heading h3 { margin: 5px 0 22px; font-size: 22px; }
.form-field { display: grid; gap: 7px; margin-bottom: 18px; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.form-field input, .form-field textarea { width: 100%; box-sizing: border-box; padding: 13px; border: 1px solid #d1d5db; border-radius: 11px; color: #111827; background: #fff; caret-color: #0ea5e9; font: inherit; font-size: 16px; text-transform: none; -webkit-text-fill-color: #111827; }
.form-field input:focus, .form-field textarea:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, .18); }
.form-field input::placeholder, .form-field textarea::placeholder { color: #9ca3af; opacity: 1; -webkit-text-fill-color: #9ca3af; }
.locked-placeholder { position: relative; border-radius: 11px; background: #fff; }.locked-placeholder input { position: relative; z-index: 1; background: transparent; }.locked-placeholder::after { position: absolute; z-index: 2; top: 50%; left: 13px; transform: translateY(-50%); color: #9ca3af; font-size: 16px; font-weight: 400; text-transform: none; pointer-events: none; }.group-placeholder::after { content: "Np. Kuchnia"; }.locked-placeholder.filled::after { display: none; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px; border-radius: 12px; background: #f9fafb; }.switch-row span { display: grid; gap: 4px; }.switch-row small { color: #6b7280; line-height: 1.35; }.switch-row input { width: 22px; height: 22px; accent-color: #0ea5e9; }
.form-actions .save { border: 0; background: #0ea5e9; color: white; }.form-actions .save:disabled { opacity: .45; }.confirm-card { max-width: 340px; }.confirm-card p { color: #6b7280; text-align: center; }
@media (min-width: 700px) { .groups-scroll { max-width: 680px; margin: 0 auto; } }
</style>
