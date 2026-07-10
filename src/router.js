import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/LoginView.vue'
import HomeView from './views/HomeView.vue'
import ZamawiarkaView from './views/ZamawiarkaView.vue'
import RentownoscView from './views/RentownoscView.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/zamawiarka',
    name: 'Zamawiarka',
    component: ZamawiarkaView
  },
  {
    path: '/rentownosc',
    name: 'Rentownosc',
    component: RentownoscView
  },
  {
    path: '/ustawienia',
    name: 'Ustawienia',
    component: () => import('./views/UstawieniaView.vue')
  },
  {
    path: '/stanowiska',
    name: 'Stanowiska',
    component: () => import('./views/UstawieniaStanowiskView.vue')
  },
  {
    path: '/zespol',
    name: 'Zespol',
    component: () => import('./views/UstawieniaZespoluView.vue')
  },
  {
    path: '/logowanie',
    name: 'LogowaniePIN',
    component: () => import('./views/PinLoginView.vue')
  },
  {
    path: '/terminal',
    name: 'Terminal',
    component: () => import('./views/TerminalView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// === STRAŻNIK TRAS ===
router.beforeEach((to, from, next) => {
  // Sprawdzamy "twardy dowód" sesji pracownika w pamięci
  const hasEmployeeSession = !!localStorage.getItem('gm_emp_id')

  // ZASADA 1: Zalogowany Pracownik (Kelner) próbuje uciec z Terminala
  if (hasEmployeeSession && to.path !== '/terminal') {
    console.log('Strażnik: Pracowniku, wracaj na swój terminal!')
    return next('/terminal')
  }

  // ZASADA 2: Ktoś bez podanego PIN-u próbuje wejść fizycznie na /terminal
  if (!hasEmployeeSession && to.path === '/terminal') {
    console.log('Strażnik: Brak PIN-u. Przekierowuję do logowania.')
    return next('/logowanie')
  }

  // Wpuszczamy całą resztę przepływu dalej
  next()
})
// === KONIEC STRAŻNIKA ===

export default router