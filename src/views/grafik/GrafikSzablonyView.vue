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
        v-if="models.length === 0"
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
        <button
          v-for="model in models"
          :key="model.id"
          class="app-list-row"
          type="button"
          @click="openModel(model.id)"
        >
          <div class="app-list-row-main">
            <div class="app-list-row-title">
              {{ model.name }}
            </div>

            <div class="app-list-row-subtitle">
              7 dni • {{ model.vacanciesCount }} wakatów
            </div>
          </div>

          <div class="app-list-row-arrow">
            ›
          </div>
        </button>
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



  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showCreateModal = ref(false)

const showNameModal = ref(false)
const newTemplateName = ref('')

const models = ref([])

function openModel(modelId) {
  console.log('Otwórz model:', modelId)
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