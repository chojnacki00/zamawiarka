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

      <h2 class="zamawiarka-menu-title">
        MODELE ZAPOTRZEBOWANIA
      </h2>
    </div>

    <div class="scroll-area">
  <div
    v-if="scheduleDemandModelsStore.isLoading"
    class="schedule-loading"
  >
    Pobieranie szablonów...
  </div>

  <div
    v-else-if="models.length === 0"
    class="empty-state"
  >
        <div class="empty-title">
          Brak modeli zapotrzebowania
        </div>

        <div class="empty-subtitle">
          Kliknij +, aby utworzyć pierwszy model
        </div>
      </div>

      <div
        v-else
        style="display:flex; flex-direction:column; gap:12px;"
      >
        <div
  v-for="model in models"
  :key="model.id"
  class="app-list-row app-list-row-with-action"
>
  <button
    class="app-list-row-open"
    type="button"
    @click="openModel(model.id)"
  >
    <div class="app-list-row-main">
      <div class="app-list-row-title">
        {{ model.name }}
      </div>

      <div class="app-list-row-subtitle">
        {{ getVacanciesLabel(model) }}
      </div>
    </div>

    <div class="app-list-row-arrow">
      ›
    </div>
  </button>

  <button
    class="app-list-row-delete"
    type="button"
    title="Usuń szablon"
    aria-label="Usuń szablon"
    @click.stop="openDeleteModal(model)"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  </button>
</div>
      </div>
    </div>

    <button
      class="fab-add-button"
      type="button"
      aria-label="Dodaj model"
      @click="showCreateModal = true"
    >
      +
    </button>

        <div
      v-if="showCreateModal"
      class="app-dialog-overlay"
      @click.self="closeCreateModal"
    >
      <div class="app-dialog-card grafik-create-dialog">
        <div class="app-dialog-icon">
          +
        </div>

        <div class="app-dialog-title">
         Dodaj szablon grafiku
        </div>

        <div class="app-dialog-message">
         Wybierz sposób utworzenia szablonu.
        </div>

        <div class="grafik-create-options">
  <button
    class="app-list-row"
    type="button"
    @click="createFromScratch"
  >
    <div class="app-list-row-main">
      <div class="app-list-row-title">
        Utwórz pusty szablon
      </div>

      <div class="app-list-row-subtitle">
        Zacznij od pustego tygodnia
      </div>
    </div>

    <div class="app-list-row-arrow">
      ›
    </div>
  </button>

  <button
    class="app-list-row"
    type="button"
    @click="copyExisting"
  >
    <div class="app-list-row-main">
      <div class="app-list-row-title">
        Powiel istniejący szablon
      </div>

      <div class="app-list-row-subtitle">
        Utwórz nowy szablon z zachowaniem ustawień istniejącego
      </div>
    </div>

    <div class="app-list-row-arrow">
      ›
    </div>
  </button>
</div>

        <div class="app-dialog-actions grafik-create-actions">
          <button
            class="app-dialog-button app-dialog-cancel"
            type="button"
            @click="closeCreateModal"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>



    <div
      v-if="showNameModal"
       class="app-dialog-overlay"
        @click.self="closeNameModal"
        >
       <div class="app-dialog-card grafik-name-dialog">
        <div class="app-dialog-icon">
      ✏️
        </div>

          <div class="app-dialog-title">
      Nazwij szablon
       </div>

        <div class="app-dialog-message">
      Wpisz nazwę, która pozwoli łatwo rozpoznać ten układ grafiku.
       </div>

       <div class="supplier-form-group">
      <input
        v-model="newTemplateName"
        type="text"
        class="supplier-form-input"
        placeholder="N.p. Zima, Lato, Wakacje"
        maxlength="60"
        autofocus
        @keydown.enter.prevent="confirmTemplateName"
      />
    </div>

    <div class="app-dialog-actions">
      <button
        class="app-dialog-button app-dialog-cancel"
        type="button"
        @click="closeNameModal"
      >
        Anuluj
      </button>

      <button
        class="app-dialog-button app-dialog-ok"
        type="button"
        :disabled="!newTemplateName.trim()"
        @click="confirmTemplateName"
      >
        Dalej
      </button>
    </div>
  </div>
