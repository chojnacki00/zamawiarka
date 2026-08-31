import { createRouter, createWebHistory } from 'vue-router'
import {
  getAuth,
  onAuthStateChanged
} from 'firebase/auth'
import { useEmployeeAuthStore } from './stores/employeeAuthStore.js' // <-- NOWOŚĆ: Importujemy nasz sklep z uprawnieniami
import { useAccountSessionStore } from './stores/accountSessionStore.js'
import { canUsePrivilegedEmployeeActions } from './utils/employeeIdentity.js'
import {
  hasStoredLegacyPinSession,
  resolveAuthenticationRedirect
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
    const employeeStore = useEmployeeAuthStore()
    const accountSessionStore = useAccountSessionStore()
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
  const authenticationRedirect = resolveAuthenticationRedirect({
    path: to.path,
    hasFirebaseSession: Boolean(firebaseUser),
    hasLegacyPinSession: hasEmployeeSession
  })

  if (authenticationRedirect) {
    return next(authenticationRedirect)
  }

  const hasAuthenticatedEmployeeContext = canUsePrivilegedEmployeeActions({
    sessionMode: employeeStore.sessionMode,
    firebaseUser,
    hasActiveContext: accountSessionStore.hasActiveContext
  })

  // ZASADA 1: Zalogowany Pracownik chce wejść na logowanie -> odsyłamy na stronę główną
  if (hasEmployeeSession && (to.path === '/logowanie' || to.path === '/login' || to.path === '/rejestracja')) {
    return next('/') 
  }



  // Zarządzanie grafikiem:
  // administrator albo pracownik z uprawnieniem
  if (
    [
      '/grafik/dyspozycyjnosc/okresy',
      '/grafik/tworzenie',
      '/grafik/grafiki',
      '/grafik/ustawienia',
      '/grafik/ustawienia/reguly'
    ].includes(to.path) || to.path.startsWith('/grafik/grafiki/')
  ) {
    if (hasEmployeeSession) {
      if (!hasAuthenticatedEmployeeContext) {
        console.warn(
          'Strażnik: Sesja PIN nie może zarządzać grafikiem.'
        )
        return next('/grafik')
      }

      if (
        !employeeStore.hasPermission(
          'can_manage_schedule'
        )
      ) {
        console.warn(
          'Strażnik: Brak uprawnienia do zarządzania grafikiem!'
        )

        return next('/grafik')
      }
    } else {
      if (!firebaseUser) {
        console.warn(
          'Strażnik: Próba wejścia do zarządzania grafikiem bez logowania!'
        )

        return next('/login')
      }
    }
  }




  // ZASADA 2: Chronimy Ustawienia Managera przed Pracownikami bez uprawnień!
  const isManagerRoute = [
    '/ustawienia',
    '/ustawienia/profile-zatrudnienia',
    '/ustawienia/grupy-pracownicze',
    '/profile-uprawnien',
    '/stanowiska-grafik',
    '/zespol'
  ].includes(to.path)

  if (hasEmployeeSession && isManagerRoute) {
    if (!hasAuthenticatedEmployeeContext) {
      console.warn(
        'Strażnik: Sesja PIN nie może wykonywać operacji administracyjnych.'
      )
      return next('/')
    }

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

  if (to.name === 'GrafikKalendarzZmian') {
    if (hasEmployeeSession) {
      if (!employeeStore.hasPermission('can_view_schedule')) {
        console.warn(
          'Strażnik: Brak uprawnienia do podglądu grafiku!'
        )
        return next('/grafik')
      }
    } else {
      if (!firebaseUser) {
        console.warn(
          'Strażnik: Próba podglądu grafiku bez logowania!'
        )
        return next('/login')
      }
    }
  }

  if (hasEmployeeSession && to.path === '/ustawienia/grupy-pracownicze' && !employeeStore.hasPermission('can_manage_employees')) {
    return next('/ustawienia')
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
