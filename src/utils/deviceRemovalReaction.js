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

export const createDeviceRemovalCoordinator = () => {
  let pendingOperation = null

  return {
    run(operation) {
      if (pendingOperation) return pendingOperation

      const currentOperation = Promise.resolve().then(operation)
      pendingOperation = currentOperation
      return currentOperation.finally(() => {
        if (pendingOperation === currentOperation) pendingOperation = null
      })
    }
  }
}
