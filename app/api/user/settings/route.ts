import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import JobSeeker from '@/lib/models/jobseeker'
import Employer from '@/lib/models/employer'
import { verifyToken, verifyPassword, hashPassword, createToken } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  await dbConnect()

  try {
    const body = await req.json()
    const { username, currentPassword, newPassword, confirmPassword } = body || {}

    if (!username && !newPassword) {
      return NextResponse.json({ message: 'No updates provided.' }, { status: 400 })
    }

    const token = req.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 })
    }

    const { userId, role } = decoded

    const isJobSeeker = role === 'job-seeker'
    const Model = isJobSeeker ? JobSeeker : Employer

    const user = await Model.findById(userId)
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    let usernameChanged = false

    if (username && typeof username === 'string') {
      const trimmed = username.trim().toLowerCase()
      if (!trimmed) {
        return NextResponse.json({ message: 'Username cannot be empty.' }, { status: 400 })
      }

      if (trimmed !== user.username) {
        const existingJobSeeker = await JobSeeker.findOne({ username: trimmed })
        const existingEmployer = await Employer.findOne({ username: trimmed })
        const foundExisting = existingJobSeeker && existingJobSeeker._id.toString() !== user._id.toString()
          ? existingJobSeeker
          : existingEmployer && existingEmployer._id.toString() !== user._id.toString()
          ? existingEmployer
          : null

        if (foundExisting) {
          return NextResponse.json({ message: 'Username already in use.' }, { status: 409 })
        }

        updates.username = trimmed
        usernameChanged = true
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ message: 'Current password is required.' }, { status: 400 })
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ message: 'New password must be at least 6 characters.' }, { status: 400 })
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json({ message: 'New passwords do not match.' }, { status: 400 })
      }

      const passwordValid = await verifyPassword(currentPassword, user.passwordHash)
      if (!passwordValid) {
        return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 403 })
      }

      updates.passwordHash = await hashPassword(newPassword)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes detected.' }, { status: 400 })
    }

    Object.assign(user, updates)
    await user.save()

    const response = NextResponse.json({
      message: 'Settings updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    })

    if (usernameChanged) {
      const newToken = createToken({
        userId: user._id.toString(),
        role: user.role,
        username: user.username,
      })

      response.cookies.set('auth_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ message: 'Unable to update settings right now.' }, { status: 500 })
  }
}
