import { createClient, type SanityClient } from '@sanity/client'
import { dataset, apiVersion } from '../env'

/** Token-bearing write client — server-only, lazy initialized to avoid build-time errors */
let _writeClient: SanityClient | undefined

export const writeClient = new Proxy({} as SanityClient, {
  get(_target, prop: string | symbol) {
    if (!_writeClient) {
      const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
      _writeClient = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env.SANITY_API_WRITE_TOKEN,
      })
    }
    return (_writeClient as any)[prop as string]
  },
})
