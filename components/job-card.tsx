"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MapPin, DollarSign, Clock, Building, Users, Check, Calendar } from "lucide-react"
import { useJobs } from "@/lib/job-context"

interface JobCardProps {
  job: {
    id: number
    title: string
    company: string
    location: string
    salary: string
    type: string
    remote: boolean
    postedDate: string
    deadline?: string
    applicants: number
    requirements: string[]
  }
  isSaved: boolean
  onSave: () => void
  onViewDetails: () => void
}

export function JobCard({ job, isSaved, onSave, onViewDetails }: JobCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const { applyToJob, hasApplied } = useJobs()
  const isApplied = hasApplied(job.id)

  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

  return (
    <Card
      className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30 hover:scale-[1.02] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onViewDetails}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="font-geist text-lg mb-2 group-hover:text-primary transition-colors duration-200">
              {job.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground mb-2 transform group-hover:translate-x-1 transition-transform duration-200">
              <Building className="h-4 w-4" />
              <span className="font-manrope">{job.company}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
            className={`${
              isSaved ? "text-red-500 scale-110" : "text-muted-foreground"
            } hover:text-red-500 hover:scale-110 transition-all duration-200`}
          >
            <Heart className={`h-5 w-5 ${isSaved ? "fill-current animate-pulse" : ""} transition-all duration-200`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground transform group-hover:translate-x-1 transition-transform duration-200 delay-75">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
            {job.remote && (
              <Badge variant="secondary" className="text-xs animate-in fade-in duration-300">
                Remote
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground transform group-hover:translate-x-1 transition-transform duration-200 delay-100">
            <DollarSign className="h-4 w-4" />
            <span>{job.salary}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground transform group-hover:translate-x-1 transition-transform duration-200 delay-125">
            <Clock className="h-4 w-4" />
            <span>{job.postedDate}</span>
          </div>
          {job.deadline && (
            <div className="flex items-center gap-2 text-sm transform group-hover:translate-x-1 transition-transform duration-200 delay-150">
              <Calendar className="h-4 w-4" />
              <span
                className={`font-medium ${
                  daysRemaining !== null && daysRemaining <= 7
                    ? "text-red-500"
                    : daysRemaining !== null && daysRemaining <= 14
                      ? "text-orange-500"
                      : "text-muted-foreground"
                }`}
              >
                Deadline: {job.deadline}
                {daysRemaining !== null && daysRemaining > 0 && ` (${daysRemaining} days left)`}
                {daysRemaining !== null && daysRemaining <= 0 && " (Expired)"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground transform group-hover:translate-x-1 transition-transform duration-200 delay-175">
            <Users className="h-4 w-4" />
            <span>{job.applicants} applicants</span>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-1 mb-4">
            {job.requirements.slice(0, 3).map((skill, index) => (
              <Badge
                key={skill}
                variant="outline"
                className={`text-xs transition-all duration-200 hover:bg-primary hover:text-primary-foreground ${
                  isHovered ? "animate-in fade-in slide-in-from-bottom-2" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {skill}
              </Badge>
            ))}
            {job.requirements.length > 3 && (
              <Badge
                variant="outline"
                className={`text-xs transition-all duration-200 ${
                  isHovered ? "animate-in fade-in slide-in-from-bottom-2" : ""
                }`}
                style={{ animationDelay: `${3 * 50}ms` }}
              >
                +{job.requirements.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails()
            }}
            variant="outline"
            className="flex-1 bg-transparent hover:bg-accent hover:scale-105 transition-all duration-200"
          >
            View Details
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplied || isApplying}
            className={`flex-1 hover:scale-105 transition-all duration-200 hover:shadow-lg ${
              isApplied ? "bg-green-600 hover:bg-green-600" : ""
            }`}
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
        </div>
      </CardContent>
    </Card>
  )
}
