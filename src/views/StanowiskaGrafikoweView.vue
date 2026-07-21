<template>
  <div class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button @click="handleBack" class="zamawiarka-menu-back">←</button>
      <h2 class="zamawiarka-menu-title">STANOWISKA (GRAFIK)</h2>
    </div>

    <div class="scroll-area" style="padding: 20px;">
      
      <!-- WIDOK 1: LISTA STANOWISK -->
      <div v-if="!isFormOpen">
        <button 
          @click="openForm()" 
          class="item-card" 
          style="width: 100%; text-align: center; margin-bottom: 25px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; display: block;"
        >
          ➕ Dodaj stanowisko do grafiku
        </button>

        <h3 style="font-size: 13px; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; font-weight: 600;">Skonfigurowane role</h3>
        
        <div v-if="positionsStore.isLoading" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
          ⏳ Pobieranie stanowisk...
        </div>

        <div v-else-if="positionsStore.positions.length === 0" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
          Brak stanowisk. Dodaj pierwsze, by móc układać grafik.
        </div>

        <div v-else>
          <div 
            v-for="stanowisko in positionsStore.positions" 
            :key="stanowisko.id"
            class="item-card"
            style="padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"
          >
            <span translate="no" class="notranslate" style="font-weight: 600; color: #111827; font-size: 16px;">
              {{ stanowisko.nazwa }}
            </span>
            
            <div style="display: flex; gap: 10px;">
              <button 
                @click="openForm(stanowisko)" 
                style="background: white; border: 1px solid #d1d5db; border-radius: 8px; color: #374151; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>

              <button 
                @click="confirmDelete(stanowisko)" 
                style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #ef4444; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- WIDOK 2: FORMULARZ DODAWANIA/EDYCJI -->
      <div v-else>
        <div style="margin-bottom: 25px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">
            Nazwa stanowiska (np. Kucharz, Kierowca)
          </label>
          <input 
            v-model="newPositionName" 
            type="text" 
            placeholder="Wpisz nazwę..." 
            translate="no"
            class="notranslate"
            style="width: 100%; padding: 15px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);"
          />
        </div>

        <div style="display: flex; gap: 12px; margin-top: 30px; padding-bottom: 40px;">
          <button 
            @click="cancelForm"
            style="flex: 1; padding: 15px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;"
          >
            Anuluj
          </button>
          <button 
            @click="savePosition"
            style="flex: 1; padding: 15px; border: none; background: #0ea5e9; color: white; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer; transition: opacity 0.2s;"
            :disabled="!newPositionName.trim() || isSaving"
            :style="{ opacity: (!newPositionName.trim() || isSaving) ? 0.5 : 1 }"
          >
            {{ isSaving ? 'Zapisywanie...' : 'Zapisz' }}
          </button>
        </div>
      </div>

    </div>

    <!-- MODAL POTWIERDZENIA USUNIĘCIA -->
    <div v-if="showDeleteModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
      <div style="background: white; border-radius: 20px; padding: 30px 20px; width: 100%; max-width: 340px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); text-align: center;">
        <div style="width: 56px; height: 56px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #111827; font-size: 20px; font-weight: 700;">Usuń stanowisko</h3>
        <p style="color: #6b7280; font-size: 15px; margin-bottom: 25px; line-height: 1.5;">
          Czy na pewno chcesz usunąć: <br>
          <strong translate="no" class="notranslate" style="color: #374151; font-size: 16px;">{{ positionToDelete?.nazwa }}</strong>?
        </p>
        <div style="display: flex; gap: 12px;">
          <button @click="showDeleteModal = false" :disabled="isSaving" style="flex: 1; padding: 14px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;">
            Anuluj
          </button>
          <button @click="executeDelete" :disabled="isSaving" style="flex: 1; padding: 14px; border: none; background: #ef4444; color: white; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;">
            {{ isSaving ? 'Usuwanie...' : 'Usuń' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSchedulePositionsStore } from '../stores/schedulePositionsStore.js'

const router = useRouter()
const positionsStore = useSchedulePositionsStore()

onMounted(() => {
  positionsStore.fetchPositions()
})

const handleBack = () => {
  if (isFormOpen.value) {
    cancelForm()
  } else {
    router.push('/ustawienia')
  }
}

const isFormOpen = ref(false)
const editingPositionId = ref(null) 
const newPositionName = ref('')
const isSaving = ref(false)

const showDeleteModal = ref(false)
const positionToDelete = ref(null)

const openForm = (position = null) => {
  if (position) {
    editingPositionId.value = position.id
    newPositionName.value = position.nazwa
  } else {
    editingPositionId.value = null
    newPositionName.value = ''
  }
  isFormOpen.value = true
}

const cancelForm = () => {
  isFormOpen.value = false
  editingPositionId.value = null
}

const savePosition = async () => {
  if (!newPositionName.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const positionData = {
      nazwa: newPositionName.value
    }

    if (editingPositionId.value) {
      await positionsStore.updatePosition(editingPositionId.value, positionData)
    } else {
      await positionsStore.addPosition(positionData)
    }
    
    isFormOpen.value = false
    editingPositionId.value = null
  } catch (error) {
    alert('Wystąpił błąd podczas zapisu do bazy.')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (position) => {
  positionToDelete.value = position
  showDeleteModal.value = true
}

const executeDelete = async () => {
  if (positionToDelete.value && !isSaving.value) {
    isSaving.value = true
    try {
      await positionsStore.deletePosition(positionToDelete.value.id)
      showDeleteModal.value = false
      positionToDelete.value = null
    } catch (error) {
      alert('Wystąpił błąd podczas usuwania.')
    } finally {
      isSaving.value = false
    }
  }
}
</script>