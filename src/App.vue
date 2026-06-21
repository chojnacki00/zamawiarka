<template>
  <!-- =========================
       LOGIN commit2
  ========================== -->
   <div
    v-if="!isLoggedIn"
    class="login-screen"
  >
    <form
      class="login-card"
      @submit.prevent="handleLogin"
      autocomplete="on"
    >
      <h1 class="login-title">GastroManager</h1>
      <div class="login-subtitle">Zaloguj się do swojej restauracji</div>

      <div class="supplier-form-group" style="margin-top:20px;">
  <label class="supplier-form-label" for="login-email">E-mail</label>
  <input
    id="login-email"
    v-model="authForm.email"
    type="email"
    class="login-input"
    placeholder="Wpisz e-mail"
    name="email"
    autocomplete="username"
    autocapitalize="none"
    autocorrect="off"
    spellcheck="false"
  />
</div>

      <div class="supplier-form-group">
        <label class="supplier-form-label" for="login-password">Hasło</label>
        <input
          id="login-password"
          v-model="authForm.password"
          type="password"
          class="login-input"
          placeholder="Wpisz hasło"
          name="password"
          autocomplete="current-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
      </div>

      <div
        v-if="authError"
        style="margin-top:10px; font-size:14px; color:#dc2626; font-weight:600;"
      >
        {{ authError }}
      </div>

  <button
  class="login-button"
  type="submit"
  :disabled="isLoggingIn"
  :class="{ 'login-button-loading': isLoggingIn }"
>
  <span v-if="!isLoggingIn">Zaloguj</span>
  <span v-else class="login-button-content">
    <span class="login-spinner"></span>
    <span>Logowanie...</span>
  </span>
</button>
    </form>
  </div>

  <!-- =========================
       APP / KONTENER GŁÓWNY
  ========================== -->
  <div
  v-else
  class="app"
>

<div v-if="!isDataLoaded" style="height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
    
    <div class="login-spinner" style="border-top-color: #2563eb; width: 48px; height: 48px; border-width: 4px; margin-bottom: 24px;"></div>
    
    <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #111827; text-align: center; letter-spacing: 0.5px;">
      Pobieranie danych...
    </h2>
    <div style="font-size: 15px; color: #6b7280; margin-top: 8px; text-align: center;">
      Proszę czekać, ładuję dane
    </div>

  </div>
  


  <div v-else>
    </div>


  

   <!-- =========================
     HOME
========================== -->
<div v-if="currentScreen === 'home'" class="home-screen-ios">
  <div class="home-header-ios">

    <button 
      @click="currentScreen = 'settings'"
      style="position: absolute; top: 97px; right: -1px; background: none; border: none; font-size: 35px; cursor: pointer; padding: 10px;"
      aria-label="Ustawienia"
    >
      ⚙️
    </button>


    <h1 class="home-title-ios">GastroManager</h1>

    <div class="home-version-ios">wersja {{ appVersion }}</div>

        <div
      v-if="currentCompany"
      class="home-account-ios"
    >
      <span class="home-account-icon">👤</span>
      <span>Konto:</span>
      <strong translate="no" class="notranslate">{{ currentCompany.companyName }}</strong>
    </div>
  </div>

  <div class="home-content-ios">
    
    <!-- GŁÓWNE MENU APLIKACJI (SIATKA KAFELKÓW) -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; max-width: 380px; margin: 40px auto 30px auto; padding: 0 20px; box-sizing: border-box;">
      
      <!-- KAFELEK 1: ZAMAWIARKA -->
      <button
        v-if="aktywneModuly.includes('zamawiarka')"
        @click="openZamawiarkaMenuFromHome"
        class="ios-menu-tile"
        style="margin: 0; min-height: 140px; box-sizing: border-box;"
      >
        <div class="ios-menu-icon ios-menu-icon-blue">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <div class="ios-menu-title" style="font-size: 15px;">Zamawiarka</div>
      </button>

      <!-- KAFELEK 2: RENTOWNOŚĆ MENU -->
      <button
        v-if="aktywneModuly.includes('rentownosc')"
        @click="currentScreen = 'receptury'; recepturyView = 'dashboard'"
        class="ios-menu-tile"
        style="margin: 0; min-height: 140px; box-sizing: border-box;"
      >
        <div class="ios-menu-icon ios-menu-icon-green">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
            <path d="M7 2v20"/>
            <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
          </svg>
        </div>
        <div class="ios-menu-title" style="font-size: 15px;">Rentowność Menu</div>
      </button>



      

       





    </div>

        <!-- WYLOGUJ -->
    <button
      @click="handleLogout"
      class="home-logout-ios"
    >
      <span class="home-logout-icon">⏻</span>
      <span>Wyloguj</span>
    </button>

    <div class="home-footer-ios">
      GastroManager © 2026
    </div>

  </div>
</div>


<div v-if="currentScreen === 'settings'" class="screen-with-topbar">
  <div class="zamawiarka-menu-topbar">
    <button @click="currentScreen = 'home'" class="zamawiarka-menu-back">←</button>
    <h2 class="zamawiarka-menu-title">USTAWIENIA APLIKACJI</h2>
  </div>

  <div class="scroll-area" style="padding: 20px;">
    <button 
      @click="eksportujBackup" 
      class="item-card" 
      style="width: 100%; text-align: center; margin-bottom: 15px; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block;"
    >
      💾 Utwórz kopię zapasową
    </button>

    <button 
      @click="triggerFileInput"
      class="item-card" 
      style="width: 100%; text-align: center; cursor: pointer; padding: 15px; font-size: 16px; font-weight: 600; color: #111827; display: block;"
    >
      📂 Przywróć dane z pliku
    </button>

    <input 
      type="file" 
      ref="backupInputRef" 
      style="display: none" 
      accept=".json" 
      @change="wczytajBackup" 
    />
  </div>
</div>



<div v-if="currentScreen === 'receptury' && recepturyView === 'dashboard'" class="screen-with-topbar">
      
      <div class="zamawiarka-menu-topbar">
        <button @click="currentScreen = 'home'" class="zamawiarka-menu-back">
          ←
        </button>
        <h2 class="zamawiarka-menu-title" style="font-size: 16px; white-space: nowrap;">RENTOWNOŚĆ MENU</h2>
      </div>

      <div class="scroll-area" style="padding: 0 16px; display: flex; flex-direction: column;">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          
          <div class="item-card" style="padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Średni FC</div>
            <div style="font-size: 24px; font-weight: 800; color: #111827; margin-top: 4px;">28.4%</div>
          </div>
          
          <div class="item-card" style="padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Średnia Marża %</div>
            <div style="font-size: 24px; font-weight: 800; color: #16a34a; margin-top: 4px;">18.5%</div>
          </div>
          
          <div class="item-card" style="padding: 14px; text-align: center; grid-column: span 2; display: flex; align-items: center; justify-content: center; gap: 10px; background: #fef2f2; border-color: #fca5a5;">
            <span style="font-size: 24px;">🚨</span>
            <div style="text-align: left;">
              <div style="font-size: 18px; font-weight: 800; color: #dc2626;">4 pozycje</div>
              <div style="font-size: 12px; color: #991b1b; font-weight: 600;">wymagają pilnej uwagi!</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="font-size: 15px; color: #dc2626; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🔻</span> Najwyższy FC
            </h3>
            <button style="background: none; border: none; color: #007aff; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0;">Pokaż (5)</button>
          </div>
          
          <div class="item-card" style="border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 14px;">Burger Szefa (Atrapa)</div>
              <div style="font-size: 11px; color: #6b7280;">Koszt: 12.50 zł | Zysk: 16.50 zł</div>
            </div>
            <div style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 13px;">43.1%</div>
          </div>
          
          <div class="item-card" style="border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 14px;">Żeberka BBQ (Atrapa)</div>
              <div style="font-size: 11px; color: #6b7280;">Koszt: 18.20 zł | Zysk: 21.80 zł</div>
            </div>
            <div style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 13px;">41.5%</div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="font-size: 15px; color: #16a34a; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🏆</span> Najniższy FC
            </h3>
            <button style="background: none; border: none; color: #007aff; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0;">Pokaż (5)</button>
          </div>
          
          <div class="item-card" style="border-left: 4px solid #16a34a; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 14px;">Zupa Pomidorowa (Atrapa)</div>
              <div style="font-size: 11px; color: #6b7280;">Koszt: 3.20 zł | Zysk: 14.80 zł</div>
            </div>
            <div style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 13px;">17.7%</div>
          </div>
          
          <div class="item-card" style="border-left: 4px solid #16a34a; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 14px;">Lemoniada (Atrapa)</div>
              <div style="font-size: 11px; color: #6b7280;">Koszt: 1.50 zł | Zysk: 13.50 zł</div>
            </div>
            <div style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 13px;">10.0%</div>
          </div>
        </div>

      </div> 
      <div style="display: flex; justify-content: space-around; padding: 10px 16px 20px 16px; flex-shrink: 0;">
        
        <button @click="recepturyView = 'lista'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">📋</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Menu</span>
        </button>

        <button @click="recepturyView = 'dashboard'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px;">📊</span>
          <span style="font-size: 11px; font-weight: 700; color: #0284c7;">Analiza</span>
        </button>

        <button @click="recepturyView = 'ustawienia'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">⚙️</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Ustawienia</span>
        </button>

      </div>

    </div>




    <div v-if="currentScreen === 'receptury' && recepturyView === 'lista'" class="screen-with-topbar">
      
      <div class="zamawiarka-menu-topbar">
        <button @click="recepturyView = 'dashboard'" class="zamawiarka-menu-back">
          ←
        </button>
        <h2 class="zamawiarka-menu-title" style="font-size: 16px; white-space: nowrap;">MENU</h2>
      </div>

      <div class="scroll-area" style="padding: 0 16px; display: flex; flex-direction: column;">

        <!-- dodaje danie do menu -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-size: 18px; color: #111827; margin: 0;">Lista dań</h3>
          <button @click="openDishForm()" style="background: #2563eb; color: #ffffff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 24px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.3); flex-shrink: 0;" aria-label="Dodaj danie">
            +
          </button>
        </div>

        <!-- Lista kategorii -->
        <div style="display:flex; flex-direction:column; gap:10px; margin-top: 20px;">
          <div v-for="cat in dishCategories" :key="cat.id" style="display:flex; flex-direction:column; gap:8px;">
            
                        <button 
              @click="selectedCategory = selectedCategory === cat.name ? null : cat.name" 
              class="item-card" 
              :style="{ padding: '16px', textAlign: 'left', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: selectedCategory === cat.name ? '2px solid #2563eb' : '1px solid #ddd', backgroundColor: selectedCategory === cat.name ? '#eff6ff' : '#ffffff' }"
            >
              <span style="font-size: 16px; color: #111827;">{{ cat.name }}</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #6b7280; font-size: 13px; font-weight: 400;">
                  {{ menuItems.filter(item => item.category === cat.name).length }} pozycji
                </span>
                <span style="font-size: 16px; color: #2563eb;">
                  {{ selectedCategory === cat.name ? '▲' : '▼' }}
                </span>
              </div>
            </button>

                        <div v-if="selectedCategory === cat.name" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
                            <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">
                <div style="display: flex; gap: 16px;">
                  <div>
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">FC Rzecz.</div>
                    <div :style="{ fontSize: '16px', fontWeight: '800', color: currentCategoryFC > (cat.targetFC || fcSettings.target) ? '#dc2626' : '#16a34a' }">
                      {{ currentCategoryFC }}%
                    </div>
                  </div>
                  <div style="width: 1px; background: #cbd5e1;"></div>
                  <div>
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">FC Cel</div>
                    <div style="font-size: 16px; font-weight: 800; color: #1e293b;">
                      {{ cat.targetFC || fcSettings.target }}%
                    </div>
                  </div>
                </div>

                                <button 
                  @click="fcSortOrder = fcSortOrder === 'desc' ? 'asc' : 'desc'"
                  style="display: flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; color: #3b82f6; font-size: 12px; font-weight: 700; cursor: pointer; padding: 6px 10px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                >
                  Sortuj
                  <span style="font-size: 14px; line-height: 1;">
                    {{ fcSortOrder === 'desc' ? '↓' : '↑' }}
                  </span>
                </button>
              </div>

                            <div style="max-height: 45vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                <div v-if="filteredMenuItems.length === 0" style="text-align: center; padding: 20px; color: #6b7280; font-size: 13px;">
                  Brak dań w tej kategorii.
                </div>

               <div
                  v-for="item in filteredMenuItems" 
                  :key="item.id" 
                  @click="openDishDetails(item)"
                  class="item-card" 
                  style="padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 8px;"
                >
                  <div style="flex: 1; min-width: 0; overflow: hidden; margin-right: 12px;">
                    <div class="towary-col-name" style="font-size: 16px; color: #111827; font-weight: 700;">
                      {{ item.name }}
                    </div>
                    <div style="font-size: 12px; color: #6b7280; font-weight: 600;">
                      Koszt: {{ Number(item.koszt || 0).toFixed(2) }} zł
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                    <div 
                      :title="'Food Cost: ' + ((item.cena && item.cena > 0) ? ((item.koszt / item.cena) * 100).toFixed(1) : 0) + '%'" 
                      :style="{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ((item.cena && item.cena > 0) ? (item.koszt / item.cena) * 100 : 0) > (cat.targetFC || fcSettings.target) ? '#ef4444' : '#22c55e' }"
                    ></div>
                    <div class="towary-col-price" style="font-size: 18px; font-weight: 800; color: #111827; min-width: 60px; text-align: right;">
                      {{ Number(item.cena || 0).toFixed(2) }} <span style="font-size: 12px; font-weight: 600; color: #6b7280;">zł</span>
                    </div>
                  </div>






                  
                  



                </div>
              </div>
            </div>
          </div>
        </div>

      </div> 



      







      <div style="display: flex; justify-content: space-around; padding: 10px 16px 20px 16px; flex-shrink: 0;">
        <button @click="recepturyView = 'lista'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px;">📋</span>
          <span style="font-size: 11px; font-weight: 700; color: #0284c7;">Menu</span>
        </button>
        <button @click="recepturyView = 'dashboard'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">📊</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Analiza</span>
        </button>
        <button @click="recepturyView = 'ustawienia'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">⚙️</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Ustawienia</span>
        </button>
      </div>
    </div>



    <div v-if="currentScreen === 'receptury' && recepturyView === 'form'" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; background: #f8fafc; padding-bottom: 100px;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 12px 16px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <button @click="closeDishForm" style="background: none; border: none; color: #64748b; font-size: 24px; font-weight: 700; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;" title="Wróć do listy">
          ←
        </button>
        <h2 style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 800;">
          {{ editingDish?.id && menuItems.find(i => i.id === editingDish?.id) ? 'Edycja dania' : 'Nowe danie' }}
        </h2>
        <button @click="saveDishForm" style="background: #22c55e; border: none; color: #ffffff; font-size: 20px; cursor: pointer; padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(34,197,94,0.2);" title="Zapisz">
          💾
        </button>
      </div>

      <div style="background: #ffffff; padding: 20px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px;">
        
        <div>
          <label style="display: block; font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Nazwa dania w karcie</label>
          <input v-model="editingDish.name" type="text" placeholder="Wpisz nazwę..." autocomplete="off" style="width: 100%; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fafafa; font-size: 16px; font-weight: 600; color: #1e293b; box-sizing: border-box; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#3b82f6'; this.style.background='#ffffff'" onblur="this.style.borderColor='#e2e8f0'; this.style.background='#fafafa'">
        </div>

        <div>
          <label style="display: block; font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Kategoria</label>
          <select v-model="editingDish.category" style="width: 100%; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background-color: #fafafa; background-image: url('data:image/svg+xml;utf8,<svg fill=%22%2364748b%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>'); background-repeat: no-repeat; background-position: right 10px center; font-size: 15px; font-weight: 600; color: #1e293b; box-sizing: border-box; appearance: none; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#ffffff'" onblur="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#fafafa'">
            <option value="" disabled selected>Wybierz kategorię...</option>
            <option v-for="cat in dishCategories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Cena brutto (zł)</label>
            <input 
              v-model.number="editingDish.cena" 
              type="number" 
              step="0.01" 
              @focus="editingDish.cena === 0 ? editingDish.cena = '' : null"
              @blur="editingDish.cena === '' ? editingDish.cena = 0 : null"
              style="width: 100%; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fafafa; font-size: 18px; font-weight: 800; color: #111827; box-sizing: border-box; text-align: right; outline: none; transition: all 0.2s;" 
              onfocus="this.style.borderColor='#3b82f6'; this.style.background='#ffffff'" 
              onblur="this.style.borderColor='#e2e8f0'; this.style.background='#fafafa'">
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">VAT (%)</label>
            <input 
              v-model.number="editingDish.vat" 
              type="number" 
              placeholder="np. 8"
              @focus="editingDish.vat === 0 ? editingDish.vat = '' : null"
              @blur="editingDish.vat === '' ? editingDish.vat = 0 : null"
              style="width: 100%; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fafafa; font-size: 16px; font-weight: 700; color: #1e293b; box-sizing: border-box; text-align: center; outline: none; transition: all 0.2s;" 
              onfocus="this.style.borderColor='#3b82f6'; this.style.background='#ffffff'" 
              onblur="this.style.borderColor='#e2e8f0'; this.style.background='#fafafa'">
          </div>
        </div>
      </div>

      <div style="background: #ffffff; padding: 20px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #1e293b; text-transform: uppercase;">Składniki receptury</h3>
          <button @click="openIngredientModal()" style="background: #2563eb; color: #ffffff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 24px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.3); flex-shrink: 0;" aria-label="Dodaj składnik">
            +
          </button>
        </div>

        <div v-if="!editingDish.recipe || editingDish.recipe.length === 0" style="text-align: center; padding: 20px; color: #94a3b8; font-weight: 600; border: 1px dashed #cbd5e1; border-radius: 12px; font-size: 14px;">
          Brak składników. Kliknij przycisk, aby dodać pierwszy surowiec.
        </div>

        <div v-else style="display: flex; flex-direction: column; gap: 8px;">
          <div
            v-for="(ing, index) in editingDish.recipe"
            :key="ing.id"
            @click="editRecipeIngredient(ing, index)"
            class="item-card"
            style="padding: 12px 16px; display: grid; grid-template-columns: 1fr auto; gap: 10px; cursor: pointer; align-items: center; margin-bottom: 0;"
          >
            <div style="min-width: 0;">
              <div style="font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ ing.name }}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Zużycie: {{ ing.qty }} {{ ing.unit }}</div>
            </div>
            <div style="text-align: right; font-weight: 800; color: #111827; font-size: 15px;">
              {{ (ing.qty * ing.netPrice).toFixed(2) }} <span style="font-size: 11px; font-weight: 600; color: #6b7280;">zł</span>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;">Całkowity koszt:</div>
            <div style="font-size: 18px; font-weight: 800; color: #dc2626;">{{ calculateTotalRecipeCost().toFixed(2) }} <span style="font-size: 13px; color: #64748b;">zł</span></div>
          </div>
        </div>
      </div>

      <div v-if="showIngredientModal" class="supplier-modal-overlay" style="z-index: 9999; padding-top: 60px;">
        <div class="supplier-modal-card" style="display: flex; flex-direction: column; max-height: 85vh; padding: 20px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 class="supplier-modal-title" style="margin: 0; font-size: 18px;">
              {{ selectedIngredientTowar ? 'PODAJ ILOŚĆ' : 'WYBIERZ SUROWIEC' }}
            </h3>
            <button @click="closeIngredientModal" style="background: #f3f4f6; border: none; font-size: 20px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: #4b5563; display: flex; align-items: center; justify-content: center;">&times;</button>
          </div>

          <div v-if="!selectedIngredientTowar" style="display: flex; flex-direction: column; min-height: 0; flex: 1;">
            <input
              v-model="ingredientSearch"
              type="text"
              placeholder="Szukaj towaru po nazwie..."
              class="towary-search-input"
              style="margin-bottom: 12px; flex-shrink: 0;"
            />
            
            <div class="scroll-area" style="padding-bottom: 20px;">
              <div v-if="filteredIngredientTowary.length === 0" style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 20px;">
                Brak wyników wyszukiwania
              </div>
              
              <div
                v-for="item in filteredIngredientTowary"
                :key="item.id"
                @click="selectIngredient(item)"
                class="towary-row-fixed"
                style="grid-template-columns: 1fr auto; cursor: pointer; margin-bottom: 8px; min-height: unset; padding: 12px;"
              >
                <div style="min-width: 0;">
                  <div class="towary-col-name" style="font-size: 15px;">{{ item.name }}</div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">{{ item.supplier || 'Brak hurtowni' }}</div>
                </div>
                <div style="text-align: right;">
                  <div class="towary-col-price" style="font-size: 15px;">{{ Number(item.netPrice || 0).toFixed(2) }} zł</div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">za 1 {{ item.unit }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else style="display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <div style="font-weight: 700; font-size: 16px; color: #111827;">{{ selectedIngredientTowar.name }}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Cena netto: {{ Number(selectedIngredientTowar.netPrice || 0).toFixed(2) }} zł / {{ selectedIngredientTowar.unit }}</div>
            </div>

            <div class="supplier-form-group">
              <label class="supplier-form-label">Zużycie na porcję (w: {{ selectedIngredientTowar.unit }})</label>
              <input
                v-model.number="ingredientQty"
                type="number"
                step="0.001"
                placeholder="np. 0.15"
                class="supplier-form-input"
              />
            </div>

            <div class="supplier-modal-actions" style="margin-top: 10px; display: flex; gap: 8px;">
              <button 
                v-if="editingRecipeIndex !== null" 
                @click="removeIngredientFromRecipe" 
                style="width: 48px; flex-shrink: 0; background: #fee2e2; border: none; border-radius: 10px; color: #dc2626; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;"
              >
                🗑️
              </button>
              
              <button 
                @click="goBackToIngredientList" 
                class="supplier-cancel-button" 
                style="flex: 1;" 
              >
                {{ editingRecipeIndex !== null ? 'Anuluj' : 'Wróć' }}
              </button>
              
              <button 
                @click="saveIngredientToRecipe" 
                class="supplier-save-button" 
                style="flex: 1;"
              >
                {{ editingRecipeIndex !== null ? 'Zapisz' : 'Dodaj' }}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>





    <div v-if="currentScreen === 'receptury' && recepturyView === 'ustawienia'" class="screen-with-topbar">
      
      <div class="zamawiarka-menu-topbar">
        <button @click="recepturyView = 'dashboard'" class="zamawiarka-menu-back">
          ←
        </button>
        <h2 class="zamawiarka-menu-title" style="font-size: 16px; white-space: nowrap;">USTAWIENIA</h2>
      </div>

      <div class="scroll-area" style="padding: 0 16px;">
        
        <h3 style="font-size: 16px; color: #111827; margin-bottom: 12px;">Cele i alarmy</h3>
        
        <div class="item-card" style="margin-bottom: 24px; margin-left: -4px; margin-right: -4px; width: auto; padding: 16px 12px; position: relative;">
          <div class="supplier-form-group">
            <label class="supplier-form-label"><span translate="no" class="notranslate">Food Cost</span> ogólny (%)</label>
            <input v-model.number="fcSettings.target" @input="markSettingsDirty" type="number" class="supplier-form-input" placeholder="podaj FC %" />
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Wartość do której dążysz, poniżej tej wartości wskaźniki będą zielone, powyżej czerwone.</div>
          </div>

          <div class="supplier-form-group" style="margin-bottom: 0;">
            <label class="supplier-form-label" style="white-space: nowrap; letter-spacing: -0.3px;">Dopuszczalne odchylenie <span translate="no" class="notranslate">FC</span> - Delta (%)</label>
            <input v-model.number="fcSettings.tolerance" @input="markSettingsDirty" type="number" class="supplier-form-input" placeholder="podaj deltę %" />
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">O ile procent wynik może przekroczyć cel, zanim włączy się alarm.</div>
          </div>

          <button v-if="isSettingsDirty" @click="saveSettings" style="margin-top: 15px; width: 100%; padding: 12px; border: none; border-radius: 10px; background: #28a745; color: white; font-weight: 700; cursor: pointer;">
            ✅ Zapisz zmiany
          </button>
        </div>

            <!--dodaje kategorie dania-->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; color: #111827; margin: 0;">Kategorie menu</h3>
          <button @click="openDishCategoryForm" style="background: #2563eb; color: #ffffff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 24px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.3); flex-shrink: 0;" aria-label="Dodaj kategorię">
            +
          </button>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:8px; padding-bottom: 20px;">
          <div v-for="cat in dishCategories" :key="cat.id" class="item-card" style="padding: 12px; display: flex; align-items: center; position: relative;">
            <div style="flex: 1; text-align: center;">
              <div style="font-weight: 600;">{{ cat.name }}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                Cel FC: <strong style="color: #111827;">{{ cat.targetFC ? cat.targetFC + '%' : 'wg ogólnych ustawień' }}</strong>
              </div>
            </div>
            <button @click="editDishCategory(cat)" class="supplier-edit-button" style="width: 32px; height: 32px; font-size: 14px; position: absolute; right: 12px;">✏️</button>
          </div>
        </div>


        <div v-if="showDishCategoryForm" class="supplier-modal-overlay">
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ dishCategoryFormMode === 'edit' ? 'EDYTUJ KATEGORIĘ' : 'DODAJ KATEGORIĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa kategorii</label>
            <input
              v-model="dishCategoryForm.name"
              type="text"
              placeholder="Np. Przystawki, Zupy"
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Indywidualny Food Cost (%)</label>
            <input
              v-model="dishCategoryForm.targetFC"
              type="number"
              placeholder="wg ogólnych ustawień"
              class="supplier-form-input"
            />
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              Aktualnie używany cel: 
              <strong style="color: #111827;">{{ dishCategoryForm.targetFC ? dishCategoryForm.targetFC + '% (własny)' : fcSettings.target + '% (ogólny)' }}</strong>
            </div>
          </div>

          <div class="supplier-modal-actions">
            <button
              v-if="dishCategoryFormMode === 'edit'"
              @click="deleteDishCategory"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <button @click="closeDishCategoryForm" class="supplier-cancel-button">
              Anuluj
            </button>

            <button @click="saveDishCategory" class="supplier-save-button">
              Zapisz
            </button>
          </div>
        </div>
      </div>




      </div>

      <div style="display: flex; justify-content: space-around; padding: 10px 16px 20px 16px; flex-shrink: 0;">
        <button @click="recepturyView = 'lista'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">📋</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Menu</span>
        </button>
        <button @click="recepturyView = 'dashboard'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">📊</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Analiza</span>
        </button>
        <button @click="recepturyView = 'ustawienia'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px;">⚙️</span>
          <span style="font-size: 11px; font-weight: 700; color: #0284c7;">Ustawienia</span>
        </button>
      </div>
    </div>





    <!-- =========================
         ZAMAWIARKA / MENU
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'menu'">
    <div class="zamawiarka-menu-topbar">
  <button
  @click="currentScreen = 'home'; zamawiarkaView = 'menu'"
  class="zamawiarka-menu-back"
>
    ←
  </button>
  <h2 class="zamawiarka-menu-title">ZAMAWIARKA</h2>
</div>

            <div
  class="zamawiarka-menu-grid-ios"
  :class="{ 'menu-tiles-animate': animateMenuTiles }"
