"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookmarkIcon, FileText, Trash2 } from "lucide-react"
import { MainNav } from "@/components/navigation/main-nav"
import { BreadcrumbNav } from "@/components/navigation/breadcrumb-nav"
import { JobCard } from "@/components/job-card"
import { FilterPanel } from "@/components/filter-panel"
import { JobDetailsModal } from "@/components/job-details-modal"
import { ApplicationModal } from "@/components/application-modal"
import { ProfileCard } from "@/components/profile-card"
import { EnhancedSearch } from "@/components/enhanced-search"
import { useJobs } from "@/lib/job-context"

export default function JobSeekerDashboard() {
  const { getFilteredJobs, savedJobs, toggleSaveJob, applications, removeApplication } = useJobs()
  const [showFilters, setShowFilters] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const jobsPerPage = 6

  const filteredJobs = getFilteredJobs()
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage)
  const startIndex = (currentPage - 1) * jobsPerPage
  const currentJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage)

  const breadcrumbItems = [{ label: "Jobs", current: true }]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <MainNav currentPage="jobs" notifications={3} userType="job-seeker" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb - Hide Home button when logged in */}
        <BreadcrumbNav items={breadcrumbItems} className="mb-6" hideHome={true} />

        <div className="flex gap-8">
          {/* Profile Card - Always Visible */}
          <div className="w-80 flex-shrink-0">
            <ProfileCard />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs defaultValue="jobs" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="jobs" className="flex items-center gap-2">
                  Browse Jobs
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex items-center gap-2">
                  <BookmarkIcon className="h-4 w-4" />
                  Saved Jobs ({savedJobs.length})
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  My Applications ({applications.length})
                </TabsTrigger>
              </TabsList>

              {/* Browse Jobs Tab */}
              <TabsContent value="jobs" className="space-y-6">
                {/* Enhanced Search */}
                <EnhancedSearch onOpenFilters={() => setShowFilters(true)} />

                {/* Job Listings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSaved={savedJobs.includes(job.id)}
                      onSave={() => toggleSaveJob(job.id)}
                      onViewDetails={() => setSelectedJob(job)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Saved Jobs Tab */}
              <TabsContent value="saved" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredJobs
                    .filter((job) => savedJobs.includes(job.id))
                    .map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isSaved={true}
                        onSave={() => toggleSaveJob(job.id)}
                        onViewDetails={() => setSelectedJob(job)}
                      />
                    ))}
                </div>
                {savedJobs.length === 0 && (
                  <div className="text-center py-12">
                    <BookmarkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
                    <p className="text-muted-foreground">Start browsing jobs and save the ones you're interested in!</p>
                  </div>
                )}
              </TabsContent>

              {/* Applications Tab */}
              <TabsContent value="applications" className="space-y-6">
                <div className="space-y-4">
                  {applications.map((application) => (
                    <Card key={application.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                              {filteredJobs.find((job) => job.id === application.jobId)?.title || "Job Title"}
                            </h3>
                            <p className="text-muted-foreground mb-2">
                              {filteredJobs.find((job) => job.id === application.jobId)?.company || "Company"}
                            </p>
                            <p className="text-sm text-muted-foreground">Applied on {application.appliedDate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                application.status === "Selected"
                                  ? "default"
                                  : application.status === "Shortlisted"
                                    ? "secondary"
                                    : application.status === "Rejected"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {application.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                // Use mongoId (MongoDB ObjectId string) if available, otherwise use numeric id
                                const applicationId = (application as any).mongoId || application.id
                                
                                console.log('🔴 Trash icon clicked!', {
                                  numericId: application.id,
                                  mongoId: (application as any).mongoId,
                                  applicationId: applicationId,
                                  application: application,
                                })
                                
                                // Call the API to delete from database
                                try {
                                  const response = await fetch(`/api/my-applications/${applicationId}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                    cache: 'no-store',
                                  })
                                  
                                  console.log('🗑️ Delete API response:', {
                                    status: response.status,
                                    ok: response.ok,
                                  })
                                  
                                  if (response.ok) {
                                    // Remove from local state after successful API call
                                    removeApplication(application.id)
                                    console.log('✅ Application deleted successfully')
                                  } else {
                                    const errorData = await response.json()
                                    console.error('❌ Delete failed:', errorData)
                                    alert(`Failed to delete: ${errorData.message || 'Unknown error'}`)
                                  }
                                } catch (error: any) {
                                  console.error('❌ Error deleting application:', error)
                                  alert(`Error: ${error.message || 'Failed to delete application'}`)
                                }
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {applications.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                    <p className="text-muted-foreground">Start applying to jobs to track your applications here!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} />

      {/* Job Details Modal */}
      <JobDetailsModal job={selectedJob} isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} />

      {/* Application Modal */}
      <ApplicationModal
        job={selectedJob}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
      />
    </div>
  )
}
