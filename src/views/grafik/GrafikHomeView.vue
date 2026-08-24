<template>
  <div>
    <!-- =========================
         GÓRNY PASEK (Kopia z Zamawiarki)
    ========================== -->
    <div class="zamawiarka-menu-topbar">
      <button @click="goBack" class="zamawiarka-menu-back">
        ←
      </button>
      <h2 class="zamawiarka-menu-title">GRAFIK</h2>
    </div>

    <!-- =========================
         SIATKA KAFELKÓW
    ========================== -->
    <div class="zamawiarka-menu-grid-ios">

      <!-- ZAPISANE GRAFIKI -->
      <button
        v-if="isManagerOrHasPermission"
        @click="goTo('grafiki')"
        class="ios-menu-tile efekt-kliku"
      >
        <div class="ios-menu-icon ios-menu-icon-teal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="8" y1="9" x2="8" y2="20"></line>
            <line x1="13" y1="9" x2="13" y2="20"></line>
          </svg>
        </div>

        <div class="ios-menu-title">Grafiki</div>
        <div class="ios-menu-subtitle">Robocze i opublikowane</div>
      </button>
      
      <!-- KAFELEK 1: KALENDARZ ZMIAN -->
      <button @click="goTo('kalendarz')" class="ios-menu-tile efekt-kliku">
        <!-- Klasa niebieska z Zamawiarki -->
        <div class="ios-menu-icon ios-menu-icon-blue">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div class="ios-menu-title">Kalendarz</div>
        <div class="ios-menu-subtitle">Podgląd zmian</div>
      </button>

      <!-- KAFELEK 2: DYSPOZYCYJNOŚĆ -->
      <button @click="goTo('dyspozycyjnosc')" class="ios-menu-tile efekt-kliku">
        <!-- Klasa zielona z Zamawiarki -->
        <div class="ios-menu-icon ios-menu-icon-green">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="ios-menu-title">Dyspozycyjność</div>
        <div class="ios-menu-subtitle">Twój czas pracy</div>
      </button>



            <!-- KAFELEK 3: MODELE ZAPOTRZEBOWANIA -->
      <button
        v-if="isManagerOrHasPermission"
        @click="goTo('szablony')"
        class="ios-menu-tile efekt-kliku"
      >
        <div class="ios-menu-icon ios-menu-icon-purple">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <line x1="7" y1="8" x2="17" y2="8"></line>
            <line x1="7" y1="12" x2="17" y2="12"></line>
            <line x1="7" y1="16" x2="13" y2="16"></line>
          </svg>
        </div>

        <div class="ios-menu-title">Modele zapotrzebowania</div>
        <div class="ios-menu-subtitle">Szablony grafiku</div>
      </button>





      <!-- KAFELEK 3: USTAWIENIA (Tylko Manager) -->
      <button 
        v-if="isManagerOrHasPermission" 
        @click="goTo('ustawienia')" 
        class="ios-menu-tile efekt-kliku"
      >
        <!-- Klasa szara z Zamawiarki (ikona Ustawień skopiowana 1:1) -->
        <div class="ios-menu-icon ios-menu-icon-gray">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.24.66 1.82.33h0c.6-.2 1-.8 1-1.51V3a2 2 0 1 1 4 0v.09c0 .7.4 1.31 1 1.51.58.33 1.32.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.5.5-.66 1.24-.33 1.82.2.6.8 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.31.4-1.51 1z"/>
          </svg>
        </div>
        <div class="ios-menu-title">Ustawienia</div>
        <div class="ios-menu-subtitle">Konfiguracja</div>
      </button>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()

// Sprawdzanie uprawnień
const isManagerOrHasPermission = computed(() => {
  if (!employeeAuthStore.currentEmployee) return true 
  return employeeAuthStore.hasPermission('can_manage_schedule')
})

const goBack = () => {
  // Symulacja opóźnienia kliknięcia z Zamawiarki dla lepszego efektu
  setTimeout(() => {
    router.push('/')
  }, 40)
}

const goTo = (sekcja) => {
  setTimeout(() => {
    router.push(`/grafik/${sekcja}`)
  }, 40)
}
</script>

<style scoped>
.ios-menu-icon-teal {
  background: linear-gradient(145deg, #14b8a6, #0f766e);
}
</style>