>
        <button
  @click="zamawiarkaView = 'produkty'"
  class="ios-menu-tile"
>
  <div class="ios-menu-icon ios-menu-icon-blue">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  </div>

  <div class="ios-menu-title">Zamówienia</div>
  <div class="ios-menu-subtitle">Złóż zamówienie</div>
</button>

        <button
  @click="zamawiarkaView = 'koszyk'"
  class="ios-menu-tile"
>
  <div class="ios-menu-icon ios-menu-icon-green">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  </div>

  <div class="ios-menu-title">
    Koszyk ({{ cartItems.length }})
  </div>
  <div class="ios-menu-subtitle">Twoje produkty</div>
</button>

  <button
  @click="zamawiarkaView = 'historia'"
  class="ios-menu-tile"
>
  <div class="ios-menu-icon ios-menu-icon-orange">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M8 2v4"/>
      <path d="M16 2v4"/>
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <path d="M3 10h18"/>
      <path d="M8 14h.01"/>
      <path d="M12 14h.01"/>
      <path d="M16 14h.01"/>
      <path d="M8 18h.01"/>
      <path d="M12 18h.01"/>
      <path d="M16 18h.01"/>
    </svg>
  </div>

  <div class="ios-menu-title">Rejestr</div>
  <div class="ios-menu-subtitle">Historia zamówień</div>
</button>

  <button
  @click="zamawiarkaView = 'towary'"
  class="ios-menu-tile"
>
  <div class="ios-menu-icon ios-menu-icon-purple">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <path d="M3.3 7l8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  </div>

  <div class="ios-menu-title">Towary</div>
  <div class="ios-menu-subtitle">Lista produktów</div>
</button>








 <button
  @click="zamawiarkaView = 'ustawienia'"
  class="ios-menu-tile"
>
  <div class="ios-menu-icon ios-menu-icon-gray">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.24.66 1.82.33h0c.6-.2 1-.8 1-1.51V3a2 2 0 1 1 4 0v.09c0 .7.4 1.31 1 1.51.58.33 1.32.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.5.5-.66 1.24-.33 1.82.2.6.8 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.31.4-1.51 1z"/>
    </svg>
  </div>

  <div class="ios-menu-title">Ustawienia</div>
  <div class="ios-menu-subtitle">Konfiguracja</div>
</button>

<button
  @click="generateHelpText(); zamawiarkaView = 'pomoc'"
  class="ios-menu-tile"
>
  <div class="ios-menu-icon ios-menu-icon-red">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 9h.01"/>
      <path d="M15 9h.01"/>
      <path d="M8 15s1.5-2 4-2 4 2 4 2"/>
    </svg>
  </div>

  <div class="ios-menu-title">Pomoc</div>
  <div class="ios-menu-subtitle">Wsparcie</div>
</button>


      </div>
    </div>



    <!-- =========================
     WIDOK: POMOC
========================== -->
<Transition name="screen-soft" appear>
<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'pomoc'" class="screen-with-topbar">
  <div class="towary-topbar">
    <div class="towary-topbar-row">
      <div class="towary-topbar-left">
        <button
  @click="zamawiarkaView = 'menu'"
  class="towary-icon-button"
  title="Wróć"
>
  ←
</button>

        <h2 class="towary-title towary-title-center">POMOC</h2>
      </div>
    </div>
  </div>

  <div class="help-ios-screen">
    <div class="help-ios-card">
      <div class="help-ios-icon">💡</div>

      <div class="help-typing">
 <span class="help-line help-line-1">{{ helpLine1 }}</span>
<span class="help-line help-line-2">{{ helpLine2 }}</span>
</div>
    </div>
  </div>
</div>
</Transition>



<!-- =========================
     WIDOK: ZRÓB ZAMÓWIENIE
========================== -->
<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'produkty'" class="screen-with-topbar">

  <!-- =========================
       NAGŁÓWEK
  ========================== -->
    <!-- =========================
       TOPBAR: ZRÓB ZAMÓWIENIE
  ========================== -->
  <div class="towary-topbar">
    <!-- WIERSZ STANDARDOWY -->
    <div v-if="!showProductSearch" class="towary-topbar-row">
      <div class="towary-topbar-left">
        <button
          @click="zamawiarkaView = 'menu'"
          class="towary-icon-button"
          title="Wróć"
        >
          ←
        </button>

        <h2 class="towary-title">ZRÓB ZAMÓWIENIE</h2>
      </div>

      <div class="towary-topbar-right">


      <div style="position:relative;">

 <button
  @click="zamawiarkaView = 'koszyk'"
  class="towary-icon-button"
  title="Koszyk"
>
  <svg
    :class="{ 'cart-bounce': cartBounce }"
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#111827"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="9" cy="20" r="1"></circle>
    <circle cx="20" cy="20" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a1 1 0 0 0 1 .81h9.72a1 1 0 0 0 1-.76L23 6H6"></path>
  </svg>
</button>

  <div
  v-if="cartItems.length > 0"
  style="
    position:absolute;
    top:-6px;
    right:-6px;
    background:#dc2626;
    color:white;
    font-size:11px;
    min-width:18px;
    height:18px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:700;
    padding:0 4px;
  "
>
  {{ cartItems.length }}
</div>
</div>



        <button
          @click="showProductSearch = true"
          class="towary-icon-button"
          title="Szukaj"
        >
          🔍
        </button>
      </div>
    </div>

    <!-- WIERSZ WYSZUKIWANIA -->
    <div v-else class="towary-topbar-row">
      <div class="towary-topbar-left">
        <button
          @click="showProductSearch = false; productSearch = ''"
          class="towary-icon-button"
          title="Zamknij wyszukiwanie"
        >
          ←
        </button>
      </div>

      <div style="flex:1; display:flex; align-items:center; gap:8px;">
        <input
          v-model="productSearch"
          type="text"
          placeholder="Szukaj produktu..."
          class="towary-search-input"
        />

        <button
  @click="showFiltersModal = true"
  class="towary-icon-button"
  title="Filtry"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4"></polygon>
  </svg>
</button>
      </div>
    </div>
  </div>










  <!-- =========================
       AKTYWNE FILTRY (CHMURKI)
  ========================== -->
  <div
  v-if="
    selectedDay !== 'wszystkie' ||
    selectedWarehouse !== 'wszystkie' ||
    selectedSupplier !== 'wszystkie' ||
    selectedWhoOrders !== 'wszystkie'
  "
  style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"
>

    <!-- KIEDY ZAMAWIANE -->
    <div
      v-if="selectedDay !== 'wszystkie'"
      style="background:#eee; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px;"
    >
      {{ selectedDay }}
      <span
        @click="selectedDay = 'wszystkie'"
        style="cursor:pointer; font-weight:bold;"
      >
        ×
      </span>
    </div>

    <!-- MAGAZYN -->
    <div
      v-if="selectedWarehouse !== 'wszystkie'"
      style="background:#eee; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px;"
    >
      {{ selectedWarehouse }}
      <span
        @click="selectedWarehouse = 'wszystkie'"
        style="cursor:pointer; font-weight:bold;"
      >
        ×
      </span>
    </div>


    <!-- HURTOWNIA -->
<div
  v-if="selectedSupplier !== 'wszystkie'"
  style="background:#eee; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px;"
>
  {{ selectedSupplier }}
  <span
    @click="selectedSupplier = 'wszystkie'"
    style="cursor:pointer; font-weight:bold;"
  >
    ×
  </span>
</div>


<!-- KTO ZAMAWIA -->
<div
  v-if="selectedWhoOrders !== 'wszystkie'"
  style="background:#eee; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px;"
>
  {{ selectedWhoOrders }}
  <span
    @click="selectedWhoOrders = 'wszystkie'"
    style="cursor:pointer; font-weight:bold;"
  >
    ×
  </span>
</div>




  </div>



    <!-- =========================
       LISTA PRODUKTÓW
  ========================== -->
  <div class="towary-list-wrap scroll-area">
    <div v-if="filteredProducts.length === 0" class="empty-state">
      <div class="empty-title">Brak produktów</div>
      <div class="empty-subtitle">Zmień wyszukiwanie lub filtry</div>
    </div>

   <div
  v-for="product in filteredProducts"
  :key="product.id"
  :class="[
    'towary-row-fixed',
    cart[product.id] > 0 ? 'zamowienie-active' : ''
  ]"
  style="grid-template-columns: 4fr 1fr 1.4fr auto;"
  @click="openQtyModal(product)"
>
     <!-- NAZWA + HURTOWNIA -->
  <div
    :title="product.name"
    style="min-width:0; overflow:hidden;"
  >
    <div class="towary-col-name">
      {{ product.name }}
    </div>

    <div
      style="
        font-size:11px;
        color:#6b7280;
        line-height:1.2;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        margin-top:2px;
      "
      :title="product.supplier"
    >
      {{ product.supplier || '' }}
    </div>
  </div>

  <!-- JM -->
  <div class="towary-col-unit">
    {{ product.unit || '-' }}
  </div>

  <!-- ILOŚĆ MAX -->
  <div
  class="towary-col-price"
  :title="product.maxQtyLabel"
  :style="{
    textAlign: 'center',
    color: product.maxQtyLabel === 'kiedy?' ? '#6b7280' : '#111827',
    fontStyle: product.maxQtyLabel === 'kiedy?' ? 'italic' : 'normal'
  }"
>
  {{ product.maxQtyLabel }}
</div>

  <!-- ILOŚĆ -->
  <div
    style="display:flex; align-items:center; justify-content:flex-end; gap:8px;"
  >
    <button
      @click.stop="removeFromCart(product.id)"
      class="towary-icon-button"
      style="width:32px; height:32px; font-size:18px;"
    >
      -
    </button>

    <div style="min-width:24px; text-align:center; font-weight:600; color:#111827;">
      {{ cart[product.id] || 0 }}
    </div>

    <button
      @click.stop="addToCart(product.id)"
      class="towary-icon-button"
      style="width:32px; height:32px; font-size:18px;"
    >
      +
    </button>
  </div>
</div>
  </div>
  <!-- =========================
       MODAL FILTRÓW
  ========================== -->
  <div
  v-if="showFiltersModal"
  style="position:fixed; inset:0; z-index:400; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; padding:20px;"
>
    <div style="background:white; width:100%; max-width:420px; border-radius:16px; padding:20px;">
      
      <h3 style="margin-top:0;">FILTRY</h3>

      <!-- KIEDY ZAMAWIANE -->
      <div style="margin-bottom:15px;">
        <div style="font-size:13px; margin-bottom:4px;">Kiedy zamawiane</div>
        <select v-model="selectedDay" style="width:100%; padding:10px;">
          <option value="wszystkie">Wszystkie</option>

          <option
            v-for="item in orderTimings"
            :key="item.id"
            :value="item.name"
          >
            {{ item.name }}
          </option>
        </select>
      </div>

      <!-- MAGAZYN -->
      <div style="margin-bottom:15px;">
        <div style="font-size:13px; margin-bottom:4px;">Magazyn</div>
        <select v-model="selectedWarehouse" style="width:100%; padding:10px;">
          <option value="wszystkie">Wszystkie</option>

          <option
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :value="warehouse.name"
          >
            {{ warehouse.name }}
          </option>
        </select>
      </div>


      <!-- HURTOWNIA -->
<div style="margin-bottom:15px;">
  <div style="font-size:13px; margin-bottom:4px;">Hurtownia</div>
  <select v-model="selectedSupplier" style="width:100%; padding:10px;">
    <option value="wszystkie">Wszystkie</option>

    <option
      v-for="supplier in suppliers"
      :key="supplier.id"
      :value="supplier.name"
    >
      {{ supplier.name }}
    </option>
  </select>
</div>


<!-- KTO ZAMAWIA -->
<div style="margin-bottom:15px;">
  <div style="font-size:13px; margin-bottom:4px;">Kto zamawia</div>
  <select v-model="selectedWhoOrders" style="width:100%; padding:10px;">
    <option value="wszystkie">Wszystkie</option>

    <option
      v-for="item in whoOrders"
      :key="item.id"
      :value="item.name"
    >
      {{ item.name }}
    </option>
  </select>
</div>




      <!-- PRZYCISK -->
      <div style="display:flex;">
  <button
  @click="showFiltersModal = false; showProductSearch = false"
  :style="{
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background:
      selectedDay !== 'wszystkie' ||
selectedWarehouse !== 'wszystkie' ||
selectedSupplier !== 'wszystkie' ||
selectedWhoOrders !== 'wszystkie'
        ? '#28a745'
        : '#e0e0e0',
    color: '#000',
    fontWeight: '600',
    cursor: 'pointer'
  }"
>
  {{
    selectedDay !== 'wszystkie' ||
selectedWarehouse !== 'wszystkie' ||
selectedSupplier !== 'wszystkie' ||
selectedWhoOrders !== 'wszystkie'
  ? 'Wybierz'
  : 'Zamknij'
  }}
</button>
      </div>

    </div>
  </div>



   





  <!-- =========================
       PRZYCISK HOME
  ========================== -->
  <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
    <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
  </div>

</div>





<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'koszyk'" class="screen-with-topbar">
  <div class="towary-topbar">
    <div v-if="!showCartSearch" class="towary-topbar-row">
      <div class="towary-topbar-left">
        <button
          @click="zamawiarkaView = 'produkty'"
          class="towary-icon-button"
          title="Wróć"
        >
          ←
        </button>

        <h2 class="towary-title">KOSZYK</h2>
      </div>

      <div class="towary-topbar-right">
        <button
          @click="handleGenerateOrder"
          title="Generuj PDF"
          style="
            width:44px;
            height:44px;
            border:none;
            border-radius:12px;
            background:#ffffff;
            color:#2563eb;
            border:1px solid #2563eb;
            font-size:20px;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
            box-shadow:0 6px 14px rgba(34, 69, 167, 0.35);
            transition:all 0.15s ease;
          "
          onmousedown="this.style.transform='scale(0.95)'"
          onmouseup="this.style.transform='scale(1)'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16l4-3 4 3 4-3 4 3V8z"/>
          </svg>
        </button>

        <button
          @click="showCartSearch = true"
          class="towary-icon-button"
          title="Szukaj"
        >
          🔍
        </button>

        <button
          @click="
            tempSelectedCartSupplier = selectedCartSupplier;
            tempSelectedCartCategories = [...selectedCartCategories];
            showCartFiltersModal = true
          "
          class="towary-icon-button"
          title="Filtry"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111827"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4"></polygon>
          </svg>
        </button>

        <button
          @click="clearCart()"
          class="towary-icon-button"
          title="Wyczyść koszyk"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc2626"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- WIERSZ WYSZUKIWANIA -->
    <div v-else class="towary-topbar-row">
      <div class="towary-topbar-left">
        <button
          @click="showCartSearch = false; cartSearch = ''"
          class="towary-icon-button"
          title="Zamknij wyszukiwanie"
        >
          ←
        </button>
      </div>

      <div style="flex:1; display:flex; align-items:center; gap:8px;">
        <input
          v-model="cartSearch"
          type="text"
          placeholder="Szukaj towaru..."
          class="towary-search-input"
        />

        <button
          @click="clearCart()"
          class="towary-icon-button"
          title="Wyczyść koszyk"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc2626"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  </div>



   <!-- MODAL: FILTRY KOSZYKA -->
<div
  v-if="showCartFiltersModal"
  class="supplier-modal-overlay"
>
  <div class="supplier-modal-card">
    <h3 class="supplier-modal-title">FILTRY KOSZYKA</h3>

    <div style="margin-bottom:15px;">
      <div
        @click="showCartSupplierFilterOptions = !showCartSupplierFilterOptions"
        class="supplier-click-field"
        style="background:#dbeafe; color:#1e3a8a;"
      >
        Hurtownia
      </div>

      <div
        v-if="showCartSupplierFilterOptions"
        class="towary-checkbox-list"
        style="margin-top:8px;"
      >
        <label class="towary-checkbox-option">
          <input
            v-model="tempSelectedCartSupplier"
            type="radio"
            value="wszystkie"
          />
          <span>Wszystkie</span>
        </label>

        <label
          v-for="name in availableCartSuppliers"
          :key="name"
          class="towary-checkbox-option"
        >
          <input
            v-model="tempSelectedCartSupplier"
            type="radio"
            :value="name"
          />
          <span>{{ name }}</span>
        </label>

        <div
          v-if="availableCartSuppliers.length === 0"
          style="font-size:13px; color:#6b7280;"
        >
          Brak hurtowni
        </div>
      </div>
    </div>

    <div style="margin-bottom:15px;">
      <div
        @click="showCartCategoryFilterOptions = !showCartCategoryFilterOptions"
        class="supplier-click-field"
        style="background:#fee2e2; color:#7f1d1d;"
      >
        Kategoria
      </div>

      <div
        v-if="showCartCategoryFilterOptions"
        class="towary-checkbox-list"
        style="margin-top:8px;"
      >
        <label
          v-for="name in availableTempCartCategories"
          :key="name"
          class="towary-checkbox-option"
        >
          <input
            v-model="tempSelectedCartCategories"
            type="checkbox"
            :value="name"
          />
          <span>{{ name }}</span>
        </label>

        <div
          v-if="availableTempCartCategories.length === 0"
          style="font-size:13px; color:#6b7280;"
        >
          Brak kategorii
        </div>
      </div>
    </div>

    <div class="supplier-modal-actions">
      <button
        @click="showCartFiltersModal = false"
        class="supplier-cancel-button"
        type="button"
      >
        Anuluj
      </button>

      <button
        @click="
          selectedCartSupplier = tempSelectedCartSupplier;
          selectedCartCategories = [...tempSelectedCartCategories];
          showCartFiltersModal = false
        "
        class="supplier-save-button"
        type="button"
      >
        Zastosuj
      </button>
    </div>
  </div>
</div>

<div v-if="cartItems.length === 0" class="scroll-area">
  Koszyk jest pusty
</div>

<div v-else class="scroll-area">
  <!-- CHMURKI FILTRÓW KOSZYKA -->
  <div
    v-if="
      selectedCartSupplier !== 'wszystkie' ||
      selectedCartCategories.length > 0
    "
    style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"
  >
    <!-- HURTOWNIA -->
    <div
      v-if="selectedCartSupplier !== 'wszystkie'"
      style="background:#dbeafe; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px; color:#1e3a8a;"
    >
      {{ selectedCartSupplier }}
      <span
        @click="
          selectedCartSupplier = 'wszystkie';
          tempSelectedCartSupplier = 'wszystkie'
        "
        style="cursor:pointer; font-weight:bold;"
      >
        ×
      </span>
    </div>

    <!-- KATEGORIE -->
    <div
      v-for="categoryName in selectedCartCategories"
      :key="categoryName"
      style="background:#fee2e2; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px; color:#7f1d1d;"
    >
      {{ categoryName }}
      <span
        @click="
          selectedCartCategories = selectedCartCategories.filter(item => item !== categoryName);
          tempSelectedCartCategories = tempSelectedCartCategories.filter(item => item !== categoryName)
        "
        style="cursor:pointer; font-weight:bold;"
      >
        ×
      </span>
    </div>
  </div>

  <div v-if="filteredCartItems.length === 0" class="empty-state">
    <div class="empty-title">Brak wyników</div>
    <div class="empty-subtitle">Zmień wyszukiwanie lub filtr</div>
  </div>

  <div
    v-for="item in filteredCartItems"
    :key="item.id"
    class="towary-row-fixed zamowienie-active"
    style="grid-template-columns: 4fr 1fr 1.4fr auto;"
    @click="openQtyModal(item)"
  >
    <div style="min-width:0; overflow:hidden;">
      <div class="towary-col-name">
        {{ item.name }}
      </div>

      <div
        style="
          font-size:11px;
          color:#6b7280;
          line-height:1.2;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          margin-top:2px;
        "
      >
        {{ item.supplier || '' }}
      </div>
    </div>

    <div class="towary-col-unit">
      {{ item.unit || '-' }}
    </div>

    <div class="towary-col-price">
      {{ item.value.toFixed(2) }}
    </div>

    <div
      style="
        display:flex;
        align-items:center;
        justify-content:flex-end;
        min-width:40px;
        font-weight:700;
        color:#111827;
      "
    >
      {{ item.qty }}
    </div>
  </div>

  <div
    style="
      margin-top:12px;
      padding-top:12px;
      border-top:1px solid #ddd;
      display:flex;
      justify-content:space-between;
      font-weight:700;
      font-size:16px;
    "
  >
    <div>Suma</div>
    <div>{{ cartTotal.toFixed(2) }}</div>
  </div>
</div>



 <!-- MODAL: DODAJ POZYCJĘ RĘCZNĄ DO KOSZYKA -->
<div
  v-if="showCustomCartItemModal"
  class="supplier-modal-overlay"
>
  <div class="supplier-modal-card">
    <h3 class="supplier-modal-title">DODAJ POZYCJĘ DO KOSZYKA</h3>

    <div class="supplier-form-group">
      <label class="supplier-form-label">Nazwa</label>
      <input
        v-model="customCartItemForm.name"
        type="text"
        placeholder="Np. Cytryny"
        class="supplier-form-input"
      />
    </div>

    <div class="supplier-form-group">
      <label class="supplier-form-label">Jednostka miary</label>
      <select
        v-model="customCartItemForm.unit"
        class="supplier-form-input"
      >
        <option value="">Wybierz jednostkę miary</option>

        <option
          v-for="item in units"
          :key="item.id"
          :value="item.name"
        >
          {{ item.name }}
        </option>
      </select>
    </div>

    <div class="supplier-form-group">
      <label class="supplier-form-label">Ilość</label>
      <input
        v-model="customCartItemForm.qty"
        type="number"
        min="0"
        step="0.01"
        placeholder="Np. 2"
        class="supplier-form-input"
      />
    </div>


    <div class="supplier-form-group">
  <label class="supplier-form-label">Cena netto</label>
  <input
    v-model="customCartItemForm.price"
    type="number"
    min="0"
    step="0.01"
    placeholder="Np. 5.50"
    class="supplier-form-input"
  />
</div>




    <div class="supplier-form-group">
      <label class="supplier-form-label">Hurtownia</label>
      <select
        v-model="customCartItemForm.supplier"
        class="supplier-form-input"
      >
        <option value="">Wybierz hurtownię</option>

        <option
          v-for="item in suppliers"
          :key="item.id"
          :value="item.name"
        >
          {{ item.name }}
        </option>
      </select>
    </div>

    <div class="supplier-modal-actions">
      <button
        @click="closeCustomCartItemModal"
        class="supplier-cancel-button"
        type="button"
      >
        Anuluj
      </button>

      <button
  @click="saveCustomCartItem"
  class="supplier-save-button"
  type="button"
>
  Zapisz
</button>
    </div>
  </div>
</div>



<button
  @click="openCustomCartItemModal"
  class="fab-add-button"
  aria-label="Dodaj pozycję"
>
  +
</button>






  <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
    <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
  </div>
</div>

    <!-- =========================
     WIDOK: REJESTR ZAMÓWIEŃ
========================== -->
<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'historia'" class="screen-with-topbar">
  <div class="towary-topbar">
    <div class="towary-topbar-row">
      <div class="towary-topbar-left">
        <button
          @click="zamawiarkaView = 'menu'"
          class="towary-icon-button"
          title="Wróć"
        >
          ←
        </button>

        <h2 class="towary-title towary-title-center">REJESTR ZAMÓWIEŃ</h2>
      </div>
    </div>
  </div>

  <div class="towary-list-wrap scroll-area">
    <div v-if="ordersRegister.length === 0" class="empty-state">
      <div class="empty-title">Brak zamówień</div>
      <div class="empty-subtitle">Wygenerowane zamówienia pojawią się tutaj</div>
    </div>

    <div
      v-for="order in ordersRegister"
      :key="order.id"
      class="item-card"
      style="padding:0; overflow:hidden; cursor:pointer;"
      @click="toggleOrderDetails(order.id)"
    >
      <div
        style="
          padding:14px;
          display:grid;
          grid-template-columns:minmax(0, 1fr) auto;
          gap:12px;
          align-items:start;
        "
      >
        <div style="min-width:0;">
          <div
            style="
              font-size:16px;
              font-weight:700;
              color:#111827;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            "
          >
            {{ order.supplier || 'Brak hurtowni' }}
          </div>

          <div style="font-size:12px; color:#6b7280; margin-top:4px;">
            {{ order.date || '-' }} {{ order.time || '' }}
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
  <div
    style="
      font-size:15px;
      font-weight:700;
      color:#111827;
      white-space:nowrap;
      margin-right:4px;
    "
  >
    {{ Number(order.total || 0).toFixed(2) }}
  </div>

  <button
  @click.stop="generatePdfFromRegister(order)"
  title="Generuj PDF"
  class="towary-icon-button"
  style="
    width:40px;
    height:40px;
    border-color:#93c5fd;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:0;
  "
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2563eb"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16l4-3 4 3 4-3 4 3V8z"/>
  </svg>
</button>

  <button
    @click.stop="deleteOrderFromRegister(order.id)"
    title="Usuń zamówienie"
    class="towary-icon-button"
    style="width:34px; height:34px; border-color:#fecaca;"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  </button>

  <div style="font-size:16px; color:#6b7280; margin-left:2px;">
    {{ expandedOrderId === order.id ? '▴' : '▾' }}
  </div>
