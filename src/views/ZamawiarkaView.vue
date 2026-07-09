<template>
  <!-- =========================
         ZAMAWIARKA / MENU
    ========================== -->
    <div v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'menu'">
    <div class="zamawiarka-menu-topbar">
  <button
  @click="router.push('/'); zamawiarkaView = 'menu'"
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
  @click="zmienWidokZOpuznieniem('produkty')"
  class="ios-menu-tile efekt-kliku"
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
  @click="zmienWidokZOpuznieniem('koszyk')"
  class="ios-menu-tile efekt-kliku"
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
  @click="zmienWidokZOpuznieniem('historia')"
  class="ios-menu-tile efekt-kliku"
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
  @click="zmienWidokZOpuznieniem('towary')"
  class="ios-menu-tile efekt-kliku"
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
  @click="zmienWidokZOpuznieniem('ustawienia')"
  class="ios-menu-tile efekt-kliku"
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
  @click="zmienWidokZOpuznieniem('pomoc')"
  class="ios-menu-tile efekt-kliku"
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
<ZamawiarkaPomocView 
  v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'pomoc'" 
  @close="zamawiarkaView = 'menu'" 
/>



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
          @click="zmienWidokZOpuznieniem('menu')"
          class="towary-icon-button efekt-kliku"
          title="Wróć"
        >
          ←
        </button>

        <h2 class="towary-title">ZRÓB ZAMÓWIENIE</h2>
      </div>

      <div class="towary-topbar-right">


      <div style="position:relative;">

 <button
  @click="zmienWidokZOpuznieniem('koszyk')"
  class="towary-icon-button efekt-kliku"
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
  <div class="towary-list-wrap scroll-area" ref="produktyListRef">
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
          @click="zmienWidokZOpuznieniem('produkty')"
          class="towary-icon-button efekt-kliku"
          title="Wróć"
        >
          ←
        </button>

        <h2 class="towary-title">KOSZYK</h2>
      </div>

      <div class="towary-topbar-right">
      <button
          @click="handleGenerateOrder"
          class="towary-icon-button"
          title="Generuj PDF"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M14 2v6h6" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/>
            <rect x="2.5" y="12.5" width="19" height="7.5" rx="1.5" fill="#dc2626" stroke="#b91c1c" stroke-width="0.5"/>
            <text x="12" y="17.8" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="5.5" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">PDF</text>
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

<div v-else class="scroll-area" ref="koszykListRef">
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
          @click="zmienWidokZOpuznieniem('menu')"
          class="towary-icon-button efekt-kliku"
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
                @click="zmienWidokZOpuznieniem('menu')"
                class="towary-icon-button efekt-kliku"
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
<ZamawiarkaUstawieniaView
  v-if="currentScreen === 'zamawiarka' && zamawiarkaView === 'ustawienia'"
  :suppliers="suppliers"
  :showSupplierForm="showSupplierForm"
  :supplierFormMode="supplierFormMode"
  :supplierForm="supplierForm"
  :warehouses="warehouses"
  :showWarehouseForm="showWarehouseForm"
  :warehouseFormMode="warehouseFormMode"
  :warehouseForm="warehouseForm"
  :units="units"
  :showUnitForm="showUnitForm"
  :unitFormMode="unitFormMode"
  :unitForm="unitForm"
  :whoOrders="whoOrders"
  :showWhoOrderForm="showWhoOrderForm"
  :whoOrderFormMode="whoOrderFormMode"
  :whoOrderForm="whoOrderForm"
  :orderTimings="orderTimings"
  :showOrderTimingForm="showOrderTimingForm"
  :orderTimingFormMode="orderTimingFormMode"
  :orderTimingForm="orderTimingForm"
  :categories="categories"
  :showCategoryForm="showCategoryForm"
  :categoryFormMode="categoryFormMode"
  :categoryForm="categoryForm"
  @close="zamawiarkaView = 'menu'"
  @openSupplierForm="openSupplierForm"
  @editSupplier="editSupplier"
  @closeSupplierForm="closeSupplierForm"
  @saveSupplier="saveSupplier"
  @deleteSupplier="deleteSupplier"
  @openWarehouseForm="openWarehouseForm"
  @editWarehouse="editWarehouse"
  @closeWarehouseForm="closeWarehouseForm"
  @saveWarehouse="saveWarehouse"
  @deleteWarehouse="deleteWarehouse"
  @openUnitForm="openUnitForm"
  @editUnit="editUnit"
  @closeUnitForm="closeUnitForm"
  @saveUnit="saveUnit"
  @deleteUnit="deleteUnit"
  @openWhoOrderForm="openWhoOrderForm"
  @editWhoOrder="editWhoOrder"
  @closeWhoOrderForm="closeWhoOrderForm"
  @saveWhoOrder="saveWhoOrder"
  @deleteWhoOrder="deleteWhoOrder"
  @openOrderTimingForm="openOrderTimingForm"
  @editOrderTiming="editOrderTiming"
  @closeOrderTimingForm="closeOrderTimingForm"
  @saveOrderTiming="saveOrderTiming"
  @deleteOrderTiming="deleteOrderTiming"
  @openCategoryForm="openCategoryForm"
  @editCategory="editCategory"
  @closeCategoryForm="closeCategoryForm"
  @saveCategory="saveCategory"
  @deleteCategory="deleteCategory"
/>













  














</template>

<script>
import { inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ZamawiarkaPomocView from './ZamawiarkaPomocView.vue'
import ZamawiarkaUstawieniaView from './ZamawiarkaUstawieniaView.vue'

export default {
  components: {
    ZamawiarkaPomocView,
    ZamawiarkaUstawieniaView
  },
  setup() {
    // Odbieramy paczkę logiki
    const appContext = inject('appContext')
    // Odpalamy Router
    const router = useRouter()
    
    // Wymuszamy widok
    onMounted(() => {
      if (appContext.currentScreen) {
        appContext.currentScreen.value = 'zamawiarka'
      }
    })

    // TUTAJ DODANA FUNKCJA OPÓŹNIAJĄCA
    const zmienWidokZOpuznieniem = (nowyWidok) => {
      setTimeout(() => {
        appContext.zamawiarkaView.value = nowyWidok
      }, 40)
    }

    // TUTAJ DOPISANA FUNKCJA DO ZWRACANYCH DANYCH
    return { ...appContext, router, zmienWidokZOpuznieniem }
  }
}



</script>