import { createClient, type SanityClient } from '@sanity/client'
import { dataset, apiVersion } from '../env'

/** Read-only client — lazy initialized to avoid build-time errors */
let _client: SanityClient | undefined

export const client = new Proxy({} as SanityClient, {
  get(_target, prop: string | symbol) {
    if (!_client) {
      const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
      _client = createClient({ projectId, dataset, apiVersion, useCdn: true })
    }
    return (_client as any)[prop as string]
  },
})
