'use client'

import React, { useState, useTransition } from 'react'

import type { User } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile, changePassword } from '@/actions/profile'

export default function ProfilePageClient({ user }: { user: User }) {
  const [name, setName] = useState(user.name ?? '')
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPendingProfile, startProfileTransition] = useTransition()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPendingPassword, startPasswordTransition] = useTransition()

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    startProfileTransition(async () => {
      const result = await updateProfile({ name })
      if (result.success) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully.' })
      } else {
        setProfileMessage({ type: 'error', text: result.error ?? 'Failed to update profile.' })
      }
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    startPasswordTransition(async () => {
      const result = await changePassword({ currentPassword, newPassword })
      if (result.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: result.error ?? 'Failed to change password.' })
      }
    })
  }

  return (
    <div className="container pt-16 pb-24 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="flex flex-col gap-8">
        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle>Account information</CardTitle>
            <CardDescription>Update your display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email} disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              {profileMessage && (
                <p className={profileMessage.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
                  {profileMessage.text}
                </p>
              )}
              <Button type="submit" disabled={isPendingProfile} className="self-start">
                {isPendingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {passwordMessage && (
                <p className={passwordMessage.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
                  {passwordMessage.text}
                </p>
              )}
              <Button type="submit" disabled={isPendingPassword} className="self-start">
                {isPendingPassword ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
