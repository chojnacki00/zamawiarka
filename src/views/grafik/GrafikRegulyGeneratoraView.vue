<template>
  <main class="screen-with-topbar generator-settings-screen">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        @click="goBack"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        REGUŁY GRAFIKU
      </h2>
    </div>

    <div class="scroll-area generator-settings-scroll">
      <section class="generator-settings-intro">
        <div class="generator-settings-step">
          GENERATOR GRAFIKU
        </div>

        <h1>Reguły układania grafiku</h1>

        <p>
          Ustal, których zasad generator musi przestrzegać,
          których powinien unikać, a które ma całkowicie pominąć.
        </p>
      </section>

      <section class="generator-settings-mode-info">
        <div class="generator-settings-mode-line hard">
          <strong>Twarda zasada</strong>
          <span>Nie zostanie naruszona, nawet kosztem braku obsady.</span>
        </div>

        <div class="generator-settings-mode-line suggestion">
          <strong>Sugestia</strong>
          <span>Może zostać naruszona, jeśli wymaga tego pełna obsada.</span>
        </div>

        <div class="generator-settings-mode-line off">
          <strong>Wyłączona</strong>
          <span>Generator nie bierze tej reguły pod uwagę.</span>
        </div>
      </section>

      <div
        v-if="settingsStore.isLoading"
        class="generator-settings-state"
      >
        Wczytywanie ustawień…
      </div>

      <template v-else>
        <section
          v-for="rule in rules"
          :key="rule.key"
          class="generator-rule-card"
          :class="settings[rule.key].mode"
        >
          <div class="generator-rule-heading">
            <div>
              <h2>{{ rule.title }}</h2>
              <p>{{ rule.description }}</p>
            </div>

            <div
              class="generator-rule-value-badge"
              :class="{ disabled: settings[rule.key].mode === 'off' }"
            >
              {{ getRuleValueLabel(rule) }}
            </div>
          </div>

          <div
            class="generator-mode-selector"
            role="group"
            :aria-label="`Tryb reguły: ${rule.title}`"
          >
            <button
              v-for="mode in modes"
              :key="mode.value"
              class="generator-mode-button"
              :class="[
                mode.value,
                {
                  selected:
                    settings[rule.key].mode === mode.value
                }
              ]"
              type="button"
              @click="setRuleMode(rule.key, mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>

          <div
            class="generator-rule-value-row"
            :class="{ disabled: settings[rule.key].mode === 'off' }"
          >
            <div>
              <strong>{{ rule.valueTitle }}</strong>
              <span>{{ rule.valueHint }}</span>
            </div>

            <div class="generator-number-control">
              <button
                type="button"
                :disabled="settings[rule.key].mode === 'off'"
                :aria-label="`Zmniejsz: ${rule.title}`"
                @click="changeRuleValue(rule, -1)"
              >
                −
              </button>

              <input
                v-model.number="settings[rule.key][rule.valueKey]"
                type="number"
                inputmode="numeric"
                :min="rule.minimum"
                :max="rule.maximum"
                :disabled="settings[rule.key].mode === 'off'"
                :aria-label="rule.valueTitle"
                @input="markAsChanged"
                @blur="normalizeRuleValue(rule)"
              >

              <button
                type="button"
                :disabled="settings[rule.key].mode === 'off'"
                :aria-label="`Zwiększ: ${rule.title}`"
                @click="changeRuleValue(rule, 1)"
              >
                +
              </button>
            </div>
          </div>

          <div
            v-if="rule.key === 'weekendRotation'"
            class="generator-weekend-example"
          >
            Przy wartości 1 przepracowana sobota uruchamia regułę
            dla następnej soboty, a przepracowana niedziela — tylko
            dla następnej niedzieli.
          </div>

          <div class="generator-rule-result">
            {{ getRuleModeDescription(settings[rule.key].mode) }}
          </div>
        </section>

        <div
          v-if="hasChanges"
          class="generator-settings-unsaved"
        >
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

    <div
      v-if="dialog.visible"
      class="app-dialog-overlay"
    >
      <div
        class="app-dialog-card generator-settings-dialog"
        :class="dialog.type"
      >
        <div class="app-dialog-icon">
          {{ dialog.type === 'success' ? '✓' : '!' }}
        </div>

        <div class="app-dialog-title">
          {{ dialog.title }}
        </div>

        <div class="app-dialog-message">
          {{ dialog.message }}
        </div>

        <div class="app-dialog-actions">
          <button
            class="app-dialog-button app-dialog-ok"
            type="button"
            @click="closeDialog"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useScheduleGeneratorSettingsStore } from '../../stores/scheduleGeneratorSettingsStore.js'

const router = useRouter()
const settingsStore = useScheduleGeneratorSettingsStore()

const settings = reactive({
  minimumRest: {
    mode: 'suggestion',
    hours: 11
  },
  maximumConsecutiveDays: {
    mode: 'suggestion',
    days: 5
  },
  weekendRotation: {
    mode: 'suggestion',
    consecutiveWeeks: 1
  }
})

