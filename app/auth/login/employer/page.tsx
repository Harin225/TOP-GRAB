"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Eye, EyeOff, XCircle } from "lucide-react"

export default function EmployerLogin() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    userName: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    let response

    try {
      // 1️⃣ Make the API call
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Ensure cookies are sent and received
        body: JSON.stringify({
          username: formData.userName, // backend expects "username"
          password: formData.password,
        }),
      })

      // 2️⃣ Read raw text first (to catch non-JSON responses)
      const text = await response.text()
      console.log("🔍 Raw API response:", text)

      let result
      try {
        result = JSON.parse(text)
      } catch {
        throw new Error("Invalid JSON from server (HTML or unexpected format)")
      }

      // 3️⃣ Handle successful login
      if (response.ok) {
        const userRole = result.user?.role
        const redirectTo =
          userRole === "job-seeker" ? "/job-seeker" : "/employer"

        // ✅ Use full page reload to ensure cookies are set properly
        window.location.href = redirectTo
        return
      }

      // 4️⃣ Handle backend errors
      if (response.status === 403 && result.requiresVerification) {
        setError(result.message || "Please verify your email first. Check your inbox for the verification link.")
      } else {
        setError(result.message || "Invalid credentials. Please try again.")
      }
    } catch (err: any) {
      console.error("❌ Login error:", err)
      setError(err.message || "Network or server error.")
    } finally {
      // 5️⃣ Stop loading if login failed
      if (!response || !response.ok) {
        setIsSubmitting(false)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="font-geist text-2xl font-bold text-foreground">TopGrab</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Employer Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your employer account and manage job postings
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="userName">Username</Label>
              <Input
                id="userName"
                name="userName"
                type="text"
                placeholder="Enter your username"
                value={formData.userName}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pr-10"
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

            <div className="flex items-center justify-between">
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In as Employer"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/auth/register/employer" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Looking for a job?{" "}
              <Link href="/auth/login/job-seeker" className="text-primary hover:underline font-medium">
                Job Seeker Login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
