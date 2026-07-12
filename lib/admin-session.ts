import { cookies } from 'next/headers'

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'crickettips2026'

/** Shared check for the cookie-based admin session set by
 * /api/admin/login — same session used by app/admin/leads and
 * app/admin/subscriptions. Distinct from the better-auth requireRole(['ADMIN'])
 * pattern used under app/dashboard/admin, which needs a DB user with role
 * ADMIN and currently has no way to log in. */
export function hasAdminSession(): boolean {
  const session = cookies().get('ct_admin_session')
  return !!session && session.value === ADMIN_PASS
}
