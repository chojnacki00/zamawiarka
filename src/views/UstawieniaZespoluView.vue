<template>
  <div class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button @click="handleBack" class="zamawiarka-menu-back">←</button>
      <h2 class="zamawiarka-menu-title">ZESPÓŁ</h2>
    </div>

    <div class="scroll-area" ref="scrollAreaRef">
      
      <!-- === WIDOK 1: LISTA PRACOWNIKÓW === -->
      <div v-if="!isFormOpen">
        
        <div style="position: sticky; top: 0; z-index: 10; background: #f9fafb; padding: 20px 20px 10px 20px; border-bottom: 1px solid #e5e7eb;">
          <button 
            @click="openForm()" 
            class="item-card" 
            style="width: 100%; text-align: center; margin-bottom: 15px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; display: block;"
          >
            ➕ Dodaj pracownika
          </button>

          <!-- Pasek Wyszukiwania z przyciskiem X -->
          <div style="position: relative; width: 100%;">
            <div style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="searchPlaceholder"
              @focus="searchPlaceholder = ''"
              @blur="searchPlaceholder = 'Szukaj pracownika...'"
              style="width: 100%; padding: 12px 45px 12px 40px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 15px; color: #111827; caret-color: #0ea5e9; box-sizing: border-box; outline: none; background: white;"
            />

            <button 
              v-if="searchQuery.length > 0"
              @click="searchQuery = ''"
              style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9ca3af; transition: color 0.2s;"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- PRZEWIJANA LISTA -->
        <div style="padding: 10px 20px 20px 20px;">
          
          <div v-if="employeesStore.isLoading || rolesStore.isLoading" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
            ⏳ Wczytywanie danych...
          </div>

          <div v-else-if="filteredAndSortedEmployees.length === 0" style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">
            Brak wyników do wyświetlenia.
          </div>

          <div v-else>
            <div 
              v-for="pracownik in filteredAndSortedEmployees" 
              :key="pracownik.id"
              class="item-card"
              :style="{ opacity: pracownik.aktywny === false ? 0.6 : 1 }"
              style="padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 15px; transition: opacity 0.2s;"
            >
              <div style="flex: 1; min-width: 0;">
                <div translate="no" class="notranslate" style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ pracownik.nazwisko }} {{ pracownik.imie }}
                </div>
                <div style="font-size: 12px; color: #6b7280; display: flex; gap: 8px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  
                  <!-- Odznaka Aktywny/Zablokowany -->
                  <span v-if="pracownik.aktywny !== false" style="background: #d1fae5; color: #059669; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
                    Aktywny
                  </span>
                  <span v-else style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
                    Zablokowany
                  </span>

                  <span translate="no" class="notranslate" style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: #4b5563;">
                    {{ getRoleName(pracownik.roleId) }}
                  </span>
                </div>
              </div>
              
              <div style="display: flex; gap: 10px; flex-shrink: 0;">
                <button @click="openForm(pracownik)" style="background: white; border: 1px solid #d1d5db; border-radius: 8px; color: #374151; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                <button @click="confirmDelete(pracownik)" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #ef4444; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- === WIDOK 2: FORMULARZ DODAWANIA/EDYCJI === -->
      <div v-else style="padding: 20px;">
        
        <!-- === PRZEŁĄCZNIK AKTYWNOŚCI KONTA === -->
        <div style="margin-bottom: 25px; padding: 15px; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">Konto aktywne</div>
            <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">Odznacz, aby zablokować pracownikowi dostęp do systemu.</div>
          </div>
          <label style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">
            <input type="checkbox" v-model="form.aktywny" style="opacity: 0; width: 0; height: 0; position: absolute;">
            <span :style="{ background: form.aktywny ? '#10b981' : '#d1d5db' }" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; border-radius: 24px; transition: .3s;">
              <span :style="{ transform: form.aktywny ? 'translateX(20px)' : 'translateX(2px)' }" style="position: absolute; height: 20px; width: 20px; left: 0; bottom: 2px; background-color: white; border-radius: 50%; transition: .3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
            </span>
          </label>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
          <div style="flex: 1;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 6px;">Imię</label>
            <input v-model="form.imie" type="text" placeholder="Wpisz imię" translate="no" class="notranslate form-input" style="width: 100%; padding: 12px 15px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box; outline: none;" />
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 6px;">Nazwisko</label>
            <input v-model="form.nazwisko" type="text" placeholder="Wpisz nazwisko" translate="no" class="notranslate form-input" style="width: 100%; padding: 12px 15px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box; outline: none;" />
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 6px;">Stanowisko</label>
          <select v-model="form.roleId" translate="no" class="notranslate form-input" style="width: 100%; padding: 12px 15px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box; outline: none; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 15px center; background-size: 18px; padding-right: 45px;">
            <option value="" disabled class="placeholder-option">Wybierz z listy...</option>
            <option v-for="rola in rolesStore.roles" :key="rola.id" :value="rola.id" style="color: #111827;">{{ rola.nazwa }}</option>
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 6px;">PIN do logowania</label>
          <div style="display: flex; gap: 8px; width: 100%;">
            <input v-model="form.pin" type="text" placeholder="4 cyfry" maxlength="4" class="form-input" style="flex: 1; min-width: 0; padding: 12px 15px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 18px; font-weight: 600; letter-spacing: 2px; text-align: center; box-sizing: border-box; outline: none;" />
            <button @click="generateRandomPin" style="white-space: nowrap; flex-shrink: 0; padding: 0 15px; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 10px; font-weight: 600; cursor: pointer;">
              🎲 Losuj
            </button>
          </div>
        </div>

        <h3 style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin: 30px 0 15px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Dane dodatkowe (opcjonalnie)</h3>

        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">Stawka / h (zł)</label>
            <input v-model="form.stawka" type="number" placeholder="Podaj stawkę" class="form-input" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; box-sizing: border-box; outline: none;" />
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">Telefon</label>
            <input v-model="form.telefon" type="tel" placeholder="Wpisz nr tel" class="form-input" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; box-sizing: border-box; outline: none;" />
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <label style="display: block; font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">Adres E-mail</label>
          <input v-model="form.email" type="email" placeholder="Wpisz adres e-mail" class="form-input" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; box-sizing: border-box; outline: none;" />
        </div>

        <div style="display: flex; gap: 12px; margin-top: 30px; padding-bottom: 40px;">
          <button @click="cancelForm" style="flex: 1; padding: 15px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;">Anuluj</button>
          <button @click="saveEmployee" :disabled="!isFormValid || isSaving" :style="{ opacity: (!isFormValid || isSaving) ? 0.5 : 1 }" style="flex: 1; padding: 15px; border: none; background: #0ea5e9; color: white; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer; transition: opacity 0.2s;">
            {{ isSaving ? 'Zapisywanie...' : 'Zapisz' }}
          </button>
        </div>
      </div>

    </div>

    <!-- === MODAL POTWIERDZENIA USUNIĘCIA === -->
    <div v-if="showDeleteModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
      <div style="background: white; border-radius: 20px; padding: 30px 20px; width: 100%; max-width: 340px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); text-align: center;">
        <div style="width: 56px; height: 56px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </div>
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #111827; font-size: 20px; font-weight: 700;">Usuń pracownika</h3>
        <p style="color: #6b7280; font-size: 15px; margin-bottom: 25px; line-height: 1.5;">Czy usunąć pracownika: <br><strong translate="no" class="notranslate" style="color: #374151; font-size: 16px;">{{ empToDelete?.imie }} {{ empToDelete?.nazwisko }}</strong>?</p>
        <div style="display: flex; gap: 12px;">
          <button @click="showDeleteModal = false" :disabled="isSaving" style="flex: 1; padding: 14px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;">Anuluj</button>
          <button @click="executeDelete" :disabled="isSaving" style="flex: 1; padding: 14px; border: none; background: #ef4444; color: white; font-weight: 600; font-size: 15px; border-radius: 10px; cursor: pointer;">{{ isSaving ? 'Usuwanie...' : 'Usuń' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeesStore } from '../stores/employeesStore.js'
import { useRolesStore } from '../stores/rolesStore.js'

const router = useRouter()
const employeesStore = useEmployeesStore()
const rolesStore = useRolesStore()

const scrollAreaRef = ref(null)
let savedScrollPosition = 0

onMounted(async () => {
  await rolesStore.fetchRoles() 
  await employeesStore.fetchEmployees()
})

const isFormOpen = ref(false)
const editingEmpId = ref(null)
const isSaving = ref(false)
const searchQuery = ref('') 
const searchPlaceholder = ref('Szukaj pracownika...')

// Dodane domyślne ustawienie `aktywny: true`
const form = ref({
  imie: '',
  nazwisko: '',
  roleId: '',
  pin: '',
  stawka: '',
  telefon: '',
  email: '',
  aktywny: true 
})

const isFormValid = computed(() => {
  return form.value.imie.trim().length > 0 && 
         form.value.nazwisko.trim().length > 0 && 
         form.value.roleId !== '' && 
         form.value.pin.trim().length >= 4
})

const filteredAndSortedEmployees = computed(() => {
  let list = employeesStore.employees || []

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(emp => {
      const fullname = `${emp.imie || ''} ${emp.nazwisko || ''}`.toLowerCase()
      return fullname.includes(q)
    })
  }

  return list.sort((a, b) => {
    const nazwiskoA = (a.nazwisko || '').toLowerCase()
    const nazwiskoB = (b.nazwisko || '').toLowerCase()
    if (nazwiskoA < nazwiskoB) return -1
    if (nazwiskoA > nazwiskoB) return 1
    return 0
  })
})

