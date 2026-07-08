<template>
  <div class="home-screen-ios">
    <div class="home-header-ios">
      <button 
        @click="router.push('/ustawienia')"
        style="position: absolute; top: 97px; right: -1px; background: none; border: none; font-size: 35px; cursor: pointer; padding: 10px;"
        aria-label="Ustawienia"
      >
        ⚙️
      </button>

      <h1 class="home-title-ios">GastroManager</h1>
      <div class="home-version-ios">wersja {{ appVersion }}</div>

      <div v-if="currentCompany" class="home-account-ios">
        <span class="home-account-icon">👤</span>
        <span>Konto:</span>
        <strong translate="no" class="notranslate">{{ currentCompany.companyName }}</strong>
      </div>
    </div>

    <div class="home-content-ios">
      <!-- GŁÓWNE MENU APLIKACJI (SIATKA KAFELKÓW) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; max-width: 380px; margin: 40px auto 30px auto; padding: 0 20px; box-sizing: border-box;">
        
        <!-- KAFELEK 1: ZAMAWIARKA -->
        <button
          v-if="aktywneModuly.includes('zamawiarka')"
          @click="navigateWithEffect('/zamawiarka')"
          class="ios-menu-tile efekt-kliku"
          style="margin: 0; min-height: 140px; box-sizing: border-box;"
        >
          <div class="ios-menu-icon ios-menu-icon-blue">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <div class="ios-menu-title" style="font-size: 15px;">Zamawiarka</div>
        </button>

        <!-- KAFELEK 2: RENTOWNOŚĆ MENU -->
        <button
          v-if="aktywneModuly.includes('rentownosc')"
          @click="navigateWithEffect('/rentownosc')"
          class="ios-menu-tile efekt-kliku"
          style="margin: 0; min-height: 140px; box-sizing: border-box;"
        >
          <div class="ios-menu-icon ios-menu-icon-green">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
            </svg>
          </div>
          <div class="ios-menu-title" style="font-size: 15px;">Rentowność Menu</div>
        </button>

      </div>

      <!-- WYLOGUJ -->
      <button
        @click="logout"
        class="home-logout-ios"
      >
        <span class="home-logout-icon">⏻</span>
        <span>Wyloguj</span>
      </button>

      <div class="home-footer-ios">
        GastroManager © 2026
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'

const router = useRouter()
const authStore = useAuthStore()

// Zmienne potrzebne do wyświetlenia menu (docelowo wyciągniemy je wyżej, na razie zostają tu)
const appVersion = ref('3.1.0')
const aktywneModuly = ref(['zamawiarka', 'rentownosc'])

// 1. Pobieramy dane zalogowanej firmy PROSTO Z PINII! Brak propsów!
const currentCompany = computed(() => authStore.currentCompany)

// 2. Wylogowanie odpala funkcję, którą wstrzyknęliśmy do Pinii z App.vue
const logout = () => {
  if (authStore.logout) {
    authStore.logout()
  }
}
const navigateWithEffect = (path) => {
  setTimeout(() => {
    router.push(path)
  }, 40)
}

</script>