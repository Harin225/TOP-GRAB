"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, Plus, FileText, Users } from "lucide-react"
import { MainNav } from "@/components/navigation/main-nav"
import { BreadcrumbNav } from "@/components/navigation/breadcrumb-nav"
import { EmployerProfileCard } from "@/components/employer-profile-card"
import { PostJobForm } from "@/components/post-job-form"
import { MyJobsTab } from "@/components/my-jobs-tab"
import { useJobs } from "@/lib/job-context"

// Mock notifications
const mockNotifications = [
  {
    id: 1,
    message: "New application for Senior Frontend Developer",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    message: "Application withdrawn for Product Designer",
    time: "1 day ago",
    unread: true,
  },
  {
    id: 3,
    message: "Job posting approved: Backend Engineer",
    time: "2 days ago",
    unread: false,
  },
]

export default function EmployerDashboard() {
  const { refreshJobs } = useJobs()
  const [employerJobs, setEmployerJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const unreadCount = mockNotifications.filter((n) => n.unread).length

  const breadcrumbItems = [{ label: "Dashboard", current: true }]

  // Fetch employer jobs
  useEffect(() => {
    const fetchEmployerJobs = async () => {
      try {
        setLoading(true)
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
            const jobs = await response.json()
            setEmployerJobs(jobs)
          } else {
            // Response is not JSON (might be HTML redirect)
            console.warn('Jobs response is not JSON, might be authentication error')
            const text = await response.text()
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              // This is an HTML page, likely a redirect - user needs to login
              console.error('Received HTML instead of JSON - authentication may have expired')
              // Clear jobs and redirect to login
              setEmployerJobs([])
              window.location.href = '/auth/login/employer'
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          // Authentication error - redirect to login
          console.warn('Authentication error when fetching jobs')
          setEmployerJobs([])
          window.location.href = '/auth/login/employer'
        } else {
          // Other error
          console.error('Error fetching jobs:', response.status)
          setEmployerJobs([])
        }
      } catch (error) {
        console.error('Error fetching employer jobs:', error)
        // Check if error is due to JSON parsing
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
          console.error('Received non-JSON response - likely authentication error')
          setEmployerJobs([])
          window.location.href = '/auth/login/employer'
        }
      } finally {
        setLoading(false)
      }
    }

    fetchEmployerJobs()

    // Poll for updates every 10 seconds (reduced frequency to avoid auth issues)
    const interval = setInterval(() => {
      fetchEmployerJobs()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate stats from employer jobs
  const stats = {
    activeJobs: employerJobs.filter((job) => job.status === 'Active').length,
    totalApplications: employerJobs.reduce((sum, job) => sum + (job.applicants || 0), 0),
    responseRate: employerJobs.length > 0 
      ? Math.round((employerJobs.filter((job) => job.applicants > 0).length / employerJobs.length) * 100)
      : 0,
  }

  // Refresh jobs when needed
  const handleRefresh = async () => {
    await refreshJobs()
    // Re-fetch employer jobs
    try {
      const response = await fetch('/api/jobs/employer', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const jobs = await response.json()
          setEmployerJobs(jobs)
        } else {
          console.warn('Refresh: Response is not JSON')
        }
      } else if (response.status === 401 || response.status === 403) {
        window.location.href = '/auth/login/employer'
      }
    } catch (error) {
      console.error('Error refreshing employer jobs:', error)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        window.location.href = '/auth/login/employer'
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <MainNav currentPage="dashboard" notifications={unreadCount} userType="employer" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb - Hide Home button when logged in */}
        <BreadcrumbNav items={breadcrumbItems} className="mb-6" hideHome={true} />

        <div className="flex gap-8">
          {/* Employer Profile Card - Always Visible */}
          <div className="w-80 flex-shrink-0">
            <EmployerProfileCard />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="post-job" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Post Job
                </TabsTrigger>
                <TabsTrigger value="my-jobs" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  My Jobs ({loading ? '...' : employerJobs.length})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.activeJobs}</div>
                      <p className="text-xs text-muted-foreground">Currently hiring</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalApplications}</div>
                      <p className="text-xs text-muted-foreground">Across all jobs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.responseRate}%</div>
                      <p className="text-xs text-muted-foreground">Application responses</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-geist">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockNotifications.slice(0, 3).map((notification) => (
                        <div key={notification.id} className="flex items-start space-x-4">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="font-manrope text-sm">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">{notification.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Post Job Tab */}
              <TabsContent value="post-job">
                <PostJobForm />
              </TabsContent>

              {/* My Jobs Tab */}
              <TabsContent value="my-jobs">
                <MyJobsTab onRefresh={handleRefresh} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
