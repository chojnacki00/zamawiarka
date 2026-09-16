import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // Główne zmienne stanu sesji
  const isLoggedIn = ref(false)
  const currentCompany = ref(null)
  const isDataLoaded = ref(false)

  return {
    isLoggedIn,
    currentCompany,
    isDataLoaded
  }
})