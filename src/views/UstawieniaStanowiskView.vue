<template>
  <div class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <!-- Przycisk powrotu do głównych ustawień -->
      <button @click="handleBack" class="zamawiarka-menu-back">←</button>
      <h2 class="zamawiarka-menu-title">STANOWISKA</h2>
    </div>

    <div class="scroll-area" style="padding: 20px;">
      
      <!-- === WIDOK 1: LISTA STANOWISK === -->
      <div v-if="!isFormOpen">
        <button 
          @click="openForm()" 
          class="item-card" 
          style="width: 100%; text-align: center; margin-bottom: 25px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; display: block;"
        >
          ➕ Dodaj nowe stanowisko
        </button>

        <h3 style="font-size: 13px; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; font-weight: 600;">Zapisane stanowiska</h3>
        
        <!-- Stan ładowania z bazy -->
        <div v-if="rolesStore.isLoading" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
          ⏳ Pobieranie stanowisk...
        </div>

        <!-- Brak stanowisk w bazie -->
        <div v-else-if="rolesStore.roles.length === 0" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
          Brak skonfigurowanych stanowisk.
        </div>

        <!-- Lista stanowisk pobrana z bazy -->
        <div v-else>
          <div 
            v-for="stanowisko in rolesStore.roles" 
            :key="stanowisko.id"
            class="item-card"
            style="padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"
          >
            <span translate="no" class="notranslate" style="font-weight: 600; color: #111827; font-size: 16px;">
              {{ stanowisko.nazwa }}
            </span>
            
            <div style="display: flex; gap: 10px;">
              <!-- Ikonka Edytuj -->
              <button 
                @click="openForm(stanowisko)" 
                style="background: white; border: 1px solid #d1d5db; border-radius: 8px; color: #374151; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>

              <!-- Ikonka Usuń -->
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

      <!-- === WIDOK 2: FORMULARZ DODAWANIA/EDYCJI === -->
      <div v-else>
        <div style="margin-bottom: 25px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">
            Nazwa stanowiska (np. Kelner)
          </label>
          <input 
            v-model="newRoleName" 
            type="text" 
            placeholder="Wpisz nazwę..." 
            translate="no"
            class="notranslate"
            style="width: 100%; padding: 15px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);"
          />
        </div>

        <h3 style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          Przypisane Uprawnienia
        </h3>

        <!-- PĘTLA PO SŁOWNIKU UPRAWNIEŃ -->
        <div v-for="modul in PERMISSIONS_DICTIONARY" :key="modul.module" style="margin-bottom: 25px;">
          <h4 translate="no" class="notranslate" style="font-size: 12px; font-weight: 700; color: #0ea5e9; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
            {{ modul.module }}
          </h4>
          
          <div 
            v-for="uprawnienie in modul.permissions" 
            :key="uprawnienie.key"
            @click="togglePermission(uprawnienie.key)"
            class="item-card"
            :style="{
              border: newRolePermissions[uprawnienie.key] ? '1px solid #10b981' : '1px solid transparent',
              backgroundColor: newRolePermissions[uprawnienie.key] ? '#ecfdf5' : 'white'
            }"
            style="padding: 15px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;"
          >
            <span translate="no" class="notranslate" style="font-size: 14px; color: #374151; font-weight: 500; line-height: 1.4; padding-right: 15px;">
              {{ uprawnienie.label }}
            </span>
            
            <div 
              style="min-width: 46px; height: 26px; border-radius: 13px; position: relative; transition: background-color 0.3s;"
              :style="{ backgroundColor: newRolePermissions[uprawnienie.key] ? '#10b981' : '#e5e7eb' }"
            >
              <div 
                style="width: 22px; height: 22px; background: white; border-radius: 50%; position: absolute; top: 2px; transition: transform 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
                :style="{ transform: newRolePermissions[uprawnienie.key] ? 'translateX(22px)' : 'translateX(2px)' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- PRZYCISKI AKCJI FORMULARZA -->
        <div style="display: flex; gap: 12px; margin-top: 30px; padding-bottom: 40px;">
          <button 
            @click="cancelForm"
            style="flex: 1; padding: 15px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;"
          >
            Anuluj
          </button>
          <button 
            @click="saveRole"
            style="flex: 1; padding: 15px; border: none; background: #0ea5e9; color: white; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer; transition: opacity 0.2s;"
            :disabled="!newRoleName.trim() || isSaving"
            :style="{ opacity: (!newRoleName.trim() || isSaving) ? 0.5 : 1 }"
          >
            {{ isSaving ? 'Zapisywanie...' : 'Zapisz' }}
          </button>
        </div>
      </div>

    </div>

    <!-- === MODAL POTWIERDZENIA USUNIĘCIA === -->
    <div v-if="showDeleteModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
      <div style="background: white; border-radius: 20px; padding: 30px 20px; width: 100%; max-width: 340px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); text-align: center;">
        
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
          <strong translate="no" class="notranslate" style="color: #374151; font-size: 16px;">{{ roleToDelete?.nazwa }}</strong>?
        </p>
        
        <div style="display: flex; gap: 12px;">
          <button @click="showDeleteModal = false" :disabled="isSaving" style="flex: 1; padding: 14px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;">
            Anuluj
          </button>
          <button @click="executeDelete" :disabled="isSaving" style="flex: 1; padding: 14px; border: none; background: #ef4444; color: white; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">
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
import { PERMISSIONS_DICTIONARY } from '../config/permissions.js'
import { useRolesStore } from '../stores/rolesStore.js'

