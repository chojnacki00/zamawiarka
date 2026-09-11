export const runDeviceRemovalReaction = async ({
  finishLoading,
  cancelAndClearBusinessData,
  stopAccountListeners,
  clearLocalPin,
  clearApprovedDevice,
  clearLocalSession,
  signOutFirebase
} = {}) => {
  finishLoading?.()
  cancelAndClearBusinessData?.()
  stopAccountListeners?.()
  clearLocalPin?.()
  clearApprovedDevice?.()
  clearLocalSession?.()
  await signOutFirebase?.()
}
