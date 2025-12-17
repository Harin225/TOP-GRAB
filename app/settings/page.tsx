'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, UserCog } from 'lucide-react'

interface UserProfile {
  username: string
  role: 'job-seeker' | 'employer'
}

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [usernameForm, setUsernameForm] = useState({
    username: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setProfile({ username: data.username, role: data.role })
          setUsernameForm({ username: data.username })
        } else if (response.status === 401 || response.status === 403) {
          router.replace('/auth/login/job-seeker')
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const safeParseJson = async (response: Response) => {
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return { message: text.slice(0, 200) }
    }
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (!usernameForm.username.trim()) {
      toast({
        title: 'Invalid username',
        description: 'Username cannot be empty.',
        variant: 'destructive',
      })
      return
    }

    setSavingUsername(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: usernameForm.username }),
      })

      const result = await safeParseJson(response)

      if (response.ok) {
        toast({ title: 'Username updated', description: 'Your username has been updated successfully.' })
        setProfile((prev) => (prev ? { ...prev, username: result.user?.username || usernameForm.username } : prev))
        setUsernameForm({ username: result.user?.username || usernameForm.username })
      } else {
        console.error('Username update failed:', result)
        toast({ title: 'Update failed', description: result.message || 'Could not update username.', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Username update failed:', error)
      toast({ title: 'Unexpected error', description: 'Please try again later.', variant: 'destructive' })
    } finally {
      setSavingUsername(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast({ title: 'Missing fields', description: 'Please enter all password fields.', variant: 'destructive' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Weak password', description: 'New password must be at least 6 characters.', variant: 'destructive' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Mismatch', description: 'New passwords do not match.', variant: 'destructive' })
      return
    }

    setSavingPassword(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })

      const result = await safeParseJson(response)

      if (response.ok) {
        toast({ title: 'Password updated', description: 'Your password has been changed successfully.' })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        console.error('Password update failed:', result)
        toast({ title: 'Update failed', description: result.message || 'Could not update password.', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Password update failed:', error)
      toast({ title: 'Unexpected error', description: 'Please try again later.', variant: 'destructive' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-3xl mx-auto py-10 px-4 space-y-8">
        <div>
          <h1 className="text-3xl font-geist mb-2">Account Settings</h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage your account information, update your username, and change your password securely.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Username</CardTitle>
                <CardDescription>Update the username associated with your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={usernameForm.username}
                  onChange={(e) => setUsernameForm({ username: e.target.value })}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>
              <Button type="submit" disabled={savingUsername}>
                {savingUsername ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Username'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password after verifying your current one.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
