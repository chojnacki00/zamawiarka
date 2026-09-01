<template>
  <main class="account-screen">
    <section class="account-card">
      <button class="back-button" type="button" @click="router.push('/login')">←</button>
      <h1>Aktywuj konto</h1>
      <p>Aby aktywować konto, otwórz unikatowy link lub zeskanuj kod QR otrzymany od managera.</p>
      <button class="primary-button" type="button" @click="router.push('/login')">Wróć do logowania</button>
    </section>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.account-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.account-card { position: relative; display: grid; width: min(420px, 100%); box-sizing: border-box; gap: 15px; padding: 28px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15,23,42,.1); }
.account-card h1 { margin: 0; color: #111827; font-size: 25px; }
.account-card > p { margin: -6px 0 4px; color: #64748b; font-size: 14px; line-height: 1.5; }
.back-button { justify-self: start; padding: 4px 8px; border: 0; color: #007aff; background: transparent; font-size: 23px; }
.primary-button { min-height: 50px; border: 0; border-radius: 13px; color: #fff; background: #007aff; font-size: 16px; font-weight: 800; }
.primary-button:active { transform: scale(.97); }
</style>
