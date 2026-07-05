<template>
  <div class="screen-with-topbar">
    
    <div v-if="activeTab === 'menu'">
      <div class="zamawiarka-menu-topbar">
        <button @click="$emit('close')" class="zamawiarka-menu-back">←</button>
        <h2 class="zamawiarka-menu-title">USTAWIENIA</h2>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; padding: 20px;">
        <button @click="activeTab = 'hurtownie'" style="padding:15px; border-radius:12px; color: #111827; font-size: 16px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">Hurtownie</button>
        <button @click="activeTab = 'magazyny'" style="padding:15px; border-radius:12px; color: #111827; font-size: 16px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">Magazyny</button>
        <button @click="activeTab = 'units'" style="padding:15px; border-radius:12px; color: #111827; font-size: 16px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">Jednostki miary</button>
        <button @click="activeTab = 'orderTiming'" style="padding:15px; border-radius:12px; color: #111827; font-size: 16px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">Kiedy zamawiane</button>
        <button @click="activeTab = 'categories'" style="padding:15px; border-radius:12px; color: #111827; font-size: 16px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">Kategorie towarów</button>
        <button @click="activeTab = 'whoOrders'" style="padding:15px; border-radius:12px; color: #111827; font-size: 16px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">Kto zamawia</button>
      </div>
    </div>

    <div v-if="activeTab !== 'menu' && activeTab !== 'hurtownie' && activeTab !== 'magazyny' && activeTab !== 'units' && activeTab !== 'whoOrders'" style="padding: 60px 20px; text-align: center;">
      <h3 style="color: #64748b; margin-bottom: 20px;">Ta sekcja czeka na przeniesienie w kolejnym kroku :)</h3>
      <button @click="activeTab = 'menu'" style="padding: 12px 24px; border-radius: 8px; background: #2563eb; color: white; border: none; font-weight: bold; cursor: pointer;">
        Wróć do menu ustawień
      </button>
    </div>

    <div v-if="activeTab === 'hurtownie'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button @click="activeTab = 'menu'" class="zamawiarka-menu-back">←</button>
        <h2 class="zamawiarka-menu-title">HURTOWNIE</h2>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px; padding: 0 20px;">
        <div v-if="suppliers.length === 0" class="empty-state">
          <div class="empty-title">Brak hurtowni</div>
          <div class="empty-subtitle">Kliknij + aby dodać</div>
        </div>

        <div v-for="supplier in suppliers" :key="supplier.id" class="item-card">
          <div class="item-card-top">
            <div class="supplier-name">{{ supplier.name }}</div>
            <button @click="$emit('editSupplier', supplier)" class="supplier-edit-button" type="button">✏️</button>
          </div>

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

      <button @click="$emit('openSupplierForm')" class="fab-add-button" aria-label="Dodaj hurtownię">+</button>

      <div v-if="showSupplierForm" class="supplier-modal-overlay">
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ supplierFormMode === 'edit' ? 'EDYTUJ HURTOWNIĘ' : 'DODAJ HURTOWNIĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa</label>
            <input v-model="supplierForm.name" type="text" placeholder="Np. Makro" autofocus class="supplier-form-input" />
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Telefon</label>
            <input v-model="supplierForm.phone" type="tel" placeholder="Np. 123456789" class="supplier-form-input" />
          </div>

          <div class="supplier-form-group">
            <label class="supplier-form-label">E-mail</label>
            <input v-model="supplierForm.email" type="email" placeholder="Np. kontakt@firma.pl" class="supplier-form-input" />
          </div>

          <div class="supplier-modal-actions">
            <button v-if="supplierFormMode === 'edit'" @click="$emit('deleteSupplier')" style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;">
              Usuń
            </button>
            <button @click="$emit('closeSupplierForm')" class="supplier-cancel-button">Anuluj</button>
            <button @click="$emit('saveSupplier')" class="supplier-save-button">Zapisz</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'magazyny'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button @click="activeTab = 'menu'" class="zamawiarka-menu-back">←</button>
        <h2 class="zamawiarka-menu-title">MAGAZYNY</h2>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px; padding: 0 20px;">
        <div v-if="warehouses.length === 0" class="empty-state">
          <div class="empty-title">Brak magazynów</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszy</div>
        </div>

        <div v-for="warehouse in warehouses" :key="warehouse.id" class="item-card">
          <div class="item-card-top">
            <div class="supplier-name">{{ warehouse.name }}</div>
            <button @click="$emit('editWarehouse', warehouse)" class="supplier-edit-button" type="button">✏️</button>
          </div>
        </div>
      </div>

      <button @click="$emit('openWarehouseForm')" class="fab-add-button" aria-label="Dodaj magazyn">+</button>

      <div v-if="showWarehouseForm" class="supplier-modal-overlay">
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ warehouseFormMode === 'edit' ? 'EDYTUJ MAGAZYN' : 'DODAJ MAGAZYN' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa magazynu</label>
            <input v-model="warehouseForm.name" type="text" placeholder="Np. Magazyn Główny" autofocus class="supplier-form-input" />
          </div>

          <div class="supplier-modal-actions">
            <button v-if="warehouseFormMode === 'edit'" @click="$emit('deleteWarehouse')" style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;">
              Usuń
            </button>
            <button @click="$emit('closeWarehouseForm')" class="supplier-cancel-button">Anuluj</button>
            <button @click="$emit('saveWarehouse')" class="supplier-save-button">Zapisz</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'units'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button @click="activeTab = 'menu'" class="zamawiarka-menu-back">←</button>
        <h2 class="zamawiarka-menu-title">JEDNOSTKI MIARY</h2>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px; padding: 0 20px;">
        <div v-if="units.length === 0" class="empty-state">
          <div class="empty-title">Brak jednostek miary</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszą</div>
        </div>

        <div v-for="item in units" :key="item.id" class="item-card">
          <div class="item-card-top">
            <div class="supplier-name">{{ item.name }}</div>
            <button @click="$emit('editUnit', item)" class="supplier-edit-button" type="button">✏️</button>
          </div>
        </div>
      </div>

      <button @click="$emit('openUnitForm')" class="fab-add-button" aria-label="Dodaj jednostkę miary">+</button>

      <div v-if="showUnitForm" class="supplier-modal-overlay">
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ unitFormMode === 'edit' ? 'EDYTUJ JEDNOSTKĘ MIARY' : 'DODAJ JEDNOSTKĘ MIARY' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Nazwa jednostki</label>
            <input v-model="unitForm.name" type="text" placeholder="Np. szt, kg, l" autofocus class="supplier-form-input" />
          </div>

          <div class="supplier-modal-actions">
            <button v-if="unitFormMode === 'edit'" @click="$emit('deleteUnit')" style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;">
              Usuń
            </button>
            <button @click="$emit('closeUnitForm')" class="supplier-cancel-button">Anuluj</button>
            <button @click="$emit('saveUnit')" class="supplier-save-button">Zapisz</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'whoOrders'" class="suppliers-screen">
      <div class="zamawiarka-menu-topbar">
        <button @click="activeTab = 'menu'" class="zamawiarka-menu-back">←</button>
        <h2 class="zamawiarka-menu-title">KTO ZAMAWIA</h2>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:110px; padding: 0 20px;">
        <div v-if="whoOrders.length === 0" class="empty-state">
          <div class="empty-title">Brak pozycji</div>
          <div class="empty-subtitle">Kliknij + aby dodać pierwszą</div>
        </div>

        <div v-for="item in whoOrders" :key="item.id" class="item-card">
          <div class="item-card-top">
            <div class="supplier-name">{{ item.name }}</div>
            <button @click="$emit('editWhoOrder', item)" class="supplier-edit-button" type="button">✏️</button>
          </div>
        </div>
      </div>

      <button @click="$emit('openWhoOrderForm')" class="fab-add-button" aria-label="Dodaj pozycję">+</button>

      <div v-if="showWhoOrderForm" class="supplier-modal-overlay">
        <div class="supplier-modal-card">
          <h3 class="supplier-modal-title">
            {{ whoOrderFormMode === 'edit' ? 'EDYTUJ POZYCJĘ' : 'DODAJ POZYCJĘ' }}
          </h3>

          <div class="supplier-form-group">
            <label class="supplier-form-label">Kto zamawia</label>
            <input v-model="whoOrderForm.name" type="text" placeholder="Np. Barman, Szef kuchni, Manager" autofocus class="supplier-form-input" />
          </div>

          <div class="supplier-modal-actions">
            <button v-if="whoOrderFormMode === 'edit'" @click="$emit('deleteWhoOrder')" style="flex:1; padding:12px; border:none; border-radius:10px; background:#d9534f; color:white; font-size:15px; font-weight:600; cursor:pointer;">
              Usuń
            </button>
            <button @click="$emit('closeWhoOrderForm')" class="supplier-cancel-button">Anuluj</button>
            <button @click="$emit('saveWhoOrder')" class="supplier-save-button">Zapisz</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps([
  // Hurtownie
  'suppliers',
  'showSupplierForm',
  'supplierFormMode',
  'supplierForm',
  // Magazyny
  'warehouses',
  'showWarehouseForm',
  'warehouseFormMode',
  'warehouseForm',
  // Jednostki miary
  'units',
  'showUnitForm',
  'unitFormMode',
  'unitForm',
  // Kto zamawia
  'whoOrders',
  'showWhoOrderForm',
  'whoOrderFormMode',
  'whoOrderForm'
])

const emit = defineEmits([
  'close',
  // Hurtownie
  'openSupplierForm',
  'editSupplier',
  'closeSupplierForm',
  'saveSupplier',
  'deleteSupplier',
  // Magazyny
  'openWarehouseForm',
  'editWarehouse',
  'closeWarehouseForm',
  'saveWarehouse',
  'deleteWarehouse',
  // Jednostki miary
  'openUnitForm',
  'editUnit',
  'closeUnitForm',
  'saveUnit',
  'deleteUnit',
  // Kto zamawia
  'openWhoOrderForm',
  'editWhoOrder',
  'closeWhoOrderForm',
  'saveWhoOrder',
  'deleteWhoOrder'
])

const activeTab = ref('menu')
</script>