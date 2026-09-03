<template>
  <div class="home-screen-ios">
    <div class="home-header-ios">
      <button
        v-if="canSeeSettings" 
        @click="router.push('/ustawienia')"
        style="position: absolute; top: 97px; right: -1px; background: none; border: none; font-size: 35px; cursor: pointer; padding: 10px;"
        aria-label="Ustawienia"
      >
        ⚙️
      </button>

      <h1 class="home-title-ios">GastroManager</h1>
      <div class="home-version-ios">wersja {{ appVersion }}</div>

      <!-- POLE Z NAZWĄ KONTA -->
      <div class="home-account-ios" style="display: flex; align-items: center; justify-content: flex-start; text-align: left; width: 100%; box-sizing: border-box; padding: 12px 15px; margin-bottom: 10px; overflow: hidden;">
        
        <!-- IKONA (PRZYSPAWANA DO LEWEJ) -->
        <span class="home-account-icon" style="font-size: 32px; margin-right: 12px; flex-shrink: 0;">👤</span>
        
        <!-- KONTENER NA TEKSTY (ZAJMUJE CAŁĄ RESZTĘ SZEROKOŚCI) -->
        <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; line-height: 1.3;">
          
          <!-- LINIJKA 1: Konto: <nazwa> -->
          <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            <span>Konto: </span>
            <strong translate="no" class="notranslate">{{ displayRestaurantName }}</strong>
          </div>
          
          <!-- LINIJKA 2: Kto jest zalogowany -->
          <strong style="font-size: 15px; color: #333; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ displayUserName }}
          </strong>
          
        </div>
      </div>
    </div>

    <div class="home-content-ios">
      <!-- GŁÓWNE MENU APLIKACJI (SIATKA KAFELKÓW) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; max-width: 380px; margin: 40px auto 30px auto; padding: 0 20px; box-sizing: border-box;">
        
        <!-- KAFELEK 1: ZAMAWIARKA -->
<button
  v-if="aktywneModuly.includes('zamawiarka') && authorizationStore.hasAnyPermission(['can_view_zamawiarka', 'can_create_orders', 'can_edit_products'])"
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
          v-if="aktywneModuly.includes('rentownosc') && authorizationStore.hasAnyPermission(['can_view_foodcost', 'can_edit_menu'])"
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


        <!-- KAFELEK 3: GRAFIK PRACOWNICZY -->
        <button
          v-if="aktywneModuly.includes('grafik') && authorizationStore.hasPermission('can_view_schedule')"
          @click="navigateWithEffect('/grafik')"
          class="ios-menu-tile efekt-kliku"
          style="margin: 0; min-height: 140px; box-sizing: border-box;"
        >
          <!-- Ikona kalendarza na pomarańczowym tle dla odróżnienia -->
          <div class="ios-menu-icon" style="background-color: #f39c12; color: white; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="ios-menu-title" style="font-size: 15px;">Grafik</div>
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
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'
import { useAuthorizationStore } from '../stores/authorizationStore.js'

const router = useRouter()
const authStore = useAuthStore()
const employeeAuthStore = useEmployeeAuthStore()
const authorizationStore = useAuthorizationStore()

const appVersion = ref('3.1.0')
const aktywneModuly = ref(['zamawiarka', 'rentownosc', 'grafik'])

const currentCompany = computed(() => authStore.currentCompany)

// 1. ZMIENNA DLA NAZWY RESTAURACJI (Pierwsza linijka)
const displayRestaurantName = computed(() => {
  // Pobiera nazwę dokładnie tak, jak robił to Twój oryginalny kod w homeview11.txt
  if (currentCompany.value && currentCompany.value.companyName) {
    return currentCompany.value.companyName
  }
  return ''
})

// 2. ZMIENNA DLA ROLI/IMIENIA (Druga linijka)
const displayUserName = computed(() => {
  const isEmployee = employeeAuthStore.currentEmployee
  
  if (!isEmployee) {
    return 'Panel Administratora'
  } else {
    let pelnaNazwa = ''
    if (isEmployee.imie) pelnaNazwa += isEmployee.imie
    if (isEmployee.nazwisko) pelnaNazwa += ' ' + isEmployee.nazwisko
    if (!pelnaNazwa.trim() && isEmployee.name) pelnaNazwa = isEmployee.name
    return pelnaNazwa.trim() || 'Pracownik'
  }
})



// 3. ZMIENNA DECYDUJĄCA CZY POKAZAĆ USTAWIENIA
const canSeeSettings = computed(() => {
  // Jeśli NIE MA pracownika (czyli zalogowany jest główny Szef), to pokazujemy zawsze
  if (authorizationStore.isOwner) return true

  // Używamy prawdziwych kluczy z Twojej bazy Firebase
  const mozeKonta = authorizationStore.hasPermission('can_manage_employees')
  const mozeStanowiska = authorizationStore.hasPermission('can_manage_roles')
  const mozeGrafik = authorizationStore.hasPermission('can_manage_schedule')

  return mozeKonta || mozeStanowiska || mozeGrafik
})



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
