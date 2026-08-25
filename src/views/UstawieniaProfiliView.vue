<template>
  <div class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <!-- Przycisk powrotu do głównych ustawień -->
      <button @click="handleBack" class="zamawiarka-menu-back">←</button>
      <h2 class="zamawiarka-menu-title">PROFILE UPRAWNIEŃ</h2>
    </div>

    <div class="scroll-area" style="padding: 20px;">
      
      <!-- === WIDOK 1: LISTA PROFILI === -->
      <div v-if="!isFormOpen">
        <button 
          @click="openForm()" 
          class="item-card" 
          style="width: 100%; text-align: center; margin-bottom: 25px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; display: block;"
        >
          ➕ Dodaj nowy profil
        </button>

        <h3 style="font-size: 13px; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; font-weight: 600;">Zapisane profile</h3>
        
        <!-- Stan ładowania z bazy -->
        <div v-if="profilesStore.isLoading" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
          ⏳ Pobieranie profili...
        </div>

        <!-- Brak profili w bazie -->
        <div v-else-if="profilesStore.profiles.length === 0" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
          Brak skonfigurowanych profili.
        </div>

        <!-- Lista profili pobrana z bazy -->
        <div v-else>
          <div 
            v-for="profil in profilesStore.profiles" 
            :key="profil.id"
            class="item-card"
            role="button"
            tabindex="0"
            @click="openForm(profil)"
            @keydown.enter="openForm(profil)"
            @keydown.space.prevent="openForm(profil)"
            style="padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"
          >
            <span translate="no" class="notranslate" style="font-weight: 600; color: #111827; font-size: 16px;">
              {{ profil.nazwa }}
            </span>
            
            <div style="display: flex; gap: 10px;">
              <!-- Ikonka Usuń -->
              <button 
                @click.stop="confirmDelete(profil)"
                @keydown.stop
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
      <div v-else class="floating-actions-content">
        <div style="margin-bottom: 25px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">
            Nazwa profilu (np. Kelnerzy)
          </label>
          <input 
            v-model="newProfileName" 
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
            @click="!isPermissionDisabled(uprawnienie.key) && togglePermission(uprawnienie.key)"
            class="item-card"
            :style="{
              border: newProfilePermissions[uprawnienie.key] ? '1px solid #10b981' : '1px solid transparent',
              backgroundColor: newProfilePermissions[uprawnienie.key] ? '#ecfdf5' : 'white',
              opacity: isPermissionDisabled(uprawnienie.key) ? '0.4' : '1',
              pointerEvents: isPermissionDisabled(uprawnienie.key) ? 'none' : 'auto'
            }"
            style="padding: 15px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;"
          >
            <span translate="no" class="notranslate" style="font-size: 14px; color: #374151; font-weight: 500; line-height: 1.4; padding-right: 15px;">
              {{ uprawnienie.label }}
            </span>
            
            <div 
              style="min-width: 46px; height: 26px; border-radius: 13px; position: relative; transition: background-color 0.3s;"
              :style="{ backgroundColor: newProfilePermissions[uprawnienie.key] ? '#10b981' : '#e5e7eb' }"
            >
              <div 
                style="width: 22px; height: 22px; background: white; border-radius: 50%; position: absolute; top: 2px; transition: transform 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
                :style="{ transform: newProfilePermissions[uprawnienie.key] ? 'translateX(22px)' : 'translateX(2px)' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- PRZYCISKI AKCJI FORMULARZA -->
        <div class="floating-form-actions">
          <button
            type="button"
            class="floating-form-action cancel"
            aria-label="Anuluj"
            title="Anuluj"
            @click="cancelForm"
          >
            ×
          </button>
          <button
            type="button"
            class="floating-form-action save"
            aria-label="Zapisz"
            title="Zapisz"
            @click="saveProfile"
            :disabled="!newProfileName.trim() || isSaving"
          >
            {{ isSaving ? '…' : '✓' }}
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

        <h3 style="margin-top: 0; margin-bottom: 12px; color: #111827; font-size: 20px; font-weight: 700;">Usuń profil</h3>
        <p style="color: #6b7280; font-size: 15px; margin-bottom: 25px; line-height: 1.5;">
          Czy na pewno chcesz usunąć: <br>
          <strong translate="no" class="notranslate" style="color: #374151; font-size: 16px;">{{ profileToDelete?.nazwa }}</strong>?
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
import { usePermissionProfilesStore } from '../stores/permissionProfilesStore.js'