</div>
      </div>

      <div
        v-if="expandedOrderId === order.id"
        style="
          border-top:1px solid #e5e7eb;
          padding:12px 14px 14px 14px;
          display:flex;
          flex-direction:column;
          gap:8px;
          background:#f9fafb;
        "
      >
        <div
          v-if="!order.items || order.items.length === 0"
          style="font-size:14px; color:#6b7280;"
        >
          Brak pozycji
        </div>

        <div
          v-for="item in order.items"
          :key="item.id"
          style="
            display:grid;
            grid-template-columns:minmax(0, 1fr) auto;
            gap:10px;
            align-items:start;
          "
        >
          <div style="min-width:0;">
            <div
              style="
                font-size:14px;
                color:#111827;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              "
            >
              {{ item.name }}
            </div>

            <div style="font-size:12px; color:#6b7280; margin-top:2px;">
              {{ item.qty }} {{ item.unit || '' }}
            </div>
          </div>

          <div
            style="
              font-size:13px;
              font-weight:600;
              color:#374151;
              white-space:nowrap;
            "
          >
            {{ Number(item.value || 0).toFixed(2) }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
    <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
  </div>
</div>

<!-- =========================
     MODAL: ILOŚĆ ZAMÓWIENIA
========================== -->
<div
  v-if="showQtyModal"
  class="supplier-modal-overlay"
>
  <div class="supplier-modal-card">
    <h3 class="supplier-modal-title">USTAW ILOŚĆ</h3>

    <div style="margin-bottom:14px; font-size:16px; font-weight:600; color:#111827;">
      {{ selectedProductForQty?.name || '' }}
    </div>

    <div class="supplier-form-group">
      <label class="supplier-form-label">Ilość</label>
      <input
        v-model="tempQty"
        type="number"
        min="0"
        class="supplier-form-input"
        placeholder="Wpisz ilość"
        ref="qtyInput"
        @keydown.enter.prevent="saveQtyModal()"
      />
    </div>

    <div
      class="supplier-modal-actions"
      style="display:flex; justify-content:space-between; align-items:center;"
    >
      <!-- LEWA STRONA -->
      <div style="display:flex; gap:8px;">
        <!-- USUŃ -->
        <button
          @click="deleteCartItemFromQtyModal()"
          class="towary-icon-button"
          type="button"
          title="Usuń z koszyka"
          style="width:40px; height:40px; border-color:#fecaca;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>

        <!-- EDYTUJ TOWAR -->
        <button
  v-if="selectedProductForQty"
  @click="selectedProductForQty?.isCustom ? openCustomCartItemModal(selectedProductForQty) : editTowarFromQtyModal()"
          class="towary-icon-button"
          type="button"
          title="Edytuj towar"
          style="width:40px; height:40px;"
        >
          ✏️
        </button>
      </div>

      <!-- PRAWA STRONA -->
      <div style="display:flex; gap:8px;">
        <button
          @click="closeQtyModal()"
          class="supplier-cancel-button"
          type="button"
        >
          Anuluj
        </button>

        <button
          @click="saveQtyModal()"
          class="supplier-save-button"
          type="button"
        >
          Zapisz
        </button>
      </div>
    </div>
  </div>
</div>

<!-- =========================
     WIDOK: TOWARY / LISTA + FORMULARZ
========================== -->
<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'towary'">

      <!-- =========================
           LISTA TOWARÓW
      ========================== -->

      <div v-if="towaryView === 'list'" class="screen-with-topbar">

        <!-- GÓRNY PASEK -->
        <div class="towary-topbar" style="background:#dbeafe; border-bottom:1px solidrgb(52, 122, 209);">
          <!-- WIERSZ 1 -->
          <div class="towary-topbar-row">
            <div class="towary-topbar-left">
              <button
                @click="zamawiarkaView = 'menu'"
                class="towary-icon-button"
                title="Wróć"
              >
                ←
              </button>

              <h2 class="towary-title">TOWARY</h2>
            </div>

            <div class="towary-topbar-right">


  <button
  @click="openTowaryPdfModal"
  class="towary-icon-button"
  title="Generuj PDF"
>
  📄
</button>



              <button
  v-if="selectedTowaryIds.length > 0"
  @click="removeSelectedTowary()"
  class="towary-icon-button danger"
  title="Usuń zaznaczone"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14H6L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4h6v2"></path>
  </svg>
</button>

              <button
                @click="toggleTowarySelectionMode()"
                :class="[
                  'towary-icon-button',
                  towarySelectionMode ? 'active' : ''
                ]"
                title="Tryb zaznaczania"
              >
                ☑️
              </button>

<button
  @click="showTowaryFiltersModal = true"
  class="towary-icon-button"
  title="Filtry"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4"></polygon>
  </svg>
</button>
            </div>
          </div>

          <!-- WIERSZ 2 -->
          <div style="margin-top:12px;">
           <div style="position:relative;">
  <input
    v-model="towarySearch"
    type="text"
    placeholder="Szukaj towaru po nazwie..."
    class="towary-search-input"
    style="padding-right:30px;"
  />

<span
  v-if="towarySearch"
  @click="towarySearch = ''"
  style="
    position:absolute;
    right:8px;
    top:50%;
    transform:translateY(-50%);
    cursor:pointer;
    width:24px;
    height:24px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:50%;
    background:#e5e7eb;
    transition:all 0.15s ease;
  "
  onmouseover="this.style.background='#d1d5db'"
  onmouseout="this.style.background='#e5e7eb'"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#374151"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
</span>
</div>
          </div>
        </div>



        <!-- AKTYWNE FILTRY TOWARÓW -->

        <!-- CHMURKI: HURTOWNIE -->
<div
  v-if="selectedSuppliersFilter.length > 0"
  style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"
>
  <div
    v-for="supplierName in selectedSuppliersFilter"
    :key="supplierName"
    style="background:#bfdbfe; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px; color:#111827;"
  >
    {{ supplierName }}
    <span
    @click="
  selectedSuppliersFilter = selectedSuppliersFilter.filter(item => item !== supplierName);
  tempSelectedSuppliersFilter = tempSelectedSuppliersFilter.filter(item => item !== supplierName)
" 
      style="cursor:pointer; font-weight:bold;"
    >
      ×
    </span>
  </div>
</div>


<!-- CHMURKI: MAGAZYN -->
<div
  v-if="selectedWarehousesFilter.length > 0"
  style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"
>
  <div
    v-for="warehouseName in selectedWarehousesFilter"
    :key="warehouseName"
    style="background:#bbf7d0; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px; color:#111827;"
  >
    {{ warehouseName }}
    <span
      @click="
        selectedWarehousesFilter = selectedWarehousesFilter.filter(item => item !== warehouseName);
        tempSelectedWarehousesFilter = tempSelectedWarehousesFilter.filter(item => item !== warehouseName)
      "
      style="cursor:pointer; font-weight:bold;"
    >
      ×
    </span>
  </div>
</div>


<!-- CHMURKI: KATEGORIA -->
<div
  v-if="selectedCategoriesFilter.length > 0"
  style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"
>
  <div
    v-for="categoryName in selectedCategoriesFilter"
    :key="categoryName"
    style="background:#fecaca; padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; font-size:13px; color:#7f1d1d;"
  >
    {{ categoryName }}
    <span
      @click="
        selectedCategoriesFilter = selectedCategoriesFilter.filter(item => item !== categoryName);
        tempSelectedCategoriesFilter = tempSelectedCategoriesFilter.filter(item => item !== categoryName)
      "
      style="cursor:pointer; font-weight:bold;"
    >
      ×
    </span>
  </div>
</div>






        <!-- LISTA -->
        <div class="towary-list-wrap scroll-area" ref="towaryListRef">
          <div v-if="filteredTowary.length === 0" class="empty-state">
            <div class="empty-title">Brak towarów</div>
            <div class="empty-subtitle">Kliknij + aby dodać pierwszy</div>
          </div>

<div
          v-for="item in filteredTowary"
          :key="item.id"
          :class="[
  'towary-row-fixed',
  !item.active ? 'towary-inactive' : ''
]"
          :style="{
            gridTemplateColumns: towarySelectionMode
              ? '28px 3fr 1fr 2fr 1.2fr'
              : '3fr 1fr 2fr 1.2fr'
          }"
          @click="handleTowarRowClick(item)"
        >
          <div
            v-if="towarySelectionMode"
            class="towary-col-checkbox"
            @click.stop
          >
            <input
              type="checkbox"
                :checked="selectedTowaryIds.includes(item.id)"
                @change="toggleTowarSelection(item.id)"
              />
            </div>

            <!-- NAZWA -->
           <div
  :class="[
    'towary-col-name',
    isTowarIncomplete(item) ? 'towary-col-name-incomplete' : ''
  ]"
  :title="item.name"
>
  {{ item.name }}
</div>

            <!-- JM -->
            <div class="towary-col-unit">
              {{ item.unit }}
            </div>

            <!-- HURTOWNIA -->
            <div class="towary-col-supplier" :title="item.supplier">
              {{ item.supplier }}
            </div>

            <!-- CENA -->
            <div class="towary-col-price">
              {{ item.netPrice }}
            </div>
          </div>
        </div>


        <!-- MODAL: FILTRY TOWARÓW -->
<div
  v-if="showTowaryFiltersModal"
  class="supplier-modal-overlay"
>
  <div class="supplier-modal-card">
    <h3 class="supplier-modal-title">FILTRY TOWARÓW</h3>

   <div style="margin-bottom:15px;">
  <div
    @click="showSuppliersFilterOptions = !showSuppliersFilterOptions"
    class="supplier-click-field"
    style="background:#dbeafe; color:#1e3a8a;"
  >
    Hurtownia
  </div>

  <div
    v-if="showSuppliersFilterOptions"
    class="towary-checkbox-list"
    style="margin-top:8px;"
  >
    <label
  v-for="supplierName in availableTowarySuppliers"
  :key="supplierName"
  class="towary-checkbox-option"
>
  <input
    v-model="tempSelectedSuppliersFilter"
    type="checkbox"
    :value="supplierName"
  />
  <span>{{ supplierName }}</span>
</label>

<div
  v-if="availableTowarySuppliers.length === 0"
  style="font-size:13px; color:#6b7280;"
>
  Brak hurtowni
</div>
</div>
</div>


<!-- =========================
     FILTR: MAGAZYN
========================= -->
<div style="margin-bottom:15px;">
  <div
    @click="showWarehousesFilterOptions = !showWarehousesFilterOptions"
    class="supplier-click-field"
    style="background:#bbf7d0; color:#1e3a8a;"
  >
    Magazyn
  </div>

  <div
    v-if="showWarehousesFilterOptions"
    class="towary-checkbox-list"
    style="margin-top:8px;"
  >
    <label
      v-for="warehouseName in availableTowaryWarehouses"
      :key="warehouseName"
      class="towary-checkbox-option"
    >
      <input
        v-model="tempSelectedWarehousesFilter"
        type="checkbox"
        :value="warehouseName"
      />
      <span>{{ warehouseName }}</span>
    </label>

    <div
      v-if="availableTowaryWarehouses.length === 0"
      style="font-size:13px; color:#6b7280;"
    >
      Brak magazynów
    </div>
  </div>
</div>

<!-- =========================
     FILTR: KATEGORIA
========================= -->
<div style="margin-bottom:15px;">
  <div
    @click="showCategoriesFilterOptions = !showCategoriesFilterOptions"
    class="supplier-click-field"
    style="background:#fee2e2; color:#7f1d1d;"
  >
    Kategoria
  </div>

  <div
    v-if="showCategoriesFilterOptions"
    class="towary-checkbox-list"
    style="margin-top:8px;"
  >
    <label
      v-for="categoryName in availableTowaryCategories"
      :key="categoryName"
      class="towary-checkbox-option"
    >
      <input
        v-model="tempSelectedCategoriesFilter"
        type="checkbox"
        :value="categoryName"
      />
      <span>{{ categoryName }}</span>
    </label>

    <div
      v-if="availableTowaryCategories.length === 0"
      style="font-size:13px; color:#6b7280;"
    >
      Brak kategorii
    </div>
  </div>
</div>

<div class="supplier-modal-actions">
  <button
    @click="showTowaryFiltersModal = false"
    class="supplier-cancel-button"
    type="button"
  >
    Anuluj
  </button>

  <button
    @click="
      selectedSuppliersFilter = [...tempSelectedSuppliersFilter];
      selectedWarehousesFilter = [...tempSelectedWarehousesFilter];
      selectedCategoriesFilter = [...tempSelectedCategoriesFilter];
      showTowaryFiltersModal = false;
    "
    class="supplier-save-button"
    type="button"
  >
    Zastosuj
  </button>
</div>
</div>
</div>


<!-- MODAL: PDF TOWARÓW -->
<div
  v-if="showTowaryPdfModal"
  class="supplier-modal-overlay"
>
  <div class="supplier-modal-card">
    <h3 class="supplier-modal-title">PDF Z TOWARÓW</h3>

    <div style="font-size:14px; color:#6b7280; margin-bottom:14px;">
      Wygenerować PDF z aktualnie widocznej listy towarów?
    </div>

    <div class="towary-checkbox-list">
      <label
        v-for="option in towaryPdfOptions"
        :key="option.key"
        class="towary-checkbox-option"
      >
        <input
          v-model="selectedTowaryPdfFields"
          type="checkbox"
          :value="option.key"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>

    <div class="supplier-modal-actions">
      <button
        @click="showTowaryPdfModal = false"
        class="supplier-cancel-button"
        type="button"
      >
        Anuluj
      </button>

      <button
        @click="handleGenerateTowaryPdf"
        class="supplier-save-button"
        type="button"
      >
        Generuj
      </button>
    </div>
  </div>
</div>





<!-- FAB + -->
<button
  @click="openTowarAdd()"
  class="fab-add-button"
  aria-label="Dodaj towar"
>
  +
</button>

<!-- HOME -->
<div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
  <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
</div>
</div>

      <!-- =========================
           FORMULARZ TOWARU
      ========================== -->
      <div v-if="towaryView === 'form'">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
  <div style="display:flex; align-items:center; gap:10px; min-width:0;">
    <button
  @click="closeTowarForm()"
  class="zamawiarka-menu-back"
>
  ←
</button>

    <h2 style="margin:0;">
      {{ towarFormMode === 'edit' ? 'EDYTUJ TOWAR' : 'DODAJ TOWAR' }}
    </h2>
  </div>

  <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
    <label style="display:flex; align-items:center; gap:6px; font-size:14px; white-space:nowrap;">
      <input
  v-model="towarForm.active"
  type="checkbox"
  @change="handleTowarActiveChange"
/>
     <span :class="{ 'inactive-label': !towarForm.active }">aktywne</span>
    </label>

    <button
      v-if="towarFormMode === 'edit'"
      @click="deleteTowar()"
      class="towary-icon-button"
      title="Usuń towar"
      type="button"
      style="width:40px; height:40px; border-color:#fecaca; flex-shrink:0;"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
    </button>
  </div>
</div>

        <!-- SZKIELET FORMULARZA -->
        <div style="display:flex; flex-direction:column; gap:14px; padding-bottom:120px;">

          

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa</label>
            <input
  v-model="towarForm.name"
  type="text"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.name)"
/>
          </div>

            <div class="supplier-form-group">
            <label class="supplier-form-label">Jednostka miary</label>

            <select
  v-model="towarForm.unit"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.unit)"
>
              <option value="">Wybierz jednostkę miary</option>

              <option
                v-for="item in units"
                :key="item.id"
                :value="item.name"
              >
                {{ item.name }}
              </option>
            </select>
          </div>

            <div class="supplier-form-group">
            <label class="supplier-form-label">Hurtownia</label>

            <select
  v-model="towarForm.supplier"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.supplier)"
>
              <option value="">Wybierz hurtownię</option>

              <option
                v-for="item in suppliers"
                :key="item.id"
                :value="item.name"
              >
                {{ item.name }}
              </option>
            </select>
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Cena netto</label>
            <input
  v-model="towarForm.netPrice"
  type="text"
  inputmode="decimal"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.netPrice)"
/>
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Stawka VAT</label>
           <input
  v-model="towarForm.vat"
  type="text"
  inputmode="numeric"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.vat)"
/>
          </div>

                    <div class="supplier-form-group">
            <label class="supplier-form-label">Magazyn</label>

            <select
  v-model="towarForm.warehouse"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.warehouse)"
>
              <option value="">Wybierz magazyn</option>

              <option
                v-for="item in warehouses"
                :key="item.id"
                :value="item.name"
              >
                {{ item.name }}
              </option>
            </select>
          </div>

            <div class="supplier-form-group">
            <label class="supplier-form-label">Kiedy zamówienie</label>

            <div
  @click="openOrderTimingModal()"
  class="supplier-click-field"
  :class="fieldFilledClass(towarForm.orderTimings)"
>
  <span v-if="towarForm.orderTimings.length === 0" style="color:#111827;">
    Wybierz pozycje
  </span>

  <span v-else>
    {{ towarForm.orderTimings.join(', ') }}
  </span>
</div>
          </div>


            <div class="supplier-form-group">
            <label class="supplier-form-label">Kto zamawia</label>

            <div
  @click="openWhoOrdersModal()"
  class="supplier-click-field"
  :class="fieldFilledClass(towarForm.whoOrders)"
>
  <span v-if="towarForm.whoOrders.length === 0" style="color:#111827;">
    Wybierz pozycje
  </span>

  <span v-else>
    {{ towarForm.whoOrders.join(', ') }}
  </span>
</div>
          </div>




           <div class="supplier-form-group">
  <label class="supplier-form-label">Kategoria towaru</label>

  <div
    @click="openCategoriesModal()"
    class="supplier-click-field"
    :class="fieldFilledClass(towarForm.categories)"
  >
    <span v-if="towarForm.categories.length === 0" style="color:#111827;">
      Wybierz pozycje
    </span>

    <span v-else>
      {{ towarForm.categories.join(', ') }}
    </span>
  </div>
</div>

<div class="supplier-form-group">
  <label class="supplier-form-label">Pozycja wyświetlania w zrób zamówienie</label>
  <input
  v-model="towarForm.displayOrder"
  type="number"
  class="supplier-form-input"
  :class="fieldFilledClass(towarForm.displayOrder)"
/>
</div>

<div class="supplier-form-group">
  <label class="supplier-form-label">Ilość max</label>

  <div
  @click="openMaxQtyField()"
  class="supplier-click-field"
  :class="fieldFilledClass(getMaxQtySummary())"
>
    {{
      !towarForm.orderTimings || towarForm.orderTimings.length === 0
        ? 'Niedostępne'
        : !getMaxQtySummary()
          ? 'Ustaw ilości'
          : getMaxQtySummary()
    }}
  </div>
</div>



  

          <div class="supplier-form-group">
            <label class="supplier-form-label">Notatka</label>
            <textarea
              v-model="towarForm.note"
              rows="4"
              class="supplier-form-input"
              style="resize:vertical;"
            ></textarea>
          </div>


          





                    <div class="supplier-modal-actions">
            <button
              @click="closeTowarForm()"
              class="supplier-cancel-button"
            >
              Wróć
            </button>

            <button
              @click="saveTowar()"
              class="supplier-save-button"
              type="button"
            >
              Zapisz
            </button>
          </div>
        </div>

                <!-- MODAL: KIEDY ZAMÓWIENIE -->
        <div
          v-if="showOrderTimingModal"
          class="supplier-modal-overlay"
        >
          <div class="supplier-modal-card">
            <h3 class="supplier-modal-title">WYBIERZ: KIEDY ZAMÓWIENIE</h3>

            <div class="towary-checkbox-list">
              <label
                v-for="item in orderTimings"
                :key="item.id"
                class="towary-checkbox-option"
              >
                <input
                  v-model="tempOrderTimings"
                  type="checkbox"
                  :value="item.name"
                />
                <span>{{ item.name }}</span>
              </label>

              <div
                v-if="orderTimings.length === 0"
                style="font-size:13px; color:#6b7280;"
              >
                Brak pozycji w ustawieniach
              </div>
            </div>

            <div class="supplier-modal-actions">
              <button
                @click="closeOrderTimingModal()"
                class="supplier-cancel-button"
                type="button"
              >
                Anuluj
              </button>

              <button
                @click="confirmOrderTimingModal()"
                class="supplier-save-button"
                type="button"
              >
                Zatwierdź
              </button>
            </div>
          </div>
        </div>



        <!-- MODAL: KTO ZAMAWIA -->
        <div
          v-if="showWhoOrdersModal"
          class="supplier-modal-overlay"
        >
          <div class="supplier-modal-card">
            <h3 class="supplier-modal-title">WYBIERZ: KTO ZAMAWIA</h3>

            <div class="towary-checkbox-list">
              <label
                v-for="item in whoOrders"
                :key="item.id"
                class="towary-checkbox-option"
              >
                <input
                  v-model="tempWhoOrders"
                  type="checkbox"
                  :value="item.name"
                />
                <span>{{ item.name }}</span>
              </label>

              <div
                v-if="whoOrders.length === 0"
                style="font-size:13px; color:#6b7280;"
              >
                Brak pozycji w ustawieniach
              </div>
            </div>

            <div class="supplier-modal-actions">
              <button
                @click="closeWhoOrdersModal()"
                class="supplier-cancel-button"
                type="button"
              >
                Anuluj
              </button>

              <button
                @click="confirmWhoOrdersModal()"
                class="supplier-save-button"
                type="button"
              >
                Zatwierdź
              </button>
            </div>
          </div>
        </div>

        
        
        
        
        <!-- MODAL: KATEGORIA TOWARU -->
        <div
          v-if="showCategoriesModal"
          class="supplier-modal-overlay"
        >
          <div class="supplier-modal-card">
            <h3 class="supplier-modal-title">WYBIERZ: KATEGORIA TOWARU</h3>

            <div class="towary-checkbox-list">
              <label
                v-for="item in categories"
                :key="item.id"
                class="towary-checkbox-option"
              >
                <input
                  v-model="tempCategories"
                  type="checkbox"
                  :value="item.name"
                />
                <span>{{ item.name }}</span>
              </label>

              <div
                v-if="categories.length === 0"
                style="font-size:13px; color:#6b7280;"
              >
                Brak pozycji w ustawieniach
              </div>
            </div>

            <div class="supplier-modal-actions">
              <button
                @click="closeCategoriesModal()"
                class="supplier-cancel-button"
                type="button"
              >
                Anuluj
              </button>

              <button
                @click="confirmCategoriesModal()"
                class="supplier-save-button"
                type="button"
              >
                Zatwierdź
              </button>
            </div>
          </div>
        </div>

        <!-- MODAL: ILOŚĆ MAX -->
        <div
          v-if="showMaxQtyModal"
          class="supplier-modal-overlay"
        >
          <div class="supplier-modal-card">
            <h3 class="supplier-modal-title">USTAW: ILOŚĆ MAX</h3>

            <div class="towary-checkbox-list">
              <div
                v-for="itemName in towarForm.orderTimings"
                :key="itemName"
                style="display:flex; align-items:center; justify-content:space-between; gap:12px;"
              >
                <div style="font-size:14px; color:#111827;">
                  {{ itemName }}
                </div>

                <input
                v-model="tempMaxQtyByOrderTiming[itemName]"
                type="text"
                class="supplier-form-input"
                placeholder="Np. 15 kg / według potrzeb"
                style="width:160px; padding:8px 10px;"
                />
              </div>
            </div>

            <div class="supplier-modal-actions">
              <button
                @click="closeMaxQtyModal()"
                class="supplier-cancel-button"
                type="button"
              >
                Anuluj
              </button>

              <button
                @click="confirmMaxQtyModal()"
                class="supplier-save-button"
                type="button"
              >
                Zatwierdź
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>




    <!-- =========================
     WIDOK: USTAWIENIA
========================== -->
<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'ustawienia'">
  <div class="zamawiarka-menu-topbar">
    <button
  @click="zamawiarkaView = 'menu'"
  class="zamawiarka-menu-back"
>
      ←
    </button>
    <h2 class="zamawiarka-menu-title">USTAWIENIA</h2>
  </div>

  <div style="display:flex; flex-direction:column; gap:10px;">
    <button
      @click="zamawiarkaView = 'hurtownie'"
      style="padding:15px; border-radius:12px;"
    >
      Hurtownie
    </button>

    <button
      @click="zamawiarkaView = 'magazyny'"
      style="padding:15px; border-radius:12px;"
    >
      Magazyny
    </button>

    <button
      @click="zamawiarkaView = 'units'"
      style="padding:15px; border-radius:12px;"
    >
      Jednostki miary
    </button>

    <button
      @click="zamawiarkaView = 'orderTiming'"
      style="padding:15px; border-radius:12px;"
    >
      Kiedy zamawiane
    </button>

    <!-- NOWY PRZYCISK -->
    <button
      @click="zamawiarkaView = 'categories'"
      style="padding:15px; border-radius:12px;"
    >
      Kategorie towarów
    </button>

    <button
      @click="zamawiarkaView = 'whoOrders'"
      style="padding:15px; border-radius:12px;"
    >
      Kto zamawia
    </button>




  </div>

  <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
    <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
  </div>
</div>






        <!-- =========================
         WIDOK: HURTOWNIE
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'hurtownie'" class="suppliers-screen">
      <!-- NAGŁÓWEK -->
      <div class="zamawiarka-menu-topbar">
        <button
  @click="zamawiarkaView = 'ustawienia'"
  class="zamawiarka-menu-back"
>
          ←
        </button>
        <h2 class="zamawiarka-menu-title">HURTOWNIE</h2>
      </div>

      <!-- LISTA HURTOWNI -->
            <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px;">

        <!-- PUSTY STAN -->
        <div v-if="suppliers.length === 0" class="empty-state">
          <div class="empty-title">Brak hurtowni</div>
          <div class="empty-subtitle">Kliknij + aby dodać</div>
        </div>

        <!-- LISTA -->
        <div
          v-for="supplier in suppliers"
          :key="supplier.id"
          class="item-card"
        >
          <!-- GÓRA KARTY: NAZWA + PRZYCISK EDYCJI -->
          <div class="item-card-top">
            <div class="supplier-name">{{ supplier.name }}</div>

            <button
              @click="editSupplier(supplier)"
              class="supplier-edit-button"
              type="button"
            >
              ✏️
            </button>
          </div>

          <!-- DANE HURTOWNI -->
          <div v-if="supplier.phone" class="supplier-row">
            <span class="supplier-label">📞 Telefon:</span>
            <span>{{ supplier.phone }}</span>
          </div>

          <div v-if="supplier.email" class="supplier-row">
            <span class="supplier-label">✉️ E-mail:</span>
            <span>{{ supplier.email }}</span>
          </div>
        </div>
      </div>

      <!-- PŁYWAJĄCY PRZYCISK DODAWANIA -->
      <button
        @click="openSupplierForm"
        class="fab-add-button"
        aria-label="Dodaj hurtownię"
      >
        +
      </button>

      <!-- OKNO FORMULARZA -->
      <div
        v-if="showSupplierForm"
        class="supplier-modal-overlay"
      >
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ supplierFormMode === 'edit' ? 'EDYTUJ HURTOWNIĘ' : 'DODAJ HURTOWNIĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa</label>
            <input
              v-model="supplierForm.name"
              type="text"
              placeholder="Np. Makro"
              autofocus
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Telefon</label>
            <input
              v-model="supplierForm.phone"
              type="tel"
              placeholder="Np. 123456789"
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">E-mail</label>
            <input
              v-model="supplierForm.email"
              type="email"
              placeholder="Np. kontakt@firma.pl"
              class="supplier-form-input"
            />
          </div>

                    <div class="supplier-modal-actions">
            <!-- PRZYCISK USUWANIA - TYLKO W TRYBIE EDYCJI -->
            <button
              v-if="supplierFormMode === 'edit'"
              @click="deleteSupplier"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <!-- PRZYCISK ANULUJ -->
            <button
              @click="closeSupplierForm"
              class="supplier-cancel-button"
            >
              Anuluj
            </button>

            <!-- PRZYCISK ZAPISZ -->
            <button
              @click="saveSupplier"
              class="supplier-save-button"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>

      <!-- DOLNY PRZYCISK HOME -->
      <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
        <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
      </div>
    </div>





        <!-- =========================
         WIDOK: MAGAZYNY
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'magazyny'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button
  @click="zamawiarkaView = 'ustawienia'"
  class="zamawiarka-menu-back"
>
          ←
        </button>
        <h2 class="zamawiarka-menu-title">MAGAZYNY</h2>
      </div>

      <!-- LISTA MAGAZYNÓW -->
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px;">

        <!-- PUSTY STAN -->
        <div v-if="warehouses.length === 0" class="empty-state">
          <div class="empty-title">Brak magazynów</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszy</div>
        </div>

        <!-- LISTA -->
        <div
          v-for="warehouse in warehouses"
          :key="warehouse.id"
          class="item-card"
        >
          <div class="item-card-top">
            <div class="supplier-name">{{ warehouse.name }}</div>

            <button
              @click="editWarehouse(warehouse)"
              class="supplier-edit-button"
              type="button"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <!-- PŁYWAJĄCY PRZYCISK DODAWANIA -->
      <button
        @click="openWarehouseForm"
        class="fab-add-button"
        aria-label="Dodaj magazyn"
      >
        +
      </button>

      <!-- OKNO FORMULARZA -->
      <div
        v-if="showWarehouseForm"
        class="supplier-modal-overlay"
      >
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ warehouseFormMode === 'edit' ? 'EDYTUJ MAGAZYN' : 'DODAJ MAGAZYN' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa magazynu</label>
            <input
              v-model="warehouseForm.name"
              type="text"
              placeholder="Np. Magazyn Główny"
              autofocus
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-modal-actions">
            <button
              v-if="warehouseFormMode === 'edit'"
              @click="deleteWarehouse"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <button
              @click="closeWarehouseForm"
              class="supplier-cancel-button"
            >
              Anuluj
            </button>

            <button
              @click="saveWarehouse"
              class="supplier-save-button"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>

      <!-- DOLNY PRZYCISK HOME -->
      <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
        <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
      </div>
    </div>







        <!-- =========================
         WIDOK: KIEDY ZAMAWIANE
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'orderTiming'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
       <button
  @click="zamawiarkaView = 'ustawienia'"
  class="zamawiarka-menu-back"
