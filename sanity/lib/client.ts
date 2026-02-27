import { createClient } from '@sanity/client'
import { projectId, dataset, apiVersion } from '../env'

/** Read-only client — safe for browser & server components */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})
