"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { X, Upload, FileText, User, Mail, CheckCircle } from "lucide-react"
import { useJobs, type Job } from "@/lib/job-context"
import { useToast } from "@/hooks/use-toast"

interface ApplicationModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
}

export function ApplicationModal({ job, isOpen, onClose }: ApplicationModalProps) {
  const { toast } = useToast()
  const { refreshJobs } = useJobs()
  const [formData, setFormData] = useState({
    coverLetter: "",
    resume: null as File | null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen || !job) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, resume: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Convert resume file to base64 if provided
      let resumeBase64 = ''
      if (formData.resume) {
        const reader = new FileReader()
        resumeBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(formData.resume!)
        })
      }

      // Convert job.id to string (handles both number and string IDs)
      const jobId = String(job.id)

      // Submit application to API
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          jobId: jobId,
          coverLetter: formData.coverLetter,
          resume: resumeBase64,
        }),
      })

      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        let errorData
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          // Response is not JSON - might be HTML redirect
          const text = await response.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            throw new Error('Session expired. Please log in again.')
          }
          try {
            errorData = JSON.parse(text)
          } catch {
            throw new Error('Failed to submit application. Please try again.')
          }
        }
        throw new Error(errorData.message || 'Failed to submit application')
      }

      // Refresh jobs to update applicant counts
      await refreshJobs()

      setIsSuccess(true)

      // Auto close after success animation
      setTimeout(() => {
        setIsSuccess(false)
        setFormData({
          coverLetter: "",
          resume: null,
        })
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error("Failed to submit application:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle className="font-geist text-2xl mb-2">Apply for {job.title}</CardTitle>
            <p className="text-muted-foreground font-manrope">
              {job.company} • {job.location}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-500">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-2xl font-bold text-green-600 mb-2">Application Submitted!</h3>
              <p className="text-muted-foreground">
                Your application has been successfully submitted. The employer will review it shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Summary */}
              <div className="bg-muted/50 p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {job.salary} • {job.type}
                    </p>
                  </div>
                  {job.remote && <Badge variant="secondary">Remote</Badge>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {job.requirements.slice(0, 5).map((skill, index) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="text-xs animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300 delay-100">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.applicantName}
                      onChange={(e) => handleInputChange("applicantName", e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.applicantEmail}
                      onChange={(e) => handleInputChange("applicantEmail", e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      disabled={isSubmitting}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300 delay-200">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume
                </h3>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors duration-200">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {formData.resume ? formData.resume.name : "Click to upload your resume"}
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX (max 5MB)</p>
                  </label>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300 delay-300">
                <h3 className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Cover Letter
                </h3>
                <Textarea
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                  placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                  rows={6}
                  className="resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Optional but recommended. This helps employers understand your motivation and fit for the role.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-400">
                <Button
                  type="submit"
                  className="flex-1 hover:scale-105 transition-all duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Submitting Application...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="hover:scale-105 transition-all duration-200 bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
