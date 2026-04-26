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
    autocomplete="email"
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
  style="padding:20px; font-family:sans-serif; max-width:500px; margin:auto;"
>


  

   <!-- =========================
     HOME
========================== -->
<div v-if="currentScreen === 'home'">
  <h1>GastroManager</h1>

  <div>wersja 1.1.1</div>

 <div
  v-if="currentCompany"
  style="margin-top:8px; font-size:14px; color:#6b7280;"
>
  Konto: <strong style="font-size:18px;">{{ currentCompany.companyName }}</strong>
</div>

  <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
    
    <!-- ZAMAWIARKA (nowy styl kafelka) -->
    <button
      @click="currentScreen = 'zamawiarka'; zamawiarkaView = 'menu'"
      style="padding:20px; border-radius:18px; min-height:90px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;"
    >
  <svg
  xmlns="http://www.w3.org/2000/svg"
  width="36"
  height="36"
  viewBox="0 0 24 24"
  fill="none"
  stroke="#111827"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- koła -->
  <circle cx="7" cy="18" r="2"/>
  <circle cx="17" cy="18" r="2"/>

  <!-- paka -->
  <rect x="1" y="6" width="12" height="10" rx="2"/>

  <!-- kabina -->
  <path d="M13 8h4l3 3v5h-7z"/>
</svg>

      <div>
        Zamawiarka
      </div>
    </button>

    <!-- WYLOGUJ -->
    <button
      @click="handleLogout"
      style="padding:14px; font-size:16px; border-radius:12px; cursor:pointer; background:#111827; color:#ffffff; border:none;"
    >
      Wyloguj
    </button>

  </div>
</div>





    <!-- =========================
         ZAMAWIARKA / MENU
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'menu'">
                 <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="currentScreen = 'home'; zamawiarkaView = 'menu'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">ZAMAWIARKA</h2>
      </div>

      <div
        style="
          display:grid;
          grid-template-columns:repeat(3, 1fr);
          gap:12px;
        "
      >
        <button
  @click="zamawiarkaView = 'produkty'"
  style="padding:20px; border-radius:18px; min-height:90px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#111827"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>

  <div>
    Zrób zamówienie
  </div>
</button>

        <button
  @click="zamawiarkaView = 'koszyk'"
  style="padding:20px; border-radius:18px; min-height:90px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
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

  <div>
    Koszyk ({{ cartItems.length }})
  </div>
</button>

  <button
  @click="zamawiarkaView = 'historia'"
  style="padding:20px; border-radius:18px; min-height:90px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#111827"
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

  <div>
    Rejestr zamówień
  </div>
</button>

  <button
  @click="zamawiarkaView = 'towary'; towaryView = 'list'"
  style="padding:20px; border-radius:18px; min-height:90px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#111827"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>

  <div>
    Towary
  </div>
</button>

 <button
  @click="zamawiarkaView = 'ustawienia'"
  style="padding:20px; border-radius:18px; min-height:90px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;"
>
  <svg
  xmlns="http://www.w3.org/2000/svg"
  width="28"
  height="28"
  viewBox="0 0 24 24"
  fill="none"
  stroke="#111827"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
</svg>

  <div>
    Ustawienia
  </div>
</button>
      </div>
    </div>




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
      style="padding:15px 25px; border-radius:30px; font-size:16px;"
    >
      🏠
    </button>
  </div>

</div>





<!-- =========================
     WIDOK: KOSZYK
========================== -->
<div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'koszyk'" class="screen-with-topbar">
  <div class="towary-topbar">
    <!-- WIERSZ STANDARDOWY -->
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
      style="padding:15px 25px; border-radius:30px; font-size:16px;"
    >
      🏠
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

        <h2 class="towary-title">REJESTR ZAMÓWIEŃ</h2>
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
      style="padding:15px 25px; border-radius:30px; font-size:16px;"
    >
      🏠
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
        <div class="towary-list-wrap scroll-area">
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
            @click="handleTowarRowClick(item)"
          >
            <!-- KOLUMNA CHECKBOX - ZAWSZE MA MIEJSCE -->
            <div
              class="towary-col-checkbox"
              @click.stop
            >
              <input
                v-if="towarySelectionMode"
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
    style="padding:15px 25px; border-radius:30px; font-size:16px;"
  >
    🏠
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
      style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
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
      <span>aktywne</span>
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
                  type="number"
                  min="0"
                  class="supplier-form-input"
                  style="width:120px; padding:8px 10px;"
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
  <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
    <button
      @click="zamawiarkaView = 'menu'"
      style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
    >
      ←
    </button>
    <h2 style="margin:0;">USTAWIENIA</h2>
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
      style="padding:15px 25px; border-radius:30px; font-size:16px;"
    >
      🏠
    </button>
  </div>
