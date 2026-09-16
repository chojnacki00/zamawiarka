export const shouldUseFirebaseEmulators = (environment = {}) => (
  environment?.DEV === true &&
  environment?.VITE_USE_FIREBASE_EMULATORS === 'true'
)
