'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { getClientSideURL } from '@/utilities/getURL'

export async function updateProfile(data: { name: string }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    return { success: false, error: 'Not authenticated' }
  }

  const meRes = await fetch(`${getClientSideURL()}/api/users/me`, {
    headers: { Authorization: `JWT ${token}` },
  })

  if (!meRes.ok) {
    return { success: false, error: 'Not authenticated' }
  }

  const { user } = await meRes.json()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const payload = await getPayload({ config })

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { name: data.name },
      overrideAccess: false,
      user,
    })
  } catch {
    return { success: false, error: 'Failed to update profile.' }
  }

  return { success: true }
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    return { success: false, error: 'Not authenticated' }
  }

  const meRes = await fetch(`${getClientSideURL()}/api/users/me`, {
    headers: { Authorization: `JWT ${token}` },
  })

  if (!meRes.ok) {
    return { success: false, error: 'Not authenticated' }
  }

  const { user } = await meRes.json()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify the current password by attempting to log in
  const loginRes = await fetch(`${getClientSideURL()}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: data.currentPassword }),
  })

  if (!loginRes.ok) {
    return { success: false, error: 'Current password is incorrect.' }
  }

  if (data.newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' }
  }

  const payload = await getPayload({ config })

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { password: data.newPassword },
      overrideAccess: false,
      user,
    })
  } catch {
    return { success: false, error: 'Failed to update password.' }
  }

  return { success: true }
}
