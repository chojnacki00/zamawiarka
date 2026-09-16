import { loadAndValidateFirebaseTestConfig } from './firebaseTestConfig.mjs'

try {
  const config = await loadAndValidateFirebaseTestConfig()
  console.log(
    `Konfiguracja projektu testowego jest poprawna: ${config.projectId}.`
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
