// app/job-seeker/applications/page.tsx

"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/navigation/main-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, MapPin, Calendar, Building2, CheckCircle2, Clock, XCircle, UserCheck, MessageSquare, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface MyApplication {
  id: string
  applicationId: string
  jobId: string
  jobTitle: string
  company: string
  location: string
  status: 'Pending' | 'Reviewed' | 'Shortlisted' | 'Interviewed' | 'Selected' | 'Rejected'
  appliedDate: string
  resume?: string
  coverLetter?: string
  rating: number
}

export default function MyApplicationsPage() {
  const { toast } = useToast()
  const [applications, setApplications] = useState<MyApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null) // Track which dialog is open

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/my-applications', {
        credentials: 'include',
        cache: 'no-store', // Ensure we always fetch fresh data from database
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure we only set valid database applications (filter any that might slip through)
        const validApplications = Array.isArray(data) ? data.filter((app: MyApplication) => 
          app && 
          app.id && 
          app.jobId && 
          app.jobTitle && 
          app.company &&
          // Ensure IDs are MongoDB ObjectId strings (24 characters), not numbers
          typeof app.id === 'string' && 
          app.id.length === 24
        ) : []
        
        setApplications(validApplications)
        console.log(`✅ Loaded ${validApplications.length} applications from database (filtered out ${data.length - validApplications.length} invalid entries)`)
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to fetch applications:', {
          status: response.status,
          errorData,
        })
        toast({
          title: "Error",
          description: errorData.message || "Failed to load applications. Please try again.",
          variant: "destructive",
        })
        // Set empty array on error to ensure no stale data
        setApplications([])
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast({
        title: "Error",
        description: "Failed to load applications. Please try again.",
        variant: "destructive",
      })
      // Set empty array on error to ensure no stale data
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
    
    // Poll for updates every 5 seconds to see status changes in real-time
    // Note: This polling might interfere with delete operations
    const interval = setInterval(() => {
      // Only fetch if not currently deleting
      if (!deletingId) {
        fetchApplications()
      }
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [deletingId])

  const handleDeleteApplication = async (applicationId: string, jobId: string) => {
    // Add a visible alert first to confirm the function is called
    console.log('🔴 DELETE BUTTON CLICKED!', {
      applicationId,
      applicationIdType: typeof applicationId,
      applicationIdLength: applicationId?.length,
      jobId,
      timestamp: new Date().toISOString(),
    })
    
    // Remove the confirm dialog - just proceed with deletion
    
    try {
      setDeletingId(applicationId)
      
      // Validate applicationId format
      if (!applicationId || typeof applicationId !== 'string') {
        console.error('❌ Invalid applicationId:', applicationId)
        toast({
          title: "Error",
          description: "Invalid application ID. Please refresh the page and try again.",
          variant: "destructive",
        })
        setDeletingId(null)
        return
      }
      
      console.log('🗑️ Calling DELETE API:', {
        url: `/api/my-applications/${applicationId}`,
        applicationId,
        jobId,
      })
      
      // Delete from myapplications collection (this also deletes from Application collection and removes from appliedJobs array)
      const deleteResponse = await fetch(`/api/my-applications/${applicationId}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store', // Ensure we don't use cached response
      })

      console.log('📡 DELETE API Response:', {
        status: deleteResponse.status,
        statusText: deleteResponse.statusText,
        ok: deleteResponse.ok,
      })

      let responseData;
      try {
        responseData = await deleteResponse.json()
        console.log('📦 Response data:', responseData)
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError)
        responseData = { message: 'Unknown error' }
      }
      
      if (deleteResponse.ok) {
        console.log('✅ Delete successful! Removing from local state...')
        
        // Remove from local state immediately for better UX
        setApplications((prev) => {
          const filtered = prev.filter((app) => {
            const matches = app.id !== applicationId
            if (!matches) {
              console.log('🗑️ Removing application from local state:', {
                appId: app.id,
                targetId: applicationId,
                appJobTitle: app.jobTitle,
              })
            }
            return matches
          })
          
          console.log('🗑️ Local state update:', {
            before: prev.length,
            after: filtered.length,
            removed: prev.length - filtered.length,
            applicationsBefore: prev.map(a => ({ id: a.id, title: a.jobTitle })),
            applicationsAfter: filtered.map(a => ({ id: a.id, title: a.jobTitle })),
          })
          
          return filtered
        })
        
        toast({
          title: "Success",
          description: "Application removed successfully.",
        })
        
        // Wait a bit to ensure database write completes, then refresh
        // But don't refresh immediately - let the user see the deletion worked
        setTimeout(async () => {
          console.log('🔄 Refreshing applications after delete...')
          await fetchApplications()
        }, 2000) // Increased delay to ensure DB write completes and avoid race condition
      } else {
        console.error('❌ Delete failed:', {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText,
          responseData,
        })
        
        toast({
          title: "Error",
          description: responseData.message || `Failed to remove application. Server returned ${deleteResponse.status}`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('❌ Exception in delete handler:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
      })
      toast({
        title: "Error",
        description: error.message || "Failed to remove application. Please try again.",
        variant: "destructive",
      })
    } finally {
      // Always reset deletingId state
      console.log('🔄 Resetting deletingId state')
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Pending': { icon: Clock, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', label: 'Pending' },
      'Reviewed': { icon: FileText, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', label: 'Reviewed' },
      'Shortlisted': { icon: UserCheck, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', label: 'Shortlisted' },
      'Interviewed': { icon: MessageSquare, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', label: 'Interviewed' },
      'Selected': { icon: CheckCircle2, color: 'bg-green-500/10 text-green-700 dark:text-green-400', label: 'Selected' },
      'Rejected': { icon: XCircle, color: 'bg-red-500/10 text-red-700 dark:text-red-400', label: 'Rejected' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  if (loading && applications.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav currentPage="applications" notifications={0} userType="job-seeker" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your applications...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav currentPage="applications" notifications={0} userType="job-seeker" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">My Applications</h1>
          <p className="text-muted-foreground">
            Track all your job applications and their status
          </p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                You haven't applied to any jobs yet. Start browsing jobs and apply to get started!
              </p>
              <Button onClick={() => window.location.href = '/job-seeker'}>
                Browse Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{application.jobTitle}</CardTitle>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium text-foreground">{application.company}</span>
                        </span>
                        {application.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {application.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied on {new Date(application.appliedDate).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(application.status)}
                      {application.rating > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{application.rating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {application.resume && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (application.resume?.startsWith('data:')) {
                              // Base64 resume - open in new tab
                              window.open(application.resume, '_blank')
                            } else if (application.resume) {
                              // URL - open in new tab
                              window.open(application.resume, '_blank')
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      )}
                      {application.coverLetter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Show cover letter in alert or modal
                            alert(application.coverLetter)
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Cover Letter
                        </Button>
                      )}
                    </div>
                    <AlertDialog 
                      open={deleteDialogOpen === application.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setDeleteDialogOpen(null)
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === application.id}
                          onClick={() => {
                            console.log('🔴 Delete button clicked, opening dialog for:', application.id)
                            setDeleteDialogOpen(application.id)
                          }}
                        >
                          {deletingId === application.id ? 'Removing...' : 'Remove Application'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this application? This action cannot be undone. 
                            This will remove the application from your list, but the employer may still have a record of it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel 
                            disabled={deletingId === application.id}
                            onClick={() => {
                              console.log('🔴 Cancel clicked, closing dialog')
                              setDeleteDialogOpen(null)
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deletingId === application.id}
                            onClick={async (e) => {
                              // Prevent default behavior which closes the dialog
                              e.preventDefault()
                              e.stopPropagation()
                              
                              console.log('🔴 AlertDialogAction Remove clicked!', {
                                applicationId: application.id,
                                applicationIdType: typeof application.id,
                                applicationIdLength: application.id?.length,
                                jobId: application.jobId,
                                application: {
                                  id: application.id,
                                  applicationId: application.applicationId,
                                  jobId: application.jobId,
                                  jobTitle: application.jobTitle,
                                },
                              })
                              
                              // Close dialog first to prevent blocking
                              setDeleteDialogOpen(null)
                              
                              // Call the delete handler directly - don't wait, let it run
                              handleDeleteApplication(application.id, application.jobId).catch((error) => {
                                console.error('❌ Error in delete handler:', error)
                                // Error toast will show from handler
                              })
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === application.id ? 'Removing...' : 'Remove'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
