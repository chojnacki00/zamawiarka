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

      <!-- === ETAP 1: KOD PAROWANIA === -->
      <div v-if="!savedRestId" style="animation: fadeIn 0.3s ease;">
        <h2 style="font-size: 18px; color: #111827; margin-bottom: 15px;">Parowanie urządzenia</h2>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 25px; line-height: 1.5;">
          Wpisz <strong>6-cyfrowy kod</strong> wygenerowany przez Managera, aby bezpiecznie połączyć to urządzenie z Twoim lokalem.
        </p>
        
        <input 
          v-model="pairingCodeInput" 
          type="text" 
          inputmode="numeric"
          maxlength="6"
          placeholder="np.123456"
          translate="no" 
          class="notranslate" 
          style="width: 100%; padding: 15px; border: 2px solid #d1d5db; background-color: #f9fafb; color: #0284c7; border-radius: 12px; font-size: 28px; letter-spacing: 6px; box-sizing: border-box; outline: none; margin-bottom: 15px; text-align: center; font-weight: 800;"
        />

        <div v-if="setupError" style="color: #ef4444; font-size: 14px; font-weight: 600; margin-bottom: 15px; min-height: 40px; animation: shake 0.4s ease;">
          {{ setupError }}
        </div>
        <div v-else style="margin-bottom: 15px; min-height: 40px;"></div>
        
        <button 
          @click="pairDevice"
          :disabled="pairingCodeInput.length !== 6 || isLoading"
          :style="{ opacity: (pairingCodeInput.length !== 6 || isLoading) ? 0.5 : 1 }"
          style="width: 100%; padding: 15px; border: none; background: #0ea5e9; color: white; font-weight: 600; font-size: 16px; border-radius: 12px; cursor: pointer; transition: 0.2s;"
        >
          {{ isLoading ? 'Sprawdzanie...' : 'Połącz urządzenie' }}
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
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; max-width: 280px; margin: 0 auto;">
          <button v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="num" @click="pressKey(num)" class="numpad-btn">{{ num }}</button>
          <button @click="clearPin" class="numpad-btn" style="background: #fef2f2; color: #ef4444; font-size: 18px;">C</button>
          <button @click="pressKey(0)" class="numpad-btn">0</button>
          <button @click="backspacePin" class="numpad-btn" style="background: #f3f4f6; color: #4b5563;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
          </button>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          <button @click="resetDevice" style="background: none; border: none; color: #9ca3af; font-size: 12px; cursor: pointer; text-decoration: underline;">
            Odłącz urządzenie (wymaga nowego kodu)
          </button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../stores/employeeAuthStore.js'
import { db } from '../firebase' 
import { doc, getDoc, deleteDoc } from 'firebase/firestore'

const router = useRouter()
const authStore = useEmployeeAuthStore()

const savedRestId = ref(localStorage.getItem('gm_saved_rest_id') || '')
const pairingCodeInput = ref('')
const setupError = ref('')
const pinCode = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// Prosty licznik błędów - resetuje się po wpisaniu poprawnego kodu
const failedAttempts = ref(parseInt(localStorage.getItem('gm_failed_attempts') || '0'))

const pairDevice = async () => {
  const code = pairingCodeInput.value.trim()
  setupError.value = ''

  if (code.length !== 6) {
    setupError.value = 'Kod musi mieć dokładnie 6 cyfr.'
    return
  }

  isLoading.value = true

  try {
    const docRef = doc(db, 'pairing_codes', code)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()

      const expDate = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
      if (expDate < new Date()) {
        setupError.value = 'Ten kod wygasł. Poproś o nowy.'
        await deleteDoc(docRef) 
        return
      }

      // 1. Zapisujemy ID Restauracji
      savedRestId.value = data.companyUid
      localStorage.setItem('gm_saved_rest_id', savedRestId.value)

      // === NOWOŚĆ: Zapisujemy ID przypisanego pracownika ===
      // Szukamy pola, pod którym podczas generowania kodu zapisałeś ID pracownika
      const pairedEmpId = data.empId || data.employeeId || data.id
      if (pairedEmpId) {
        localStorage.setItem('gm_saved_emp_id', pairedEmpId)
      } else {
        console.warn("Uwaga: W dokumencie kodu parowania brakuje przypisanego ID pracownika!")
      }
      // =====================================================

      // Wyczyszczenie błędów po poprawnym parowaniu
      failedAttempts.value = 0
      localStorage.removeItem('gm_failed_attempts')

      await deleteDoc(docRef)

    } else {
      setupError.value = 'Nieprawidłowy kod parowania.'
    }
  } catch (e) {
    console.error("Błąd połączenia z bazą:", e)
    setupError.value = 'Wystąpił błąd podczas sprawdzania kodu.'
  } finally {
    isLoading.value = false
  }
}

const resetDevice = () => {
  localStorage.removeItem('gm_saved_rest_id')
  localStorage.removeItem('gm_saved_emp_id') // NOWOŚĆ: Czyścimy ID pracownika przy resecie
  savedRestId.value = ''
  pinCode.value = ''
  errorMessage.value = ''
  pairingCodeInput.value = ''
}

  const pressKey = (num) => {
  if (isLoading.value || pinCode.value.length >= 4) return
  errorMessage.value = '' 
  pinCode.value += num.toString()
  }

  const clearPin = () => {
  pinCode.value = ''
  errorMessage.value = ''
  }

  const backspacePin = () => {
  pinCode.value = pinCode.value.slice(0, -1)
  errorMessage.value = ''
  }

  watch(pinCode, async (newPin) => {
  if (newPin.length === 4) {
    isLoading.value = true
    try {
      await authStore.login(savedRestId.value, newPin)
      
      // Sukces - resetujemy błędy
      failedAttempts.value = 0
      localStorage.removeItem('gm_failed_attempts')
      router.push('/')
      
    } catch (error) {
      failedAttempts.value += 1
      localStorage.setItem('gm_failed_attempts', failedAttempts.value.toString())
      
      if (failedAttempts.value >= 3) {
        // TWARDY RESET - ODŁĄCZAMY URZĄDZENIE
        resetDevice()
        setupError.value = 'Zbyt wiele błędnych prób logowania. Ze względów bezpieczeństwa urządzenie zostało odłączone. Poproś o nowy kod parowania.'
      } else {
        errorMessage.value = `Błędny PIN. Pozostałe próby: ${3 - failedAttempts.value}`
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