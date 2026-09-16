const trimTrailingSlash = value => String(value || '').trim().replace(/\/+$/, '')

export const resolvePublicAppBaseUrl = ({
  configuredUrl = import.meta.env?.VITE_PUBLIC_APP_URL,
  currentOrigin = globalThis.location?.origin
} = {}) => {
  const configured = trimTrailingSlash(configuredUrl)
  if (configured) return configured

  const origin = trimTrailingSlash(currentOrigin)
  if (!origin) {
    throw new Error('Nie udało się ustalić adresu aplikacji GastroManager.')
  }

  return origin
}

export const buildActivationUrl = ({ token, ...options } = {}) => {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) throw new Error('Brak tokenu zaproszenia.')

  const url = new URL('/aktywacja', `${resolvePublicAppBaseUrl(options)}/`)
  url.searchParams.set('t', normalizedToken)
  return url.toString()
}

export const buildAccountReturnUrl = options => {
  const url = new URL('/konto', `${resolvePublicAppBaseUrl(options)}/`)
  return url.toString()
}