const handleBack = () => {
  if (isFormOpen.value) {
    cancelForm()
  } else {
    router.push('/ustawienia')
  }
}

const openForm = (emp = null) => {
  if (scrollAreaRef.value) {
    savedScrollPosition = scrollAreaRef.value.scrollTop
  }

  if (emp) {
    editingEmpId.value = emp.id
    form.value = {
      imie: emp.imie || '',
      nazwisko: emp.nazwisko || '',
      roleId: emp.roleId || '',
      pin: emp.pin || '',
      stawka: emp.stawka || '',
      telefon: emp.telefon || '',
      email: emp.email || '',
      // Jeśli stary pracownik nie miał tego pola w bazie, przyjmujemy, że jest aktywny
      aktywny: emp.aktywny !== false 
    }
  } else {
    editingEmpId.value = null
    form.value = { imie: '', nazwisko: '', roleId: '', pin: '', stawka: '', telefon: '', email: '', aktywny: true }
    generateRandomPin()
  }
  isFormOpen.value = true
}

const cancelForm = () => {
  isFormOpen.value = false
  editingEmpId.value = null
  
  nextTick(() => {
    if (scrollAreaRef.value) {
      scrollAreaRef.value.scrollTop = savedScrollPosition
    }
  })
}

const generateRandomPin = () => {
  const min = 1000
  const max = 9999
  form.value.pin = Math.floor(Math.random() * (max - min + 1) + min).toString()
}