</div>



<div
  v-if="showDeleteModal"
  class="app-dialog-overlay"
  @click.self="closeDeleteModal"
>
  <div class="app-dialog-card">
    <div class="app-dialog-icon schedule-delete-dialog-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
    </div>

    <div class="app-dialog-title">
      Usuń szablon?
    </div>

    <div class="app-dialog-message">
      Czy na pewno chcesz usunąć szablon
      „{{ modelToDelete?.name }}”?

      Tej operacji nie można cofnąć.
    </div>

    <div class="app-dialog-actions">
      <button
        class="app-dialog-button app-dialog-cancel"
        type="button"
        :disabled="scheduleDemandModelsStore.isSaving"
        @click="closeDeleteModal"
      >
        Anuluj
      </button>

      <button
        class="app-dialog-button app-dialog-delete"
        type="button"
        :disabled="scheduleDemandModelsStore.isSaving"
        @click="confirmDeleteModel"
      >
        {{
          scheduleDemandModelsStore.isSaving
            ? 'Usuwanie...'
            : 'Usuń'
        }}
      </button>
    </div>
  </div>
</div>



  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useScheduleDemandModelsStore } from '../../stores/scheduleDemandModelsStore'

const router = useRouter()
const scheduleDemandModelsStore = useScheduleDemandModelsStore()
const { models } = storeToRefs(scheduleDemandModelsStore)

const showCreateModal = ref(false)

const showNameModal = ref(false)
const newTemplateName = ref('')
const showDeleteModal = ref(false)
const modelToDelete = ref(null)


onMounted(async () => {
  await scheduleDemandModelsStore.fetchModels()
})


function countModelVacancies(model) {
  if (!model?.days) return 0

  return Object.values(model.days).reduce((total, vacancies) => {
    return total + (Array.isArray(vacancies) ? vacancies.length : 0)
  }, 0)
}

function getVacanciesLabel(model) {
  const count = countModelVacancies(model)

  if (count === 0) return 'Brak dodanych wakatów'
  if (count === 1) return '1 wakat'
  if (count >= 2 && count <= 4) return `${count} wakaty`

  return `${count} wakatów`
}



function openModel(modelId) {
  router.push({
    name: 'GrafikSzablonEdycja',
    params: {
      id: modelId
    }
  })
}

function openDeleteModal(model) {
  modelToDelete.value = model
  showDeleteModal.value = true
}

function closeDeleteModal() {
  if (scheduleDemandModelsStore.isSaving) return

  showDeleteModal.value = false
  modelToDelete.value = null
}

async function confirmDeleteModel() {
  if (
    !modelToDelete.value ||
    scheduleDemandModelsStore.isSaving
  ) {
    return
  }

  try {
    await scheduleDemandModelsStore.deleteModel(
      modelToDelete.value.id
    )

    closeDeleteModal()
  } catch (error) {
    alert('Nie udało się usunąć szablonu grafiku.')
  }
}

function createFromScratch() {
  showCreateModal.value = false
  newTemplateName.value = ''
  showNameModal.value = true
}

function copyExisting() {
  showCreateModal.value = false
  console.log('Skopiuj istniejący model')
}

function closeCreateModal() {
  showCreateModal.value = false
}


function closeNameModal() {
  showNameModal.value = false
  newTemplateName.value = ''
}

function confirmTemplateName() {
  const name = newTemplateName.value.trim()

  if (!name) return

  showNameModal.value = false

  router.push({
    name: 'GrafikSzablonNowy',
    query: {
      name
    }
  })
}



</script>