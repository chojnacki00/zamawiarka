export const DEVICE_ACCESS_REMOVED_HEADING =
  'Dostęp urządzenia usunięty'

export const DEVICE_ACCESS_REMOVED_MESSAGE =
  'Dostęp do aplikacji na tym urządzeniu został usunięty. Aby ponownie korzystać z aplikacji, poproś managera o nowe zaproszenie.'

export const runDeviceRemovalReaction = async ({
  markAccessRemoved,
  finishLoading,
  cancelAndClearBusinessData,
  stopAccountListeners,
  clearLocalPin,
  clearApprovedDevice,
  clearLocalSession,
  signOutFirebase
} = {}) => {
  markAccessRemoved?.()
  finishLoading?.()
  cancelAndClearBusinessData?.()
  stopAccountListeners?.()
  clearLocalPin?.()
  clearApprovedDevice?.()
  clearLocalSession?.()
  await signOutFirebase?.()
}