</div>






        <!-- =========================
         WIDOK: HURTOWNIE
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'hurtownie'" class="suppliers-screen">
      <!-- NAGŁÓWEK -->
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="zamawiarkaView = 'ustawienia'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">HURTOWNIE</h2>
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
          style="padding:15px 25px; border-radius:30px; font-size:16px;"
        >
          🏠
        </button>
      </div>
    </div>





        <!-- =========================
         WIDOK: MAGAZYNY
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'magazyny'" class="suppliers-screen">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="zamawiarkaView = 'ustawienia'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">MAGAZYNY</h2>
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
          style="padding:15px 25px; border-radius:30px; font-size:16px;"
        >
          🏠
        </button>
      </div>
    </div>







        <!-- =========================
         WIDOK: KIEDY ZAMAWIANE
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'orderTiming'" class="suppliers-screen">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="zamawiarkaView = 'ustawienia'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">KIEDY ZAMAWIANE</h2>
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
          <div class="supplier-card-top">
            <div class="supplier-name">{{ item.name }}</div>

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
          style="padding:15px 25px; border-radius:30px; font-size:16px;"
        >
          🏠
        </button>
      </div>
    </div>






        <!-- =========================
         WIDOK: JEDNOSTKI MIARY
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'units'" class="suppliers-screen">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="zamawiarkaView = 'ustawienia'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">JEDNOSTKI MIARY</h2>
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
          <div class="supplier-card-top">
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
          style="padding:15px 25px; border-radius:30px; font-size:16px;"
        >
          🏠
        </button>
      </div>
    </div>








        <!-- =========================
         WIDOK: KATEGORIE TOWARÓW
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'categories'" class="suppliers-screen">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="zamawiarkaView = 'ustawienia'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">KATEGORIE TOWARÓW</h2>
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
          <div class="supplier-card-top">
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
          style="padding:15px 25px; border-radius:30px; font-size:16px;"
        >
          🏠
        </button>
      </div>
    </div>






        <!-- =========================
         WIDOK: KTO ZAMAWIA
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'whoOrders'" class="suppliers-screen">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #ddd; margin-bottom:20px;">
        <button
          @click="zamawiarkaView = 'ustawienia'"
          style="border:none; background:none; font-size:24px; cursor:pointer; padding:0;"
        >
          ←
        </button>
        <h2 style="margin:0;">KTO ZAMAWIA</h2>
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
          style="padding:15px 25px; border-radius:30px; font-size:16px;"
        >
          🏠
        </button>
      </div>
    </div>






  </div>



  <!-- =========================
     UKRYTY SZABLON PDF
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

    <div
      style="
        display:grid;
        grid-template-columns: minmax(0, 1fr) 90px 80px 120px;
        gap:12px;
        padding:10px 0;
        border-top:2px solid #111827;
        border-bottom:2px solid #111827;
        font-weight:700;
        font-size:15px;
      "
    >
      <div>Nazwa</div>
      <div style="text-align:center;">Ilość</div>
      <div style="text-align:center;">JM</div>
      <div style="text-align:right;">Wartość</div>
    </div>

    <div
      v-for="item in pdfPreviewOrder.items"
      :key="item.id"
      style="
        display:grid;
        grid-template-columns: minmax(0, 1fr) 90px 80px 120px;
        gap:12px;
        padding:10px 0;
        border-bottom:1px solid #e5e7eb;
        font-size:15px;
        align-items:start;
      "
    >
      <div style="word-break:break-word;">
        {{ item.name }}
      </div>

      <div style="text-align:center;">
        {{ item.qty }}
      </div>

      <div style="text-align:center;">
        {{ item.unit || '' }}
      </div>

      <div style="text-align:right;">
        {{ Number(item.value || 0).toFixed(2) }}
      </div>
    </div>

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
  writeBatch
} from 'firebase/firestore'

