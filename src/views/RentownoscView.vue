<template>
 <div v-if="currentScreen === 'receptury' && recepturyView === 'dashboard'" class="screen-with-topbar">
      
      <div class="zamawiarka-menu-topbar">
        <button @click="router.push('/')" class="zamawiarka-menu-back">
          ←
        </button>
        <h2 class="zamawiarka-menu-title" style="font-size: 16px; white-space: nowrap;">RENTOWNOŚĆ MENU</h2>
      </div>

      <div class="scroll-area" style="padding: 0 16px; display: flex; flex-direction: column;">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; margin-top: 10px;">
          <div class="item-card" style="padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Średni FC Menu</div>
            <div style="font-size: 24px; font-weight: 800; color: #111827; margin-top: 4px;">{{ dashboardMetrics.avgFc }}%</div>
          </div>
          <div class="item-card" style="padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Średnia Marża</div>
            <div style="font-size: 24px; font-weight: 800; color: #16a34a; margin-top: 4px;">{{ dashboardMetrics.avgMargin }}%</div>
          </div>
          
          <div v-if="dashboardMetrics.exceededCount > 0" class="item-card" style="padding: 14px; text-align: center; grid-column: span 2; display: flex; align-items: center; justify-content: center; gap: 10px; background: #fef2f2; border-color: #fca5a5;">
            <span style="font-size: 24px;">🚨</span>
            <div style="text-align: left;">
              <div style="font-size: 18px; font-weight: 800; color: #dc2626;">{{ dashboardMetrics.exceededCount }} pozycje</div>
              <div style="font-size: 12px; color: #991b1b; font-weight: 700;">przekroczyły próg Food Cost!</div>
            </div>
          </div>
          <div v-else class="item-card" style="padding: 14px; text-align: center; grid-column: span 2; display: flex; align-items: center; justify-content: center; gap: 10px; background: #f0fdf4; border-color: #bbf7d0;">
            <span style="font-size: 24px;">✅</span>
            <div style="text-align: left;">
              <div style="font-size: 18px; font-weight: 800; color: #16a34a;">Menu w normie</div>
              <div style="font-size: 12px; color: #166534; font-weight: 700;">Wszystkie pozycje trzymają FC.</div>
            </div>
          </div>
        </div>

        <div v-if="dashboardWorstFC.length > 0" style="margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #dc2626; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🔻</span> Największe odchylenia FC
          </h3>
          <div v-for="item in dashboardWorstFC" :key="item.id" class="item-card" style="border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 14px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ item.name }}</div>
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-top: 2px;">
                Cel: {{ item.target }}% | Odchylenie: <span style="color: #dc2626; font-weight: 700;">+{{ item.deviation.toFixed(1) }}%</span>
              </div>
            </div>
            <div style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 14px; margin-left: 8px;">
              {{ item.fc.toFixed(1) }}%
            </div>
          </div>
        </div>

        <div v-if="dashboardGoldenShots.length > 0" style="margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #d97706; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🏆</span> Złote strzały (Polecaj)
          </h3>
          <div v-for="item in dashboardGoldenShots" :key="item.id" class="item-card" style="border-left: 4px solid #d97706; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 14px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ item.name }}</div>
              <div style="font-size: 11px; color: #16a34a; font-weight: 700; margin-top: 2px;">FC w normie: {{ item.fc.toFixed(1) }}%</div>
            </div>
            <div style="text-align: right; margin-left: 8px;">
              <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Zysk</div>
              <div style="color: #d97706; font-weight: 800; font-size: 15px;">{{ item.zysk.toFixed(2) }} zł</div>
            </div>
          </div>
        </div>

        <div v-if="dashboardBestFC.length > 0" style="margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #16a34a; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🛡️</span> Największy bufor (Najniższy FC)
          </h3>
          <div v-for="item in dashboardBestFC" :key="item.id" class="item-card" style="border-left: 4px solid #16a34a; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 14px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ item.name }}</div>
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-top: 2px;">
                Cel: {{ item.target }}% | <span style="color: #16a34a; font-weight: 700;">-{{ item.deviation.toFixed(1) }}%</span> poniżej progu
              </div>
            </div>
            <div style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 14px; margin-left: 8px;">
              {{ item.fc.toFixed(1) }}%
            </div>
          </div>
        </div>

        <div v-if="dashboardCategoryHealth.length > 0" style="margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #3b82f6; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">📊</span> Kondycja kategorii
          </h3>
          <div v-for="cat in dashboardCategoryHealth" :key="cat.name" class="item-card" :style="{ borderLeft: cat.isExceeded ? '4px solid #dc2626' : '4px solid #16a34a', padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
            <div style="font-weight: 800; font-size: 14px; color: #111827;">{{ cat.name }}</div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600; text-align: right;">Cel:<br>{{ cat.target }}%</div>
              <div :style="{ background: cat.isExceeded ? '#fee2e2' : '#dcfce7', color: cat.isExceeded ? '#dc2626' : '#16a34a', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '14px', width: '45px', textAlign: 'center' }">
                {{ cat.avgFc }}%
              </div>
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
          <span style="font-size: 24px;">📊</span>
          <span style="font-size: 11px; font-weight: 700; color: #0284c7;">Analiza</span>
        </button>

        <button @click="recepturyView = 'ustawienia'" style="flex: 1; padding: 8px 4px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;">
          <span style="font-size: 24px; filter: grayscale(100%) opacity(0.5);">⚙️</span>
          <span style="font-size: 11px; font-weight: 600; color: #9ca3af;">Ustawienia</span>
        </button>

      </div>

    </div>
</template>

<script>
import { inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  setup() {
    // Odbieramy paczkę logiki z App.vue
    const appContext = inject('appContext')
    // Odpalamy Router
    const router = useRouter()
    
    // Wymuszamy widok po wejściu do pokoju
    onMounted(() => {
      if (appContext.currentScreen) {
        appContext.currentScreen.value = 'receptury'
      }
    })

    // Zwracamy wszystko do HTML-a
    return { ...appContext, router }
  }
}
</script>