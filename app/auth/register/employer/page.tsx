// app/auth/register/employer/page.tsx

"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Briefcase, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function EmployerRegister() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null) 
    setIsSubmitting(true)

    // --- Frontend Validation Checks ---
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.")
      setIsSubmitting(false)
      return
    }
    if (!formData.agreeToTerms) {
      setError("You must agree to the Terms and Privacy Policy.")
      setIsSubmitting(false)
      return
    }

    // --- API Submission ---
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Ensure cookies are sent and received
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.userName,
          email: formData.email,
          password: formData.password,
          role: "employer", // ⬅️ CRITICAL: Sets the role to employer
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Successful Registration - email verification required
        // Show success message and redirect to login
        setIsSubmitted(true)
        setTimeout(() => {
          window.location.href = '/auth/login/employer';
        }, 3000);
      } else {
        setError(result.message || "Registration failed. Please try again.")
      }
    } catch (err) {
      console.error("Registration submission error:", err)
      setError("A network error occurred. Could not connect to the server.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Registration Successful!</h2>
              <p className="text-muted-foreground">
                Please check your email to verify your account before logging in.
              </p>
              <p className="text-sm text-muted-foreground">
                We've sent a verification link to your email. Click the link to verify your account.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/auth/login/employer">Go to Login Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-primary" />
              <span className="font-geist text-2xl font-bold text-foreground">TopGrab</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create Employer Account</CardTitle>
          <CardDescription className="text-center">Post jobs and find top talent.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Company Contact First Name</Label>
                <Input id="firstName" name="firstName" placeholder="Jane" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Company Contact Last Name</Label>
                <Input id="lastName" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">Username</Label>
              <Input id="userName" name="userName" type="text" placeholder="company.admin" value={formData.userName} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="your.email@example.com" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={formData.password} onChange={handleChange} required className="pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (<EyeOff className="h-4 w-4 text-muted-foreground" />) : (<Eye className="h-4 w-4 text-muted-foreground" />)}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required className="pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (<EyeOff className="h-4 w-4 text-muted-foreground" />) : (<Eye className="h-4 w-4 text-muted-foreground" />)}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="agreeToTerms" checked={formData.agreeToTerms} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))} required />
              <Label htmlFor="agreeToTerms" className="text-sm">I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link></Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !formData.agreeToTerms}>
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login/employer" className="text-primary hover:underline font-medium">Sign in here</Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Looking for a job?{" "}
              <Link href="/auth/register/job-seeker" className="text-primary hover:underline font-medium">Job Seeker Registration</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}