const getRoleName = (roleId) => {
  const rola = rolesStore.roles.find(r => r.id === roleId)
  return rola ? rola.nazwa : 'Brak przypisania'
}

const saveEmployee = async () => {
  if (!isFormValid.value || isSaving.value) return

  isSaving.value = true
  try {
    const dataToSave = { ...form.value }

    if (editingEmpId.value) {
      await employeesStore.updateEmployee(editingEmpId.value, dataToSave)
    } else {
      await employeesStore.addEmployee(dataToSave)
    }
    
    isFormOpen.value = false
    editingEmpId.value = null
    searchQuery.value = ''

    nextTick(() => {
      if (scrollAreaRef.value) {
        scrollAreaRef.value.scrollTop = savedScrollPosition
      }
    })
  } catch (error) {
    alert('Wystąpił błąd podczas zapisu pracownika.')
  } finally {
    isSaving.value = false
  }
}

const showDeleteModal = ref(false)
const empToDelete = ref(null)

const confirmDelete = (emp) => {
  empToDelete.value = emp
  showDeleteModal.value = true
}

const executeDelete = async () => {
  if (empToDelete.value && !isSaving.value) {
    isSaving.value = true
    try {
      await employeesStore.deleteEmployee(empToDelete.value.id)
      showDeleteModal.value = false
      empToDelete.value = null
    } catch (error) {
      alert('Wystąpił błąd podczas usuwania.')
    } finally {
      isSaving.value = false
    }
  }
}
</script>

<style scoped>
.form-input {
  background-color: #f3f4f6 !important; 
  color: #0284c7 !important;            
  font-weight: 600;
}

.form-input::placeholder {
  color: #111827 !important;            
  font-style: italic !important;        
  font-weight: 400 !important;
}

.placeholder-option {
  color: #111827 !important;
  font-style: italic !important;
}
</style>