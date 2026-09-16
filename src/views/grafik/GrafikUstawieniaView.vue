<template>
  <main class="screen-with-topbar schedule-settings-screen">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        @click="goBack"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        USTAWIENIA GRAFIKU
      </h2>
    </div>

    <div class="scroll-area schedule-settings-scroll">
      <section class="schedule-settings-intro">
        <div class="schedule-settings-step">
          KONFIGURACJA
        </div>

        <h1>Ustawienia</h1>

        <p>
          Wybierz obszar grafiku, który chcesz skonfigurować.
        </p>
      </section>

      <section class="schedule-settings-list">
        <button
          class="schedule-settings-row"
          type="button"
          @click="goToRules"
        >
          <span class="schedule-settings-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
          </span>

          <span class="schedule-settings-copy">
            <strong>Reguły grafiku</strong>
            <small>
              Przerwy między zmianami, dni pracy i rotacja weekendów
            </small>
          </span>

          <span
            class="schedule-settings-arrow"
            aria-hidden="true"
          >
            ›
          </span>
        </button>

      </section>
    </div>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  setTimeout(() => {
    router.push('/grafik')
  }, 40)
}

const goToRules = () => {
  setTimeout(() => {
    router.push('/grafik/ustawienia/reguly')
  }, 40)
}

</script>

<style scoped>
.schedule-settings-screen {
  width: 100%;
}

.schedule-settings-scroll {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  box-sizing: border-box;
}

.schedule-settings-intro {
  padding: 5px 2px 16px;
}

.schedule-settings-step {
  margin-bottom: 6px;
  color: #f97316;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.schedule-settings-intro h1 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 23px;
  line-height: 1.2;
}

.schedule-settings-intro p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.schedule-settings-list {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.schedule-settings-row {
  width: 100%;
  min-height: 78px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 13px;
  border: none;
  background: #ffffff;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.schedule-settings-row:active {
  background: #f8fafc;
  transform: scale(0.993);
}

.schedule-settings-row + .schedule-settings-row {
  border-top: 1px solid #e2e8f0;
}

.schedule-settings-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: #d6a928;
  color: #ffffff;
}

.schedule-settings-icon svg {
  width: 25px;
  height: 25px;
}

.schedule-settings-copy {
  min-width: 0;
  flex: 1;
}

.schedule-settings-copy strong,
.schedule-settings-copy small {
  display: block;
}

.schedule-settings-copy strong {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 850;
}

.schedule-settings-copy small {
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}

.schedule-settings-arrow {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 29px;
  font-weight: 400;
  line-height: 1;
}

.schedule-settings-future {
  margin-top: 13px;
  padding: 0 8px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  text-align: center;
}
</style>