>
          ←
        </button>
        <h2 class="zamawiarka-menu-title">KIEDY ZAMAWIANE</h2>
      </div>

      <!-- LISTA -->
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px;">

        <!-- PUSTY STAN -->
        <div v-if="orderTimings.length === 0" class="empty-state">
          <div class="empty-title">Brak pozycji</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszą</div>
        </div>

        <!-- LISTA POZYCJI -->
        <div
          v-for="item in orderTimings"
          :key="item.id"
          class="item-card"
        >
          <div class="item-card-top">
            <div class="item-name">{{ item.name }}</div>

            <button
              @click="editOrderTiming(item)"
              class="supplier-edit-button"
              type="button"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <!-- PŁYWAJĄCY PRZYCISK DODAWANIA -->
      <button
        @click="openOrderTimingForm"
        class="fab-add-button"
        aria-label="Dodaj pozycję"
      >
        +
      </button>

      <!-- OKNO FORMULARZA -->
      <div
        v-if="showOrderTimingForm"
        class="supplier-modal-overlay"
      >
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ orderTimingFormMode === 'edit' ? 'EDYTUJ POZYCJĘ' : 'DODAJ POZYCJĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa</label>
            <input
              v-model="orderTimingForm.name"
              type="text"
              placeholder="Np. Poniedziałek albo Raz w miesiącu"
              autofocus
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-modal-actions">
            <button
              v-if="orderTimingFormMode === 'edit'"
              @click="deleteOrderTiming"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <button
              @click="closeOrderTimingForm"
              class="supplier-cancel-button"
            >
              Anuluj
            </button>

            <button
              @click="saveOrderTiming"
              class="supplier-save-button"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>

      <!-- DOLNY PRZYCISK HOME -->
      <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
        <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
      </div>
    </div>






        <!-- =========================
         WIDOK: JEDNOSTKI MIARY
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'units'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button
  @click="zamawiarkaView = 'ustawienia'"
  class="zamawiarka-menu-back"
>
          ←
        </button>
        <h2 class="zamawiarka-menu-title">JEDNOSTKI MIARY</h2>
      </div>

      <!-- LISTA -->
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px;">

        <!-- PUSTY STAN -->
        <div v-if="units.length === 0" class="empty-state">
          <div class="empty-title">Brak jednostek miary</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszą</div>
        </div>

        <!-- LISTA POZYCJI -->
        <div
          v-for="item in units"
          :key="item.id"
          class="item-card"
        >
          <div class="item-card-top">
            <div class="supplier-name">{{ item.name }}</div>

            <button
              @click="editUnit(item)"
              class="supplier-edit-button"
              type="button"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <!-- PŁYWAJĄCY PRZYCISK DODAWANIA -->
      <button
        @click="openUnitForm"
        class="fab-add-button"
        aria-label="Dodaj jednostkę miary"
      >
        +
      </button>

      <!-- OKNO FORMULARZA -->
      <div
        v-if="showUnitForm"
        class="supplier-modal-overlay"
      >
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ unitFormMode === 'edit' ? 'EDYTUJ JEDNOSTKĘ MIARY' : 'DODAJ JEDNOSTKĘ MIARY' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa jednostki</label>
            <input
              v-model="unitForm.name"
              type="text"
              placeholder="Np. szt, kg, l"
              autofocus
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-modal-actions">
            <button
              v-if="unitFormMode === 'edit'"
              @click="deleteUnit"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <button
              @click="closeUnitForm"
              class="supplier-cancel-button"
            >
              Anuluj
            </button>

            <button
              @click="saveUnit"
              class="supplier-save-button"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>

      <!-- DOLNY PRZYCISK HOME -->
      <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
        <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
      </div>
    </div>








        <!-- =========================
         WIDOK: KATEGORIE TOWARÓW
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'categories'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button
  @click="zamawiarkaView = 'ustawienia'"
  class="zamawiarka-menu-back"
>
          ←
        </button>
        <h2 class="zamawiarka-menu-title">KATEGORIE TOWARÓW</h2>
      </div>

      <!-- LISTA -->
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px;">

        <!-- PUSTY STAN -->
        <div v-if="categories.length === 0" class="empty-state">
          <div class="empty-title">Brak kategorii towarów</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszą</div>
        </div>

        <!-- LISTA POZYCJI -->
        <div
          v-for="item in categories"
          :key="item.id"
          class="item-card"
        >
          <div class="item-card-top">
            <div class="supplier-name">{{ item.name }}</div>

            <button
              @click="editCategory(item)"
              class="supplier-edit-button"
              type="button"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <!-- PŁYWAJĄCY PRZYCISK DODAWANIA -->
      <button
        @click="openCategoryForm"
        class="fab-add-button"
        aria-label="Dodaj kategorię"
      >
        +
      </button>

      <!-- OKNO FORMULARZA -->
      <div
        v-if="showCategoryForm"
        class="supplier-modal-overlay"
      >
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ categoryFormMode === 'edit' ? 'EDYTUJ KATEGORIĘ' : 'DODAJ KATEGORIĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa kategorii</label>
            <input
              v-model="categoryForm.name"
              type="text"
              placeholder="Np. Nabiał, Chemia, Mięso"
              autofocus
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-modal-actions">
            <button
              v-if="categoryFormMode === 'edit'"
              @click="deleteCategory"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <button
              @click="closeCategoryForm"
              class="supplier-cancel-button"
            >
              Anuluj
            </button>

            <button
              @click="saveCategory"
              class="supplier-save-button"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>

      <!-- DOLNY PRZYCISK HOME -->
      <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
        <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
      </div>
    </div>






        <!-- =========================
         WIDOK: KTO ZAMAWIA
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'whoOrders'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button
  @click="zamawiarkaView = 'ustawienia'"
  class="zamawiarka-menu-back"
>
          ←
        </button>
        <h2 class="zamawiarka-menu-title">KTO ZAMAWIA</h2>
      </div>

            <!-- LISTA -->
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px;">

        <!-- PUSTY STAN -->
        <div v-if="whoOrders.length === 0" class="empty-state">
          <div class="empty-title">Brak pozycji</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszą</div>
        </div>

        <!-- LISTA POZYCJI -->
        <div
          v-for="item in whoOrders"
          :key="item.id"
          class="item-card"
        >
          <div class="item-card-top">
            <div class="supplier-name">{{ item.name }}</div>

            <button
              @click="editWhoOrder(item)"
              class="supplier-edit-button"
              type="button"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <!-- PŁYWAJĄCY PRZYCISK DODAWANIA -->
      <button
        @click="openWhoOrderForm"
        class="fab-add-button"
        aria-label="Dodaj pozycję"
      >
        +
      </button>

      <!-- OKNO FORMULARZA -->
      <div
        v-if="showWhoOrderForm"
        class="supplier-modal-overlay"
      >
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ whoOrderFormMode === 'edit' ? 'EDYTUJ POZYCJĘ' : 'DODAJ POZYCJĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Kto zamawia</label>
            <input
              v-model="whoOrderForm.name"
              type="text"
              placeholder="Np. Barman, Szef kuchni, Manager"
              autofocus
              class="supplier-form-input"
            />
          </div>

          <div class="supplier-modal-actions">
            <button
              v-if="whoOrderFormMode === 'edit'"
              @click="deleteWhoOrder"
              style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;"
            >
              Usuń
            </button>

            <button
              @click="closeWhoOrderForm"
              class="supplier-cancel-button"
            >
              Anuluj
            </button>

            <button
              @click="saveWhoOrder"
              class="supplier-save-button"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>

      <!-- DOLNY PRZYCISK HOME -->
      <div style="position:fixed; bottom:20px; left:0; right:0; display:flex; justify-content:center;">
        <button
  @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
  class="ios-home-pill"
>
  <span class="ios-home-pill-icon">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  </span>
  <span>Menu</span>
</button>
      </div>
    </div>






  </div>


  <div v-if="showPdfViewerModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; box-sizing: border-box;">
  <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
    
    <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;">
      <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">Podgląd zamówienia</h3>
      <button @click="closePdfViewer" style="background: none; border: none; font-size: 28px; line-height: 1; cursor: pointer; color: #6b7280; padding: 0;">&times;</button>
    </div>
    
    <div style="flex-grow: 1; background: #e5e7eb; position: relative; height: 65vh; width: 100%;">
      <iframe :src="pdfViewerUrl" style="width: 100%; height: 100%; border: none;" title="Podgląd PDF"></iframe>
    </div>
    
    <div style="padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; background: #f9fafb;">
      <button @click="closePdfViewer" style="padding: 10px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #ffffff; color: #374151; font-weight: bold; cursor: pointer;">
        Zamknij
      </button>
      <button @click="sharePdf" style="padding: 10px 20px; border-radius: 8px; border: none; background: #2563eb; color: #ffffff; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <span style="font-size: 16px;">📤</span> Udostępnij / Zapisz
      </button>
    </div>

  </div>
</div>




  <!-- =========================
     MODAL POWIADOMIEŃ iOS
========================== -->
<div v-if="showDishDetailsModal" class="supplier-modal-overlay">
  <div class="supplier-modal-card" style="max-width: 450px;">
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <div>
        <h3 style="margin: 0; font-size: 22px; color: #111827; font-weight: 800; line-height: 1.2;">
          {{ selectedDishDetails?.name }}
        </h3>
        <div style="font-size: 13px; color: #6b7280; margin-top: 4px; font-weight: 600;">
          Kategoria: <span style="color: #2563eb;">{{ selectedDishDetails?.category || 'Brak' }}</span>
        </div>
      </div>
      <button @click="closeDishDetails" style="background: #f3f4f6; border: none; font-size: 20px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: #4b5563; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 24px;">
            <div style="background: #f8fafc; padding: 12px 8px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Cena</div>
        <div style="font-size: 15px; font-weight: 800; color: #111827; margin-top: 4px;">{{ Number(selectedDishDetails?.cena || 0).toFixed(2) }} <span style="font-size: 11px; font-weight: 600;">zł</span></div>
      </div>
            <div style="background: #f8fafc; padding: 12px 8px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Koszt</div>
        <div style="font-size: 15px; font-weight: 800; color: #111827; margin-top: 4px;">{{ Number(selectedDishDetails?.koszt || 0).toFixed(2) }} <span style="font-size: 11px; font-weight: 600;">zł</span></div>
      </div>
            <div style="background: #f8fafc; padding: 12px 8px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">FC Rzecz.</div>
        <div :style="{ fontSize: '15px', fontWeight: '800', marginTop: '4px', color: ((selectedDishDetails?.cena && selectedDishDetails?.cena > 0) ? (selectedDishDetails?.koszt / selectedDishDetails?.cena * 100) : 0) > (dishCategories.find(c => c.name === selectedDishDetails?.category)?.targetFC || fcSettings.target) ? '#dc2626' : '#16a34a' }">
          {{ (selectedDishDetails?.cena && selectedDishDetails?.cena > 0) ? ((selectedDishDetails?.koszt / selectedDishDetails?.cena) * 100).toFixed(1) : 0 }}%
        </div>
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">Receptura (Składniki)</h4>
      <div style="background: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px 16px; text-align: center; color: #64748b; font-size: 14px; line-height: 1.4;">
        Brak wprowadzonych składników.<br>Kliknij edytuj, aby zbudować kalkulację.
      </div>
    </div>

    <div style="display: flex; gap: 10px; margin-bottom: 12px;">
      <button @click="handleDuplicateFromDetails" style="flex: 1; padding: 14px; border: 1px solid #d1d5db; border-radius: 12px; background: #ffffff; color: #1f2937; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <span>📑</span> Powiel
      </button>
      <button @click="handleDeleteFromDetails" style="flex: 1; padding: 14px; border: none; border-radius: 12px; background: #fee2e2; color: #dc2626; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span>🗑️</span> Usuń
      </button>
    </div>

    <button @click="openDishForm(selectedDishDetails)" style="width: 100%; padding: 16px; border: none; border-radius: 12px; background: #2563eb; color: #ffffff; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: transform 0.15s ease;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
      Edytuj danie / Recepturę
    </button>
  </div>
</div>




<div
  v-if="appDialog.show"
  class="app-dialog-overlay"
>
  <div class="app-dialog-card">
    <div class="app-dialog-icon">
      {{ appDialog.icon }}
    </div>

    <div class="app-dialog-title">
      {{ appDialog.title }}
    </div>

    <div class="app-dialog-message">
      {{ appDialog.message }}
    </div>

    <div class="app-dialog-actions">
      <button
        v-if="appDialog.type === 'confirm'"
        @click="cancelAppDialog"
        class="app-dialog-button app-dialog-cancel"
        type="button"
      >
        Anuluj
      </button>

      <button
        @click="confirmAppDialog"
        class="app-dialog-button app-dialog-ok"
        type="button"
      >
        OK
      </button>
    </div>
  </div>
</div>


<!-- =========================
     UKRYTY SZABLON PDF TOWARÓW
========================== -->
<div
  style="
    position:fixed;
    left:-99999px;
    top:0;
    width:794px;
    background:#ffffff;
    padding:32px;
    box-sizing:border-box;
    color:#111827;
    font-family:Arial, sans-serif;
  "
