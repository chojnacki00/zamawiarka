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
        DYSPOZYCYJNOŚĆ
      </h2>
    </div>

    <div class="scroll-area">
  <div class="grafik-menu-list">
    <button
      class="app-list-row"
      type="button"
      @click="router.push('/grafik/dyspozycyjnosc/kalendarz')"
    >
      <div class="app-list-row-main">
        <div class="app-list-row-title">
          Kalendarz dyspozycyjności
        </div>

        <div class="app-list-row-subtitle">
          Uzupełnij lub sprawdź dyspozycyjność
        </div>
      </div>

      <div class="app-list-row-arrow">
        ›
      </div>
    </button>

    <button
      v-if="canManageSchedule"
      class="app-list-row"
      type="button"
      @click="router.push('/grafik/dyspozycyjnosc/okresy')"
    >
      <div class="app-list-row-main">
        <div class="app-list-row-title">
          Okresy dyspozycji
        </div>

        <div class="app-list-row-subtitle">
          Twórz okresy i kontroluj zatwierdzenia
        </div>
      </div>

      <div class="app-list-row-arrow">
        ›
      </div>
    </button>
  </div>
</div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()

const canManageSchedule = computed(() => {
  if (!employeeAuthStore.currentEmployee) {
    return true
  }

  return employeeAuthStore.hasPermission(
    'can_manage_schedule'
  )
})
</script>