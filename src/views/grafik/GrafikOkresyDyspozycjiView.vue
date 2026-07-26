<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik/dyspozycyjnosc')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        OKRESY DYSPOZYCJI
      </h2>
    </div>

    <div class="scroll-area">
      <div class="empty-state">
        <div class="empty-title">
          Okresy dyspozycji
        </div>

        <div class="empty-subtitle">
          Tutaj manager będzie tworzył okresy zbierania dyspozycyjności.
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>