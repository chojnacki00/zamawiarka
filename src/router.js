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
}

]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router