>
  <div
    v-if="towaryPdfPreviewItems.length > 0"
    ref="towaryPdfTemplateRef"
    style="width:100%; background:#ffffff; color:#111827;"
  >
    <!-- NAGŁÓWEK -->
    <div style="margin-bottom:22px;">
      <div style="font-size:28px; font-weight:800; margin-bottom:8px;">
        Lista towarów
      </div>

      <div style="font-size:13px; color:#6b7280; line-height:1.5;">
        <div><strong>Data wygenerowania:</strong> {{ getTodayLabel() }}</div>
        <div><strong>Liczba pozycji:</strong> {{ towaryPdfPreviewItems.length }}</div>
        <div><strong>Zakres:</strong> aktywne towary z aktualnie przefiltrowanego widoku</div>
      </div>
    </div>

    <!-- TABELA -->
    <table
      style="
        width:100%;
        border-collapse:collapse;
        table-layout:fixed;
        font-size:12px;
      "
    >
      <thead>
        <tr style="background:#f3f4f6;">
          <th
            v-for="field in selectedTowaryPdfFields"
            :key="field"
            :style="getTowaryPdfColumnStyle(field, true)"
          >
            {{ getTowaryPdfFieldLabel(field) }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
  v-for="item in towaryPdfPreviewItems"
  :key="item.id"
>
          <td
            v-for="field in selectedTowaryPdfFields"
            :key="field"
            :style="getTowaryPdfColumnStyle(field, false)"
          >
            {{ getTowaryPdfFieldValue(item, field) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>



  <div
  style="
    position:fixed;
    left:-99999px;
    top:0;
    width:794px;
    background:#ffffff;
    padding:32px;
    box-sizing:border-box;
    color:#111827;
    font-family:Arial, sans-serif;
  "
>
  <div
    v-if="pdfPreviewOrder"
    ref="pdfTemplateRef"
    style="
      width:100%;
      background:#ffffff;
      color:#111827;
    "
  >
    <div style="margin-bottom:24px;">
      <div style="font-size:28px; font-weight:700; margin-bottom:10px;">
        Zamówienie
      </div>

      <div style="font-size:16px; margin-bottom:6px;">
        <strong>Hurtownia:</strong> {{ pdfPreviewOrder.supplier || '-' }}
      </div>

      <div style="font-size:16px;">
        <strong>Data:</strong> {{ pdfPreviewOrder.date || '-' }} {{ pdfPreviewOrder.time || '' }}
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:15px; text-align:left;">
      <thead>
        <tr>
          <th style="padding:10px 0; border-top:2px solid #111827; border-bottom:2px solid #111827;">Nazwa</th>
          <th style="width:90px; text-align:center; padding:10px 0; border-top:2px solid #111827; border-bottom:2px solid #111827;">Ilość</th>
          <th style="width:80px; text-align:center; padding:10px 0; border-top:2px solid #111827; border-bottom:2px solid #111827;">JM</th>
          <th style="width:120px; text-align:right; padding:10px 0; border-top:2px solid #111827; border-bottom:2px solid #111827;">Wartość</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in pdfPreviewOrder.items" :key="item.id">
          <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; word-break:break-word;">
            {{ item.name }}
          </td>
          <td style="text-align:center; padding:10px 0; border-bottom:1px solid #e5e7eb;">
            {{ item.qty }}
          </td>
          <td style="text-align:center; padding:10px 0; border-bottom:1px solid #e5e7eb;">
            {{ item.unit || '' }}
          </td>
          <td style="text-align:right; padding:10px 0; border-bottom:1px solid #e5e7eb;">
            {{ Number(item.value || 0).toFixed(2) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div
      style="
        margin-top:20px;
        display:flex;
        justify-content:flex-end;
        font-size:20px;
        font-weight:700;
      "
    >
      Suma: {{ Number(pdfPreviewOrder.total || 0).toFixed(2) }}
    </div>
  </div>
</div>








</template>







<script>


import ZamawiarkaView from './views/ZamawiarkaView.vue'
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { products } from './src/data.js'
import { auth, db } from './firebase.js'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  increment,
  deleteDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore'

import { useRegisterSW } from 'virtual:pwa-register/vue'

export default {





  setup() {

    // =========================
    // wersja aplikacji    
    // =========================

       const appVersion = ref('2.1.9')


       // =========================
    // FEATURE FLAGS (UPRAWNIENIA)
    // =========================
    const aktywneModuly = ref(['zamawiarka', 'rentownosc'])


    // =========================
    // LOGOWANIE - STAN SESJI
    // =========================
    const isLoggedIn = ref(false)
    const authError = ref('')
    const isLoggingIn = ref(false)
    const currentCompany = ref(null)
    

   const authForm = ref({
  email: '',
  password: ''
})


const createEmptyCloudState = () => ({
  suppliers: suppliers.value,
  towary: towary.value,
  warehouses: warehouses.value,
  orderTimings: orderTimings.value,
  units: units.value,
  categories: categories.value,
  whoOrders: whoOrders.value,
  fcSettings: { target: 30, tolerance: 5 },
  dishCategories: [],
  menuItems: []
})


const getUserStateDocRef = (uid) => {
  return doc(db, 'users', uid, 'app', 'state')
}

const getUserCartItemsCollectionRef = (uid) => {
  return collection(db, 'users', uid, 'cartItems')
}

const getUserCartItemDocRef = (uid, productId) => {
  return doc(db, 'users', uid, 'cartItems', String(productId))
}

// Referencja do kolekcji towarów użytkownika
const getUserTowaryCollectionRef = (uid) => {
  return collection(db, 'users', uid, 'towary')
}

// Referencja do konkretnego towaru
const getUserTowarDocRef = (uid, towarId) => {
  return doc(db, 'users', uid, 'towary', String(towarId))
}

// Referencje do nowej kolekcji zamówień
const getUserOrdersCollectionRef = (uid) => {
  return collection(db, 'users', uid, 'orders')
}

const getUserOrderDocRef = (uid, orderId) => {
  return doc(db, 'users', uid, 'orders', String(orderId))
}


const loadUserStateFromFirestore = async (uid) => {
  const stateRef = getUserStateDocRef(uid)
  const snapshot = await getDoc(stateRef)

  if (!snapshot.exists()) {
    return createEmptyCloudState()
  }

  return {
    ...createEmptyCloudState(),
    ...snapshot.data()
  }
}

const saveUserStateToFirestore = async (uid, state) => {
  const stateRef = getUserStateDocRef(uid)

  await setDoc(stateRef, state, { merge: true })
}


        



    

  const handleLogin = async () => {
  const email = String(authForm.value.email || '').trim().toLowerCase()
  const password = String(authForm.value.password || '').trim()

  authError.value = ''

  if (!email) {
    authError.value = 'Wpisz e-mail'
    return
  }

  if (!password) {
    authError.value = 'Wpisz hasło'
    return
  }

  isLoggingIn.value = true

  try {
       await signInWithEmailAndPassword(auth, email, password)

// Nie czyścimy pól od razu po logowaniu,
// żeby przeglądarka mogła zaproponować zapisanie hasła.
  } catch (error) {
    console.error('Firebase login error:', error.message)
    authError.value = 'Nieprawidłowy e-mail lub hasło'
  } finally {
    isLoggingIn.value = false
  }
}

const handleLogout = async () => {
  await signOut(auth)

  isDataLoaded.value = false
  resetCompanyDataState()

  isLoggedIn.value = false
  currentCompany.value = null
  authError.value = ''

  authForm.value = {
    email: '',
    password: ''
  }
}

    





const collectAppState = () => ({
  suppliers: suppliers.value,
  towary: towary.value,
  warehouses: warehouses.value,
  orderTimings: orderTimings.value,
  units: units.value,
  categories: categories.value,
  whoOrders: whoOrders.value,
  fcSettings: fcSettings.value,
  dishCategories: dishCategories.value,
  menuItems: menuItems.value
})

const applyAppState = (state) => {
  const safeState = {
    ...createEmptyCloudState(),
    ...(state || {})
  }

  suppliers.value = safeState.suppliers
  towary.value = safeState.towary
  warehouses.value = safeState.warehouses
  orderTimings.value = safeState.orderTimings
  units.value = safeState.units
  categories.value = safeState.categories
  whoOrders.value = safeState.whoOrders
  
  if (state?.fcSettings) {
    fcSettings.value = state.fcSettings
  }
  
  if (state?.dishCategories) {
    dishCategories.value = state.dishCategories
  }

  if (state?.menuItems) {
        menuItems.value = state.menuItems
      }
  
  isSettingsDirty.value = false
}


const saveAllAppStateToCloud = async () => {
  const uid = auth.currentUser?.uid

  if (!uid) return

  try {
    const appState = collectAppState()

    // ✂️ ODCIĘCIE: Wyrzucamy towary ze starego worka przed zapisem do bazy
    if (appState.towary) {
      delete appState.towary
    }

    // 🔒 BLOKADA TYLKO PRZY CAŁKOWICIE PUSTYM STANIE PO RESECIE
    // (Usunięto sprawdzanie appState.towary, bo już go tu nie ma)
    const isReallyEmptyState =
      (!appState.suppliers || appState.suppliers.length === 0) &&
      (!appState.warehouses || appState.warehouses.length === 0) &&
      (!appState.orderTimings || appState.orderTimings.length === 0) &&
      (!appState.units || appState.units.length === 0) &&
      (!appState.categories || appState.categories.length === 0) &&
      (!appState.whoOrders || appState.whoOrders.length === 0) &&
      (!appState.ordersRegister || appState.ordersRegister.length === 0)

    if (isReallyEmptyState) {
      console.warn('🚫 Zablokowany zapis – stan wygląda na całkowicie pusty')
      return
    }

    await saveUserStateToFirestore(uid, appState)
  } catch (error) {
    console.error('Błąd zapisu do Firestore:', error)
  }
}

const isHydrating = ref(false)
const isDataLoaded = ref(false)
let saveTimeout = null

let unsubscribeCartItems = null
let unsubscribeUserState = null


const subscribeUserState = (uid) => {
  if (unsubscribeUserState) {
    unsubscribeUserState()
    unsubscribeUserState = null
  }

  const stateRef = getUserStateDocRef(uid)

  unsubscribeUserState = onSnapshot(stateRef, (snapshot) => {
    if (!snapshot.exists()) return

    const data = snapshot.data()

    if (Array.isArray(data.ordersRegister)) {
      ordersRegister.value = data.ordersRegister
    }
  })
}



const subscribeCartItems = (uid) => {
  if (unsubscribeCartItems) {
    unsubscribeCartItems()
    unsubscribeCartItems = null
  }

  const cartItemsRef = getUserCartItemsCollectionRef(uid)

  unsubscribeCartItems = onSnapshot(cartItemsRef, (snapshot) => {
  const nextCart = {}
  const nextCustomCartItems = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const qty = Number(data.qty || 0)

    if (qty <= 0) return

    if (data.isCustom) {
      const netPrice = Number(data.netPrice || 0)

      nextCustomCartItems.push({
        id: docSnap.id,
        name: data.name || '',
        unit: data.unit || '',
        supplier: data.supplier || '',
        qty,
        netPrice,
        value: netPrice * qty,
        categories: [],
        isCustom: true
      })

      return
    }

    nextCart[docSnap.id] = qty
  })

  cart.value = nextCart
  customCartItems.value = nextCustomCartItems
})
}


let unsubscribeOrders = null

const subscribeOrders = (uid) => {
  if (unsubscribeOrders) {
    unsubscribeOrders()
    unsubscribeOrders = null
  }

  const ordersRef = getUserOrdersCollectionRef(uid)

  unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
    const nextOrders = []
    snapshot.forEach((docSnap) => {
      nextOrders.push(docSnap.data())
    })
    // Aktualizujemy listę i upewniamy się, że najnowsze są na górze
    ordersRegister.value = nextOrders.sort((a, b) => b.id - a.id)
  })
}



// Zmienna do trzymania "połączenia" na żywo z towarami
let unsubscribeTowary = null

const subscribeTowary = (uid) => {
  // Jeśli już nasłuchujemy, rozłączamy stare połączenie
  if (unsubscribeTowary) {
    unsubscribeTowary()
    unsubscribeTowary = null
  }

  const towaryRef = getUserTowaryCollectionRef(uid)

  // Zaczynamy nasłuchiwać nowej kolekcji!
  unsubscribeTowary = onSnapshot(towaryRef, (snapshot) => {
    const nextTowary = []
    
    snapshot.forEach((docSnap) => {
      nextTowary.push(docSnap.data())
    })

    // Aktualizujemy listę na ekranie w czasie rzeczywistym
    towary.value = nextTowary
  })
}

const scheduleSave = () => {
  if (isHydrating.value) return
  if (!isDataLoaded.value) return

  clearTimeout(saveTimeout)

  saveTimeout = setTimeout(() => {
    saveAllAppStateToCloud()
  }, 500)
}



  const resetCompanyDataState = () => {
  suppliers.value = []

  towary.value = []
  warehouses.value = []
  orderTimings.value = []
  units.value = []
  categories.value = []
  whoOrders.value = []
  ordersRegister.value = []

  cart.value = {}
  customCartItems.value = []

  selectedDay.value = 'wszystkie'
  selectedWarehouse.value = 'wszystkie'
  selectedSupplier.value = 'wszystkie'
  selectedWhoOrders.value = 'wszystkie'

  selectedCartSupplier.value = 'wszystkie'
  selectedCartCategories.value = []
  tempSelectedCartSupplier.value = 'wszystkie'
  tempSelectedCartCategories.value = []

  expandedOrderId.value = null
}



const loadCompanyDataWithFallback = async () => {
  isHydrating.value = true
  isDataLoaded.value = false

  try {
    const uid = auth.currentUser?.uid

    if (!uid) {
      resetCompanyDataState()
      return
    }

    const cloudState = await loadUserStateFromFirestore(uid)

    resetCompanyDataState()
    applyAppState(cloudState)

    isDataLoaded.value = true
  } catch (error) {
    console.error('Błąd ładowania z Firestore:', error)
    resetCompanyDataState()
  } finally {
    isHydrating.value = false
  }
}







// --- KONFIGURACJA BACKUPU ---
const COLLECTIONS_TO_BACKUP = [
  'state',
  'towary',
  'cartItems', // Dodałem, żebyś miał pełny obraz danych
  'kategorie',
  'magazyny',
  'whoOrders',
  'units',
  'orderTimings'
];

// --- FUNKCJA EKSPORTU ---
const eksportujBackup = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const confirmed = await showConfirm('Czy chcesz utworzyć pełną kopię zapasową swoich danych?', 'Utworzyć kopię?', '💾');
  if (!confirmed) return;

  try {
    const backupData = {
      exportedAt: new Date().toISOString(),
      state: {}, // Tu wylądują dane z dokumentu state (bez towarów)
      collections: {} // Tu wylądują dane z kolekcji (w tym nowa kolekcja 'towary')
    };

    // 1. Pobieramy główny dokument stanu
    const stateDoc = await getDoc(getUserStateDocRef(user.uid));
    if (stateDoc.exists()) {
      backupData.state = stateDoc.data();
      
      // 🧹 Gwarancja czystości: na wszelki wypadek usuwamy stary worek towarów ze stanu,
      // żeby nowy plik backupu był w 100% zgodny z nową architekturą.
      if (backupData.state.towary) {
        delete backupData.state.towary;
      }
    }

    // 2. Pobieramy pozostałe kolekcje
    const collectionsToFetch = ['towary', 'cartItems'];
    for (const colName of collectionsToFetch) {
      const colRef = collection(db, 'users', user.uid, colName);
      const snapshot = await getDocs(colRef);
      backupData.collections[colName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // 3. Generowanie poprawnej daty lokalnej (rozwiązuje problem "wczorajszej daty" po północy!)
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];

    // Zapis pliku
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Zmiana nazwy pliku na dedykowaną z poprawną datą
    link.download = `GastroManager_backup_${localDate}.json`;
    link.click();
  } catch (error) {
    console.error("Błąd backupu:", error);
    await showAlert('Nie udało się wygenerować pełnego backupu.', 'Błąd', '❌');
  }
};

const backupInputRef = ref(null);

const triggerFileInput = () => {
  if (backupInputRef.value) {
    backupInputRef.value.click();
  }
};

// --- FUNKCJA WCZYTYWANIA BACKUPU ---
const wczytajBackup = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const backupData = JSON.parse(e.target.result);

      if (!backupData.state || !backupData.collections) {
        await showAlert('Nieprawidłowy format pliku kopii zapasowej.', 'Błąd pliku', '❌');
        event.target.value = '';
        return;
      }

      const confirmed = await showConfirm(
        'Czy na pewno chcesz nadpisać WSZYSTKIE obecne dane w aplikacji? Tej operacji nie można cofnąć!',
        'Uwaga: Przywracanie danych',
        '⚠️'
      );

      if (!confirmed) {
        event.target.value = '';
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      isDataLoaded.value = false;

      // 1. Zapisujemy główny stan aplikacji (nie zawiera już starych towarów)
      if (backupData.state) {
        await setDoc(getUserStateDocRef(user.uid), backupData.state);
      }

      // 2. Zapisujemy kolekcje (w tym 'towary')
      if (backupData.collections) {
        for (const [colName, docsArray] of Object.entries(backupData.collections)) {
          
          // Złota zasada: Najpierw w pełni czyścimy istniejącą kolekcję na żywo...
          const currentCollectionSnapshot = await getDocs(collection(db, 'users', user.uid, colName));
          for (const docSnap of currentCollectionSnapshot.docs) {
            await deleteDoc(docSnap.ref);
          }

          // ...a potem zapisujemy do niej idealnie odwzorowane dane z pliku.
          for (const itemData of docsArray) {
            const docRef = doc(db, 'users', user.uid, colName, String(itemData.id));
            await setDoc(docRef, itemData);
          }
        }
      }

      await loadCompanyDataWithFallback();
      await showAlert('Kopia zapasowa wczytana pomyślnie! Aplikacja zostanie odświeżona.', 'Sukces', '✅');
      
      // Magiczna linijka – robi automatyczne F5, gwarantując idealne załadowanie widoku
      window.location.reload();

    } catch (error) {
      console.error("Błąd odczytu pliku:", error);
      await showAlert('Nie udało się odczytać pliku. Plik jest uszkodzony.', 'Błąd', '❌');
    }
    
    event.target.value = ''; 
  };
  
  reader.readAsText(file);
};




    // =========================
// SKĄD OTWARTO FORMULARZ TOWARU
// =========================
const towarFormSource = ref('towary')





    // =========================
    // EKRAN GŁÓWNY APLIKACJI
    // =========================
    const currentScreen = ref('home')

    // =========================
    // AKTYWNA ZAKŁADKA W ZAMAWIARCE
    // =========================
    const zamawiarkaView = ref('menu')
    const settingsView = ref('')


    // =========================
    // AKTYWNA ZAKŁADKA W RECEPTURACH
    // =========================
    const recepturyView = ref('dashboard')


    // =========================
    // USTAWIENIA: FOOD COST I KATEGORIE DAŃ
    // =========================
    const fcSettings = ref({
      target: 30, // docelowy % Food Cost
      tolerance: 5 // dopuszczalna delta (odchylenie w %)
    })

    const isSettingsDirty = ref(false)
    
   // Lista kategorii dań (na start dajemy przykładowe)
    const dishCategories = ref([])

    const menuItems = ref([])

    // Zmienne do modala Szczegółów Dania
    const showDishDetailsModal = ref(false)
    const selectedDishDetails = ref(null)

    const openDishDetails = (item) => {
      selectedDishDetails.value = item
      showDishDetailsModal.value = true
    }

    const closeDishDetails = () => {
      showDishDetailsModal.value = false
      selectedDishDetails.value = null
    }
    const selectedCategory = ref(null)

    // Stan sortowania: 'desc' (od najwyższego FC) lub 'asc' (od najniższego FC)
    const fcSortOrder = ref('desc')

    const filteredMenuItems = computed(() => {
      // 1. Filtrowanie
      let filtered = menuItems.value
      if (selectedCategory.value) {
        filtered = filtered.filter(item => item.category === selectedCategory.value)
      }
      
      // 2. Sortowanie po wyliczonym FC (koszt / cena)
      return filtered.slice().sort((a, b) => {
        const fcA = (a.cena && a.cena > 0) ? (a.koszt / a.cena) : 0
        const fcB = (b.cena && b.cena > 0) ? (b.koszt / b.cena) : 0
        
        return fcSortOrder.value === 'desc' ? fcB - fcA : fcA - fcB
      })
    })

    // Obliczanie średniego FC dla aktualnie wyświetlanej kategorii
    const currentCategoryFC = computed(() => {
      if (filteredMenuItems.value.length === 0) return 0
      
      let totalCost = 0
      let totalPrice = 0
      
      filteredMenuItems.value.forEach(item => {
        totalCost += Number(item.koszt || 0)
        totalPrice += Number(item.cena || 0)
      })
      
      if (totalPrice === 0) return 0
      return ((totalCost / totalPrice) * 100).toFixed(1)
    })


    // Stan modala i formularza kategorii menu
    const showDishCategoryForm = ref(false)
    const dishCategoryFormMode = ref('add') // 'add' lub 'edit'
    const editedDishCategoryId = ref(null)

    const dishCategoryForm = ref({
      name: '',
      targetFC: '' // Jeśli puste, dziedziczy po ogólnym FC
    })


    // Funkcje do zarządzania kategoriami menu (Rentowność)
    const openDishCategoryForm = () => {
      dishCategoryFormMode.value = 'add'
      editedDishCategoryId.value = null
      dishCategoryForm.value = { name: '', targetFC: '' }
      showDishCategoryForm.value = true
    }

    const closeDishCategoryForm = () => {
      showDishCategoryForm.value = false
      dishCategoryFormMode.value = 'add'
      editedDishCategoryId.value = null
      dishCategoryForm.value = { name: '', targetFC: '' }
    }

    const editDishCategory = (category) => {
      dishCategoryFormMode.value = 'edit'
      editedDishCategoryId.value = category.id
      dishCategoryForm.value = { 
        name: category.name || '', 
        targetFC: category.targetFC !== undefined && category.targetFC !== null ? String(category.targetFC) : '' 
      }
      showDishCategoryForm.value = true
    }

    const saveDishCategory = async () => {
      const name = cleanName(dishCategoryForm.value.name)
      if (!name) return

      // Sprawdzenie, czy kategoria o takiej nazwie już istnieje (wykorzystujemy Twoją funkcję hasDuplicateName)
      if (hasDuplicateName(dishCategories.value, name, editedDishCategoryId.value)) {
        await showAlert('Taka kategoria już istnieje', 'Duplikat', '⚠️')
        return
      }

      // Formatowanie FC: jeśli ktoś wpisał liczbę, zapisujemy ją, jeśli puste - dajemy null
      const targetFCParsed = dishCategoryForm.value.targetFC !== '' ? Number(dishCategoryForm.value.targetFC) : null

      if (dishCategoryFormMode.value === 'edit' && editedDishCategoryId.value !== null) {
        // Zapisujemy edycję
        const itemToUpdate = dishCategories.value.find(item => item.id === editedDishCategoryId.value)
        if (itemToUpdate) {
          itemToUpdate.name = name
          itemToUpdate.targetFC = targetFCParsed
        }
      } else {
        // Dodajemy nową kategorię
        dishCategories.value.push({
          id: Date.now(),
          name,
          targetFC: targetFCParsed
        })
      }

      closeDishCategoryForm()
      scheduleSave()
    }

    const deleteDishCategory = async () => {
      if (editedDishCategoryId.value === null) return

      const confirmed = await showConfirm('Czy na pewno chcesz usunąć tę kategorię?', 'Usuń kategorię', '🗑️')
      if (!confirmed) return

      dishCategories.value = dishCategories.value.filter(item => item.id !== editedDishCategoryId.value)
      closeDishCategoryForm()
      scheduleSave()
    }

    // --- FUNKCJE MENU ---
const duplicateMenuItem = (item) => {
  const newItem = {
    ...item,
    id: Date.now(), 
    name: `${item.name} (kopia)`
  }
  menuItems.value.push(newItem)
  scheduleSave()
}

const deleteMenuItem = async (id) => {
      const confirmed = await showConfirm('Czy na pewno chcesz usunąć tę pozycję z menu?', 'Usuń danie', '🗑️')
      if (!confirmed) return
      
      menuItems.value = menuItems.value.filter(item => item.id !== id)
      scheduleSave()
      
      // Jeśli usuwamy danie mając otwarty jego modal, zamykamy go.
      if (showDishDetailsModal.value && selectedDishDetails.value?.id === id) {
        closeDishDetails()
      }
    }

    // Funkcje "Nakładki" dla przycisków w Modalu Szczegółów
    const handleDuplicateFromDetails = () => {
      if (selectedDishDetails.value) {
        duplicateMenuItem(selectedDishDetails.value)
        closeDishDetails() // Po sklonowaniu zamykamy modal
      }
    }

    const handleDeleteFromDetails = async () => {
      if (selectedDishDetails.value) {
        await deleteMenuItem(selectedDishDetails.value.id)
      }
    }

    // --- WIDOK FORMULARZA RECEPTURY ---
    const editingDish = ref(null)

    const openDishForm = (item = null) => {
      if (showDishDetailsModal.value) closeDishDetails()

      if (item) {
        editingDish.value = JSON.parse(JSON.stringify(item))
        if (!editingDish.value.recipe) editingDish.value.recipe = []
      } else {
        // Nowe danie
        editingDish.value = {
          id: Date.now(),
          name: '',
          category: '', // Zostawiamy puste, żeby wymusić komunikat "Wybierz kategorię..."
          cena: 0,
          koszt: 0,
          vat: 8, 
          recipe: []
        }
      }
      recepturyView.value = 'form'
    }

    



    const closeDishForm = () => {
      editingDish.value = null
      recepturyView.value = 'lista'
    }

    const saveDishForm = async () => { // Zmieniamy na async
      // 1. Walidacja nazwy
      if (!editingDish.value.name || editingDish.value.name.trim() === '') {
        await showAlert('Musisz podać nazwę dania.', 'Brak nazwy', '⚠️')
        return // Zatrzymujemy funkcję, zapis nie dojdzie do skutku
      }

      // 2. Walidacja kategorii
      if (!editingDish.value.category || editingDish.value.category === '') {
        await showAlert('Musisz wybrać kategorię dla tego dania.', 'Brak kategorii', '📁')
        return // Zatrzymujemy funkcję, zapis nie dojdzie do skutku
      }
      
      const index = menuItems.value.findIndex(i => i.id === editingDish.value.id)
      
      if (index !== -1) {
        menuItems.value[index] = editingDish.value
      } else {
        menuItems.value.push(editingDish.value)
      }
      
      scheduleSave()
      closeDishForm()
      // Opcjonalnie: jeśli chcesz potwierdzenie zapisu, możesz tu dodać kolejny showAlert
    }




    // =========================
    // RECEPTURA - SKŁADNIKI
    // =========================
    const showIngredientModal = ref(false)
    const ingredientSearch = ref('')
    const selectedIngredientTowar = ref(null)
    const ingredientQty = ref('')
    const editingRecipeIndex = ref(null)

    const filteredIngredientTowary = computed(() => {
      if (!towary.value) return []
      return towary.value.filter(item => {
        if (item.active === false) return false
        if (ingredientSearch.value.trim() === '') return true
        return item.name.toLowerCase().includes(ingredientSearch.value.toLowerCase())
      })
    })

    const closeIngredientModal = () => {
      showIngredientModal.value = false
      ingredientSearch.value = ''
      selectedIngredientTowar.value = null
      ingredientQty.value = ''
      editingRecipeIndex.value = null
    }

    const openIngredientModal = () => {
      editingRecipeIndex.value = null
      selectedIngredientTowar.value = null
      ingredientSearch.value = ''
      ingredientQty.value = ''
      showIngredientModal.value = true
    }

    const selectIngredient = (item) => {
      selectedIngredientTowar.value = item
      ingredientQty.value = ''
    }

    const editRecipeIngredient = (ing, index) => {
      editingRecipeIndex.value = index
      selectedIngredientTowar.value = {
        id: ing.towarId,
        name: ing.name,
        unit: ing.unit,
        netPrice: ing.netPrice 
      }
      ingredientQty.value = ing.qty
      showIngredientModal.value = true
    }

    const goBackToIngredientList = () => {
      if (editingRecipeIndex.value !== null) {
        closeIngredientModal()
      } else {
        selectedIngredientTowar.value = null
        ingredientQty.value = ''
      }
    }

    const updateDishTotalCost = () => {
      if (!editingDish.value.recipe) return
      const total = editingDish.value.recipe.reduce((sum, ing) => sum + (ing.qty * ing.netPrice), 0)
      editingDish.value.koszt = Number(total.toFixed(2))
    }

    const calculateTotalRecipeCost = () => {
      if (!editingDish.value || !editingDish.value.recipe) return 0
      return editingDish.value.recipe.reduce((sum, ing) => sum + (ing.qty * ing.netPrice), 0)
    }

    const saveIngredientToRecipe = async () => {
      if (!ingredientQty.value || ingredientQty.value <= 0) {
        await showAlert('Wpisz poprawną ilość zużycia.', 'Błąd', '⚠️')
        return
      }
      
      const newIngredient = {
        id: editingRecipeIndex.value !== null ? editingDish.value.recipe[editingRecipeIndex.value].id : Date.now(),
        towarId: selectedIngredientTowar.value.id,
        name: selectedIngredientTowar.value.name,
        unit: selectedIngredientTowar.value.unit,
        netPrice: Number(selectedIngredientTowar.value.netPrice || 0),
        qty: Number(ingredientQty.value)
      }

      if (!editingDish.value.recipe) {
        editingDish.value.recipe = []
      }

      if (editingRecipeIndex.value !== null) {
        editingDish.value.recipe[editingRecipeIndex.value] = newIngredient
      } else {
        editingDish.value.recipe.push(newIngredient)
      }
      
      updateDishTotalCost()
      closeIngredientModal()
    }

    const removeIngredientFromRecipe = async () => {
      const confirmed = await showConfirm('Usunąć ten składnik z receptury?', 'Usuń składnik', '🗑️')
      if (!confirmed) return
      
      if (editingRecipeIndex.value !== null) {
        editingDish.value.recipe.splice(editingRecipeIndex.value, 1)
        updateDishTotalCost()
      }
      closeIngredientModal()
    }





    const markSettingsDirty = () => {
      isSettingsDirty.value = true
    }

    const saveSettings = () => {
      scheduleSave()
      isSettingsDirty.value = false
    }



    // =========================
    // AKTYWNY LOKAL
    // przygotowanie pod wiele restauracji w przyszłości
    // =========================
    const activeRestaurant = ref({
      id: 'demo-restauracja',
      name: 'Demo Restauracja',
      plan: 'full'
    })



    // =========================
    // FILTRY
    // =========================
    const selectedDay = ref('wszystkie')
    const selectedWarehouse = ref('wszystkie')
    const selectedSupplier = ref('wszystkie')
    const selectedWhoOrders = ref('wszystkie')


    // =========================
    // WYSZUKIWARKA W WIDOKU ZAMÓWIENIA
    // =========================
    const showProductSearch = ref(false)
    const productSearch = ref('')


    // =========================
    // MODAL FILTRÓW
    // =========================
    const showFiltersModal = ref(false)








    // =========================
    // KOSZYK
    // =========================
    const cart = ref({})
    const selectedCartSupplier = ref('wszystkie')
    const showCartSearch = ref(false)
const cartSearch = ref('')
const selectedCartCategories = ref([])
const showCartFiltersModal = ref(false)
const tempSelectedCartSupplier = ref('wszystkie')
const showCartSupplierFilterOptions = ref(false)
const showCartCategoryFilterOptions = ref(false)
const tempSelectedCartCategories = ref([])
const showCustomCartItemModal = ref(false)
const cartBounce = ref(false)


const customCartItemForm = ref({
  name: '',
  unit: '',
  qty: '',
  supplier: '',
  price: ''
})

const customCartItems = ref([])


    // =========================
    // REJESTR ZAMÓWIEŃ
    // =========================
    const ordersRegister = ref([])
    const expandedOrderId = ref(null)
    const pdfTemplateRef = ref(null)
    const pdfPreviewOrder = ref(null)


    // =========================
    // ZMIENNE DO PODGLĄDU PDF
    // =========================
    const showPdfViewerModal = ref(false)
    const pdfViewerUrl = ref('')
    const pdfViewerFileName = ref('')
    const currentPdfBlob = ref(null)



    const showTowaryPdfModal = ref(false)
const towaryPdfTemplateRef = ref(null)
const towaryPdfPreviewItems = ref([])

const towaryPdfOptions = [
  { key: 'name', label: 'Nazwa' },
  { key: 'unit', label: 'JM' },
  { key: 'supplier', label: 'Hurtownia' },
  { key: 'netPrice', label: 'Cena netto' },
  { key: 'vat', label: 'Stawka VAT' },
  { key: 'warehouse', label: 'Magazyn' },
  { key: 'categories', label: 'Kategoria' }
]

const selectedTowaryPdfFields = ref([
  'name',
  'unit',
  'supplier',
  'netPrice'
])





    // =========================
    // HURTOWNIE (LISTA + FORMULARZ)
    // =========================
    const suppliers = ref([
      {
        id: 1,
        name: 'Hurtownia Testowa',
        phone: '123456789',
        email: 'test@email.com'
      }
    ])

        const showSupplierForm = ref(false)

    // =========================
    // TRYB FORMULARZA HURTOWNI
    // add = dodawanie
    // edit = edycja
    // =========================
    const supplierFormMode = ref('add')
    const editedSupplierId = ref(null)

    const supplierForm = ref({
      name: '',
      phone: '',
      email: ''
    })





 








    // =========================
    // FUNKCJE KOSZYKA
    // =========================
    const addToCart = async (productId) => {
  const user = auth.currentUser
  if (!user) return

  const ref = getUserCartItemDocRef(user.uid, productId)

  await setDoc(
    ref,
    { qty: increment(1) },
    { merge: true }
  )
}

  const removeFromCart = async (productId) => {
  const user = auth.currentUser
  if (!user) return

  if (Number(cart.value[productId] || 0) <= 1) {
    await deleteDoc(getUserCartItemDocRef(user.uid, productId))
    return
  }

  const ref = getUserCartItemDocRef(user.uid, productId)

  await setDoc(
    ref,
    { qty: increment(-1) },
    { merge: true }
  )
}

  const clearCart = async () => {
  const confirmed = await showConfirm(
  'Czy na pewno chcesz wyczyścić koszyk?',
  'Potwierdź akcję',
  '🗑️'
)
if (!confirmed) return

  const user = auth.currentUser
  if (!user) return

  const batch = writeBatch(db)

  Object.keys(cart.value).forEach((productId) => {
    batch.delete(getUserCartItemDocRef(user.uid, productId))
  })

  customCartItems.value.forEach((item) => {
  batch.delete(getUserCartItemDocRef(user.uid, item.id))
})

  await batch.commit()

  customCartItems.value = []
}


const openCustomCartItemModal = (item = null) => {
  if (item) {
    closeQtyModal()
  }

  if (item) {
    customCartItemForm.value = {
      id: item.id,
      name: item.name || '',
      unit: item.unit || '',
      supplier: item.supplier || '',
      qty: item.qty || '',
      price: item.netPrice || ''
    }
  } else {
    customCartItemForm.value = {
      id: null,
      name: '',
      unit: '',
      supplier: '',
      qty: '',
      price: ''
    }
  }

  showCustomCartItemModal.value = true
}

const closeCustomCartItemModal = () => {
  showCustomCartItemModal.value = false

  customCartItemForm.value = {
  name: '',
  unit: '',
  qty: '',
  supplier: '',
  price: ''
}
}


const saveCustomCartItem = async () => {
  const user = auth.currentUser
  if (!user) return

  const name = String(customCartItemForm.value.name || '').trim()
  const unit = String(customCartItemForm.value.unit || '').trim()
  const supplier = String(customCartItemForm.value.supplier || '').trim()
  const qty = Number(customCartItemForm.value.qty)
  const price = Number(customCartItemForm.value.price)

  if (!name) {
  await showAlert('Wpisz nazwę', 'Brak nazwy', '✏️')
  return
}

  if (!unit) {
    await showAlert('Wybierz jednostkę miary', 'Brak danych', '⚠️')
    return
  }

  if (!qty || qty <= 0) {
    await showAlert('Wpisz poprawną ilość', 'Błąd danych', '⚠️')
    return
  }

  const customId = customCartItemForm.value.id || `custom-${Date.now()}`

  await setDoc(
    getUserCartItemDocRef(user.uid, customId),
    {
      isCustom: true,
      name,
      unit,
      supplier,
      qty,
      netPrice: !isNaN(price) ? price : 0
    },
    { merge: true }
  )

  closeCustomCartItemModal()
}



    // =========================
    // MODAL_ILOŚĆ_ZAMÓWIENIA
    // =========================
    const showQtyModal = ref(false)
    const selectedProductForQty = ref(null)
    const tempQty = ref('')

   const qtyInput = ref(null)

const openQtyModal = async (product) => {
  selectedProductForQty.value = product

  if (product?.isCustom) {
    tempQty.value = String(product.qty ?? '')
  } else {
    tempQty.value = String(cart.value[product.id] || '')
  }

  showQtyModal.value = true

  await nextTick()
  qtyInput.value?.focus()
}

    const closeQtyModal = () => {
      showQtyModal.value = false
      selectedProductForQty.value = null
      tempQty.value = ''
    }

    const saveQtyModal = async () => {
  if (!selectedProductForQty.value) return

  const user = auth.currentUser
  if (!user) return

  const product = selectedProductForQty.value
  const productId = product.id
  const qty = Number(tempQty.value)

  if (product.isCustom) {
  if (!tempQty.value || qty <= 0) {
    await deleteDoc(getUserCartItemDocRef(user.uid, productId))
    closeQtyModal()
    return
  }

    const itemToUpdate = customCartItems.value.find(item => item.id === productId)

    if (itemToUpdate) {
  await setDoc(
    getUserCartItemDocRef(user.uid, productId),
    {
      qty,
      netPrice: itemToUpdate.netPrice || 0
    },
    { merge: true }
  )
}

closeQtyModal()
return
  }

  if (!tempQty.value || qty <= 0) {
    await deleteDoc(getUserCartItemDocRef(user.uid, productId))
    closeQtyModal()
    return
  }

  await setDoc(
    getUserCartItemDocRef(user.uid, productId),
    { qty },
    { merge: true }
  )

  closeQtyModal()
}


// =========================
// KOSZYK - USUWANIE POZYCJI Z MODALA ILOŚCI
// =========================
const deleteCartItemFromQtyModal = async () => {
  if (!selectedProductForQty.value) return

  const user = auth.currentUser
  if (!user) return

  const productId = selectedProductForQty.value.id

  await deleteDoc(getUserCartItemDocRef(user.uid, productId))

  closeQtyModal()
}



// =========================
// KOSZYK - EDYCJA TOWARU Z MODALA ILOŚCI
// =========================
// =========================
// KOSZYK / ZRÓB ZAMÓWIENIE - EDYCJA TOWARU Z MODALA ILOŚCI
// =========================
const editTowarFromQtyModal = () => {
  if (!selectedProductForQty.value) return

  const product = selectedProductForQty.value

  if (product.isCustom) return

  towarFormSource.value =
    zamawiarkaView.value === 'koszyk' ? 'koszyk' : 'produkty'

  const fullTowar = towary.value.find(item => item.id === product.id)

closeQtyModal()
zamawiarkaView.value = 'towary'
openTowarEdit(fullTowar || product)
}







    // =========================
    // FUNKCJE HURTOWNI
    // =========================
    const openSupplierForm = () => {
      supplierFormMode.value = 'add'
      editedSupplierId.value = null

      supplierForm.value = {
        name: '',
        phone: '',
        email: ''
      }

      showSupplierForm.value = true
    }

    const editSupplier = (supplier) => {
      supplierFormMode.value = 'edit'
      editedSupplierId.value = supplier.id

      supplierForm.value = {
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || ''
      }

      showSupplierForm.value = true
    }

    const closeSupplierForm = () => {
      showSupplierForm.value = false
      supplierFormMode.value = 'add'
      editedSupplierId.value = null

      supplierForm.value = {
        name: '',
        phone: '',
        email: ''
      }
    }

    const saveSupplier = async () => {
      if (!supplierForm.value.name.trim()) return








           // =========================
            // DUPLIKAT - HURTOWNIA
             // =========================
                  if (hasDuplicateName(
                    suppliers.value,
                    supplierForm.value.name,
                     editedSupplierId.value
                  )) {
                  await showAlert('Taka hurtownia już istnieje', 'Duplikat', '⚠️')
                    return
                   }




            // =========================
            // TRYB EDYCJI
             // =========================
           if (supplierFormMode.value === 'edit' && editedSupplierId.value !== null) {
            const supplierToUpdate = suppliers.value.find(
            supplier => supplier.id === editedSupplierId.value
            )

           if (supplierToUpdate) {
          supplierToUpdate.name = cleanName(supplierForm.value.name)
          supplierToUpdate.phone = supplierForm.value.phone
          supplierToUpdate.email = supplierForm.value.email
        }
      } else {
        // =========================
        // TRYB DODAWANIA
        // =========================
        suppliers.value.push({
  id: Date.now(),
  name: cleanName(supplierForm.value.name),
  phone: supplierForm.value.phone,
  email: supplierForm.value.email
})
      }

      supplierForm.value = {
        name: '',
        phone: '',
        email: ''
      }

      showSupplierForm.value = false
      supplierFormMode.value = 'add'
      editedSupplierId.value = null
      scheduleSave()
    }



// =========================
// USUWANIE HURTOWNI (Z POTWIERDZENIEM)
// =========================
const deleteSupplier = async () => {
  if (editedSupplierId.value === null) return

  const supplierToDelete = suppliers.value.find(
    supplier => supplier.id === editedSupplierId.value
  )

  const supplierNameToDelete = supplierToDelete?.name || ''

  // 🔴 POTWIERDZENIE
  const confirmed = await showConfirm(
  'Czy na pewno chcesz usunąć?',
  'Usuń hurtownię',
  '🗑️'
)
if (!confirmed) return

  suppliers.value = suppliers.value.filter(
    supplier => supplier.id !== editedSupplierId.value
  )

  if (supplierNameToDelete) {
    towary.value = towary.value.map(item => {
      if (item.supplier !== supplierNameToDelete) return item

      return {
        ...item,
        supplier: ''
      }
    })
  }

  showSupplierForm.value = false
  supplierFormMode.value = 'add'
  editedSupplierId.value = null

  supplierForm.value = {
    name: '',
    phone: '',
    email: ''
  }

  scheduleSave()
}






    // =========================
    // MAGAZYNY (LISTA + FORMULARZ)
    // =========================
    const warehouses = ref([])

    const showWarehouseForm = ref(false)

    // =========================
    // TRYB FORMULARZA MAGAZYNU
    // add = dodawanie
    // edit = edycja
    // =========================
    const warehouseFormMode = ref('add')
    const editedWarehouseId = ref(null)

    const warehouseForm = ref({
      name: ''
    })

    // =========================
    // FUNKCJE MAGAZYNÓW
    // =========================
    const openWarehouseForm = () => {
      warehouseFormMode.value = 'add'
      editedWarehouseId.value = null

      warehouseForm.value = {
        name: ''
      }

      showWarehouseForm.value = true
    }

    const editWarehouse = (warehouse) => {
      warehouseFormMode.value = 'edit'
      editedWarehouseId.value = warehouse.id

      warehouseForm.value = {
        name: warehouse.name || ''
      }

      showWarehouseForm.value = true
    }

    const closeWarehouseForm = () => {
      showWarehouseForm.value = false
      warehouseFormMode.value = 'add'
      editedWarehouseId.value = null

      warehouseForm.value = {
        name: ''
      }
    }

    const saveWarehouse =async () => {
  const name = cleanName(warehouseForm.value.name)

  if (!name) return

  // =========================
  // DUPLIKAT - MAGAZYN
  // =========================
  if (hasDuplicateName(
    warehouses.value,
    name,
    editedWarehouseId.value
  )) {
    await showAlert('Taki magazyn już istnieje', 'Duplikat', '⚠️')
    return
  }

  // =========================
  // TRYB EDYCJI
  // =========================
  if (warehouseFormMode.value === 'edit' && editedWarehouseId.value !== null) {
    const warehouseToUpdate = warehouses.value.find(
      warehouse => warehouse.id === editedWarehouseId.value
    )

    if (warehouseToUpdate) {
      warehouseToUpdate.name = name
    }
  } else {
    // =========================
    // TRYB DODAWANIA
    // =========================
    warehouses.value.push({
      id: Date.now(),
      name
    })
  }

  showWarehouseForm.value = false
  warehouseFormMode.value = 'add'
  editedWarehouseId.value = null

  warehouseForm.value = {
    name: ''
  }

  scheduleSave()
}

    // =========================
    // USUWANIE MAGAZYNU (Z POTWIERDZENIEM)
    // =========================
    const deleteWarehouse = async () => {
  if (editedWarehouseId.value === null) return

  const warehouseToDelete = warehouses.value.find(
    warehouse => warehouse.id === editedWarehouseId.value
  )

  const warehouseNameToDelete = warehouseToDelete?.name || ''

  const confirmed = await showConfirm(
    'Czy na pewno chcesz usunąć?',
    'Usuń magazyn',
    '🗑️'
  )
  if (!confirmed) return

  warehouses.value = warehouses.value.filter(
    warehouse => warehouse.id !== editedWarehouseId.value
  )

  if (warehouseNameToDelete) {
    towary.value = towary.value.map(item => {
      if (item.warehouse !== warehouseNameToDelete) return item

      return {
        ...item,
        warehouse: ''
      }
    })
  }

  showWarehouseForm.value = false
  warehouseFormMode.value = 'add'
  editedWarehouseId.value = null

  warehouseForm.value = {
    name: ''
  }

  scheduleSave()
}





    // =========================
    // KIEDY ZAMAWIANE (LISTA + FORMULARZ)
    // =========================
    const orderTimings = ref([])

    const showOrderTimingForm = ref(false)

    // =========================
    // TRYB FORMULARZA
    // =========================
    const orderTimingFormMode = ref('add')
    const editedOrderTimingId = ref(null)

    const orderTimingForm = ref({
      name: ''
    })

    // =========================
    // FUNKCJE
    // =========================
    const openOrderTimingForm = () => {
      orderTimingFormMode.value = 'add'
      editedOrderTimingId.value = null

      orderTimingForm.value = {
        name: ''
      }

      showOrderTimingForm.value = true
    }

    const editOrderTiming = (item) => {
      orderTimingFormMode.value = 'edit'
      editedOrderTimingId.value = item.id

      orderTimingForm.value = {
        name: item.name || ''
      }

      showOrderTimingForm.value = true
    }

    const closeOrderTimingForm = () => {
      showOrderTimingForm.value = false
      orderTimingFormMode.value = 'add'
      editedOrderTimingId.value = null

      orderTimingForm.value = {
        name: ''
      }
    }

    const saveOrderTiming = async () => {
  const name = cleanName(orderTimingForm.value.name)

  if (!name) return

  // =========================
  // DUPLIKAT - KIEDY ZAMAWIANE
  // =========================
  if (hasDuplicateName(
    orderTimings.value,
    name,
    editedOrderTimingId.value
  )) {
    await showAlert('Taka pozycja już istnieje', 'Duplikat', '⚠️')
    return
  }

  if (orderTimingFormMode.value === 'edit' && editedOrderTimingId.value !== null) {
    const itemToUpdate = orderTimings.value.find(
      item => item.id === editedOrderTimingId.value
    )

    if (itemToUpdate) {
      itemToUpdate.name = name
    }
  } else {
    orderTimings.value.push({
      id: Date.now(),
      name
    })
  }

  showOrderTimingForm.value = false
  orderTimingFormMode.value = 'add'
  editedOrderTimingId.value = null

  orderTimingForm.value = {
    name: ''
  }

  scheduleSave()
}

    // =========================
    // USUWANIE (Z POTWIERDZENIEM)
    // =========================
    const deleteOrderTiming = async () => {
  if (editedOrderTimingId.value === null) return

  const timingToDelete = orderTimings.value.find(
    item => item.id === editedOrderTimingId.value
  )

  const timingNameToDelete = timingToDelete?.name || ''

  const confirmed = await showConfirm(
  'Czy na pewno chcesz usunąć?',
  'Potwierdź usunięcie',
  '🗑️'
)
if (!confirmed) return

  orderTimings.value = orderTimings.value.filter(
    item => item.id !== editedOrderTimingId.value
  )

  if (timingNameToDelete) {
    towary.value = towary.value.map(item => {
      let updatedItem = { ...item }

      // usuwamy z listy orderTimings
      if (Array.isArray(updatedItem.orderTimings)) {
        updatedItem.orderTimings = updatedItem.orderTimings.filter(
          t => t !== timingNameToDelete
        )
      }

      // usuwamy z maxQtyByOrderTiming
      if (
        updatedItem.maxQtyByOrderTiming &&
        typeof updatedItem.maxQtyByOrderTiming === 'object'
      ) {
        const newMax = { ...updatedItem.maxQtyByOrderTiming }
        delete newMax[timingNameToDelete]
        updatedItem.maxQtyByOrderTiming = newMax
      }

      return updatedItem
    })
  }

  showOrderTimingForm.value = false
  orderTimingFormMode.value = 'add'
  editedOrderTimingId.value = null

  orderTimingForm.value = {
    name: ''
  }

  scheduleSave()
}



  


    // =========================
    // JEDNOSTKI MIARY (LISTA + FORMULARZ)
    // =========================
    const units = ref([])

    const showUnitForm = ref(false)

    // =========================
    // TRYB FORMULARZA
    // =========================
    const unitFormMode = ref('add')
    const editedUnitId = ref(null)

    const unitForm = ref({
      name: ''
    })

    // =========================
    // FUNKCJE
    // =========================
    const openUnitForm = () => {
      unitFormMode.value = 'add'
      editedUnitId.value = null

      unitForm.value = {
        name: ''
      }

      showUnitForm.value = true
    }

    const editUnit = (item) => {
      unitFormMode.value = 'edit'
      editedUnitId.value = item.id

      unitForm.value = {
        name: item.name || ''
      }

      showUnitForm.value = true
    }

    const closeUnitForm = () => {
      showUnitForm.value = false
      unitFormMode.value = 'add'
      editedUnitId.value = null

      unitForm.value = {
        name: ''
      }
    }

    const saveUnit = async () => {
  const name = cleanName(unitForm.value.name)

  if (!name) return

  // =========================
  // DUPLIKAT - JEDNOSTKA
  // =========================
  if (hasDuplicateName(
    units.value,
    name,
    editedUnitId.value
  )) {
    await showAlert('Taka jednostka już istnieje', 'Duplikat', '⚠️')
    return
  }

  if (unitFormMode.value === 'edit' && editedUnitId.value !== null) {
    const itemToUpdate = units.value.find(
      item => item.id === editedUnitId.value
    )

    if (itemToUpdate) {
      itemToUpdate.name = name
    }
  } else {
    units.value.push({
      id: Date.now(),
      name
    })
  }

  showUnitForm.value = false
  unitFormMode.value = 'add'
  editedUnitId.value = null

  unitForm.value = {
    name: ''
  }

  scheduleSave()
}



    // =========================
    // USUWANIE (Z POTWIERDZENIEM)
    // =========================
    const deleteUnit = async () => {
  if (editedUnitId.value === null) return

  const unitToDelete = units.value.find(
    item => item.id === editedUnitId.value
  )

  const unitNameToDelete = unitToDelete?.name || ''

  const confirmed = await showConfirm(
  'Czy na pewno chcesz usunąć?',
  'Usuń jednostkę',
  '🗑️'
)
if (!confirmed) return

  units.value = units.value.filter(
    item => item.id !== editedUnitId.value
  )

  if (unitNameToDelete) {
    towary.value = towary.value.map(item => {
      if (item.unit !== unitNameToDelete) return item

      return {
        ...item,
        unit: ''
      }
    })
  }

  showUnitForm.value = false
  unitFormMode.value = 'add'
  editedUnitId.value = null

  unitForm.value = {
    name: ''
  }

  scheduleSave()
}





  


// =========================
// KATEGORIE TOWARÓW (LISTA + FORMULARZ)
// =========================
const categories = ref([])

const showCategoryForm = ref(false)

// =========================
// TRYB FORMULARZA
// =========================
const categoryFormMode = ref('add')
const editedCategoryId = ref(null)

const categoryForm = ref({
  name: ''
})

// =========================
// FUNKCJE
// =========================
const openCategoryForm = () => {
  categoryFormMode.value = 'add'
  editedCategoryId.value = null

  categoryForm.value = {
    name: ''
  }

  showCategoryForm.value = true
}

const editCategory = (item) => {
  categoryFormMode.value = 'edit'
  editedCategoryId.value = item.id

  categoryForm.value = {
    name: item.name || ''
  }

  showCategoryForm.value = true
}

const closeCategoryForm = () => {
  showCategoryForm.value = false
  categoryFormMode.value = 'add'
  editedCategoryId.value = null

  categoryForm.value = {
    name: ''
  }
}

const saveCategory = async () => {
  const name = cleanName(categoryForm.value.name)

  if (!name) return

  // =========================
  // DUPLIKAT - KATEGORIA
  // =========================
  if (hasDuplicateName(
    categories.value,
    name,
    editedCategoryId.value
  )) {
    await showAlert('Taka kategoria już istnieje', 'Duplikat', '⚠️')
    return
  }

  if (categoryFormMode.value === 'edit' && editedCategoryId.value !== null) {
    const itemToUpdate = categories.value.find(
      item => item.id === editedCategoryId.value
    )

    if (itemToUpdate) {
      itemToUpdate.name = name
    }
  } else {
    categories.value.push({
      id: Date.now(),
      name
    })
  }

  showCategoryForm.value = false
  categoryFormMode.value = 'add'
  editedCategoryId.value = null

  categoryForm.value = {
    name: ''
  }

  scheduleSave()
}

// =========================
// USUWANIE (Z POTWIERDZENIEM)
// =========================
const deleteCategory = async () => {
  if (editedCategoryId.value === null) return

  const categoryToDelete = categories.value.find(
    item => item.id === editedCategoryId.value
  )

  const categoryNameToDelete = categoryToDelete?.name || ''

  const confirmed = await showConfirm(
    'Czy na pewno chcesz usunąć kategorię?',
    'Potwierdź usunięcie',
    '🗑️'
  )
  if (!confirmed) return

  categories.value = categories.value.filter(
    item => item.id !== editedCategoryId.value
  )

  if (categoryNameToDelete) {
    towary.value = towary.value.map(item => {
      if (!Array.isArray(item.categories)) return item

      const updatedCategories = item.categories.filter(
        cat => cat !== categoryNameToDelete
      )

      return {
        ...item,
        categories: updatedCategories
      }
    })
  }

  showCategoryForm.value = false
  categoryFormMode.value = 'add'
  editedCategoryId.value = null

  categoryForm.value = {
    name: ''
  }

  scheduleSave()
}




// =========================
// KTO ZAMAWIA (LISTA + FORMULARZ)
// =========================
const whoOrders = ref([])

const showWhoOrderForm = ref(false)

// =========================
// TRYB FORMULARZA
// =========================
const whoOrderFormMode = ref('add')
const editedWhoOrderId = ref(null)

const whoOrderForm = ref({
  name: ''
})

// =========================
// FUNKCJE
// =========================
const openWhoOrderForm = () => {
  whoOrderFormMode.value = 'add'
  editedWhoOrderId.value = null

  whoOrderForm.value = {
    name: ''
  }

  showWhoOrderForm.value = true
}

const editWhoOrder = (item) => {
  whoOrderFormMode.value = 'edit'
  editedWhoOrderId.value = item.id

  whoOrderForm.value = {
    name: item.name || ''
  }

  showWhoOrderForm.value = true
}

const closeWhoOrderForm = () => {
  showWhoOrderForm.value = false
  whoOrderFormMode.value = 'add'
  editedWhoOrderId.value = null

  whoOrderForm.value = {
    name: ''
  }
}

const saveWhoOrder = async () => {
  const name = cleanName(whoOrderForm.value.name)

  if (!name) return

  // =========================
  // DUPLIKAT - KTO ZAMAWIA
  // =========================
  if (hasDuplicateName(
    whoOrders.value,
    name,
    editedWhoOrderId.value
  )) {
    await showAlert('Taka pozycja już istnieje', 'Duplikat', '⚠️')
    return
  }

  if (whoOrderFormMode.value === 'edit' && editedWhoOrderId.value !== null) {
    const itemToUpdate = whoOrders.value.find(
      item => item.id === editedWhoOrderId.value
    )

    if (itemToUpdate) {
      itemToUpdate.name = name
    }
  } else {
    whoOrders.value.push({
      id: Date.now(),
      name
    })
  }

  showWhoOrderForm.value = false
  whoOrderFormMode.value = 'add'
  editedWhoOrderId.value = null

  whoOrderForm.value = {
    name: ''
  }

  scheduleSave()
}

// =========================
// USUWANIE (Z POTWIERDZENIEM)
// =========================
const deleteWhoOrder = async () => {
  if (editedWhoOrderId.value === null) return

  const whoOrderToDelete = whoOrders.value.find(
    item => item.id === editedWhoOrderId.value
  )

  const whoOrderNameToDelete = whoOrderToDelete?.name || ''

  const confirmed = await showConfirm(
  'Czy na pewno chcesz usunąć?',
  'Usuń operatora',
  '🗑️'
)
if (!confirmed) return

  whoOrders.value = whoOrders.value.filter(
    item => item.id !== editedWhoOrderId.value
  )

  if (whoOrderNameToDelete) {
    towary.value = towary.value.map(item => {
      if (!Array.isArray(item.whoOrders)) return item

      const updated = item.whoOrders.filter(
        val => val !== whoOrderNameToDelete
      )

      return {
        ...item,
        whoOrders: updated
      }
    })
  }

  showWhoOrderForm.value = false
  whoOrderFormMode.value = 'add'
  editedWhoOrderId.value = null

  whoOrderForm.value = {
    name: ''
  }

  scheduleSave()
}



    // =========================
    // TOWARY - WIDOK / LISTA / FORMULARZ
    // =========================
    const towaryView = ref('list')
    const towarFormMode = ref('add')
    const editedTowarId = ref(null)

    // Zmienne do zapamiętywania scrolla
    const towaryListRef = ref(null)
    const savedTowaryScroll = ref(0)

    const towarySearch = ref('')
    const towarySelectionMode = ref(false)
    const selectedTowaryIds = ref([])
    const showTowaryFiltersModal = ref(false)
    const selectedSuppliersFilter = ref([])
    const tempSelectedSuppliersFilter = ref([])
    const selectedWarehousesFilter = ref([])
    const selectedCategoriesFilter = ref([])
    const tempSelectedCategoriesFilter = ref([])
    const showCategoriesFilterOptions = ref(false)
    const tempSelectedWarehousesFilter = ref([])
    const showWarehousesFilterOptions = ref(false)
    const showSuppliersFilterOptions = ref(false)

    // =========================
    // TOWARY - DANE TESTOWE
    // na razie tylko do zbudowania widoku
    // =========================
    const towary = ref([])

      const towarForm = ref({
      id: '',
      name: '',
      unit: '',
      supplier: '',
      netPrice: '',
      vat: '',
      warehouse: '',
      orderTimings: [],
      whoOrders: [],
      categories: [],
      displayOrder: '',
      maxQtyByOrderTiming: {},
      active: true,
      note: ''
    })

    // =========================
    // TOWARY - FUNKCJE WIDOKU
    // =========================
    const resetTowarForm = () => {
        towarForm.value = {
        id: '',
        name: '',
        unit: '',
        supplier: '',
        netPrice: '',
        vat: '',
        warehouse: '',
        orderTimings: [],
        whoOrders: [],
        categories: [],
        displayOrder: '',
        maxQtyByOrderTiming: {},
        active: true,
        note: ''
      }
    }

  const openTowarAdd = () => {
  towarFormSource.value = 'towary'
  towarFormMode.value = 'add'
  editedTowarId.value = null
  resetTowarForm()
  towaryView.value = 'form'
}

 const openTowarEdit = (item) => {
  towarFormMode.value = 'edit'
  editedTowarId.value = item.id

  towarForm.value = {
    id: item.id ?? '',
    name: item.name ?? '',
    unit: item.unit ?? '',
    supplier: (item.supplier || '').trim(),
    netPrice: item.netPrice ?? '',
    vat: item.vat ?? '',
    warehouse:
  item.warehouse ??
  item.warehousesLabel ??
  (Array.isArray(item.warehouses) ? item.warehouses[0] ?? '' : ''),
    orderTimings: Array.isArray(item.orderTimings) ? [...item.orderTimings] : [],
    whoOrders: Array.isArray(item.whoOrders) ? [...item.whoOrders] : [],
    categories: Array.isArray(item.categories) ? [...item.categories] : [],
    displayOrder: item.displayOrder ?? '',
    maxQtyByOrderTiming:
      item.maxQtyByOrderTiming && typeof item.maxQtyByOrderTiming === 'object'
        ? { ...item.maxQtyByOrderTiming }
        : {},
    active: !!item.active,
    note: item.note ?? ''
  }

  towaryView.value = 'form'
}

const handleTowarActiveChange = () => {
  if (towarFormMode.value !== 'edit') return
  if (editedTowarId.value === null) return

  const index = towary.value.findIndex(
    item => item.id === editedTowarId.value
  )

  if (index === -1) return

  towary.value[index] = {
    ...towary.value[index],
    active: !!towarForm.value.active
  }

  scheduleSave()
}


const fieldFilledClass = (value) => {
  const isFilled = Array.isArray(value)
    ? value.length > 0
    : String(value || '').trim() !== ''

  return isFilled ? 'field-filled' : 'field-empty'
}


const normalizeNetPrice = (value) => {
  const raw = String(value || '').trim()

  if (!raw) return ''

  const normalized = raw.replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null
  }

  return Number(normalized).toFixed(2)
}

