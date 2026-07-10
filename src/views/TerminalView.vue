<template>
  <div style="min-height: 100vh; background-color: #111827; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif;">
    <h1 style="font-size: 24px; margin-bottom: 10px;">Terminal Pracownika</h1>
    <p style="color: #9ca3af; margin-bottom: 30px;">Zalogowano jako: <strong style="color: #0ea5e9;">{{ authStore.currentEmployee?.imie }}</strong></p>
    
    <button 
      @click="wyloguj" 
      style="padding: 15px 30px; background: #ef4444; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 16px; cursor: pointer;"
    >
      Wyloguj (Zamknij zmianę)
    </button>
  </div>
</template>

<script setup>
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'
import { useRouter } from 'vue-router'

const authStore = useEmployeeAuthStore()
const router = useRouter()

const wyloguj = () => {
  authStore.logout() // Funkcja z naszego sklepu - czyści pamięć urządzenia
  router.push('/logowanie') // Odsyła z powrotem do ekranu PIN-u
}
</script>