const router = useRouter()
const rolesStore = useRolesStore()

// Pobranie danych z Firebase przy otwarciu tego widoku
onMounted(() => {
  rolesStore.fetchRoles()
})



// Obsługa przycisku "Wstecz" na górnym pasku
const handleBack = () => {
  if (isFormOpen.value) {
    cancelForm() // Jeśli formularz otwarty, wracamy do listy
  } else {
    router.push('/ustawienia') // Jeśli lista otwarta, wracamy do głównych ustawień
  }
}



const isFormOpen = ref(false)
const editingRoleId = ref(null) 
const newRoleName = ref('')
const newRolePermissions = ref({})
const isSaving = ref(false) // Zabezpieczenie przed podwójnym kliknięciem

const showDeleteModal = ref(false)
const roleToDelete = ref(null)

const openForm = (role = null) => {
  if (role) {
    editingRoleId.value = role.id
    newRoleName.value = role.nazwa
    newRolePermissions.value = {}
    PERMISSIONS_DICTIONARY.forEach(modul => {
      modul.permissions.forEach(perm => {
        newRolePermissions.value[perm.key] = role.permissions[perm.key] || false
      })
    })
  } else {
    editingRoleId.value = null
    newRoleName.value = ''
    newRolePermissions.value = {}
    PERMISSIONS_DICTIONARY.forEach(modul => {
      modul.permissions.forEach(perm => {
        newRolePermissions.value[perm.key] = false
      })
    })
  }
  isFormOpen.value = true
}

const cancelForm = () => {
  isFormOpen.value = false
  editingRoleId.value = null
}

const togglePermission = (key) => {
  newRolePermissions.value[key] = !newRolePermissions.value[key]
}

// Zapis lub aktualizacja w Firebase
const saveRole = async () => {
  if (!newRoleName.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const roleData = {
      nazwa: newRoleName.value,
      permissions: { ...newRolePermissions.value }
    }

    if (editingRoleId.value) {
      await rolesStore.updateRole(editingRoleId.value, roleData)
    } else {
      await rolesStore.addRole(roleData)
    }
    
    isFormOpen.value = false
    editingRoleId.value = null
  } catch (error) {
    alert('Wystąpił błąd podczas zapisu do bazy.')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (role) => {
  roleToDelete.value = role
  showDeleteModal.value = true
}

// Usunięcie z Firebase
const executeDelete = async () => {
  if (roleToDelete.value && !isSaving.value) {
    isSaving.value = true
    try {
      await rolesStore.deleteRole(roleToDelete.value.id)
      showDeleteModal.value = false
      roleToDelete.value = null
    } catch (error) {
      alert('Wystąpił błąd podczas usuwania.')
    } finally {
      isSaving.value = false
    }
  }
}
</script>