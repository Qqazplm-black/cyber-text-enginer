import { useCallback, useEffect, useState } from 'react'
import { parseShareFromHash } from '../storage/share'
import type { ShareBundle } from '../storage/types'

export type AppRoute =
  | { name: 'home' }
  | { name: 'play'; bundle: ShareBundle }
  | { name: 'continue'; gameId: string }

function parseRoute(hash: string): AppRoute {
  if (!hash || hash === '#' || hash === '#/') {
    return { name: 'home' }
  }
  const continueMatch = hash.match(/^#\/continue\/(.+)$/)
  if (continueMatch) {
    return { name: 'continue', gameId: continueMatch[1] }
  }
  const bundle = parseShareFromHash(hash)
  if (bundle) {
    return { name: 'play', bundle }
  }
  return { name: 'home' }
}

export function useHashRoute() {
  const [route, setRouteState] = useState<AppRoute>(() =>
    parseRoute(window.location.hash),
  )

  const navigate = useCallback((hash: string) => {
    if (window.location.hash !== hash) {
      window.location.hash = hash
    } else {
      setRouteState(parseRoute(hash))
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => setRouteState(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return { route, navigate }
}
