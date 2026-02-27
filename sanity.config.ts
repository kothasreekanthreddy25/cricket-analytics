import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'
import { projectId, dataset } from './sanity/env'

export default defineConfig({
  name: 'cricket-analytics-blog',
  title: 'Cricket Analytics Blog',
  projectId,
  dataset,
  basePath: '/studio',
  plugins: [structureTool()],
  schema: { types: schemaTypes },
})
