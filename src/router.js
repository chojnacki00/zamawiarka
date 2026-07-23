import { createRouter, createWebHistory } from 'vue-router'
import { useEmployeeAuthStore } from './stores/employeeAuthStore.js' // <-- NOWOŚĆ: Importujemy nasz sklep z uprawnieniami

import LoginView from './views/LoginView.vue'
import HomeView from './views/HomeView.vue'
import ZamawiarkaView from './views/ZamawiarkaView.vue'
import RentownoscView from './views/RentownoscView.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/', name: 'Home', component: HomeView },
  { path: '/zamawiarka', name: 'Zamawiarka', component: ZamawiarkaView },
  { path: '/rentownosc', name: 'Rentownosc', component: RentownoscView },
  { path: '/ustawienia', name: 'Ustawienia', component: () => import('./views/UstawieniaView.vue') },
  { path: '/profile-uprawnien', name: 'ProfileUprawnien', component: () => import('./views/UstawieniaProfiliView.vue') },
  { path: '/stanowiska-grafik', name: 'StanowiskaGrafikowe', component: () => import('./views/StanowiskaGrafikoweView.vue') },
  { path: '/zespol', name: 'Zespol', component: () => import('./views/UstawieniaZespoluView.vue') },
  { path: '/logowanie', name: 'LogowaniePIN', component: () => import('./views/PinLoginView.vue') },
  { path: '/terminal', name: 'Terminal', component: () => import('./views/TerminalView.vue') },
  { path: '/grafik', name: 'GrafikHome', component: () => import('./views/grafik/GrafikHomeView.vue') },
  { path: '/grafik/szablony', name: 'GrafikSzablony', component: () => import('./views/grafik/GrafikSzablonyView.vue') },
  { path: '/grafik/szablony/nowy', name: 'GrafikSzablonNowy', component: () => import('./views/grafik/GrafikSzablonEdytorView.vue') },
  { path: '/grafik/szablony/:id', name: 'GrafikSzablonEdycja', component: () => import('./views/grafik/GrafikSzablonEdytorView.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// === STRAŻNIK TRAS ===
router.beforeEach((to, from, next) => {
  const hasEmployeeSession = !!localStorage.getItem('gm_emp_id')
  
  // Pobieramy sklep z uprawnieniami wewnątrz strażnika
  const employeeStore = useEmployeeAuthStore()

  // ZASADA 1: Zalogowany Pracownik chce wejść na logowanie -> odsyłamy na stronę główną
  if (hasEmployeeSession && (to.path === '/logowanie' || to.path === '/login')) {
    return next('/') 
  }

  // ZASADA 2: Chronimy Ustawienia Managera przed Pracownikami bez uprawnień!
  const isManagerRoute = ['/ustawienia', '/profile-uprawnien', '/stanowiska-grafik', '/zespol'].includes(to.path)

  if (hasEmployeeSession && isManagerRoute) {
    // Odpytujemy nasz system o uprawnienia pracownika
    // WAŻNE: To musi być wywołane wewnątrz strażnika, żeby Pinia działała poprawnie
    const employeeAuthStore = useEmployeeAuthStore()
    
    const mozeKonta = employeeAuthStore.hasPermission('can_manage_employees')
    const mozeStanowiska = employeeAuthStore.hasPermission('can_manage_roles')

    // Jeśli pracownik nie ma ŻADNEGO z tych uprawnień -> blokujemy i wyrzucamy na główną
    if (!mozeKonta && !mozeStanowiska) {
      console.log('Strażnik: Pracownik nie ma odpowiednich uprawnień do Ustawień!')
      return next('/') 
    }
    // W przeciwnym razie - brama otwarta, wpuszczamy!
  }

  // === NOWOŚĆ: ZASADA 3 - Blokada konkretnych modułów na podstawie uprawnień ===
  if (hasEmployeeSession) {
    
    // Zabezpieczenie Zamawiarki
    if (to.path === '/zamawiarka') {
      if (!employeeStore.hasPermission('can_view_zamawiarka') && !employeeStore.hasPermission('can_edit_products')) {
        console.warn('Strażnik: Odmowa dostępu do Zamawiarki dla tego stanowiska!')
        return next('/')
      }
    }

    // Zabezpieczenie Rentowności
    if (to.path === '/rentownosc') {
      if (!employeeStore.hasPermission('can_view_foodcost') && !employeeStore.hasPermission('can_edit_menu')) {
        console.warn('Strażnik: Odmowa dostępu do Rentowności dla tego stanowiska!')
        return next('/')
      }
    }
  }

  // Jeśli wszystko jest OK, wpuszczamy dalej
  next()
})
// === KONIEC STRAŻNIKA ===

export default router