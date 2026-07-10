<template>
  <div style="min-height: 100vh; background-color: #f3f4f6; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', sans-serif;">
    
    <div style="background: white; border-radius: 24px; padding: 40px 30px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); text-align: center;">
      
      <div style="margin-bottom: 30px;">
        <div style="width: 64px; height: 64px; background: #0ea5e9; border-radius: 16px; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; color: white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">GastroManager</h1>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Panel Pracownika</p>
      </div>

      <!-- === ETAP 1: KONFIGURACJA === -->
      <div v-if="!savedRestId" style="animation: fadeIn 0.3s ease;">
        <h2 style="font-size: 18px; color: #111827; margin-bottom: 20px;">Konfiguracja urządzenia</h2>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.5;">
          Podaj <strong>ID Restauracji</strong>, aby powiązać to urządzenie z Twoim lokalem.
        </p>
        
        <!-- POPRAWA KONTRASTU W POLU INPUT -->
        <input 
          v-model="restIdInput" 
          type="text" 
          placeholder="Wklej ID Restauracji..." 
          style="width: 100%; padding: 15px; border: 2px solid #d1d5db; background-color: #f9fafb; color: #0284c7; border-radius: 12px; font-size: 16px; box-sizing: border-box; outline: none; margin-bottom: 20px; text-align: center; font-weight: 700;"
        />
        
        <button 
          @click="saveRestaurantId"
          :disabled="!restIdInput.trim()"
          :style="{ opacity: !restIdInput.trim() ? 0.5 : 1 }"
          style="width: 100%; padding: 15px; border: none; background: #0ea5e9; color: white; font-weight: 600; font-size: 16px; border-radius: 12px; cursor: pointer; transition: 0.2s;"
        >
          Zapisz urządzenie
        </button>
      </div>

      <!-- === ETAP 2: KLAWIATURA PIN === -->
      <div v-else style="animation: fadeIn 0.3s ease;">
        <h2 style="font-size: 18px; color: #111827; margin-bottom: 25px;">Wprowadź PIN</h2>
        
        <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; height: 24px;">
          <div 
            v-for="i in 4" 
            :key="i" 
            style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d1d5db; transition: all 0.2s ease;"
            :style="{ 
              background: pinCode.length >= i ? '#0ea5e9' : 'transparent',
              borderColor: pinCode.length >= i ? '#0ea5e9' : '#d1d5db',
              transform: pinCode.length >= i ? 'scale(1.1)' : 'scale(1)'
            }"
          ></div>
        </div>

        <div v-if="errorMessage" style="color: #ef4444; font-size: 14px; font-weight: 600; margin-bottom: 20px; min-height: 20px; animation: shake 0.4s ease;">
          {{ errorMessage }}
        </div>
        <div v-else style="margin-bottom: 20px; min-height: 20px;"></div>

        <!-- Jeśli zablokowane - ukryj klawiaturę numeryczną -->
        <div v-if="isLocked" style="padding: 20px; background: #fef2f2; border-radius: 12px; color: #ef4444; font-weight: 600; margin-bottom: 20px;">
          Urządzenie tymczasowo zablokowane.
        </div>
        
        <div v-else style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; max-width: 280px; margin: 0 auto;">
          <button v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="num" @click="pressKey(num)" class="numpad-btn">{{ num }}</button>
          <button @click="clearPin" class="numpad-btn" style="background: #fef2f2; color: #ef4444; font-size: 18px;">C</button>
          <button @click="pressKey(0)" class="numpad-btn">0</button>
          <button @click="backspacePin" class="numpad-btn" style="background: #f3f4f6; color: #4b5563;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
          </button>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          <button @click="resetDevice" style="background: none; border: none; color: #9ca3af; font-size: 12px; cursor: pointer; text-decoration: underline;">
            Zmień ID Restauracji
          </button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'

const router = useRouter()
const authStore = useEmployeeAuthStore()

const savedRestId = ref(localStorage.getItem('gm_saved_rest_id') || '')
const restIdInput = ref('')
const pinCode = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// BLOKADA ANTY-ZGADYWANIA
const failedAttempts = ref(parseInt(localStorage.getItem('gm_failed_attempts') || '0'))
const lockoutTimestamp = ref(parseInt(localStorage.getItem('gm_lockout_time') || '0'))
const isLocked = ref(false)
let timerInterval = null

// Sprawdzanie czy czas blokady minął
const checkLockoutStatus = () => {
  const now = Date.now()
  if (lockoutTimestamp.value > now) {
    isLocked.value = true
    const minutesLeft = Math.ceil((lockoutTimestamp.value - now) / 60000)
    errorMessage.value = `Zbyt wiele błędnych prób. Spróbuj za ${minutesLeft} min.`
  } else {
    isLocked.value = false
    if (errorMessage.value.includes('Zbyt wiele błędnych prób')) {
      errorMessage.value = ''
      failedAttempts.value = 0
      localStorage.removeItem('gm_failed_attempts')
    }
  }
}

onMounted(() => {
  checkLockoutStatus()
  timerInterval = setInterval(checkLockoutStatus, 10000) // Odświeżaj status co 10 sekund
})

onUnmounted(() => {
  clearInterval(timerInterval)
})

const saveRestaurantId = () => {
  if (restIdInput.value.trim()) {
    savedRestId.value = restIdInput.value.trim()
    localStorage.setItem('gm_saved_rest_id', savedRestId.value)
  }
}

const resetDevice = () => {
  localStorage.removeItem('gm_saved_rest_id')
  savedRestId.value = ''
  pinCode.value = ''
  errorMessage.value = ''
}

const pressKey = (num) => {
  if (isLoading.value || pinCode.value.length >= 4 || isLocked.value) return
  errorMessage.value = '' 
  pinCode.value += num.toString()
}

const clearPin = () => {
  pinCode.value = ''
  if (!isLocked.value) errorMessage.value = ''
}

const backspacePin = () => {
  pinCode.value = pinCode.value.slice(0, -1)
  if (!isLocked.value) errorMessage.value = ''
}

watch(pinCode, async (newPin) => {
  if (newPin.length === 4) {
    isLoading.value = true
    try {
      await authStore.login(savedRestId.value, newPin)
      
      // Sukces - czyścimy błędy i logujemy
      failedAttempts.value = 0
      localStorage.removeItem('gm_failed_attempts')
      router.push('/terminal')
      
    } catch (error) {
      // Rejestrujemy błąd
      failedAttempts.value += 1
      localStorage.setItem('gm_failed_attempts', failedAttempts.value.toString())
      
      if (failedAttempts.value >= 3) {
        // Blokada na 5 minut (5 * 60 * 1000 ms)
        lockoutTimestamp.value = Date.now() + 300000 
        localStorage.setItem('gm_lockout_time', lockoutTimestamp.value.toString())
        checkLockoutStatus()
      } else {
        errorMessage.value = error.message
      }
      pinCode.value = '' 
    } finally {
      isLoading.value = false
    }
  }
})
</script>

<style scoped>
.numpad-btn {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  height: 70px;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.numpad-btn:active {
  background: #f3f4f6;
  transform: scale(0.95);
  border-color: #d1d5db;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-8px); }
}
</style>