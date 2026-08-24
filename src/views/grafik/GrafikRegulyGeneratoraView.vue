<template>
  <main class="screen-with-topbar generator-settings-screen">
    <div class="zamawiarka-menu-topbar">
      <button class="zamawiarka-menu-back" type="button" @click="goBack">←</button>
      <h2 class="zamawiarka-menu-title">REGUŁY GRAFIKU</h2>
    </div>

    <div class="scroll-area generator-settings-scroll">
      <section class="generator-settings-intro">
        <div class="generator-settings-step">GENERATOR GRAFIKU</div>
        <h1>Reguły układania grafiku</h1>
        <p>
          Wartości pochodzą z profilu przypisanego pracownikowi. Tutaj wybierasz,
          jak generator ma traktować każdą zasadę.
        </p>
      </section>

      <section class="generator-settings-mode-info">
        <div class="generator-settings-mode-line hard">
          <strong>Twarda zasada</strong>
          <span>Generator jej nie naruszy, nawet kosztem braku obsady.</span>
        </div>
        <div class="generator-settings-mode-line suggestion">
          <strong>Sugestia</strong>
          <span>Może zostać naruszona, jeśli wymaga tego pełna obsada.</span>
        </div>
        <div class="generator-settings-mode-line off">
          <strong>Wyłączona</strong>
          <span>Generator całkowicie pomija daną zasadę.</span>
        </div>
      </section>

      <div v-if="settingsStore.isLoading" class="generator-settings-state">
        Wczytywanie ustawień…
      </div>

      <template v-else>
        <section class="generator-main-switch" :class="{ disabled: !settings.useEmploymentProfiles }">
          <div>
            <strong>Uwzględniaj profile zatrudnienia</strong>
            <span>
              Po wyłączeniu generator pominie wszystkie ograniczenia zapisane
              w profilach pracowników.
            </span>
          </div>
          <button
            type="button"
            :class="{ enabled: settings.useEmploymentProfiles }"
            @click="toggleEmploymentProfiles"
          >
            {{ settings.useEmploymentProfiles ? 'Włączone' : 'Wyłączone' }}
          </button>
        </section>

        <section
          v-for="rule in rules"
          :key="rule.key"
          class="generator-rule-card"
          :class="[
            settings.profileRules[rule.key].mode,
            { disabled: !settings.useEmploymentProfiles }
          ]"
        >
          <div class="generator-rule-heading">
            <div>
              <h2>{{ rule.title }}</h2>
              <p>{{ rule.description }}</p>
            </div>
          </div>

          <div class="generator-mode-selector" role="group" :aria-label="`Tryb reguły: ${rule.title}`">
            <button
              v-for="mode in modes"
              :key="mode.value"
              class="generator-mode-button"
              :class="[
                mode.value,
                { selected: settings.profileRules[rule.key].mode === mode.value }
              ]"
              type="button"
              :disabled="!settings.useEmploymentProfiles"
              @click="setRuleMode(rule.key, mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>

          <div class="generator-rule-result">
            {{ getRuleModeDescription(settings.profileRules[rule.key].mode) }}
          </div>
        </section>

        <section class="generator-stars-card" :class="{ disabled: !settings.competenceStars.enabled }">
          <div class="generator-stars-heading">
            <div>
              <h2>Siła kompetencji — gwiazdki</h2>
              <p>
                Gwiazdki określają, jak chętnie generator powinien wybierać
                pracownika na dane stanowisko.
              </p>
            </div>
            <button
              type="button"
              :class="{ enabled: settings.competenceStars.enabled }"
              @click="toggleCompetenceStars"
            >
              {{ settings.competenceStars.enabled ? 'Uwzględniaj' : 'Ignoruj' }}
            </button>
          </div>

          <div v-if="settings.competenceStars.enabled" class="generator-stars-threshold">
            <div>
              <strong>Minimum dla generatora</strong>
              <span>Pracownicy poniżej progu pozostają dostępni tylko ręcznie.</span>
            </div>

            <div class="generator-number-control">
              <button type="button" aria-label="Zmniejsz próg gwiazdek" @click="changeStarsThreshold(-1)">−</button>
              <div>{{ settings.competenceStars.minimumAutomaticStars }}★</div>
              <button type="button" aria-label="Zwiększ próg gwiazdek" @click="changeStarsThreshold(1)">+</button>
            </div>
          </div>

          <div class="generator-stars-explanation">
            {{ starsExplanation }}
          </div>
        </section>

        <div v-if="hasChanges" class="generator-settings-unsaved">
          Masz niezapisane zmiany.
        </div>

        <button
          class="generator-settings-save"
          type="button"
          :disabled="settingsStore.isSaving || !hasChanges"
          @click="saveSettings"
        >
          {{ settingsStore.isSaving ? 'Zapisywanie…' : 'Zapisz ustawienia' }}
        </button>
      </template>
    </div>

    <div v-if="dialog.visible" class="app-dialog-overlay">
      <div class="app-dialog-card generator-settings-dialog" :class="dialog.type">
        <div class="app-dialog-icon">{{ dialog.type === 'success' ? '✓' : '!' }}</div>
        <div class="app-dialog-title">{{ dialog.title }}</div>
        <div class="app-dialog-message">{{ dialog.message }}</div>
        <div class="app-dialog-actions">
          <button class="app-dialog-button app-dialog-ok" type="button" @click="dialog.visible = false">OK</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  DEFAULT_GENERATOR_SETTINGS,
  useScheduleGeneratorSettingsStore
} from '../../stores/scheduleGeneratorSettingsStore.js'