const normalizeVat = (value) => {
  const raw = String(value || '').trim()

  if (!raw) return ''

  if (!/^\d+$/.test(raw)) {
    return null
  }

  return String(Number(raw))
}


  // =========================
// TOWARY - KLIK NA WIERSZ LISTY
// =========================
const handleTowarRowClick = async (item) => {
  // ZAPAMIĘTUJEMY SCROLL PRZED ZMIANĄ WIDOKU
  if (towaryListRef.value) {
    savedTowaryScroll.value = towaryListRef.value.scrollTop
  }

  towarFormSource.value = 'towary'

  if (isTowarIncomplete(item)) {
    const missingFields = getTowarMissingFields(item)

    if (missingFields.length > 0) {
      await showAlert(
  'Brakuje pozycji:\n- ' + missingFields.join('\n- '),
  'Niekompletny towar',
  '⚠️'
)
    }
  }

  openTowarEdit(item)
}





const closeTowarForm = async () => {
  towaryView.value = 'list'
  towarFormMode.value = 'add'
  editedTowarId.value = null
  resetTowarForm()

  if (towarFormSource.value === 'koszyk') {
    zamawiarkaView.value = 'koszyk'
  } else if (towarFormSource.value === 'produkty') {
    zamawiarkaView.value = 'produkty'
  } else {
    zamawiarkaView.value = 'towary'
  }

  towarFormSource.value = 'towary'

  // PRZYWRACAMY SCROLL PO WYRENDEROWANIU LISTY
  await nextTick()
  if (towaryListRef.value) {
    towaryListRef.value.scrollTop = savedTowaryScroll.value
  }
}

    const toggleTowarySelectionMode = () => {
      towarySelectionMode.value = !towarySelectionMode.value

      if (!towarySelectionMode.value) {
        selectedTowaryIds.value = []
      }
    }

    const toggleTowarSelection = (id) => {
      if (selectedTowaryIds.value.includes(id)) {
        selectedTowaryIds.value = selectedTowaryIds.value.filter(itemId => itemId !== id)
      } else {
        selectedTowaryIds.value.push(id)
      }
    }

    const removeSelectedTowary = async () => {
  const confirmed = await showConfirm(
    'Czy na pewno chcesz usunąć zaznaczone towary?',
    'Usuń towary',
    '🗑️'
  )
  if (!confirmed) return

  const uid = auth.currentUser?.uid
  if (!uid) return

  try {
    // 1. Przygotowujemy paczkę (batch) z poleceniami usunięcia w chmurze
    const batch = writeBatch(db)

    selectedTowaryIds.value.forEach(id => {
      const docRef = getUserTowarDocRef(uid, String(id))
      batch.delete(docRef)
    })

    // 2. Odpalamy wszystkie usunięcia w Firebase w ułamku sekundy
    await batch.commit()

    // 3. Usuwamy towary z ekranu
    towary.value = towary.value.filter(
      item => !selectedTowaryIds.value.includes(item.id)
    )

    selectedTowaryIds.value = []
    towarySelectionMode.value = false
    // scheduleSave() zostało stąd całkowicie usunięte
  } catch (error) {
    console.error('Błąd podczas grupowego usuwania towarów:', error)
  }
}



        // =========================
    // TOWARY - MODAL: KIEDY ZAMÓWIENIE
    // =========================
    const showOrderTimingModal = ref(false)
    const tempOrderTimings = ref([])

    const openOrderTimingModal = () => {
      tempOrderTimings.value = Array.isArray(towarForm.value.orderTimings)
        ? [...towarForm.value.orderTimings]
        : []

      showOrderTimingModal.value = true
    }

    const closeOrderTimingModal = () => {
      showOrderTimingModal.value = false
      tempOrderTimings.value = []
    }

    const confirmOrderTimingModal = () => {
      towarForm.value.orderTimings = [...tempOrderTimings.value]
      showOrderTimingModal.value = false
    }


        // =========================
    // TOWARY - MODAL: KTO ZAMAWIA
    // =========================
    const showWhoOrdersModal = ref(false)
    const tempWhoOrders = ref([])

    const openWhoOrdersModal = () => {
      tempWhoOrders.value = Array.isArray(towarForm.value.whoOrders)
        ? [...towarForm.value.whoOrders]
        : []

      showWhoOrdersModal.value = true
    }

    const closeWhoOrdersModal = () => {
      showWhoOrdersModal.value = false
      tempWhoOrders.value = []
    }

    const confirmWhoOrdersModal = () => {
      towarForm.value.whoOrders = [...tempWhoOrders.value]
      showWhoOrdersModal.value = false
    }

        // =========================
    // TOWARY - MODAL: KATEGORIA TOWARU
    // =========================
    const showCategoriesModal = ref(false)
    const tempCategories = ref([])

    const openCategoriesModal = () => {
      tempCategories.value = Array.isArray(towarForm.value.categories)
        ? [...towarForm.value.categories]
        : []

      showCategoriesModal.value = true
    }

    const closeCategoriesModal = () => {
      showCategoriesModal.value = false
      tempCategories.value = []
    }

    const confirmCategoriesModal = () => {
      towarForm.value.categories = [...tempCategories.value]
      showCategoriesModal.value = false
    }


    // =========================
    // TOWARY - ILOŚĆ MAX
    // =========================
    const showMaxQtyModal = ref(false)
    const tempMaxQtyByOrderTiming = ref({})

    const openMaxQtyField = async () => {
      const hasOrderTimings =
        Array.isArray(towarForm.value.orderTimings) &&
        towarForm.value.orderTimings.length > 0

      if (!hasOrderTimings) {
        await showAlert('Najpierw wybierz pozycję w polu „Kiedy zamówienie”', 'Brak wyboru', '⚠️')
        return
      }

      const currentValues =
        towarForm.value.maxQtyByOrderTiming &&
        typeof towarForm.value.maxQtyByOrderTiming === 'object'
          ? towarForm.value.maxQtyByOrderTiming
          : {}

      const preparedValues = {}

      towarForm.value.orderTimings.forEach((itemName) => {
        preparedValues[itemName] = currentValues[itemName] ?? ''
      })

      tempMaxQtyByOrderTiming.value = preparedValues
      showMaxQtyModal.value = true
    }

    const closeMaxQtyModal = () => {
      showMaxQtyModal.value = false
      tempMaxQtyByOrderTiming.value = {}
    }

    const confirmMaxQtyModal = () => {
  towarForm.value.maxQtyByOrderTiming = {
    ...tempMaxQtyByOrderTiming.value
  }

  showMaxQtyModal.value = false
}


      const getMaxQtySummary = () => {
      const data = towarForm.value.maxQtyByOrderTiming

      if (!data || typeof data !== 'object') return ''

      const entries = Object.entries(data).filter(([_, value]) => {
        return String(value).trim() !== ''
      })

      if (entries.length === 0) return ''

      return entries
        .map(([day, value]) => `${day}: ${value}`)
        .join(', ')
    }





      const saveTowar = async () => {
             // =========================
             // PROSTA WALIDACJA
              // =========================
              if (!towarForm.value.name.trim()) return

const netPriceNormalized = normalizeNetPrice(towarForm.value.netPrice)
const vatNormalized = normalizeVat(towarForm.value.vat)

if (netPriceNormalized === null) {
  await showAlert('Cena netto musi być liczbą z maksymalnie 2 miejscami po przecinku', 'Błąd danych', '⚠️')
  return
}

if (vatNormalized === null) {
  await showAlert('Stawka VAT musi być liczbą całkowitą', 'Błąd danych', '⚠️')
  return
}

// =========================
// PORZĄDKOWANIE DANYCH Z FORMULARZA
// =========================
const preparedTowar = {
               id:
               towarFormMode.value === 'edit' && editedTowarId.value !== null
               ? editedTowarId.value
                : Date.now(),

        name: towarForm.value.name.trim(),
        unit: towarForm.value.unit.trim(),
        supplier: towarForm.value.supplier.trim(),
        netPrice: netPriceNormalized,
         vat: vatNormalized,

        warehouse: towarForm.value.warehouse.trim(),

          orderTimings: Array.isArray(towarForm.value.orderTimings)
          ? [...towarForm.value.orderTimings]
          : [],

          whoOrders: Array.isArray(towarForm.value.whoOrders)
          ? [...towarForm.value.whoOrders]
          : [],

          categories: Array.isArray(towarForm.value.categories)
          ? [...towarForm.value.categories]
          : [],
        displayOrder: String(towarForm.value.displayOrder ?? '').trim(),
          maxQtyByOrderTiming:
          towarForm.value.maxQtyByOrderTiming &&
          typeof towarForm.value.maxQtyByOrderTiming === 'object'
            ? { ...towarForm.value.maxQtyByOrderTiming }
            : {},
        active: !!towarForm.value.active,
        note: towarForm.value.note.trim()
      }

      // =========================
      // ZAPIS DO FIRESTORE (KOLEKCJA TOWARY)
      // =========================
      const user = auth.currentUser
      if (user) {
        try {
          await setDoc(getUserTowarDocRef(user.uid, preparedTowar.id), preparedTowar)
        } catch (error) {
          console.error("Błąd przy zapisie towaru:", error)
          await showAlert('Nie udało się zapisać towaru', 'Błąd', '❌')
          return
        }
      }

      // Aktualizacja lokalnego stanu (żeby widok się odświeżył)
      const index = towary.value.findIndex(item => item.id === preparedTowar.id)
      if (index !== -1) {
        towary.value[index] = preparedTowar
      } else {
        towary.value.push(preparedTowar)
      }

      // =========================
      // ZAMKNIĘCIE FORMULARZA I ZAPIS
      // =========================
      closeTowarForm()
      scheduleSave()
    }


    // =========================
