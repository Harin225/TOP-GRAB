"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, MapPin, Briefcase, Mail, ExternalLink, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Applicant {
  id: string | number
  applicantId: string | number
  applicantName: string
  applicantEmail: string
  status: string
  rating: number
  appliedDate: string
  resume?: string
  coverLetter?: string
}

interface ApplicantsTabProps {
  selectedJob: any
}

export function ApplicantsTab({ selectedJob }: ApplicantsTabProps) {
  const { toast } = useToast()
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch applications when job is selected
  useEffect(() => {
    if (selectedJob && selectedJob.id) {
      fetchApplicants()
    } else {
      setApplicants([])
    }
  }, [selectedJob])

  const fetchApplicants = async () => {
    if (!selectedJob || !selectedJob.id) return

    try {
      setLoading(true)
      const jobId = String(selectedJob.id) // Convert to string for API
      const response = await fetch(`/api/applications?jobId=${jobId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setApplicants(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load applicants. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching applicants:', error)
      toast({
        title: "Error",
        description: "Failed to load applicants. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (applicationId: string | number, newStatus: string) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setApplicants((prev) =>
          prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app))
        )
        toast({
          title: "Success",
          description: "Application status updated.",
        })
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.message || "Failed to update status.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateRating = async (applicationId: string | number, rating: number) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ rating }),
      })

      if (response.ok) {
        // Update local state
        setApplicants((prev) =>
          prev.map((app) => (app.id === applicationId ? { ...app, rating } : app))
        )
        toast({
          title: "Success",
          description: "Rating updated.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update rating.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      toast({
        title: "Error",
        description: "Failed to update rating. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-blue-500"
      case "Reviewed":
        return "bg-yellow-500"
      case "Shortlisted":
        return "bg-green-500"
      case "Interviewed":
        return "bg-purple-500"
      case "Selected":
        return "bg-green-600"
      case "Rejected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (!selectedJob) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select a Job to View Applicants</h3>
        <p className="text-muted-foreground">Choose a job from the "My Jobs" tab to see its applicants.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading applicants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-geist text-2xl font-semibold">Applicants for {selectedJob.title}</h2>
          <p className="text-muted-foreground">{applicants.length} total applicant{applicants.length !== 1 ? 's' : ''}</p>
        </div>
        <Badge variant="outline">{selectedJob.status}</Badge>
      </div>

      {applicants.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Applicants Yet</h3>
            <p className="text-muted-foreground">No one has applied to this job yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applicants.map((applicant) => {
            const applicantIdStr = String(applicant.id)
            const initials = applicant.applicantName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            return (
              <Card key={applicantIdStr} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-geist text-lg font-semibold">{applicant.applicantName}</h3>
                          <Badge className={`${getStatusColor(applicant.status)} text-white`}>
                            {applicant.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{applicant.applicantEmail}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-4 w-4" />
                              <span>Applied on {new Date(applicant.appliedDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {applicant.resume && (
                              <div className="flex items-center gap-2 text-sm">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={applicant.resume}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  View Resume
                                </a>
                              </div>
                            )}
                            {applicant.coverLetter && (
                              <div className="text-sm text-muted-foreground">
                                <p className="line-clamp-2">{applicant.coverLetter}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-sm font-medium">Rating:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 cursor-pointer ${
                                  star <= applicant.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                                onClick={() => updateRating(applicant.id, star)}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Status Update */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Select
                              value={applicant.status}
                              onValueChange={(value) => updateStatus(applicant.id, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Reviewed">Reviewed</SelectItem>
                                <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="Interviewed">Interviewed</SelectItem>
                                <SelectItem value="Selected">Selected</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
