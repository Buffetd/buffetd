import type { Metadata } from 'next'

import { getMeUser } from '@/utilities/getMeUser'
import ProfilePageClient from './page.client'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function ProfilePage() {
  const { user } = await getMeUser({
    nullUserRedirect: '/admin/login?redirect=%2Fprofile',
  })

  return <ProfilePageClient user={user} />
}
