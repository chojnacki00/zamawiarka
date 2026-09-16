<template>
  <div style="min-height: 100vh; background-color: #111827; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif;">
    <h1 style="font-size: 24px; margin-bottom: 10px;">Terminal Pracownika</h1>
    <p style="color: #9ca3af; margin-bottom: 30px;">Zalogowano jako: <strong style="color: #0ea5e9;">{{ authStore.currentEmployee?.imie }}</strong></p>


    <!-- SEKCJA DEBUGOWANIA (do usunięcia w następnym kroku) -->
    <div style="background-color: #1f2937; padding: 15px; border-radius: 8px; margin-bottom: 30px; text-align: left; width: 100%; max-width: 500px; overflow-x: auto;">
      <p style="color: #fbbf24; font-size: 14px; margin-bottom: 10px; font-weight: bold;">Debug: Obiekt pracownika i uprawnienia</p>
      <pre style="font-size: 12px; color: #a7f3d0; margin: 0;">{{ authStore.currentEmployee }}</pre>
    </div>



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