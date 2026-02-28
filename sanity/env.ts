// projectId is not a secret — it's visible in every Sanity API request
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '5xxnqbdd'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const apiVersion = '2024-01-01'