export default {





  setup() {



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
  suppliers: [],
  towary: [],
  warehouses: [],
  orderTimings: [],
  units: [],
  categories: [],
  whoOrders: [],
  ordersRegister: []
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

    authForm.value = {
      email: '',
      password: ''
    }
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
  ordersRegister: ordersRegister.value
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
  ordersRegister.value = safeState.ordersRegister
}


const saveAllAppStateToCloud = async () => {
  const uid = auth.currentUser?.uid

  if (!uid) return

  try {
    const appState = collectAppState()

    // 🔒 BLOKADA TYLKO PRZY CAŁKOWICIE PUSTYM STANIE PO RESECIE
const isReallyEmptyState =
  (!appState.towary || appState.towary.length === 0) &&
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
  const confirmed = confirm('Czy na pewno chcesz wyczyścić koszyk?')
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
    alert('Wpisz nazwę')
    return
  }

  if (!unit) {
    alert('Wybierz jednostkę miary')
    return
  }

  if (!qty || qty <= 0) {
    alert('Wpisz poprawną ilość')
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

    const saveSupplier = () => {
      if (!supplierForm.value.name.trim()) return








           // =========================
            // DUPLIKAT - HURTOWNIA
             // =========================
                  if (hasDuplicateName(
                    suppliers.value,
                    supplierForm.value.name,
                     editedSupplierId.value
                  )) {
                  alert('Taka hurtownia już istnieje')
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
const deleteSupplier = () => {
  if (editedSupplierId.value === null) return

  const supplierToDelete = suppliers.value.find(
    supplier => supplier.id === editedSupplierId.value
  )

  const supplierNameToDelete = supplierToDelete?.name || ''

  // 🔴 POTWIERDZENIE
  const confirmed = confirm('Czy na pewno chcesz usunąć?')

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

    const saveWarehouse = () => {
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
    alert('Taki magazyn już istnieje')
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
    const deleteWarehouse = () => {
  if (editedWarehouseId.value === null) return

  const warehouseToDelete = warehouses.value.find(
    warehouse => warehouse.id === editedWarehouseId.value
  )

  const warehouseNameToDelete = warehouseToDelete?.name || ''

  const confirmed = confirm('Czy na pewno chcesz usunąć?')
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

    const saveOrderTiming = () => {
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
    alert('Taka pozycja już istnieje')
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
    const deleteOrderTiming = () => {
  if (editedOrderTimingId.value === null) return

  const timingToDelete = orderTimings.value.find(
    item => item.id === editedOrderTimingId.value
  )

  const timingNameToDelete = timingToDelete?.name || ''

  const confirmed = confirm('Czy na pewno chcesz usunąć?')
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

    const saveUnit = () => {
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
    alert('Taka jednostka już istnieje')
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
    const deleteUnit = () => {
  if (editedUnitId.value === null) return

  const unitToDelete = units.value.find(
    item => item.id === editedUnitId.value
  )

  const unitNameToDelete = unitToDelete?.name || ''

  const confirmed = confirm('Czy na pewno chcesz usunąć?')
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

const saveCategory = () => {
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
    alert('Taka kategoria już istnieje')
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
const deleteCategory = () => {
  if (editedCategoryId.value === null) return

  const categoryToDelete = categories.value.find(
    item => item.id === editedCategoryId.value
  )

  const categoryNameToDelete = categoryToDelete?.name || ''

  const confirmed = confirm('Czy na pewno chcesz usunąć?')
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

const saveWhoOrder = () => {
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
    alert('Taka pozycja już istnieje')
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
const deleteWhoOrder = () => {
  if (editedWhoOrderId.value === null) return

  const whoOrderToDelete = whoOrders.value.find(
    item => item.id === editedWhoOrderId.value
  )

  const whoOrderNameToDelete = whoOrderToDelete?.name || ''

  const confirmed = confirm('Czy na pewno chcesz usunąć?')
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
const handleTowarRowClick = (item) => {
  towarFormSource.value = 'towary'

  if (isTowarIncomplete(item)) {
    const missingFields = getTowarMissingFields(item)

    if (missingFields.length > 0) {
      alert(
        'Brakuje pól:\n- ' + missingFields.join('\n- ')
      )
    }
  }

  openTowarEdit(item)
}





const closeTowarForm = () => {
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

    const removeSelectedTowary = () => {
  const confirmed = confirm('Czy na pewno chcesz usunąć zaznaczone towary?')
  if (!confirmed) return

  towary.value = towary.value.filter(
    item => !selectedTowaryIds.value.includes(item.id)
  )

  selectedTowaryIds.value = []
  towarySelectionMode.value = false

  scheduleSave()
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

    const openMaxQtyField = () => {
      const hasOrderTimings =
        Array.isArray(towarForm.value.orderTimings) &&
        towarForm.value.orderTimings.length > 0

      if (!hasOrderTimings) {
        alert('Najpierw wybierz pozycje w polu Kiedy zamówienie')
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





      const saveTowar = () => {
             // =========================
             // PROSTA WALIDACJA
              // =========================
              if (!towarForm.value.name.trim()) return

const netPriceNormalized = normalizeNetPrice(towarForm.value.netPrice)
const vatNormalized = normalizeVat(towarForm.value.vat)

if (netPriceNormalized === null) {
  alert('Cena netto musi być liczbą z maksymalnie 2 miejscami po przecinku')
  return
}

if (vatNormalized === null) {
  alert('Stawka VAT musi być liczbą całkowitą')
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
      // EDYCJA
      // =========================
      if (towarFormMode.value === 'edit' && editedTowarId.value !== null) {
        const index = towary.value.findIndex(item => item.id === editedTowarId.value)

        if (index !== -1) {
          towary.value[index] = preparedTowar
        }
      } else {
        // =========================
        // DODAWANIE
        // =========================
        towary.value.push(preparedTowar)
      }

      // =========================
      // ZAMKNIĘCIE FORMULARZA
      // =========================
      closeTowarForm()
      scheduleSave()
    }


    // =========================
// TOWARY - USUWANIE
// =========================
const deleteTowar = () => {
  if (editedTowarId.value === null) return

  const confirmed = confirm('Czy na pewno chcesz usunąć ten towar?')
  if (!confirmed) return

  towary.value = towary.value.filter(item => item.id !== editedTowarId.value)

  closeTowarForm()
  scheduleSave()
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
// ZAPIS AKTUALNEGO ZAMÓWIENIA DO REJESTRU
// =========================
const saveCurrentOrderToRegister = () => {
  if (filteredCartItems.value.length === 0) {
    alert('Brak pozycji do zapisania w aktualnym widoku koszyka')
    return null
  }

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

  ordersRegister.value.unshift(orderRecord)
  scheduleSave()
  return orderRecord
  
}



// =========================
// GENEROWANIE ZAMÓWIENIA (FLOW POD PDF)
// =========================
const handleGenerateOrder = async () => {
  if (filteredCartItems.value.length === 0) {
    alert('Brak pozycji do zamówienia')
    return
  }

  const confirmed = confirm('Wygenerować PDF i zapisać zamówienie?')

  if (!confirmed) return

  const order = saveCurrentOrderToRegister()

  if (!order) return

  const pdfResult = await generateOrderPdf(order)

  if (!pdfResult) {
    alert('Nie udało się wygenerować PDF')
    return
  }

  pdfResult.doc.save(pdfResult.fileName)

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
// GENEROWANIE PDF
// =========================
const generateOrderPdf = async (order) => {
  if (!order) return null

  pdfPreviewOrder.value = order
  await nextTick()

  const element = pdfTemplateRef.value

  if (!element) return null

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff'
  })

  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

    const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  const pageMargin = 12
  const imgWidth = pdfWidth - pageMargin * 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = pageMargin

  pdf.addImage(imgData, 'PNG', pageMargin, position, imgWidth, imgHeight)
  heightLeft -= pdfHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + pageMargin
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', pageMargin, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight
  }

  return {
    doc: pdf,
    fileName: getOrderFileName(order)
  }
}


// =========================
// REJESTR ZAMÓWIEŃ - ROZWIJANIE SZCZEGÓŁÓW
// =========================
const toggleOrderDetails = (orderId) => {
  expandedOrderId.value =
    expandedOrderId.value === orderId ? null : orderId
}


// =========================
// REJESTR ZAMÓWIEŃ - USUWANIE
// =========================
const deleteOrderFromRegister = (orderId) => {
  const confirmed = confirm('Czy na pewno chcesz usunąć to zamówienie?')

  if (!confirmed) return

  ordersRegister.value = ordersRegister.value.filter(order => order.id !== orderId)

  if (expandedOrderId.value === orderId) {
    expandedOrderId.value = null
  }
  scheduleSave()
}


// =========================
// REJESTR ZAMÓWIEŃ - GENERUJ PDF
// =========================
const generatePdfFromRegister = async (order) => {
  if (!order) return

  const confirmed = confirm('Wygenerować PDF tego zamówienia?')

  if (!confirmed) return

  const pdfResult = await generateOrderPdf(order)

  if (!pdfResult) {
    alert('Nie udało się wygenerować PDF')
    return
  }

  pdfResult.doc.save(pdfResult.fileName)
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



    return {
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

      isDataLoaded,

      fieldFilledClass,

      



      
    }
  }
}
</script>















<style>


.field-empty,
.supplier-click-field.field-empty {
  background-color: #ef080871;
  color: #111827;
}

.field-filled,
.supplier-click-field.field-filled {
  background-color: #09f34f72;
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
  min-height: 100vh;
  box-sizing: border-box;
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
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 300;
}

.supplier-modal-card {
  background: #ffffff;
  width: 100%;
  max-width: 420px;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
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
  grid-template-columns: 28px 3fr 1fr 2fr 1.2fr;
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



</style>