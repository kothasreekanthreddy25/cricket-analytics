import { createClient } from '@sanity/client'
import { projectId, dataset, apiVersion } from '../env'

/** Token-bearing write client — server-only, never expose to browser */
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
})