// TOWARY - USUWANIE
// =========================
const deleteTowar = async () => {
  if (editedTowarId.value === null) return

  const confirmed = await showConfirm(
    'Czy na pewno chcesz usunąć ten towar?',
    'Usuń towar',
    '🗑️'
  )
  if (!confirmed) return

  const uid = auth.currentUser?.uid
  if (!uid) return

  try {
    // 1. Usuwamy dokument bezpośrednio z nowej kolekcji w chmurze
    const docRef = getUserTowarDocRef(uid, String(editedTowarId.value))
    await deleteDoc(docRef)

    // 2. Usuwamy towar z ekranu
    towary.value = towary.value.filter(item => item.id !== editedTowarId.value)

    closeTowarForm()
    // Odcięto scheduleSave() – nie jest już tutaj potrzebne!
  } catch (error) {
    console.error('Błąd podczas usuwania towaru:', error)
  }
}







    const normalizeName = (value) => {
  return String(value || '').trim().toLowerCase()
}

const cleanName = (value) => {
  return String(value || '').trim()
}



const hasDuplicateName = (items, name, editedId = null) => {
  const normalizedNewName = normalizeName(name)

  if (!normalizedNewName) return false

  return items.some(item => {
    const sameId = editedId !== null && item.id === editedId
    if (sameId) return false

    return normalizeName(item.name) === normalizedNewName
  })
}

const getWarehouse = (item) => {
  return (
    item.warehouse ||
    item.warehousesLabel ||
    (Array.isArray(item.warehouses) ? item.warehouses[0] : '') ||
    ''
  )
}



// =========================
// TOWAR - CZY NIEPEŁNY
// =========================
const isTowarIncomplete = (item) => {
  const hasName = String(item.name || '').trim() !== ''
  const hasUnit = String(item.unit || '').trim() !== ''
  const hasSupplier = String(item.supplier || '').trim() !== ''
  const hasNetPrice = String(item.netPrice || '').trim() !== ''
  const hasVat = String(item.vat || '').trim() !== ''
  const hasWarehouse = String(item.warehouse || '').trim() !== ''
  const hasOrderTimings =
    Array.isArray(item.orderTimings) && item.orderTimings.length > 0
  const hasWhoOrders =
    Array.isArray(item.whoOrders) && item.whoOrders.length > 0
  const hasCategories =
    Array.isArray(item.categories) && item.categories.length > 0
  const hasDisplayOrder = String(item.displayOrder || '').trim() !== ''

  const hasMaxQty =
    item.maxQtyByOrderTiming &&
    typeof item.maxQtyByOrderTiming === 'object' &&
    Object.values(item.maxQtyByOrderTiming).some(value => String(value || '').trim() !== '')

  return !(
    hasName &&
    hasUnit &&
    hasSupplier &&
    hasNetPrice &&
    hasVat &&
    hasWarehouse &&
    hasOrderTimings &&
    hasWhoOrders &&
    hasCategories &&
    hasDisplayOrder &&
    hasMaxQty
  )
}



// =========================
// TOWAR - BRAKUJĄCE POLA
// =========================
const getTowarMissingFields = (item) => {
  const missingFields = []

  if (String(item.name || '').trim() === '') {
    missingFields.push('Nazwa')
  }

  if (String(item.unit || '').trim() === '') {
    missingFields.push('Jednostka miary')
  }

  if (String(item.supplier || '').trim() === '') {
    missingFields.push('Hurtownia')
  }

  if (String(item.netPrice || '').trim() === '') {
    missingFields.push('Cena netto')
  }

  if (String(item.vat || '').trim() === '') {
    missingFields.push('Stawka VAT')
  }

  if (String(item.warehouse || '').trim() === '') {
  missingFields.push('Magazyn')
}

  if (!Array.isArray(item.orderTimings) || item.orderTimings.length === 0) {
    missingFields.push('Kiedy zamówienie')
  }

  if (!Array.isArray(item.whoOrders) || item.whoOrders.length === 0) {
    missingFields.push('Kto zamawia')
  }

  if (!Array.isArray(item.categories) || item.categories.length === 0) {
    missingFields.push('Kategoria towaru')
  }

  if (String(item.displayOrder || '').trim() === '') {
    missingFields.push('Pozycja wyświetlania w zrób zamówienie')
  }

  const hasMaxQty =
    item.maxQtyByOrderTiming &&
    typeof item.maxQtyByOrderTiming === 'object' &&
    Object.values(item.maxQtyByOrderTiming).some(value => String(value || '').trim() !== '')

  if (!hasMaxQty) {
    missingFields.push('Ilość max')
  }

  return missingFields
}




    // =========================
    // COMPUTED
    // =========================


    const availableTowarySuppliers = computed(() => {
  const names = towary.value
    .map(item => item.supplier)
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})


// =========================
// AVAILABLE_TOWARY_CATEGORIES
// =========================
const availableTowaryCategories = computed(() => {
  const names = towary.value
    .flatMap(item => item.categories || [])
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})


const availableTowaryWarehouses = computed(() => {
  const names = towary.value
    .map(item => getWarehouse(item))
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})





    const filteredTowary = computed(() => {
  return towary.value.filter(item => {
    const searchMatch =
      towarySearch.value.trim() === '' ||
      item.name.toLowerCase().includes(towarySearch.value.toLowerCase())

    const supplierMatch =
      selectedSuppliersFilter.value.length === 0 ||
      selectedSuppliersFilter.value.includes(item.supplier)

    const warehouseValue = getWarehouse(item)


const warehouseMatch =
  selectedWarehousesFilter.value.length === 0 ||
  selectedWarehousesFilter.value.includes(warehouseValue)

    const categoryMatch =
      selectedCategoriesFilter.value.length === 0 ||
      (item.categories || []).some(c =>
        selectedCategoriesFilter.value.includes(c)
      )

    return searchMatch && supplierMatch && warehouseMatch && categoryMatch
  })
})


    // =========================
    // FILTERED_ZAMOWIENIE_TOWARY
    // na razie tylko przygotowanie logiki pod przejście z products na towary
    // jeszcze nieużywane w template
    // =========================
        const filteredZamowienieTowary = computed(() => {
      return towary.value.filter(item => {
        const activeMatch = item.active !== false

        const dayMatch =
          selectedDay.value === 'wszystkie' ||
          (item.orderTimings || []).includes(selectedDay.value)

        const warehouseValue = getWarehouse(item)

const warehouseMatch =
  selectedWarehouse.value === 'wszystkie' ||
  warehouseValue === selectedWarehouse.value

        const supplierMatch =
          selectedSupplier.value === 'wszystkie' ||
          item.supplier === selectedSupplier.value

          const whoOrdersMatch =
            selectedWhoOrders.value === 'wszystkie' ||
            (item.whoOrders || []).includes(selectedWhoOrders.value)

        const searchMatch =
          productSearch.value.trim() === '' ||
          item.name.toLowerCase().includes(productSearch.value.toLowerCase())

        return activeMatch && dayMatch && warehouseMatch && supplierMatch && whoOrdersMatch && searchMatch
      })
    })





      const cartItems = computed(() => {
  const regularItems = towary.value
    .filter(item => Number(cart.value[item.id] || 0) > 0)
    .slice()
    .sort((a, b) => {
      const aOrder = Number(a.displayOrder)
      const bOrder = Number(b.displayOrder)

      const aValid = !isNaN(aOrder) && aOrder > 0
      const bValid = !isNaN(bOrder) && bOrder > 0

      if (aValid && bValid) return aOrder - bOrder
      if (aValid) return -1
      if (bValid) return 1
      return 0
    })
    .map(item => {
      const qty = Number(cart.value[item.id] || 0)

      const price = Number(
        String(item.netPrice || '')
          .replace(',', '.')
          .trim()
      )

      const value = !isNaN(price) ? price * qty : 0

      return {
        ...item,
        qty,
        value,
        isCustom: false
      }
    })

  return [...regularItems, ...customCartItems.value]
})


// =========================
// CART_TOTAL_FILTERED
// suma koszyka zależna od aktualnego filtra
// =========================
const cartTotal = computed(() => {
  return filteredCartItems.value.reduce((sum, item) => {
    return sum + item.value
  }, 0)
})




const availableCartSuppliers = computed(() => {
  const names = cartItems.value
    .map(item => item.supplier)
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})


const availableCartCategories = computed(() => {
  const filteredBySupplier =
    selectedCartSupplier.value === 'wszystkie'
      ? cartItems.value
      : cartItems.value.filter(item => item.supplier === selectedCartSupplier.value)

  const names = filteredBySupplier
    .flatMap(item => item.categories || [])
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})



const availableTempCartCategories = computed(() => {
  const filteredBySupplier =
    tempSelectedCartSupplier.value === 'wszystkie'
      ? cartItems.value
      : cartItems.value.filter(item => item.supplier === tempSelectedCartSupplier.value)

  const names = filteredBySupplier
    .flatMap(item => item.categories || [])
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})






const filteredCartItems = computed(() => {
  return cartItems.value.filter(item => {
    const supplierMatch =
      selectedCartSupplier.value === 'wszystkie' ||
      item.supplier === selectedCartSupplier.value

    const categoryMatch =
      selectedCartCategories.value.length === 0 ||
      (item.categories || []).some(category =>
        selectedCartCategories.value.includes(category)
      )

    const searchMatch =
      cartSearch.value.trim() === '' ||
      item.name.toLowerCase().includes(cartSearch.value.toLowerCase())

    return supplierMatch && categoryMatch && searchMatch
  })
})






 const filteredProducts = computed(() => {
      return filteredZamowienieTowary.value
        .slice()
        .sort((a, b) => {
          const aOrder = Number(a.displayOrder)
const bOrder = Number(b.displayOrder)

const aValid = !isNaN(aOrder) && aOrder > 0
const bValid = !isNaN(bOrder) && bOrder > 0

          // oba mają poprawny displayOrder
          if (aValid && bValid) {
            return aOrder - bOrder
          }

          // tylko a ma → a wyżej
          if (aValid) return -1

          // tylko b ma → b wyżej
          if (bValid) return 1

          // oba nie mają → kolejność bez zmian
          return 0
        })
        .map(item => {
  let maxQtyLabel = ''

  if (selectedDay.value !== 'wszystkie') {
    const val = item.maxQtyByOrderTiming?.[selectedDay.value]

    maxQtyLabel =
      val !== undefined && String(val).trim() !== ''
        ? String(val)
        : ''
  } else {
    maxQtyLabel = 'kiedy?'
  }

  return {
    id: item.id,
    name: item.name || '',
    unit: item.unit || '',
    warehouse: item.warehouse || '',
    supplier: item.supplier || '',
    maxQtyLabel,
    max:
      selectedDay.value !== 'wszystkie'
        ? Number(item.maxQtyByOrderTiming?.[selectedDay.value] ?? 999999)
        : 999999
  }
})
    })




// =========================
// ZAPIS AKTUALNEGO ZAMÓWIENIA DO REJESTRU (OSOBNA KOLEKCJA)
// =========================
const saveCurrentOrderToRegister = async () => {
  if (filteredCartItems.value.length === 0) {
    await showAlert('Brak pozycji do zapisania w aktualnym widoku koszyka', 'Brak pozycji', '⚠️')
    return null
  }

  const user = auth.currentUser
  if (!user) return null

  const now = new Date()

  const date =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const time =
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const supplierNames = [
    ...new Set(
      filteredCartItems.value
        .map(item => (item.supplier || '').trim())
        .filter(Boolean)
    )
  ]

  const supplierLabel =
    supplierNames.length === 1
      ? supplierNames[0]
      : supplierNames.length > 1
        ? supplierNames.join(', ')
        : 'Brak hurtowni'

  const items = filteredCartItems.value.map(item => ({
    id: item.id,
    name: item.name || '',
    qty: Number(item.qty || 0),
    unit: item.unit || '',
    supplier: item.supplier || '',
    netPrice: Number(
      String(item.netPrice || '')
        .replace(',', '.')
        .trim()
    ) || 0,
    value: Number(item.value || 0)
  }))

  const total = items.reduce((sum, item) => {
    return sum + Number(item.value || 0)
  }, 0)

  const orderRecord = {
    id: Date.now(),
    date,
    time,
    supplier: supplierLabel,
    total,
    items
  }

  try {
    // 1. TWARDY ZAPIS: Aplikacja musi poczekać, aż baza w chmurze potwierdzi zapis.
    const docRef = getUserOrderDocRef(user.uid, orderRecord.id)
    await setDoc(docRef, orderRecord)
    
    // Zwracamy obiekt dla mechanizmu PDF. Nasłuch onSnapshot sam zaktualizuje widok historii.
    return orderRecord
  } catch (error) {
    console.error('Błąd zapisu do chmury:', error)
    await showAlert('Błąd połączenia. Zamówienie mogło nie zostać zapisane.', 'Błąd', '❌')
    return null
  }
}

// =========================
// REJESTR ZAMÓWIEŃ - USUWANIE (Z CHMURY)
// =========================
const deleteOrderFromRegister = async (orderId) => {
  const confirmed = await showConfirm(
    'Czy na pewno chcesz usunąć to zamówienie?',
    'Potwierdź usunięcie',
    '🗑️'
  )

  if (!confirmed) return

  const user = auth.currentUser
  if (!user) return

  try {
    const docRef = getUserOrderDocRef(user.uid, orderId)
    await deleteDoc(docRef)

    if (expandedOrderId.value === orderId) {
      expandedOrderId.value = null
    }
  } catch (error) {
    console.error('Błąd usuwania:', error)
    await showAlert('Nie udało się usunąć zamówienia.', 'Błąd', '❌')
  }
}



// =========================
// GENEROWANIE ZAMÓWIENIA (FLOW POD PDF)
// =========================
const handleGenerateOrder = async () => {
  if (filteredCartItems.value.length === 0) {
    await showAlert('Brak pozycji do zamówienia', 'Brak pozycji', '⚠️')
    return
  }

  const confirmed = await showConfirm(
  'Wygenerować PDF i zapisać zamówienie?',
  'Zapis zamówienia',
  '📄'
)
if (!confirmed) return

  const order = await saveCurrentOrderToRegister()

  if (!order) return

  const pdfResult = await generateOrderPdf(order)

  if (!pdfResult) {
    await showAlert('Nie udało się wygenerować PDF', 'Błąd', '❌')
    return
  }


  zamawiarkaView.value = 'historia'
}



// =========================
// NAZWA PLIKU PDF
// =========================
const getOrderFileName = (order) => {
  if (!order) return 'zamowienie.pdf'

  const safeSupplier = (order.supplier || 'zamowienie')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')

  const date = order.date || 'data'
  const time = (order.time || '00:00').replace(':', '-')

  return `${safeSupplier}_${date}_${time}.pdf`
}


// =========================
// DANE DO PDF
// =========================
const buildOrderPayload = () => {
  if (filteredCartItems.value.length === 0) return null

  const items = filteredCartItems.value.map(item => ({
    name: item.name || '',
    qty: Number(item.qty || 0),
    unit: item.unit || '',
    price: Number(
      String(item.netPrice || '')
        .replace(',', '.')
        .trim()
    ) || 0,
    value: Number(item.value || 0)
  }))

  const total = items.reduce((sum, item) => sum + item.value, 0)

  const suppliers = [
    ...new Set(
      filteredCartItems.value
        .map(i => (i.supplier || '').trim())
        .filter(Boolean)
    )
  ]

  return {
    supplier:
      suppliers.length === 1
        ? suppliers[0]
        : suppliers.join(', ') || 'Brak hurtowni',
    items,
    total
  }
}


// =========================
// PDF - ELEMENT HTML DO PDF Z POPRAWNYMI MARGINESAMI
// =========================
// =========================
// PDF - ELEMENT HTML DO PDF Z POPRAWNYMI MARGINESAMI (ZOPTYMALIZOWANE DLA TELEFONÓW)
// =========================
const createPdfFromElement = async (element, fileName) => {
  if (!element) return null

  // 1. Zmiana skali na 1, aby telefon nie dusił się przy renderowaniu Canvasa
  const canvas = await html2canvas(element, {
    scale: 1, 
    backgroundColor: '#ffffff',
    logging: false // Wyłączenie logów biblioteki też lekko odciąża proces
  })

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  const pageMargin = 12
  const imgWidth = pdfWidth - pageMargin * 2
  const usablePageHeight = pdfHeight - pageMargin * 2 - 10

  const pageCanvasHeight = Math.floor(
    (usablePageHeight * canvas.width) / imgWidth
  )

  let sourceY = 0
  let pageIndex = 0

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY)

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight

    const ctx = pageCanvas.getContext('2d')

    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    )

    // 2. Zmiana ciężkiego PNG na lekki JPEG. Wartość 0.8 to świetny kompromis jakości do wagi pliku.
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.8)
    const imgHeight = (sliceHeight * imgWidth) / canvas.width

    if (pageIndex > 0) {
      pdf.addPage()
    }

    // 3. Wstrzyknięcie skompresowanego JPEG do pliku PDF
    pdf.addImage(imgData, 'JPEG', pageMargin, pageMargin, imgWidth, imgHeight)

    sourceY += sliceHeight
    pageIndex += 1
  }

  return {
    doc: pdf,
    fileName
  }
}


// =========================
// OBSŁUGA WBUDOWANEGO PODGLĄDU PDF (ZAPOBIEGA RESTARTOM iOS)
// =========================
const closePdfViewer = () => {
  showPdfViewerModal.value = false
  if (pdfViewerUrl.value) {
    URL.revokeObjectURL(pdfViewerUrl.value)
    pdfViewerUrl.value = ''
  }
  currentPdfBlob.value = null
}

const sharePdf = async () => {
  if (!currentPdfBlob.value) return

  const file = new File([currentPdfBlob.value], pdfViewerFileName.value, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Zamówienie GastroManager',
        text: 'Przesyłam zamówienie w załączniku.'
      })
    } catch (error) {
      console.log('Udostępnianie anulowane przez użytkownika', error)
    }
  } else {
    // Tradycyjne pobieranie dla przeglądarek na PC
    const a = document.createElement('a')
    a.href = pdfViewerUrl.value
    a.download = pdfViewerFileName.value
    a.click()
  }
}

// =========================
// GENEROWANIE PDF
// =========================
const generateOrderPdf = async (order) => {
  if (!order) return null

  pdfPreviewOrder.value = order
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 150))

  const element = pdfTemplateRef.value
  if (!element) return null

  const pdfResult = await createPdfFromElement(element, getOrderFileName(order))
  
  if (pdfResult && pdfResult.doc) {
    // ZAMIAST ZAPISYWAĆ, WYDOBYWAMY WIRTUALNY PLIK Z PAMIĘCI
    const pdfBlob = pdfResult.doc.output('blob')
    
    currentPdfBlob.value = pdfBlob
    pdfViewerFileName.value = pdfResult.fileName
    pdfViewerUrl.value = URL.createObjectURL(pdfBlob)
    
    // Otwieramy nasz wbudowany podgląd
    showPdfViewerModal.value = true
  }
  
  return pdfResult
}


// =========================
// REJESTR ZAMÓWIEŃ - ROZWIJANIE SZCZEGÓŁÓW
// =========================
const toggleOrderDetails = (orderId) => {
  expandedOrderId.value =
    expandedOrderId.value === orderId ? null : orderId
}





// =========================
// TOWARY - GENEROWANIE PDF
// =========================

const openTowaryPdfModal = async () => {
  if (filteredTowary.value.length === 0) {
    await showAlert('Brak towarów do wygenerowania PDF', 'Brak pozycji', '⚠️')
    return
  }

  showTowaryPdfModal.value = true
}

const getTowaryPdfFieldLabel = (field) => {
  const option = towaryPdfOptions.find(item => item.key === field)
  return option ? option.label : field
}

const getTowaryPdfFieldValue = (item, field) => {
  if (field === 'categories') {
    return Array.isArray(item.categories) && item.categories.length > 0
      ? item.categories.join(', ')
      : '-'
  }

  if (field === 'warehouse') {
    return getWarehouse(item) || '-'
  }

  return item[field] || '-'
}


const getTodayLabel = () => {
  const now = new Date()

  return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const getTowaryPdfColumnStyle = (field, isHeader = false) => {
  const base = {
    padding: '7px 6px',
    border: '1px solid #d1d5db',
    verticalAlign: 'top',
    textAlign: 'left',
    fontWeight: isHeader ? '700' : '400',
    color: '#111827',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere'
  }

  const widths = {
    name: '28%',
    unit: '8%',
    supplier: '18%',
    netPrice: '10%',
    vat: '9%',
    warehouse: '15%',
    categories: '18%'
  }

  return {
    ...base,
    width: widths[field] || 'auto',
    textAlign: ['unit', 'netPrice', 'vat'].includes(field) ? 'center' : 'left'
  }
}







const handleGenerateTowaryPdf = async () => {
  const activeFilteredTowary = filteredTowary.value.filter(item => item.active !== false)

if (activeFilteredTowary.length === 0) {
  await showAlert('Brak aktywnych towarów do wygenerowania PDF', 'Brak pozycji', '⚠️')
  return
}
  if (selectedTowaryPdfFields.value.length === 0) {
    await showAlert('Wybierz przynajmniej jedną informację do PDF', 'Brak wyboru', '⚠️')
    return
  }

  const confirmed = await showConfirm(
    'Wygenerować PDF z widoku towarów?',
    'PDF z towarów',
    '📄'
  )

  if (!confirmed) return

  towaryPdfPreviewItems.value = activeFilteredTowary.map(item => ({ ...item }))
showTowaryPdfModal.value = false

await nextTick()
await new Promise(resolve => setTimeout(resolve, 150))

const element = towaryPdfTemplateRef.value

if (!element) {
  await showAlert('Nie udało się przygotować PDF', 'Błąd', '❌')
  return
}

const pdfResult = await createPdfFromElement(
  element,
  `lista_towarow_${new Date().toISOString().slice(0, 10)}.pdf`
)

if (!pdfResult) {
  await showAlert('Nie udało się wygenerować PDF', 'Błąd', '❌')
  return
}

pdfResult.doc.save(pdfResult.fileName)

towaryPdfPreviewItems.value = []
}




// =========================
// REJESTR ZAMÓWIEŃ - GENERUJ PDF
// =========================
const generatePdfFromRegister = async (order) => {
  if (!order) return

 const confirmed = await showConfirm(
  'Wygenerować PDF tego zamówienia?',
  'Generowanie PDF',
  '📄'
)
if (!confirmed) return

  const pdfResult = await generateOrderPdf(order)

  if (!pdfResult) {
    await showAlert('Nie udało się wygenerować PDF', 'Błąd', '❌')
    return
  }

}



// =========================
// START APLIKACJI - ODTWORZENIE SESJI I ŁADOWANIE Z FIRESTORE
// =========================
let unsubscribeAuth = null

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (unsubscribeCartItems) {
        unsubscribeCartItems()
        unsubscribeCartItems = null
      }

      // Odpięcie nasłuchiwania towarów przy wylogowaniu
      if (typeof unsubscribeTowary !== 'undefined' && unsubscribeTowary) {
        unsubscribeTowary()
        unsubscribeTowary = null
      }
      
      if (typeof unsubscribeOrders !== 'undefined' && unsubscribeOrders) {
        unsubscribeOrders()
        unsubscribeOrders = null
      }


      if (unsubscribeUserState) {
        unsubscribeUserState()
        unsubscribeUserState = null
      }

      isDataLoaded.value = false
      isLoggedIn.value = false
      currentCompany.value = null
      resetCompanyDataState()
      return
    }

    isLoggedIn.value = true

    const email = String(user.email || '').trim().toLowerCase()
    const name = email ? email.split('@')[0] : 'użytkownik'

    currentCompany.value = {
      uid: user.uid,
      username: email,
      companyName: name
    }

    await loadCompanyDataWithFallback()
    subscribeCartItems(user.uid)
    subscribeUserState(user.uid)
    
   // Uruchomienie nasłuchiwania na żywo po zalogowaniu
    subscribeTowary(user.uid)
    subscribeOrders(user.uid)
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }

  if (unsubscribeCartItems) {
    unsubscribeCartItems()
    unsubscribeCartItems = null
  }

  if (unsubscribeUserState) {
    unsubscribeUserState()
    unsubscribeUserState = null
  }
})


