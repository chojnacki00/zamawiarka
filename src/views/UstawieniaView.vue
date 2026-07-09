<template>
  <div class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button @click="router.push('/')" class="zamawiarka-menu-back">←</button>
      <h2 class="zamawiarka-menu-title">USTAWIENIA APLIKACJI</h2>
    </div>

    <div class="scroll-area" style="padding: 20px;">
      <button 
        @click="showBackupOptions = !showBackupOptions" 
        class="item-card" 
        :class="{ 'item-card-active': showBackupOptions }"
        style="width: 100%; text-align: center; margin-bottom: 15px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block;"
      >
        💾 Kopia zapasowa i przywracanie
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
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { eksportujBackup, wczytajBackup } = inject('appContext')

const showBackupOptions = ref(false)
const backupInputRef = ref(null)

const triggerFileInput = () => {
  if (backupInputRef.value) backupInputRef.value.click()
}
</script>