const router = useRouter()
const settingsStore = useScheduleGeneratorSettingsStore()
const clone = value => JSON.parse(JSON.stringify(value))
const settings = reactive(clone(DEFAULT_GENERATOR_SETTINGS))
const savedSettingsSignature = ref('')
const hasChanges = ref(false)
const dialog = reactive({ visible: false, type: 'success', title: '', message: '' })

const modes = [
  { value: 'hard', label: 'Twarda zasada' },
  { value: 'suggestion', label: 'Sugestia' },
  { value: 'off', label: 'Wyłączona' }
]

const rules = [
  {
    key: 'targetHours',
    title: 'Docelowa liczba godzin',
    description: 'Uwzględnia cel godzin, wymiar pracownika, okres rozliczeniowy i dopuszczalne odchylenie.'
  },
  {
    key: 'maximumDailyHours',
    title: 'Maksymalna liczba godzin dziennie',
    description: 'Limit pobierany z profilu zatrudnienia konkretnego pracownika.'
  },
  {
    key: 'maximumWeeklyHours',
    title: 'Maksymalna liczba godzin tygodniowo',
    description: 'Generator kontroluje łączny tygodniowy czas pracy.'
  },
  {
    key: 'minimumRest',
    title: 'Przerwa między zmianami',
    description: 'Minimalny czas od zakończenia jednej zmiany do rozpoczęcia następnej.'
  },
  {
    key: 'minimumWeeklyRest',
    title: 'Odpoczynek tygodniowy',
    description: 'Minimalny nieprzerwany odpoczynek w każdym tygodniu.'
  },
  {
    key: 'maximumConsecutiveDays',
    title: 'Dni pracy z rzędu',
    description: 'Maksymalna liczba kolejnych dni pracy określona w profilu.'
  },
  {
    key: 'weekendRotation',
    title: 'Rotacja sobót i niedziel',
    description: 'Soboty i niedziele są sprawdzane osobno według wartości zapisanych w profilu.'
  },
  {
    key: 'breaks',
    title: 'Przerwy w trakcie pracy',
    description: 'Reguła przygotowana również dla przyszłego rejestratora czasu pracy.'
  }
]

const starsExplanation = computed(() => {
  if (!settings.competenceStars.enabled) {
    return 'Generator traktuje pracowników mających od 1★ do 5★ jednakowo.'
  }

  const threshold = settings.competenceStars.minimumAutomaticStars
  if (threshold === 1) {
    return 'Generator może użyć pracowników od 1★ do 5★ i nadal preferuje większą liczbę gwiazdek.'
  }

  const manualRange = threshold === 2 ? '1★' : `1–${threshold - 1}★`
  return `${manualRange}: tylko wybór ręczny managera. ${threshold}–5★: kandydaci generatora; więcej gwiazdek oznacza wyższy priorytet.`
})

