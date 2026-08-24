<template>
  <div class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button @click="router.push('/')" class="zamawiarka-menu-back">←</button>
      <h2 class="zamawiarka-menu-title">USTAWIENIA APLIKACJI</h2>
    </div>

    <div class="scroll-area" style="padding: 20px;">
      
      <!-- Przycisk do zarządzania profilami uprawnień (Właściciel LUB Manager z uprawnieniem) -->
      <button 
        v-if="!employeeAuthStore.currentEmployee || employeeAuthStore.hasPermission('can_manage_roles')"
        @click="router.push('/profile-uprawnien')" 
        class="item-card" 
        style="width: 100%; text-align: center; margin-bottom: 8px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
      >
        👥 Profile uprawnień
      </button>

      <!-- Przycisk do zarządzania stanowiskami na grafiku (Właściciel LUB Manager z uprawnieniem can_manage_roles) -->
      <button 
        v-if="!employeeAuthStore.currentEmployee || employeeAuthStore.hasPermission('can_manage_roles')"
        @click="router.push('/stanowiska-grafik')" 
        class="item-card" 
        style="width: 100%; text-align: center; margin-bottom: 8px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
      >
        📅 Stanowiska
      </button>

      <!-- Przycisk Zespół (Właściciel LUB Manager z uprawnieniem) -->
      <button 
        v-if="!employeeAuthStore.currentEmployee || employeeAuthStore.hasPermission('can_manage_employees')"
        @click="router.push('/zespol')" 
        class="item-card" 
        style="width: 100%; text-align: center; margin-bottom: 8px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
      >
        👨‍🍳 Zespół i Pracownicy
      </button>

      <!-- Profile warunków pracy przypisywane później pracownikom -->
      <button
        v-if="!employeeAuthStore.currentEmployee || employeeAuthStore.hasPermission('can_manage_employees')"
        @click="router.push('/ustawienia/profile-zatrudnienia')"
        class="item-card"
        style="width: 100%; text-align: center; margin-bottom: 8px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
      >
        🧾 Profile zatrudnienia
      </button>

      <!-- SEKCJA KOPII ZAPASOWEJ (Tylko Główny Właściciel, brak dostępu dla jakiegokolwiek pracownika) -->
      <div v-if="!employeeAuthStore.currentEmployee">
        <button 
          @click="showBackupOptions = !showBackupOptions" 
          class="item-card" 
          :class="{ 'item-card-active': showBackupOptions }"
          style="width: 100%; text-align: center; margin-bottom: 15px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >
          💾 Kopia zapasowa/wczytaj
        </button>

        <div v-if="showBackupOptions" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px;">
          <button @click="eksportujBackup" class="item-card item-card-sub" style="width: 100%; text-align: center; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block;">
            💾 Utwórz kopię zapasową
          </button>

          <button @click="triggerFileInput" class="item-card item-card-sub" style="width: 100%; text-align: center; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block;">
            📂 Przywróć dane z pliku
          </button>
        </div>

        <input type="file" ref="backupInputRef" style="display: none" accept=".json" @change="wczytajBackup" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const { eksportujBackup, wczytajBackup } = inject('appContext')

const showBackupOptions = ref(false)
const backupInputRef = ref(null)

const triggerFileInput = () => {
  if (backupInputRef.value) backupInputRef.value.click()
}
</script>
