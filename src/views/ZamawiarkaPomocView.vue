<template>
  <Transition name="screen-soft" appear>
    <div class="screen-with-topbar">
      <div class="towary-topbar">
        <div class="towary-topbar-row">
          <div class="towary-topbar-left">
            <button @click="$emit('close')" class="towary-icon-button" title="Wróć">←</button>
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
</template>

<script setup>
import { ref, onMounted } from 'vue'

const helpTexts = [
  [ "Jeśli sam sobie nie pomożesz", "to nikt Ci nie pomoże :-)" ],
  [ "Teraz to pomocy pomocy!!!", "A czy Ty pomagasz innym?😄" ],
  [ "Wyglądasz mi na Geniusza", "wiec sobie poradzisz😉" ],
  [ "No weź przestań, ", "nie udawaj że nie wiesz😄" ],
  [ "Oj tam oj tam....", "spróbuj jeszcze raz 😄" ],
  [ "No weź przestań, ", "nie udawaj że nie wiesz😄" ],
  [ "Nie bój się prosić o pomoc", "Napisz do mnie na priv 😄" ],
  [ "Nie chce Cie martwić, ale  ", "tylko Ty pomocy potrzebujesz 😄" ]
]

const helpLine1 = ref('')
const helpLine2 = ref('')

const generateHelpText = () => {
  const random = helpTexts[Math.floor(Math.random() * helpTexts.length)]
  helpLine1.value = random[0]
  helpLine2.value = random[1]
}

// Gdy okno pomocy się otwiera, automatycznie losujemy tekst
onMounted(() => {
  generateHelpText()
})
</script>

<style scoped>
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
</style>