const savedSettingsSignature = ref('')
const hasChanges = ref(false)

const dialog = reactive({
  visible: false,
  type: 'success',
  title: '',
  message: ''
})

const modes = [
  {
    value: 'hard',
    label: 'Twarda zasada'
  },
  {
    value: 'suggestion',
    label: 'Sugestia'
  },
  {
    value: 'off',
    label: 'Wyłączona'
  }
]

const rules = [
  {
    key: 'minimumRest',
    title: 'Przerwa między zmianami',
    description:
      'Minimalny czas od zakończenia jednej zmiany do rozpoczęcia następnej.',
    valueKey: 'hours',
    valueTitle: 'Minimalna przerwa',
    valueHint: 'Liczba pełnych godzin',
    minimum: 1,
    maximum: 48
  },
  {
    key: 'maximumConsecutiveDays',
    title: 'Dni pracy z rzędu',
    description:
      'Maksymalna liczba kolejnych dni, w których pracownik może otrzymać zmianę.',
    valueKey: 'days',
    valueTitle: 'Maksymalnie',
    valueHint: 'Liczba kolejnych dni pracy',
    minimum: 1,
    maximum: 31
  },
  {
    key: 'weekendRotation',
    title: 'Rotacja weekendów',
    description:
      'Soboty i niedziele są liczone osobno. Przepracowana sobota wpływa na kolejną sobotę, a niedziela na kolejną niedzielę.',
    valueKey: 'consecutiveWeeks',
    valueTitle: 'Maksymalnie',
    valueHint: 'Kolejne soboty lub niedziele',
    minimum: 1,
    maximum: 12
  }
]

const getSettingsSignature = value => {
  return JSON.stringify(value)
}

const copySettings = source => {
  Object.keys(settings).forEach(key => {
    settings[key].mode = source[key].mode

    const rule = rules.find(item => item.key === key)
    settings[key][rule.valueKey] = source[key][rule.valueKey]
  })
}

const updateChangedState = () => {
  hasChanges.value =
    !settingsStore.hasStoredSettings ||
    getSettingsSignature(settings) !== savedSettingsSignature.value
}

const markAsChanged = () => {
  updateChangedState()
}

const setRuleMode = (ruleKey, mode) => {
  settings[ruleKey].mode = mode
  updateChangedState()
}

const normalizeRuleValue = rule => {
  const rawValue = Math.trunc(
    Number(settings[rule.key][rule.valueKey])
  )
  const normalizedValue = Number.isFinite(rawValue)
    ? Math.min(
      rule.maximum,
      Math.max(rule.minimum, rawValue)
    )
    : rule.minimum

  settings[rule.key][rule.valueKey] = normalizedValue
  updateChangedState()
}

const changeRuleValue = (rule, difference) => {
  settings[rule.key][rule.valueKey] =
    Number(settings[rule.key][rule.valueKey]) + difference

  normalizeRuleValue(rule)
}

const getRuleModeDescription = mode => {
  if (mode === 'hard') {
    return 'Generator nie naruszy tej reguły.'
  }

  if (mode === 'suggestion') {
    return 'Generator spróbuje jej przestrzegać, ale priorytetem pozostanie obsada.'
  }

  return 'Reguła jest wyłączona i nie wpłynie na grafik.'
}

const getRuleValueLabel = rule => {
  const value = Number(
    settings[rule.key][rule.valueKey]
  )

  if (rule.valueKey === 'hours') {
    return `${value} godz.`
  }

  if (rule.valueKey === 'consecutiveWeeks') {
    return `${value} z rzędu`
  }

  return value === 1
    ? '1 dzień'
    : `${value} dni`
}

const showDialog = (type, title, message) => {
  dialog.type = type
  dialog.title = title
  dialog.message = message
  dialog.visible = true
}

const closeDialog = () => {
  dialog.visible = false
}

const loadSettings = async () => {
  try {
    const loadedSettings = await settingsStore.fetchSettings(true)
    copySettings(loadedSettings)
    savedSettingsSignature.value = getSettingsSignature(settings)
    updateChangedState()
  } catch (error) {
    showDialog(
      'error',
      'Nie udało się wczytać ustawień',
      error?.message || 'Spróbuj ponownie za chwilę.'
    )
  }
}

const saveSettings = async () => {
  rules.forEach(normalizeRuleValue)

  try {
    const savedSettings = await settingsStore.saveSettings(settings)
    copySettings(savedSettings)
    savedSettingsSignature.value = getSettingsSignature(settings)
    hasChanges.value = false

    showDialog(
      'success',
      'Ustawienia zapisane',
      'Generator użyje tych reguł podczas tworzenia kolejnych grafików.'
    )
  } catch (error) {
    showDialog(
      'error',
      'Nie udało się zapisać ustawień',
      error?.message || 'Sprawdź połączenie i spróbuj ponownie.'
    )
  }
}

