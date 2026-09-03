import { createRouter, createWebHistory } from 'vue-router'
import {
  getAuth,
  onAuthStateChanged
} from 'firebase/auth'
import { useEmployeeAuthStore } from './stores/employeeAuthStore.js' // <-- NOWOŚĆ: Importujemy nasz sklep z uprawnieniami
import { useAccountSessionStore } from './stores/accountSessionStore.js'
import { useAuthorizationStore } from './stores/authorizationStore.js'
import {
  accessContextCanOpenRoute,
  getRoutePermissionRequirement
} from './utils/accessControl.js'
import {
  hasStoredLegacyPinSession,
  isPublicActivationRoute,
  resolveRouteAuthenticationRedirect
} from './utils/routeAccess.js'

import LoginView from './views/LoginView.vue'
import HomeView from './views/HomeView.vue'
import ZamawiarkaView from './views/ZamawiarkaView.vue'
import RentownoscView from './views/RentownoscView.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/rejestracja', name: 'Rejestracja', component: () => import('./views/RegisterView.vue') },
  { path: '/aktywacja', name: 'Aktywacja', component: () => import('./views/ActivationView.vue') },
  { path: '/konto', name: 'KontoDostep', component: () => import('./views/AccountAccessView.vue') },
  { path: '/', name: 'Home', component: HomeView },
  { path: '/zamawiarka', name: 'Zamawiarka', component: ZamawiarkaView },
  { path: '/rentownosc', name: 'Rentownosc', component: RentownoscView },
  { path: '/ustawienia', name: 'Ustawienia', component: () => import('./views/UstawieniaView.vue') },
  { path: '/ustawienia/profile-zatrudnienia', name: 'ProfileZatrudnienia', component: () => import('./views/grafik/GrafikProfileZatrudnieniaView.vue') },
  { path: '/ustawienia/grupy-pracownicze', name: 'GrupyPracownicze', component: () => import('./views/UstawieniaGrupPracowniczychView.vue') },
  { path: '/profile-uprawnien', name: 'ProfileUprawnien', component: () => import('./views/UstawieniaProfiliView.vue') },
  { path: '/stanowiska-grafik', name: 'StanowiskaGrafikowe', component: () => import('./views/StanowiskaGrafikoweView.vue') },
  { path: '/zespol', name: 'Zespol', component: () => import('./views/UstawieniaZespoluView.vue') },
  { path: '/logowanie', name: 'LogowaniePIN', component: () => import('./views/PinLoginView.vue') },
  { path: '/terminal', name: 'Terminal', component: () => import('./views/TerminalView.vue') },
  { path: '/grafik', name: 'GrafikHome', component: () => import('./views/grafik/GrafikHomeView.vue') },
  { path: '/grafik/kalendarz', name: 'GrafikKalendarzZmian', component: () => import('./views/grafik/GrafikKalendarzZmianView.vue') },
  { path: '/grafik/tworzenie', name: 'GrafikTworzenie', component: () => import('./views/grafik/GrafikTworzenieView.vue') },
  { path: '/grafik/grafiki', name: 'GrafikiLista', component: () => import('./views/grafik/GrafikiListaView.vue') },
  { path: '/grafik/grafiki/:id', name: 'GrafikRoboczy', component: () => import('./views/grafik/GrafikRoboczyView.vue') },
  { path: '/grafik/ustawienia', name: 'GrafikUstawienia', component: () => import('./views/grafik/GrafikUstawieniaView.vue') },
  { path: '/grafik/ustawienia/reguly', name: 'GrafikRegulyGeneratora', component: () => import('./views/grafik/GrafikRegulyGeneratoraView.vue') },
  { path: '/grafik/dyspozycyjnosc', name: 'GrafikDyspozycyjnosc', component: () => import('./views/grafik/GrafikDyspozycyjnoscView.vue') },
  {
  path: '/grafik/dyspozycyjnosc/kalendarz',
  name: 'GrafikKalendarzDyspozycji',
  component: () => import('./views/grafik/GrafikKalendarzDyspozycjiView.vue')
 },
 {
  path: '/grafik/dyspozycyjnosc/okresy',
  name: 'GrafikOkresyDyspozycji',
  component: () => import('./views/grafik/GrafikOkresyDyspozycjiView.vue')
  },
  { path: '/grafik/szablony', name: 'GrafikSzablony', component: () => import('./views/grafik/GrafikSzablonyView.vue') },
  { path: '/grafik/szablony/nowy', name: 'GrafikSzablonNowy', component: () => import('./views/grafik/GrafikSzablonEdytorView.vue') },
  { path: '/grafik/szablony/:id', name: 'GrafikSzablonEdycja', component: () => import('./views/grafik/GrafikSzablonEdytorView.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// === STRAŻNIK TRAS ===

const getResolvedFirebaseUser = () => {
  return new Promise((resolve) => {
    const auth = getAuth()

    let unsubscribe = () => {}

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        resolve(user)
      }
    )
  })
}

router.beforeEach(async (to, from, next) => {
  // Publiczna aktywacja sama bezpiecznie sprawdza token. Nie uruchamiamy przed
  // nią bootstrapu konta ani strażników wymagających istniejącej sesji.
  if (isPublicActivationRoute(to)) return next()

    const employeeStore = useEmployeeAuthStore()
    const accountSessionStore = useAccountSessionStore()
    const authorizationStore = useAuthorizationStore()
    const firebaseUser = await getResolvedFirebaseUser()

  if (
    firebaseUser &&
    (!accountSessionStore.isInitialized ||
      accountSessionStore.authUser?.uid !== firebaseUser.uid)
  ) {
    await accountSessionStore.initializeForUser(firebaseUser)
  }

  if (
    firebaseUser &&
    ['/login', '/rejestracja'].includes(to.path) &&
    !accountSessionStore.requiresAccountAction
  ) {
    return next('/konto')
  }

  if (
    firebaseUser &&
    accountSessionStore.requiresAccountAction &&
    !['/konto', '/aktywacja'].includes(to.path)
  ) {
    return next('/konto')
  }

  const hasSavedEmployeeSession = hasStoredLegacyPinSession(localStorage)

  if (
    hasSavedEmployeeSession &&
    !employeeStore.isInitialized
  ) {
    await employeeStore.initSession()
  }

  const hasEmployeeSession =
    Boolean(employeeStore.currentEmployee)
  const authenticationRedirect = resolveRouteAuthenticationRedirect({
    route: to,
    hasFirebaseSession: Boolean(firebaseUser),
    hasLegacyPinSession: hasEmployeeSession
  })

  if (authenticationRedirect) {
    return next(authenticationRedirect)
  }

  // Zalogowany pracownik chce wejść na logowanie -> odsyłamy na stronę główną.
  if (hasEmployeeSession && (to.path === '/logowanie' || to.path === '/login' || to.path === '/rejestracja')) {
    return next('/') 
  }

  const requiredPermissions = getRoutePermissionRequirement(to.path)
  if (
    requiredPermissions.length > 0 &&
    !accessContextCanOpenRoute(authorizationStore.context, to.path)
  ) {
    console.warn('Strażnik: Brak uprawnienia do wybranego widoku.')
    return next('/')
  }

  // Jeśli wszystko jest OK, wpuszczamy dalej
  next()
})
// === KONIEC STRAŻNIKA ===

export default router