// =========================
// LOCAL STORAGE - ZAPIS
// =========================


watch(tempSelectedCartSupplier, () => {
  tempSelectedCartCategories.value = tempSelectedCartCategories.value.filter(category =>
    availableTempCartCategories.value.includes(category)
  )
})




// =========================
// LOCAL STORAGE - ZAPIS WYŁĄCZONY
// aplikacja zapisuje już stan do Firestore
// =========================

/*
watch(suppliers, () => {
  scheduleSave()
}, { deep: true })

watch(towary, () => {
  scheduleSave()
}, { deep: true })

watch(warehouses, () => {
  scheduleSave()
}, { deep: true })

watch(orderTimings, () => {
  scheduleSave()
}, { deep: true })

watch(units, () => {
  scheduleSave()
}, { deep: true })

watch(categories, () => {
  scheduleSave()
}, { deep: true })

watch(whoOrders, () => {
  scheduleSave()
}, { deep: true })

watch(ordersRegister, () => {
  scheduleSave()
}, { deep: true })
*/




watch(
  () => [authForm.value.email, authForm.value.password],
  () => {
    authError.value = ''
  }
)



const helpTexts = [
  [
    "Jeśli sam sobie nie pomożesz",
    "to nikt Ci nie pomoże :-)"
  ],
  [
    "Teraz to pomocy pomocy!!!",
    "A czy Ty pomagasz innym?😄"
  ],
  [
    "Wyglądasz mi na Geniusza",
    "wiec sobie poradzisz😉"
  ],
  [
    "No weź przestań, ",
    "nie udawaj że nie wiesz😄"
  ],
  [
    "Oj tam oj tam....",
    "spróbuj jeszcze raz 😄"
  ],
  [
    "No weź przestań, ",
    "nie udawaj że nie wiesz😄"
  ],
  [
    "Nie bój się prosić o pomoc",
    "Napisz do mnie na priv 😄"
  ],
  [
    "Nie chce Cie martwić, ale  ",
    "tylko Ty pomocy potrzebujesz 😄"
  ]
]

const helpLine1 = ref('')
const helpLine2 = ref('')

function generateHelpText() {
  const random = helpTexts[Math.floor(Math.random() * helpTexts.length)]
  helpLine1.value = random[0]
  helpLine2.value = random[1]
}




// =========================
// POWIADOMIENIA / CONFIRM iOS
// =========================
const appDialog = ref({
  show: false,
  type: 'alert',
  title: '',
  message: '',
  icon: 'ℹ️',
  resolve: null
})

const showAlert = (message, title = 'Informacja', icon = 'ℹ️') => {
  return new Promise((resolve) => {
    appDialog.value = {
      show: true,
      type: 'alert',
      title,
      message,
      icon,
      resolve
    }
  })
}

const showConfirm = (message, title = 'Potwierdź', icon = '⚠️') => {
  return new Promise((resolve) => {
    appDialog.value = {
      show: true,
      type: 'confirm',
      title,
      message,
      icon,
      resolve
    }
  })
}

const closeAppDialog = (result) => {
  const resolver = appDialog.value.resolve

  appDialog.value = {
    show: false,
    type: 'alert',
    title: '',
    message: '',
    icon: 'ℹ️',
    resolve: null
  }

  if (resolver) {
    resolver(result)
  }
}

const confirmAppDialog = () => {
  closeAppDialog(true)
}

const cancelAppDialog = () => {
  closeAppDialog(false)
}




const animateMenuTiles = ref(false)

const openZamawiarkaMenuFromHome = () => {
  currentScreen.value = 'zamawiarka'
  zamawiarkaView.value = 'menu'
  animateMenuTiles.value = true

  setTimeout(() => {
    animateMenuTiles.value = false
  }, 900)
}

// =========================
    // AKTUALIZACJA PWA (BEZWZGLĘDNA - TYLKO PRZYCISK OK)
    // =========================
    const { needRefresh, updateServiceWorker } = useRegisterSW({
      onRegistered(r) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && r) {
            r.update() 
          }
        })
      }
    })

    watch(needRefresh, async (isNewVersionAvailable) => {
      if (isNewVersionAvailable) {
        await showAlert(
          'Pobrano nową wersję aplikacji. Odświeżam system w celu aktualizacji.',
          'Aktualizacja',
          '📲'
        )
        
        updateServiceWorker(true)
      }
    })



    return {
      settingsView,
      appVersion,
      aktywneModuly,
      eksportujBackup,
      recepturyView,
      isLoggedIn,
      isLoggingIn,
      authForm,
      authError,
      currentCompany,
      handleLogin,
      handleLogout,
      products,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      cartBounce,
      showCustomCartItemModal,
      openCustomCartItemModal,
      closeCustomCartItemModal,
      customCartItemForm,
      customCartItems,
      saveCustomCartItem,
      showQtyModal,
      selectedProductForQty,
      tempQty,
      openQtyModal,
      closeQtyModal,
      saveQtyModal,
      deleteCartItemFromQtyModal,
      editTowarFromQtyModal,
      qtyInput,
      cartItems,
      cartTotal,
      selectedCartSupplier,
      selectedCartCategories,
      tempSelectedCartSupplier,
      tempSelectedCartCategories,
      showCartSupplierFilterOptions,
      showCartCategoryFilterOptions,
      showCartFiltersModal,
      showCartSearch,
      cartSearch,
      availableCartSuppliers,
      availableCartCategories,
      availableTempCartCategories,
      filteredCartItems,
      selectedDay,
      filteredProducts,
      selectedWarehouse,
      currentScreen,
      zamawiarkaView,
      activeRestaurant,

      suppliers,
      showSupplierForm,
      supplierForm,
      supplierFormMode,
      editedSupplierId,
      openSupplierForm,
      editSupplier,
      closeSupplierForm,
      saveSupplier,
      deleteSupplier,

      warehouses,
      showWarehouseForm,
      warehouseFormMode,
      editedWarehouseId,
      warehouseForm,
      openWarehouseForm,
      editWarehouse,
      closeWarehouseForm,
      saveWarehouse,
      deleteWarehouse,


      orderTimings,
      showOrderTimingForm,
      orderTimingFormMode,
      editedOrderTimingId,
      orderTimingForm,
      openOrderTimingForm,
      editOrderTiming,
      closeOrderTimingForm,
      saveOrderTiming,
      deleteOrderTiming,

      units,
      showUnitForm,
      unitFormMode,
      editedUnitId,
      unitForm,
      openUnitForm,
      editUnit,
      closeUnitForm,
      saveUnit,
      deleteUnit,
      
      categories,
      showCategoryForm,
      categoryFormMode,
      editedCategoryId,
      categoryForm,
      openCategoryForm,
      editCategory,
      closeCategoryForm,
      saveCategory,
      deleteCategory,
      
      whoOrders,
      showWhoOrderForm,
      whoOrderFormMode,
      editedWhoOrderId,
      whoOrderForm,
      openWhoOrderForm,
      editWhoOrder,
      closeWhoOrderForm,
      saveWhoOrder,
      deleteWhoOrder,

      towaryView,
      towarFormMode,
      editedTowarId,
      towarySearch,
      towarySelectionMode,
      selectedTowaryIds,
      showTowaryFiltersModal,
      selectedSuppliersFilter,
      tempSelectedSuppliersFilter,
      selectedWarehousesFilter,
      tempSelectedWarehousesFilter,
      showWarehousesFilterOptions,
      selectedCategoriesFilter,
      tempSelectedCategoriesFilter,
      showCategoriesFilterOptions,
      showSuppliersFilterOptions,
      towary,
      towarForm,
      isTowarIncomplete,
      getTowarMissingFields,
      handleTowarRowClick,
      availableTowarySuppliers,
      availableTowaryWarehouses,
      availableTowaryCategories,
      filteredTowary,
      openTowarAdd,
      openTowarEdit,
      closeTowarForm,
      handleTowarActiveChange,
      saveTowar,
      deleteTowar,
      toggleTowarySelectionMode,
      toggleTowarSelection,
      removeSelectedTowary,

      showOrderTimingModal,
      tempOrderTimings,
      openOrderTimingModal,
      closeOrderTimingModal,
      confirmOrderTimingModal,
      showWhoOrdersModal,
      tempWhoOrders,
      openWhoOrdersModal,
      closeWhoOrdersModal,
      confirmWhoOrdersModal,

      showCategoriesModal,
      tempCategories,
      openCategoriesModal,
      closeCategoriesModal,
      confirmCategoriesModal,

      openMaxQtyField,
      showMaxQtyModal,
      tempMaxQtyByOrderTiming,
      closeMaxQtyModal,
      confirmMaxQtyModal,
      getMaxQtySummary,



      showProductSearch,
      productSearch,

      showFiltersModal,

      selectedSupplier,
      selectedWhoOrders,
      ordersRegister,
      expandedOrderId,
      pdfTemplateRef,
      pdfPreviewOrder,
      saveCurrentOrderToRegister,
      handleGenerateOrder,
      getOrderFileName,
      buildOrderPayload,
      generateOrderPdf,
      toggleOrderDetails,
      deleteOrderFromRegister,
      generatePdfFromRegister,
      showTowaryPdfModal,
      showPdfViewerModal,
      pdfViewerUrl,
      closePdfViewer,
      sharePdf,
      openTowaryPdfModal,
      handleGenerateTowaryPdf,
      towaryPdfTemplateRef,
      towaryPdfPreviewItems,
      towaryPdfOptions,
      selectedTowaryPdfFields,
      getTowaryPdfFieldLabel,
      getTowaryPdfFieldValue,
      getTodayLabel,
      getTowaryPdfColumnStyle,

      towaryListRef,

      isDataLoaded,

      fieldFilledClass,


        helpLine1,
        helpLine2,
        generateHelpText,

        appDialog,
        showAlert,
        showConfirm,
        confirmAppDialog,
        cancelAppDialog,


        animateMenuTiles,
        openZamawiarkaMenuFromHome,

       fcSettings,
      dishCategories,
      menuItems,
      showDishDetailsModal,
      selectedDishDetails,
      openDishDetails,
      closeDishDetails,
      handleDuplicateFromDetails,
      handleDeleteFromDetails,
      openDishForm,
      editingDish,
      closeDishForm,
      saveDishForm,
      selectedCategory,
      fcSortOrder,
      filteredMenuItems,
      currentCategoryFC,
      showDishCategoryForm,
      dishCategoryFormMode,
      dishCategoryForm,
      openDishCategoryForm,
      closeDishCategoryForm,
      editDishCategory,
      saveDishCategory,
      deleteDishCategory,
      duplicateMenuItem,
      deleteMenuItem,
        backupInputRef,
      triggerFileInput,
      wczytajBackup,

      isSettingsDirty,
      markSettingsDirty,
      saveSettings,

      showIngredientModal,
      openIngredientModal,
      ingredientSearch,
      selectedIngredientTowar,
      ingredientQty,
      filteredIngredientTowary,
      closeIngredientModal,
      selectIngredient,
      editingRecipeIndex,
      editRecipeIngredient,
      goBackToIngredientList,
      updateDishTotalCost,
      calculateTotalRecipeCost,
      saveIngredientToRecipe,
      removeIngredientFromRecipe,

      


    }
  }
}
</script>







<style>


.field-empty,
.supplier-click-field.field-empty {
  background-color: #fffaf5;
  border: 1.5px solid #f59e0b !important;
  color: #111827;
}

.field-filled,
.supplier-click-field.field-filled {
  background-color: #f8fafc;
  border: 1.5px solid #cbd5f5 !important;
  color: #111827;
}





html, body, #app {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
}

.app {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20px;
  font-family: sans-serif;
  background: #f5f5f7;
  overflow-x: hidden;
}


.screen-with-topbar {
  height: calc(100dvh - 40px);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 120px;
}





/* =========================
   CART - BOUNCE
========================= */

@keyframes cart-bounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.25); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.cart-bounce {
  animation: cart-bounce 0.4s ease;
}






/* =========================
   HURTOWNIE - KARTY
========================= */
.item-card {
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #ddd;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.supplier-name {
  flex: 1;
  min-width: 0;
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.supplier-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  font-size: 14px;
  word-break: break-word;
}

.supplier-label {
  font-weight: 600;
}

/* =========================
   HURTOWNIE - FAB "+"
========================= */
.fab-add-button {
  position: fixed;
  right: 20px;
  bottom: 90px;
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  background: #1e3a8a;
  color: #fff;
  font-size: 34px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.fab-add-button:active {
  transform: scale(0.96);
}

/* =========================
   HURTOWNIE - MODAL
========================= */
.supplier-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  /* Zwiększyliśmy dolny padding z 20px na 50px */
  padding: 120px 20px 50px 20px; 
  z-index: 300;
}

.supplier-modal-card {
  background: #ffffff;
  width: 100%;
  max-width: 420px;
  border-radius: 18px;
  /* Dodajemy wsparcie dla paska systemowego iOS/Android */
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  max-height: 100%;
  overflow-y: auto;
}

.supplier-modal-title {
  margin-top: 0;
  margin-bottom: 18px;
  font-size: 20px;
}

.supplier-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.supplier-form-label {
  font-size: 14px;
  font-weight: 600;
}

.supplier-form-input {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ccc;
  font-size: 16px;
  text-align: center;
}

.supplier-form-input select {
  text-align: center;
}

.supplier-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.supplier-cancel-button,
.supplier-save-button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
}

.supplier-cancel-button {
  background:rgb(153, 146, 146);
}

.supplier-save-button {
  background: #28a745;
}

/* =========================
   HURTOWNIE - GÓRA KARTY + EDYCJA
========================= */
.item-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.supplier-edit-button {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: #e5e7eb;
  cursor: pointer;
  font-size: 18px;
  flex-shrink: 0;
  flex-grow: 0;
}

/* =========================
   PUSTY STAN
========================= */
.empty-state {
  text-align: center;
  padding: 30px 16px;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
  background: #f9fafb;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}

.empty-subtitle {
  font-size: 14px;
  color: #6b7280;
}



/* =========================
   TOWARY - GÓRNY PASEK
========================= */
.towary-topbar {
  position: sticky;   /* przyklejenie do góry */
  top: 0;
  z-index: 1000;
  background: #ffffff;
  padding: 4px 0 12px 0;
  border-bottom: 1px solid #d1d5db;
  flex-shrink: 0;
  margin-bottom: 0;   /* usunięcie marginesu, bo psuje sticky */
}

.towary-topbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.towary-topbar-left,
.towary-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.towary-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.towary-icon-button {
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.towary-icon-button.active {
  background: #1e3a8a;
  color: #ffffff;
  border-color: #1e3a8a;
}

.towary-icon-button.danger {
  color: #b91c1c;
  background:rgb(255, 255, 255);
  border-color:rgb(17, 83, 237);
}

.towary-search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-sizing: border-box;
  font-size: 16px;
  color: #111827;
  background: #ffffff;
}

/* =========================
   TOWARY - LISTA
========================= */
.towary-list-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;   /* przewijanie listy */
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 120px;
}

.towary-row-fixed {
  display: grid;
  gap: 8px;
  align-items: center;
  min-height: 48px;
  padding: 10px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  margin-bottom: 8px;
  box-sizing: border-box;
  width: 100%;
  cursor: pointer;
}

.towary-col-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
}

.towary-col-name,
.towary-col-unit,
.towary-col-supplier,
.towary-col-price {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.towary-col-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  text-align: left;
  justify-self: start;
  width: 100%;
  text-overflow: clip;
}


.towary-col-name-incomplete {
  color: #dc2626;
}

.towary-col-unit {
  font-size: 13px;
  color: #111827;
  text-align: center;
}

.towary-col-supplier {
  font-size: 13px;
  color: #111827;
}

.towary-col-price {
  font-size: 13px;
  color: #111827;
  text-align: right;
  font-weight: 600;
}


/* =========================
   TOWARY - NIEAKTYWNY
========================= */
.towary-inactive {
  background:rgb(109, 111, 116);
  opacity: 0.85;
}

.inactive-label {
  text-decoration: line-through;
  opacity: 0.5;
  color: #6b7280;
  transition: all 0.2s ease;
}

/* =========================
   ZAMÓWIENIE - AKTYWNY WIERSZ
========================= */
.zamowienie-active {
  background: #93c5fd;
  border-color: #2563eb;
}


/* =========================
   TOWARY - LISTY WYBORU W FORMULARZU
========================= */
.towary-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  background: #fff;
  /* DODANE LINIJKI: */
  max-height: 250px; /* Maksymalna wysokość listy */
  overflow-y: auto;  /* Scroll, gdy lista jest dłuższa */
}

.towary-checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #111827;
}



/* =========================
   FORMULARZ - POLA KLIKANE (MODALE)
========================= */
.supplier-click-field {
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 12px;
  font-size: 15px;
  color: #ffffff;
  background:rgb(65, 65, 67);
}



/* =========================
   LOGIN
========================= */
.login-screen {
  min-height: 100vh;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: #000000;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #111111;
  border: 1px solid #2a2a2a;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
}

.login-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
}

.login-subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: #d1d5db;
}

.login-button {
  width: 100%;
  margin-top: 18px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  align-items: center;
  transition: all 0.15s ease;
}

.login-button:active {
  transform: scale(0.97);
}


.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.95;
}

.login-button-loading {
  background: #9ca3af; /* szary */
  transform: scale(0.98);
}

.login-button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.login-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: login-spin 0.7s linear infinite;
}

@keyframes login-spin {
  to {
    transform: rotate(360deg);
  }
}




.login-button:active {
  transform: scale(0.98);
}

.login-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #3a3a3a;
  background: #1a1a1a;
  color: #ffffff;
  font-size: 16px;
}

.login-input::placeholder {
  color: #9ca3af;
}

.login-input:focus {
  outline: none;
  border-color: #2563eb;
}

input,
select,
textarea {
  font-size: 16px;
}


.company-name {
  font-size: 18px;
  font-weight: 700;
  text-decoration: underline;
  color: #111827;
  text-transform: uppercase;
}



/* =========================
   HOME - KAFELEK ZAMAWIARKA iOS
========================= */

.home-wallet-tile {
  width: 100%;
  max-width: 270px;
  min-height: 190px;
  margin: 40px auto 0 auto;
  padding: 34px 24px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    0 28px 70px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  cursor: pointer;
}

.home-wallet-tile:active {
  transform: scale(0.98);
}

.home-wallet-icon {
  width: 104px;
  height: 104px;
  border-radius: 30px;
  background: linear-gradient(145deg, #dff3ff 0%, #b8dcff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 16px 34px rgba(37, 99, 235, 0.18);
}

.home-wallet-icon svg {
  width: 62px;
  height: 62px;
}

.home-truck-body,
.home-truck-cabin {
  fill: #1d6fe8;
}

.home-truck-window {
  fill: #dbeafe;
}

.home-truck-wheel {
  fill: #1e3a8a;
}

.home-truck-wheel-inner {
  fill: #93c5fd;
}

.home-wallet-title {
  margin-top: 10px;
  font-size: 26px;
  line-height: 1.1;
  font-weight: 800;
  color: #111827;
}

.home-wallet-subtitle {
  font-size: 19px;
  color: #6b7280;
  font-weight: 400;
}




/* =========================
   HOME - UKŁAD iOS
========================= */

.home-screen-ios {
  min-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between; /* 🔥 KLUCZ */
}

.home-header-ios {
  width: 100%;
  text-align: center;
  margin-top: 6px;
}

.home-title-ios {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.6px;
}

.home-version-ios {
  margin-top: 6px;
  font-size: 14px;
  color: #6b7280;
}
<!---pole konto w home --->
.home-account-ios {
  width: 100%;
  max-width: 230px;
  box-sizing: border-box;
  margin: 12px auto 0 auto;
  padding: 8px 12px;
  border-radius: 999px;
  background: #eef0f3;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: #6b7280;
  overflow: hidden;
}

.home-account-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e5e7eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}




.home-account-ios strong {
  min-width: 0;
  max-width: 190px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}



.home-content-ios {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1; /* 🔥 KLUCZ */
}

.home-logout-ios {
  width: 100%;
  max-width: 270px;
  margin-top: auto;
  margin-bottom: 8px;
  padding: 16px 18px;
  border: none;
  border-radius: 22px;
  background: #ffffff;
  color: #ef4444;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}


.home-logout-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
}

.home-footer-ios {
  margin-bottom: 0;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}




.home-logout-ios:active {
  transform: scale(0.98);
}


/* =========================
   ZAMAWIARKA MENU - GRID iOS
========================= */

.zamawiarka-menu-grid-ios {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.home-wallet-tile,
.home-logout-ios {
  box-sizing: border-box;
}


.home-account-ios {
  background: #eef0f3 !important;
}

.home-account-ios {
  width: 82% !important;
  max-width: 230px !important;
  min-height: 34px;
  padding: 6px 12px !important;
  border-radius: 999px !important;
  background: #eef0f3 !important;
  box-shadow: none !important;
}

.home-account-ios strong {
  max-width: 120px !important;
  font-size: 15px !important;
}

.home-header-ios {
  display: flex;
  flex-direction: column;
  align-items: center; /* 🔥 gwarantuje środek */
  position: relative; /* Dodałem to, aby przycisk w rogu działał */
}

.home-account-ios {
  margin-top: 16px !important; /* 🔥 większy odstęp od "wersja" */
}


/* =========================
   ZAMAWIARKA MENU - KAFELKI iOS
========================= */

.ios-menu-tile {
  min-height: 150px;
  padding: 18px;
  border: none;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.10);
  display: flex;
  flex-direction: column;
    align-items: center;
  justify-content: flex-start;
  gap: 6px;
  cursor: pointer;
  text-align: center;
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease;
}

.ios-menu-tile:active {
  transform: scale(0.94);
  box-shadow: 0 6px 16px rgba(0,0,0,0.14);
}

.ios-menu-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.ios-menu-icon svg {
  width: 40px;
  height: 40px;
}

.ios-menu-icon-blue {
  background: linear-gradient(135deg, #2563eb, #60a5fa);
}

.ios-menu-title {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 800;
  color: #111827;
}

.ios-menu-subtitle {
  font-size: 12px;
  margin-top: -6px;
  color: #6b7280;
  line-height: 1.2;
}


.ios-menu-icon-green {
  background: linear-gradient(135deg, #16a34a, #4ade80);
}

.ios-menu-icon-orange {
  background: linear-gradient(135deg, #f97316, #fb923c);
}

.ios-menu-icon-purple {
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
}

.ios-menu-icon-gray {
  background: linear-gradient(135deg, #6b7280, #9ca3af);
}

.ios-menu-icon-red {
  background: linear-gradient(135deg, #ef4444, #f87171);
}

/* =========================
   POMOC - iOS
========================= */

.help-ios-screen {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.help-ios-card {
  width: 100%;
  max-width: 360px;
  min-height: 240px;
  border-radius: 30px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 28px;
  box-sizing: border-box;
}

.help-ios-icon {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: linear-gradient(135deg, #facc15, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
}

.help-typing {
  max-width: 280px;
  line-height: 1.35;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  text-align: center;
}



@keyframes helpTyping {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

@keyframes helpCursor {
  50% {
    border-color: transparent;
  }
}

.help-line {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  margin: 0 auto;
}

.help-line-1 {
  animation: helpTypingLine1 1.7s steps(29, end) forwards;
}

.help-line-2 {
  animation: helpTypingLine2 1.6s steps(27, end) forwards;
  animation-delay: 1.7s;
}

@keyframes helpTypingLine1 {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes helpTypingLine2 {
  from { width: 0; }
  to { width: 100%; }
}


.view-title {
  width: 100%;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.towary-title-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.towary-topbar {
  background: #ffffff;
  border-bottom: 1px solid #e5e5ea;
}

.towary-title {
  color: #000;
}

.towary-icon-button {
  color: #007aff;
}


.zamawiarka-menu-topbar {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e5ea;
  margin-bottom: 20px;
  background: #ffffff;
}

.zamawiarka-menu-back {
  border: none;
  background: #f2f2f7;
  color: #007aff;
  font-size: 20px;
  cursor: pointer;

  width: 36px;
  height: 36px;
  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.zamawiarka-menu-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}



/* =========================
   MODAL POWIADOMIEŃ iOS
========================= */

.app-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.app-dialog-card {
  width: 100%;
  max-width: 330px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.22);
  padding: 24px 20px 18px 20px;
  box-sizing: border-box;
  text-align: center;
  animation: appDialogIn 0.18s ease-out;
}

.app-dialog-icon {
  width: 58px;
  height: 58px;
  margin: 0 auto 14px auto;
  border-radius: 18px;
  background: #f2f2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.app-dialog-title {
  font-size: 19px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 8px;
}

.app-dialog-message {
  font-size: 15px;
  line-height: 1.35;
  color: #6b7280;
  margin-bottom: 20px;
  white-space: pre-line;
}

.app-dialog-actions {
  display: flex;
  gap: 10px;
}

.app-dialog-button {
  flex: 1;
  border: none;
  border-radius: 16px;
  padding: 13px 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.app-dialog-cancel {
  background: #f2f2f7;
  color: #111827;
}

.app-dialog-ok {
  background: #007aff;
  color: #ffffff;
}

.app-dialog-button:active {
  transform: scale(0.97);
}

@keyframes appDialogIn {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}


/* =========================
   SUBTELNE PRZEJŚCIE WIDOKU
========================= */

.screen-soft-enter-active {
  transition: opacity 0.32s ease, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.screen-soft-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.screen-soft-enter-from {
  opacity: 0;
  transform: translateY(28px) scale(0.97);
}

.screen-soft-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.99);
}

.screen-soft-enter-to,
.screen-soft-leave-from {
  opacity: 1;
  transform: translateY(0);
}



.menu-tiles-animate .ios-menu-tile {
  animation: menuTilePop 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.menu-tiles-animate .ios-menu-tile:nth-child(1) { animation-delay: 0.1s; }
.menu-tiles-animate .ios-menu-tile:nth-child(2) { animation-delay: 0.3s; }
.menu-tiles-animate .ios-menu-tile:nth-child(3) { animation-delay: 0.05s; }
.menu-tiles-animate .ios-menu-tile:nth-child(4) { animation-delay: 0.4s; }
.menu-tiles-animate .ios-menu-tile:nth-child(5) { animation-delay: 0.2s; }
.menu-tiles-animate .ios-menu-tile:nth-child(6) { animation-delay: 0.5s; }

@keyframes menuTilePop {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}



.ios-home-pill {
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: #007aff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.ios-home-pill:active {
  transform: scale(0.95);
  box-shadow: 0 7px 18px rgba(15, 23, 42, 0.18);
}

.ios-home-pill-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ios-home-pill-icon svg {
  width: 22px;
  height: 22px;
}



</style>