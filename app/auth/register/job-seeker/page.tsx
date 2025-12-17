"use client"
// JobSeekerRegister.tsx (Updated)

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Briefcase, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react" // Added XCircle for errors
import Link from "next/link"

export default function JobSeekerRegister() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "", // Matches your backend's 'username' field
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null) // State for API errors

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null) // Clear previous errors
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
          // Use 'username' key to match the backend API expected field
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: "job-seeker", // Hardcoded role for this specific component
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Successful Registration - user is auto-logged in
        // Redirect to profile page after a brief delay
        setTimeout(() => {
          window.location.href = '/job-seeker/profile';
        }, 1500);
        setIsSubmitted(true)
      } else {
        // Handle API errors (e.g., username already exists, bad password)
        setError(result.message || "Registration failed. Please try again.")
      }
    } catch (err) {
      console.error("Network or submission error:", err)
      setError("A network error occurred. Please check your connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When changing input, clear the error message
    setError(null)
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  // --- Success State Render ---
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
                  <Link href="/auth/login/job-seeker">Go to Login Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Form Render ---
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
          <CardTitle className="text-2xl font-bold text-center">Create Job Seeker Account</CardTitle>
          <CardDescription className="text-center">Join TopGrab to find your dream job</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label> {/* Label changed to Username */}
              <Input
                id="username"
                name="username"
                type="text" // Changed from 'string' to 'text' as string isn't a valid input type
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeToTerms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))}
                required
              />
              <Label htmlFor="agreeToTerms" className="text-sm">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !formData.agreeToTerms || formData.password !== formData.confirmPassword}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login/job-seeker" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Looking to hire?{" "}
              <Link href="/auth/register/employer" className="text-primary hover:underline font-medium">
                Employer Registration
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}