const getSettingsSignature = value => JSON.stringify(value)

const copySettings = source => {
  Object.keys(settings).forEach(key => delete settings[key])
  Object.assign(settings, clone(source))
}

const updateChangedState = () => {
  hasChanges.value =
    !settingsStore.hasStoredSettings ||
    getSettingsSignature(settings) !== savedSettingsSignature.value
}

const setRuleMode = (ruleKey, mode) => {
  settings.profileRules[ruleKey].mode = mode
  updateChangedState()
}

const toggleEmploymentProfiles = () => {
  settings.useEmploymentProfiles = !settings.useEmploymentProfiles
  updateChangedState()
}

const toggleCompetenceStars = () => {
  settings.competenceStars.enabled = !settings.competenceStars.enabled
  updateChangedState()
}

const changeStarsThreshold = difference => {
  const nextValue = Number(settings.competenceStars.minimumAutomaticStars) + difference
  settings.competenceStars.minimumAutomaticStars = Math.min(5, Math.max(1, nextValue))
  updateChangedState()
}

const getRuleModeDescription = mode => {
  if (mode === 'hard') return 'Generator automatyczny nie naruszy tej reguły.'
  if (mode === 'suggestion') return 'Generator spróbuje jej przestrzegać, ale priorytetem pozostanie obsada.'
  return 'Reguła jest wyłączona i nie wpłynie na grafik.'
}

const showDialog = (type, title, message) => {
  dialog.type = type
  dialog.title = title
  dialog.message = message
  dialog.visible = true
}

const loadSettings = async () => {
  try {
    const loadedSettings = await settingsStore.fetchSettings(true)
    copySettings(loadedSettings)
    savedSettingsSignature.value = getSettingsSignature(settings)
    updateChangedState()
  } catch (error) {
    showDialog('error', 'Nie udało się wczytać ustawień', error?.message || 'Spróbuj ponownie za chwilę.')
  }
}

const saveSettings = async () => {
  try {
    const savedSettings = await settingsStore.saveSettings(settings)
    copySettings(savedSettings)
    savedSettingsSignature.value = getSettingsSignature(settings)
    hasChanges.value = false
    showDialog('success', 'Ustawienia zapisane', 'Generator użyje tych reguł podczas tworzenia kolejnych grafików.')
  } catch (error) {
    showDialog('error', 'Nie udało się zapisać ustawień', error?.message || 'Sprawdź połączenie i spróbuj ponownie.')
  }
}

const goBack = () => {
  setTimeout(() => router.push('/grafik/ustawienia'), 40)
}

onMounted(loadSettings)
</script>

