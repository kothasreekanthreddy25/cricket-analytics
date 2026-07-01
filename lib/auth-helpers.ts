import { getSession } from './session'

export async function getCurrentUser() {
  try {
    return await getSession()
  } catch {
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) throw new Error('Forbidden')
  return user
}
