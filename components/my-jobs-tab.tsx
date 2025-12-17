"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Clock, Users, Trash2, AlertCircle, Mail, Phone, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Job {
  id: string | number
  title: string
  location: string
  salary: string
  type: string
  remote: boolean
  postedDate: string
  deadline?: string
  status: string
  applicants: number
  pendingApplications?: number
  description: string
  requirements: string[]
}

interface Applicant {
  id: string | number
  applicantId: string | number
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  status: string
  rating: number
  appliedDate: string
  resume?: string
  coverLetter?: string
  skills?: string[]
  bio?: string
  salaryExpectation?: string
  title?: string
  location?: string
  photo?: string
}

interface MyJobsTabProps {
  onViewApplicants?: (job: Job) => void
  onRefresh?: () => void
}

export function MyJobsTab({ onViewApplicants, onRefresh }: MyJobsTabProps) {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingJobId, setDeletingJobId] = useState<string | number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)
  const [showApplicantsDialog, setShowApplicantsDialog] = useState(false)
  
  // Ref to store interval for applicants refresh
  const applicantsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch jobs from API
  const fetchJobs = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const response = await fetch('/api/jobs/employer', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          setJobs(data)
        } else {
          // Response is not JSON (might be HTML redirect)
          const text = await response.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            // This is an HTML page, likely a redirect - user needs to login
            if (!silent) {
              toast({
                title: "Session Expired",
                description: "Please log in again to continue.",
                variant: "destructive",
              })
            }
            window.location.href = '/auth/login/employer'
            return
          }
          // Try to parse as JSON anyway
          try {
            const data = JSON.parse(text)
            setJobs(data)
          } catch {
            setJobs([])
          }
        }
      } else if (response.status === 401 || response.status === 403) {
        // Authentication error
        if (!silent) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
        }
        window.location.href = '/auth/login/employer'
      } else {
        if (!silent) {
          toast({
            title: "Error",
            description: "Failed to load jobs. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      // Check if error is due to JSON parsing
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        if (!silent) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
        }
        window.location.href = '/auth/login/employer'
        return
      }
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load jobs. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchJobs()
    
    // Poll for updates every 10 seconds to see new applicants in real-time (reduced frequency)
    const interval = setInterval(() => {
      fetchJobs(true) // Silent refresh - don't show loading spinner
    }, 10000) // Refresh every 10 seconds (reduced from 5)

    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (jobId: string | number) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Job deleted successfully.",
        })
        // Refresh jobs list
        await fetchJobs()
        // Also refresh parent if callback provided
        if (onRefresh) {
          onRefresh()
        }
      } else {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        let data
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          // Response is not JSON - might be HTML redirect
          const text = await response.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            toast({
              title: "Session Expired",
              description: "Please log in again to continue.",
              variant: "destructive",
            })
            window.location.href = '/auth/login/employer'
            return
          }
          try {
            data = JSON.parse(text)
          } catch {
            data = { message: 'Failed to delete job. Please try again.' }
          }
        }
        toast({
          title: "Error",
          description: data.message || "Failed to delete job. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      toast({
        title: "Error",
        description: "Failed to delete job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingJobId(null)
      setShowDeleteDialog(false)
    }
  }

  const handleViewApplicants = async (job: Job) => {
    setSelectedJob(job)
    setShowApplicantsDialog(true)
    // Fetch applicants immediately
    await fetchApplicants(job.id, false)
  }

  // Poll applicants when dialog is open
  useEffect(() => {
    if (showApplicantsDialog && selectedJob) {
      // Clear any existing interval first
      if (applicantsIntervalRef.current) {
        clearInterval(applicantsIntervalRef.current)
        applicantsIntervalRef.current = null
      }
      
      const jobId = selectedJob.id
      
      // Start polling for applicants every 5 seconds (increased from 3 to reduce load)
      // Only start after initial load is complete
      const timeoutId = setTimeout(() => {
        applicantsIntervalRef.current = setInterval(() => {
          fetchApplicants(jobId, true) // Silent refresh - don't show loading spinner
        }, 5000) // Increased from 3 seconds to 5 seconds
      }, 2000) // Wait 2 seconds before starting polling
      
      return () => {
        clearTimeout(timeoutId)
        if (applicantsIntervalRef.current) {
          clearInterval(applicantsIntervalRef.current)
          applicantsIntervalRef.current = null
        }
      }
    } else {
      // Clear interval when dialog closes
      if (applicantsIntervalRef.current) {
        clearInterval(applicantsIntervalRef.current)
        applicantsIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showApplicantsDialog, selectedJob?.id])

  const fetchApplicants = async (jobId: string | number, silent: boolean = false) => {
    try {
      if (!silent) {
        setLoadingApplicants(true)
      }
      const jobIdStr = String(jobId)
      const response = await fetch(`/api/applications?jobId=${jobIdStr}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        let data
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          // Response is not JSON - try to parse or handle error
          const text = await response.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            // This is an HTML page, likely a redirect
            if (!silent) {
              toast({
                title: "Session Expired",
                description: "Please log in again to continue.",
                variant: "destructive",
              })
            }
            window.location.href = '/auth/login/employer'
            return
          }
          try {
            data = JSON.parse(text)
          } catch {
            throw new Error('Invalid response format')
          }
        }
        console.log(`📋 Received ${data.length} applicants for job ${jobIdStr}`)
        
        // Only fetch phone numbers if we have applicants
        if (data.length > 0) {
          // Use functional update to access current state
          setApplicants(prevApplicants => {
            // Check if we need to fetch phone numbers (only for new applicants or first load)
            const existingApplicantIds = new Set(prevApplicants.map(a => String(a.id)))
            const hasNewApplicants = data.some((app: Applicant) => !existingApplicantIds.has(String(app.id)))
            
            // If silent refresh and no new applicants, just update status without refetching phones
            if (silent && !hasNewApplicants) {
              return data.map((app: Applicant) => {
                const existing = prevApplicants.find(a => String(a.id) === String(app.id))
                // Preserve existing phone number if available
                return existing ? { ...existing, ...app, applicantPhone: existing.applicantPhone } : app
              })
            }
            
            // For first load or new applicants, fetch phone numbers
            // First, set applicants with existing phone numbers or placeholder
            const applicantsWithExistingPhones = data.map((app: Applicant) => {
              const existing = prevApplicants.find(a => String(a.id) === String(app.id))
              return { 
                ...app, 
                applicantPhone: existing?.applicantPhone || (existing?.applicantPhone === 'Loading...' ? 'Loading...' : 'Not provided')
              }
            })
            
            // Then fetch phone numbers for applicants that don't have them yet
            Promise.all(
              data.map(async (app: Applicant) => {
                const existing = prevApplicants.find(a => String(a.id) === String(app.id))
                // If we already have phone number, reuse it
                if (existing && existing.applicantPhone && existing.applicantPhone !== 'Not provided' && existing.applicantPhone !== 'Loading...') {
                  return { ...app, applicantPhone: existing.applicantPhone }
                }
                
                // Only fetch if we don't have the phone number
                try {
                  const jobSeekerResponse = await fetch(`/api/job-seeker/profile?id=${app.applicantId}`, {
                    credentials: 'include',
                    headers: {
                      'Cache-Control': 'no-cache',
                    },
                  })
                  if (jobSeekerResponse.ok) {
                    const jobSeeker = await jobSeekerResponse.json()
                    const phone = (jobSeeker.phone || '').trim() || 'Not provided'
                    return { ...app, applicantPhone: phone }
                  } else {
                    return { ...app, applicantPhone: existing?.applicantPhone || 'Not provided' }
                  }
                } catch (error) {
                  console.error(`❌ Error fetching job seeker details for ${app.applicantId}:`, error)
                  return { ...app, applicantPhone: existing?.applicantPhone || 'Not provided' }
                }
              })
            ).then(applicantsWithPhone => {
              setApplicants(applicantsWithPhone)
            })
            
            // Return immediately with existing phone numbers or placeholder
            return applicantsWithExistingPhones
          })
        } else {
          setApplicants([])
        }
      } else if (response.status === 401 || response.status === 403) {
        // Authentication error
        if (!silent) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
        }
        window.location.href = '/auth/login/employer'
      } else {
        if (!silent) {
          toast({
            title: "Error",
            description: "Failed to load applicants. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error fetching applicants:', error)
      // Check if error is due to JSON parsing
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        if (!silent) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
        }
        window.location.href = '/auth/login/employer'
        return
      }
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load applicants. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) {
        setLoadingApplicants(false)
      }
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
        // Check if response is JSON before parsing (if needed)
        // For PATCH requests, we might not need to parse the response
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            await response.json() // Consume response if JSON
          } catch {
            // Ignore parsing errors for status updates
          }
        }
        setApplicants((prev) =>
          prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app))
        )
        toast({
          title: "Success",
          description: "Application status updated.",
        })
        // Refresh jobs to update counts
        await fetchJobs()
        if (onRefresh) {
          onRefresh()
        }
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

  const handleReject = async (applicationId: string | number) => {
    await updateStatus(applicationId, 'Rejected')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-500'
      case 'Reviewed':
        return 'bg-blue-500'
      case 'Shortlisted':
        return 'bg-purple-500'
      case 'Interviewed':
        return 'bg-indigo-500'
      case 'Selected':
        return 'bg-green-500'
      case 'Rejected':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-geist text-2xl font-semibold">My Posted Jobs</h2>
          <Badge variant="outline">{jobs.length} Total Jobs</Badge>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Posted Yet</h3>
              <p className="text-muted-foreground">Start by posting your first job to attract talent.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => {
              // Convert MongoDB ID to string for comparison
              const jobIdStr = String(job.id)
              const isPastDeadline = job.deadline && new Date(job.deadline) < new Date()

              return (
                <Card key={jobIdStr} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="font-geist text-lg mb-2">{job.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location}</span>
                          </div>
                          {job.remote && (
                            <Badge variant="secondary" className="text-xs">
                              Remote
                            </Badge>
                          )}
                          {isPastDeadline && job.status === 'Active' && (
                            <Badge variant="destructive" className="text-xs">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge className={job.status === "Active" ? "bg-green-500" : "bg-gray-500"}>
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{job.salary || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Posted on {new Date(job.postedDate).toLocaleDateString()}</span>
                      </div>
                      {job.deadline && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {job.applicants} {job.applicants === 1 ? 'applicant' : 'applicants'}
                          {job.pendingApplications !== undefined && job.pendingApplications > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {job.pendingApplications} pending
                            </Badge>
                          )}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {job.requirements.slice(0, 3).map((skill, index) => (
                          <Badge key={`${jobIdStr}-${index}`} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.requirements.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.requirements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeletingJobId(job.id)
                          setShowDeleteDialog(true)
                        }}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                      <Button onClick={() => handleViewApplicants(job)} className="flex-1" disabled={job.applicants === 0}>
                        <Users className="h-4 w-4 mr-2" />
                        View Applicants ({job.applicants})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job and all associated applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingJobId && handleDelete(deletingJobId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Applicants Dialog */}
      <Dialog open={showApplicantsDialog} onOpenChange={(open) => {
        setShowApplicantsDialog(open)
        if (!open) {
          // Clear interval when dialog closes
          if (applicantsIntervalRef.current) {
            clearInterval(applicantsIntervalRef.current)
            applicantsIntervalRef.current = null
          }
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-geist">
              Applicants for {selectedJob?.title}
            </DialogTitle>
          </DialogHeader>

          {loadingApplicants ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading applicants...</p>
              </div>
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Applicants Yet</h3>
              <p className="text-muted-foreground mb-2">No one has applied to this job yet.</p>
              <p className="text-xs text-muted-foreground">Applications will appear here in real-time when job seekers apply.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  📊 Total Applicants: <span className="font-semibold text-foreground">{applicants.length}</span>
                  {' '}• Auto-refreshes every 5 seconds
                </p>
              </div>
              {applicants.map((applicant) => (
                <Card key={String(applicant.id)} className="border-2 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-16 w-16">
                          <AvatarImage 
                            src={applicant.photo || "/placeholder-user.jpg"} 
                            alt={applicant.applicantName}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {applicant.applicantName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{applicant.applicantName || 'Unknown Applicant'}</h3>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              <span className="font-medium text-primary break-all">{applicant.applicantEmail || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-primary" />
                              <span className="font-medium text-primary">{applicant.applicantPhone || 'Not provided'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(applicant.status)} text-white`}>
                        {applicant.status || 'Pending'}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Applied on {new Date(applicant.appliedDate).toLocaleDateString()}</span>
                      </div>

                      {/* Applicant Profile Information */}
                      {(applicant.title || applicant.location || applicant.skills?.length || applicant.bio || applicant.salaryExpectation) && (
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                          <h4 className="font-semibold text-sm text-foreground mb-3">Applicant Profile Information</h4>
                          
                          {applicant.title && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-primary" />
                              <span className="font-medium">{applicant.title}</span>
                            </div>
                          )}
                          
                          {applicant.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{applicant.location}</span>
                            </div>
                          )}

                          {applicant.skills && applicant.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Skills:</p>
                              <div className="flex flex-wrap gap-2">
                                {applicant.skills.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {applicant.bio && (
                            <div>
                              <p className="text-sm font-medium mb-1">Bio:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{applicant.bio}</p>
                            </div>
                          )}

                          {applicant.salaryExpectation && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <span className="font-medium">Salary Expectation: <span className="text-primary">{applicant.salaryExpectation}</span></span>
                            </div>
                          )}
                        </div>
                      )}

                      {applicant.coverLetter && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Cover Letter:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{applicant.coverLetter}</p>
                        </div>
                      )}

                      {applicant.resume && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (applicant.resume?.startsWith('data:')) {
                                const link = document.createElement('a')
                                link.href = applicant.resume
                                link.download = `${applicant.applicantName}_resume.pdf`
                                link.click()
                              } else {
                                window.open(applicant.resume, '_blank')
                              }
                            }}
                          >
                            View Resume
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Status</label>
                            <Select
                              value={applicant.status}
                              onValueChange={(value) => updateStatus(applicant.id, value)}
                            >
                              <SelectTrigger className="w-[180px]">
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(applicant.id)}
                          disabled={applicant.status === 'Rejected'}
                        >
                          Reject Applicant
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