<style scoped>
.generator-settings-screen { width: 100%; }
.generator-settings-scroll { width: 100%; max-width: 760px; margin: 0 auto; box-sizing: border-box; }
.generator-settings-intro { padding: 5px 2px 14px; }
.generator-settings-step { margin-bottom: 6px; color: #f97316; font-size: 12px; font-weight: 900; letter-spacing: .08em; }
.generator-settings-intro h1 { margin: 0 0 8px; color: #111827; font-size: 23px; line-height: 1.2; }
.generator-settings-intro p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; }
.generator-settings-mode-info {
  margin-bottom: 13px;
  padding: 13px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .05);
}
.generator-settings-mode-line { display: grid; grid-template-columns: 118px 1fr; gap: 8px; padding: 6px 0; color: #64748b; font-size: 12px; line-height: 1.4; }
.generator-settings-mode-line strong { color: #334155; }
.generator-settings-mode-line.hard strong { color: #b91c1c; }
.generator-settings-mode-line.suggestion strong { color: #9a7200; }
.generator-settings-state { padding: 30px 16px; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; color: #64748b; font-size: 14px; font-weight: 700; text-align: center; }
.generator-main-switch,
.generator-stars-card {
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid #c4b5fd;
  border-left: 5px solid #7c3aed;
  border-radius: 19px;
  background: #faf5ff;
  box-shadow: 0 8px 26px rgba(15, 23, 42, .055);
}
.generator-main-switch { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.generator-main-switch strong,
.generator-main-switch span { display: block; }
.generator-main-switch strong { color: #1f2937; font-size: 15px; }
.generator-main-switch span { margin-top: 4px; color: #64748b; font-size: 11px; line-height: 1.4; }
.generator-main-switch > button,
.generator-stars-heading > button {
  flex-shrink: 0;
  min-width: 92px;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 11px;
  background: #fff;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}
.generator-main-switch > button.enabled,
.generator-stars-heading > button.enabled { border-color: #86efac; background: #dcfce7; color: #15803d; }
.generator-main-switch.disabled { border-color: #e2e8f0; border-left-color: #94a3b8; background: #f8fafc; }
.generator-rule-card {
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-left: 5px solid #94a3b8;
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 26px rgba(15, 23, 42, .055);
}
.generator-rule-card.hard { border-left-color: #ef4444; }
.generator-rule-card.suggestion { border-left-color: #c9a227; }
.generator-rule-card.disabled { opacity: .55; }
.generator-rule-heading h2,
.generator-stars-heading h2 { margin: 0 0 5px; color: #111827; font-size: 17px; line-height: 1.25; }
.generator-rule-heading p,
.generator-stars-heading p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.45; }
.generator-mode-selector { margin-top: 14px; padding: 3px; display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 3px; border-radius: 13px; background: #f1f5f9; }
.generator-mode-button { min-width: 0; min-height: 37px; padding: 7px 5px; border: none; border-radius: 10px; background: transparent; color: #64748b; font-size: 11px; font-weight: 800; }
.generator-mode-button.selected { background: #fff; color: #334155; box-shadow: 0 2px 8px rgba(15, 23, 42, .12); }
.generator-mode-button.hard.selected { background: #fee2e2; color: #991b1b; }
.generator-mode-button.suggestion.selected { background: #f4e7a8; color: #765800; }
.generator-rule-result { margin-top: 10px; color: #64748b; font-size: 11px; font-weight: 700; line-height: 1.4; }
.generator-stars-card { border-color: #bfdbfe; border-left-color: #2563eb; background: #f8fbff; }
.generator-stars-card.disabled { border-color: #e2e8f0; border-left-color: #94a3b8; background: #f8fafc; }
.generator-stars-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.generator-stars-threshold {
  margin-top: 14px;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 13px;
  background: #fff;
}
.generator-stars-threshold strong,
.generator-stars-threshold span { display: block; }
.generator-stars-threshold strong { color: #334155; font-size: 13px; }
.generator-stars-threshold span { margin-top: 2px; color: #94a3b8; font-size: 10px; font-weight: 650; }
.generator-number-control { flex-shrink: 0; display: flex; align-items: center; overflow: hidden; border: 1px solid #dbe4ef; border-radius: 12px; background: #fff; }
.generator-number-control button { width: 38px; height: 38px; border: none; background: #f8fafc; color: #007aff; font-size: 22px; }
.generator-number-control div { width: 48px; height: 38px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; color: #111827; font-size: 16px; font-weight: 850; }
.generator-stars-explanation { margin-top: 10px; padding: 10px 11px; border-radius: 11px; background: #eff6ff; color: #1e40af; font-size: 11px; font-weight: 700; line-height: 1.45; }
.generator-stars-card.disabled .generator-stars-explanation { background: #f1f5f9; color: #64748b; }
.generator-settings-unsaved { margin: 4px 0 9px; color: #b45309; font-size: 12px; font-weight: 750; text-align: center; }
.generator-settings-save { width: 100%; min-height: 51px; border: none; border-radius: 16px; background: #007aff; color: #fff; font-size: 16px; font-weight: 850; }
.generator-settings-save:disabled { background: #cbd5e1; }
.generator-settings-dialog .app-dialog-icon { background: #e8f8ee; color: #16a34a; font-weight: 900; }
.generator-settings-dialog.error .app-dialog-icon { background: #fee2e2; color: #dc2626; }

@media (max-width: 520px) {
  .generator-settings-mode-line { grid-template-columns: 1fr; gap: 2px; }
  .generator-main-switch,
  .generator-stars-heading,
  .generator-stars-threshold { align-items: stretch; flex-direction: column; }
  .generator-main-switch > button,
  .generator-stars-heading > button { width: 100%; }
  .generator-number-control { align-self: flex-start; }
}
</style>
