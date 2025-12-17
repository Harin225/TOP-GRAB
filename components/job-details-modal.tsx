"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, MapPin, DollarSign, Clock, Building, Users, Heart, Check, Calendar, AlertCircle } from "lucide-react"
import { useJobs } from "@/lib/job-context"

interface JobDetailsModalProps {
  job: any
  isOpen: boolean
  onClose: () => void
}

export function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  const { applyToJob, hasApplied, toggleSaveJob, savedJobs } = useJobs()
  const [isApplying, setIsApplying] = useState(false)

  if (!isOpen || !job) return null

  const isApplied = hasApplied(job.id)
  const isSaved = savedJobs.includes(job.id)

  const handleApply = async () => {
    if (!isApplied && !isApplying) {
      setIsApplying(true)
      try {
        await applyToJob(job.id, {
          jobId: job.id,
          applicantId: 1,
          applicantName: "Sarah Chen",
          applicantEmail: "sarah.chen@email.com",
        })
      } catch (error: any) {
        console.error('Failed to apply to job:', error)
        // Show error message to user
        alert(error.message || 'Failed to apply to job. Please try again.')
      } finally {
        setIsApplying(false)
      }
    }
  }

  const getDaysRemaining = () => {
    if (!job.deadline) return null
    const today = new Date()
    const deadlineDate = new Date(job.deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysRemaining()
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle className="font-geist text-2xl mb-2">{job.title}</CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span className="font-manrope">{job.company}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {isExpiringSoon && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">Application Deadline Approaching</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Only {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left to apply for this position!
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{job.location}</span>
              {job.remote && (
                <Badge variant="secondary" className="text-xs">
                  Remote
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{job.salary}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{job.postedDate}</span>
            </div>
            {job.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span
                  className={`font-medium ${
                    daysRemaining !== null && daysRemaining <= 7
                      ? "text-red-500"
                      : daysRemaining !== null && daysRemaining <= 14
                        ? "text-orange-500"
                        : ""
                  }`}
                >
                  {job.deadline}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{job.applicants} applicants</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.requirements.map((skill: string) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Job Description</h3>
            <p className="font-manrope text-muted-foreground leading-relaxed">{job.description}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className={`flex-1 ${isApplied ? "bg-green-600 hover:bg-green-600" : ""}`}
              onClick={handleApply}
              disabled={isApplied || isApplying}
            >
              {isApplying ? (
                "Applying..."
              ) : isApplied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Applied
                </>
              ) : (
                "Apply Now"
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleSaveJob(job.id)}
              className={isSaved ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
