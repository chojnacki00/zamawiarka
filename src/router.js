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
  const hasEmployeeSession = !!localStorage.getItem('gm_emp_id')

  // ZASADA 1: Zalogowany Pracownik chce wejść na logowanie -> odsyłamy na stronę główną
  if (hasEmployeeSession && (to.path === '/logowanie' || to.path === '/login')) {
    return next('/') 
  }

  // ZASADA 2: Chronimy Ustawienia Managera przed Pracownikami!
  const isManagerRoute = ['/ustawienia', '/stanowiska', '/zespol'].includes(to.path)
  if (hasEmployeeSession && isManagerRoute) {
    console.log('Strażnik: Pracownik nie ma dostępu do ustawień Managera!')
    return next('/') // Wyrzucamy go bezpiecznie na stronę główną
  }

  // Wpuszczamy całą resztę przepływu dalej (w tym Pracownika na /zamawiarka itp.)
  next()
})
// === KONIEC STRAŻNIKA ===

export default router