const router = useRouter()
const profilesStore = usePermissionProfilesStore()

// Pobranie danych z Firebase przy otwarciu tego widoku
onMounted(() => {
  profilesStore.fetchProfiles()
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
const editingProfileId = ref(null) 
const newProfileName = ref('')
const newProfilePermissions = ref({})
const isSaving = ref(false) // Zabezpieczenie przed podwójnym kliknięciem

const showDeleteModal = ref(false)
const profileToDelete = ref(null)

const openForm = (profile = null) => {
  if (profile) {
    editingProfileId.value = profile.id
    newProfileName.value = profile.nazwa
    newProfilePermissions.value = {}
    PERMISSIONS_DICTIONARY.forEach(modul => {
      modul.permissions.forEach(perm => {
        newProfilePermissions.value[perm.key] = profile.uprawnienia?.[perm.key] || false
      })
    })
  } else {
    editingProfileId.value = null
    newProfileName.value = ''
    newProfilePermissions.value = {}
    PERMISSIONS_DICTIONARY.forEach(modul => {
      modul.permissions.forEach(perm => {
        newProfilePermissions.value[perm.key] = false
      })
    })
  }
  isFormOpen.value = true
}

const cancelForm = () => {
  isFormOpen.value = false
  editingProfileId.value = null
}

const isPermissionDisabled = (permKey) => {
  // Blokady dla Zamawiarki
  if (permKey === 'can_create_orders' || permKey === 'can_edit_products') {
    return !newProfilePermissions.value['can_view_zamawiarka']
  }
  // Blokady dla Rentowności
  if (permKey === 'can_edit_menu') {
    return !newProfilePermissions.value['can_view_foodcost']
  }
  return false
}

const togglePermission = (key) => {
  // Zabezpieczenie przed kliknięciem w zablokowany element
  if (isPermissionDisabled(key)) return;

  // Główna zmiana wartości
  newProfilePermissions.value[key] = !newProfilePermissions.value[key]

  // Kaskada 1: Odznaczenie "Dostępu do Zamawiarki" wyłącza jej opcje
  if (key === 'can_view_zamawiarka' && !newProfilePermissions.value[key]) {
    newProfilePermissions.value['can_create_orders'] = false
    newProfilePermissions.value['can_edit_products'] = false
  }
  
  // Kaskada 2: Włączenie "Zarządzania bazą" włącza też "Składanie zamówień"
  if (key === 'can_edit_products' && newProfilePermissions.value[key]) {
    newProfilePermissions.value['can_create_orders'] = true
  }

  // Kaskada 3: Odznaczenie "Dostępu do Rentowności" wyłącza jej edycję
  if (key === 'can_view_foodcost' && !newProfilePermissions.value[key]) {
    newProfilePermissions.value['can_edit_menu'] = false
  }
}

// Zapis lub aktualizacja w Firebase
const saveProfile = async () => {
  if (!newProfileName.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const profileData = {
      nazwa: newProfileName.value,
      uprawnienia: { ...newProfilePermissions.value }
    }

    if (editingProfileId.value) {
      await profilesStore.updateProfile(editingProfileId.value, profileData)
    } else {
      await profilesStore.addProfile(profileData)
    }
    
    isFormOpen.value = false
    editingProfileId.value = null
  } catch (error) {
    alert('Wystąpił błąd podczas zapisu do bazy.')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (profile) => {
  profileToDelete.value = profile
  showDeleteModal.value = true
}

// Usunięcie z Firebase
const executeDelete = async () => {
  if (profileToDelete.value && !isSaving.value) {
    isSaving.value = true
    try {
      await profilesStore.deleteProfile(profileToDelete.value.id)
      showDeleteModal.value = false
      profileToDelete.value = null
    } catch (error) {
      alert('Wystąpił błąd podczas usuwania.')
    } finally {
      isSaving.value = false
    }
  }
}
</script>