const goBack = () => {
  setTimeout(() => {
    router.push('/grafik/ustawienia')
  }, 40)
}

onMounted(loadSettings)
</script>

<style scoped>
.generator-settings-screen {
  width: 100%;
}

.generator-settings-scroll {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  box-sizing: border-box;
}

.generator-settings-intro {
  padding: 5px 2px 14px;
}

.generator-settings-step {
  margin-bottom: 6px;
  color: #f97316;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.generator-settings-intro h1 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 23px;
  line-height: 1.2;
}

.generator-settings-intro p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.generator-settings-mode-info {
  margin-bottom: 13px;
  padding: 13px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.generator-settings-mode-line {
  display: grid;
  grid-template-columns: 118px 1fr;
  gap: 8px;
  padding: 6px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.generator-settings-mode-line strong {
  color: #334155;
}

.generator-settings-mode-line.hard strong {
  color: #b91c1c;
}

.generator-settings-mode-line.suggestion strong {
  color: #9a7200;
}

.generator-settings-state {
  padding: 30px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.generator-rule-card {
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-left: 5px solid #94a3b8;
  border-radius: 19px;
  background: #ffffff;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.055);
}

.generator-rule-card.hard {
  border-left-color: #ef4444;
}

.generator-rule-card.suggestion {
  border-left-color: #c9a227;
}

.generator-rule-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.generator-rule-heading h2 {
  margin: 0 0 5px;
  color: #111827;
  font-size: 17px;
  line-height: 1.25;
}

.generator-rule-heading p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.generator-rule-value-badge {
  flex-shrink: 0;
  min-width: 54px;
  padding: 7px 8px;
  border-radius: 11px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 850;
  text-align: center;
}

.generator-rule-value-badge.disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.generator-mode-selector {
  margin-top: 14px;
  padding: 3px;
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr;
  gap: 3px;
  border-radius: 13px;
  background: #f1f5f9;
}

.generator-mode-button {
  min-width: 0;
  min-height: 37px;
  padding: 7px 5px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.generator-mode-button.selected {
  background: #ffffff;
  color: #334155;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}

.generator-mode-button.hard.selected {
  background: #fee2e2;
  color: #991b1b;
}

.generator-mode-button.suggestion.selected {
  background: #f4e7a8;
  color: #765800;
}

.generator-mode-button:active {
  transform: scale(0.97);
}

.generator-rule-value-row {
  margin-top: 12px;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 13px;
  background: #f8fafc;
}

.generator-rule-value-row > div:first-child {
  min-width: 0;
}

.generator-rule-value-row strong,
.generator-rule-value-row span {
  display: block;
}

.generator-rule-value-row strong {
  color: #334155;
  font-size: 13px;
}

.generator-rule-value-row span {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 650;
}

.generator-rule-value-row.disabled {
  opacity: 0.55;
}

.generator-number-control {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #ffffff;
}

.generator-number-control button {
  width: 38px;
  height: 38px;
  border: none;
  background: #f8fafc;
  color: #007aff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.generator-number-control button:disabled {
  color: #94a3b8;
  cursor: default;
}

.generator-number-control input {
  width: 46px;
  height: 38px;
  box-sizing: border-box;
  border: none;
  border-right: 1px solid #e2e8f0;
  border-left: 1px solid #e2e8f0;
  outline: none;
  background: #ffffff;
  color: #111827;
  font-size: 16px;
  font-weight: 850;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.generator-number-control input::-webkit-inner-spin-button,
.generator-number-control input::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.generator-rule-result {
  margin-top: 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.generator-weekend-example {
  margin-top: 10px;
  padding: 9px 10px;
  border: 1px solid #e4ce72;
  border-radius: 11px;
  background: #fbf4d4;
  color: #765800;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.45;
}

.generator-settings-unsaved {
  margin: 4px 0 9px;
  color: #b45309;
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}

.generator-settings-save {
  width: 100%;
  min-height: 51px;
  border: none;
  border-radius: 16px;
  background: #007aff;
  color: #ffffff;
  font-size: 16px;
  font-weight: 850;
  cursor: pointer;
}

.generator-settings-save:disabled {
  background: #cbd5e1;
  cursor: default;
}

.generator-settings-save:active:not(:disabled) {
  transform: scale(0.985);
}

.generator-settings-dialog .app-dialog-icon {
  background: #e8f8ee;
  color: #16a34a;
  font-weight: 900;
}

.generator-settings-dialog.error .app-dialog-icon {
  background: #fee2e2;
  color: #dc2626;
}

@media (max-width: 520px) {
  .generator-settings-mode-line {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .generator-rule-heading {
    gap: 9px;
  }

  .generator-rule-value-row {
    padding: 10px;
  }

  .generator-number-control button {
    width: 35px;
  }

  .generator-number-control input {
    width: 43px;
  }
}
</style>
