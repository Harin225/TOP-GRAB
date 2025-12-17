"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface Job {
  id: number
  title: string
  company: string
  location: string
  salary: string
  type: string
  remote: boolean
  description: string
  requirements: string[]
  postedDate: string
  deadline?: string
  applicants: number
  status: "Active" | "Closed" | "Draft"
  employerId: number
  category: string
  experience: string
  benefits: string[]
  companySize: string
  industry: string
}

export interface Application {
  id: number
  mongoId?: string // MongoDB ObjectId string for API calls
  jobId: number
  applicantId: number
  applicantName: string
  applicantEmail: string
  status: "Pending" | "Reviewed" | "Shortlisted" | "Interviewed" | "Selected" | "Rejected"
  appliedDate: string
  resume?: string
  coverLetter?: string
  rating: number
}

export interface JobFilters {
  search: string
  jobTypes: string[]
  locations: string[]
  salaryMin: number
  salaryMax: number
  remote: boolean
  experience: string[]
  categories: string[]
}

interface JobContextType {
  jobs: Job[]
  applications: Application[]
  savedJobs: number[]
  filters: JobFilters
  loading: boolean

  // Job management
  addJob: (job: Omit<Job, "id" | "postedDate" | "applicants"> | Job) => void
  updateJob: (id: number, updates: Partial<Job>) => void
  deleteJob: (id: number) => void
  refreshJobs: () => Promise<void>

  // Application management
  applyToJob: (jobId: number, applicationData: Omit<Application, "id" | "appliedDate" | "status" | "rating">) => void
  updateApplicationStatus: (applicationId: number, status: Application["status"]) => void
  rateApplicant: (applicationId: number, rating: number) => void
  removeApplication: (applicationId: number) => void
  hasApplied: (jobId: number) => boolean

  // Job seeker actions
  toggleSaveJob: (jobId: number) => void

  // Search and filtering
  updateFilters: (newFilters: Partial<JobFilters>) => void
  getFilteredJobs: () => Job[]
  searchJobs: (query: string) => Job[]

  // Analytics
  getJobStats: (employerId?: number) => {
    totalJobs: number
    activeJobs: number
    totalApplications: number
    responseRate: number
  }
}

const JobContext = createContext<JobContextType | undefined>(undefined)

// All jobs and applications are now fetched from the database only
// No mock/dummy data is used

// Helper function to convert MongoDB _id string to numeric ID
function stringIdToNumber(id: string): number {
  // Convert string to a numeric hash
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) || 1000000 + Math.floor(Math.random() * 1000000) // Ensure positive number, fallback if 0
}

function parseSalaryValue(salary: string): number {
  if (!salary) return 0
  const match = salary.toLowerCase().match(/(\d+(?:\.\d+)?)(\s*[km])?/)
  if (!match) return 0
  let value = parseFloat(match[1])
  const unit = match[2]?.trim()
  if (unit === 'k') value *= 1000
  else if (unit === 'm') value *= 1000000
  return Math.round(value)
}

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [savedJobs, setSavedJobs] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<JobFilters>({
    search: "",
    jobTypes: [],
    locations: [],
    salaryMin: 0,
    salaryMax: 300000,
    remote: false,
    experience: [],
    categories: [],
  })

  // Function to fetch jobs from database only (no mock data)
  const fetchCustomJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs', {
        credentials: 'include',
        cache: 'no-store', // Always fetch fresh data from database
      })

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const dbJobs = await response.json()
          
          // Convert database jobs to match Job interface
          // Keep MongoDB ObjectId as mongoId for API calls, but use numeric ID for frontend compatibility
          const formattedJobs: Job[] = dbJobs.map((job: any) => ({
            ...job,
            id: stringIdToNumber(job.id), // Convert MongoDB _id string to numeric ID for frontend
            mongoId: job.id, // Keep original MongoDB ObjectId string for API calls
            employerId: stringIdToNumber(job.employerId || '0'), // Convert employerId too
          }))

          // Only use database jobs - no mock data
          setJobs(formattedJobs)
          console.log(`✅ Loaded ${formattedJobs.length} jobs from database`)
        } else {
          // Response is not JSON (might be HTML redirect)
          const text = await response.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.error('Received HTML instead of JSON - authentication may have expired')
            setJobs([])
          } else {
            // Try to parse as JSON anyway
            try {
              const dbJobs = JSON.parse(text)
              const formattedJobs: Job[] = dbJobs.map((job: any) => ({
                ...job,
                id: stringIdToNumber(job.id),
                mongoId: job.id,
                employerId: stringIdToNumber(job.employerId || '0'),
              }))
              setJobs(formattedJobs)
            } catch {
              setJobs([])
            }
          }
        }
      } else if (response.status === 401 || response.status === 403) {
        console.error('Authentication error when fetching jobs')
        setJobs([])
      } else {
        console.error('Failed to fetch jobs from database:', response.status)
        // Set empty array if API fails - no fallback to mock data
        setJobs([])
      }
    } catch (error) {
      console.error('Error fetching jobs from database:', error)
      // Set empty array on error - no fallback to mock data
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  // Function to fetch applications from database (only for job seekers)
  const fetchApplicationsFromDB = async () => {
    try {
      // First check if user is authenticated and what role they have
      const profileResponse = await fetch('/api/user/profile', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!profileResponse.ok) {
        // Not authenticated or error - don't fetch applications
        setApplications([])
        return
      }

      // Check if response is JSON before parsing
      const contentType = profileResponse.headers.get('content-type')
      let userProfile
      if (contentType && contentType.includes('application/json')) {
        userProfile = await profileResponse.json()
      } else {
        // Response is not JSON - might be HTML redirect
        const text = await profileResponse.text()
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.warn('Received HTML instead of JSON for user profile')
          setApplications([])
          return
        }
        try {
          userProfile = JSON.parse(text)
        } catch {
          setApplications([])
          return
        }
      }
      
      // Only fetch applications if user is a job seeker
      if (userProfile.role !== 'job-seeker') {
        // User is an employer or guest - don't fetch applications
        setApplications([])
        return
      }

      const response = await fetch('/api/my-applications', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        let dbApplications
        if (contentType && contentType.includes('application/json')) {
          dbApplications = await response.json()
        } else {
          // Response is not JSON - might be HTML redirect
          const text = await response.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.warn('Received HTML instead of JSON for applications')
            setApplications([])
            return
          }
          try {
            dbApplications = JSON.parse(text)
          } catch {
            setApplications([])
            return
          }
        }
        
        // Convert database applications to match Application interface
        // Map jobId from MongoDB ObjectId string to numeric ID used in frontend
        // Use functional setState to get current jobs value
        setJobs((currentJobs) => {
          const formattedApplications: Application[] = dbApplications.map((app: any) => {
            // Find the job in the current jobs array to get its numeric ID
            const job = currentJobs.find((j: any) => j.mongoId === app.jobId)
            // If job not found, use the jobId from the API response and convert it
            const numericJobId = job ? job.id : stringIdToNumber(app.jobId)
            
            return {
              id: stringIdToNumber(app.id || app.applicationId),
              mongoId: app.id || app.applicationId, // Store MongoDB ObjectId for API calls
              jobId: numericJobId,
              applicantId: stringIdToNumber(app.applicantId || '0'),
              applicantName: app.applicantName || 'Unknown',
              applicantEmail: app.applicantEmail || '',
              status: app.status || 'Pending',
              appliedDate: app.appliedDate || new Date().toISOString().split('T')[0],
              rating: app.rating || 0,
            }
          })

          setApplications(formattedApplications)
          console.log(`✅ Loaded ${formattedApplications.length} applications from database`)
          return currentJobs // Return unchanged jobs
        })
      } else {
        // Only log error if it's not a 403 (expected for employers)
        if (response.status !== 403) {
          console.error('Failed to fetch applications from database:', response.status)
        }
        setApplications([])
      }
    } catch (error) {
      console.error('Error fetching applications from database:', error)
      setApplications([])
    }
  }

  // Fetch custom jobs from database on mount
  useEffect(() => {
    fetchCustomJobs()
  }, [])

  // Fetch applications when jobs are loaded (so we can map jobIds correctly)
  useEffect(() => {
    if (jobs.length > 0) {
      fetchApplicationsFromDB()
    }
  }, [jobs]) // Re-fetch when jobs change

  // Refresh jobs function (can be called after posting a new job)
  const refreshJobs = async () => {
    await fetchCustomJobs()
    // Also refresh applications after refreshing jobs
    await fetchApplicationsFromDB()
  }

  // Job management functions
  const addJob = (jobData: Omit<Job, "id" | "postedDate" | "applicants"> | Job) => {
    // If job already has an id (from database), use it; otherwise generate one
    let newJob: Job
    if ('id' in jobData && typeof jobData.id === 'number') {
      newJob = {
        ...jobData,
        postedDate: jobData.postedDate || new Date().toISOString().split("T")[0],
        applicants: jobData.applicants || 0,
      } as Job
    } else {
      newJob = {
        ...jobData,
        id: jobs.length > 0 ? Math.max(...jobs.map((j) => j.id), 0) + 1 : 1,
        postedDate: new Date().toISOString().split("T")[0],
        applicants: 0,
      } as Job
    }
    
    // Add to state, but only if not already present (avoid duplicates)
    setJobs((prev) => {
      // Check if job with this id already exists
      const exists = prev.some((j) => j.id === newJob.id)
      if (exists) {
        return prev // Don't add duplicate
      }
      // Add new job at the beginning of the list (most recent first)
      return [newJob, ...prev]
    })
  }

  const updateJob = (id: number, updates: Partial<Job>) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...updates } : job)))
  }

  const deleteJob = (id: number) => {
    setJobs((prev) => prev.filter((job) => job.id !== id))
    setApplications((prev) => prev.filter((app) => app.jobId !== id))
  }

  // Application management functions
  const applyToJob = async (
    jobId: number,
    applicationData: Omit<Application, "id" | "appliedDate" | "status" | "rating">,
  ) => {
    try {
      // Find the job in the current jobs list to get its MongoDB ObjectId
      const job = jobs.find((j) => j.id === jobId);
      
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found in current jobs list. Please refresh the page.`);
      }
      
      const mongoJobId = (job as any)?.mongoId;
      
      // Check if this is a mock job (doesn't have mongoId)
      if (!mongoJobId) {
        // This is a mock job, not from the database
        // We can't apply to mock jobs - they don't exist in the database
        throw new Error(
          `This is a sample job and cannot be applied to. Please apply to jobs posted by employers.`
        );
      }
      
      console.log('📤 Applying to job:', {
        numericJobId: jobId,
        mongoJobId: mongoJobId,
        jobTitle: job.title,
        company: job.company,
      });
      
      // Call the API to save the application to the database
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          jobId: mongoJobId, // Use MongoDB ObjectId string (we've already verified it exists)
          coverLetter: '',
          resume: '',
        }),
      })

      if (!response.ok) {
        // Clone the response so we can read it multiple times if needed
        const responseClone = response.clone();
        let errorData;
        let errorMessage = 'Failed to submit application';
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, try to get text from the clone
          try {
            const errorText = await responseClone.text();
            errorMessage = errorText || `Server returned: ${response.status} ${response.statusText}`;
          } catch (textError) {
            // If both fail, use status info
            errorMessage = `Server returned: ${response.status} ${response.statusText}`;
          }
        }
        
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData || 'Could not parse error response',
          jobId: jobId,
          mongoJobId: mongoJobId,
          errorMessage,
        });
        
        throw new Error(errorMessage);
      }

      const application = await response.json()

      // Update local state after successful API call
      // Ensure jobId matches the numeric ID used in the frontend
      const newApplication: Application = {
        ...applicationData,
        jobId: jobId, // Use the numeric jobId from the frontend (not the MongoDB ObjectId from API)
        id: parseInt(application.id) || Math.max(...(applications.length > 0 ? applications.map((a) => a.id) : [0]), 0) + 1,
        appliedDate: application.appliedDate || new Date().toISOString().split("T")[0],
        status: application.status || "Pending",
        rating: application.rating || 0,
      }
      
      // Add to applications state - this will trigger hasApplied to return true
      setApplications((prev) => {
        // Check if already exists to avoid duplicates
        const exists = prev.some((app) => app.jobId === jobId)
        if (exists) {
          return prev
        }
        return [newApplication, ...prev]
      })

      // Update job applicant count
      setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, applicants: job.applicants + 1 } : job)))
      
      // Refresh applications from database to ensure data is up to date
      await fetchApplicationsFromDB()
      
      // Refresh jobs to ensure data is up to date
      await refreshJobs()
    } catch (error: any) {
      console.error('Failed to apply to job:', error)
      // You might want to show a toast notification here
      throw error // Re-throw so calling code can handle it
    }
  }

  const updateApplicationStatus = (applicationId: number, status: Application["status"]) => {
    setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, status } : app)))
  }

  const rateApplicant = (applicationId: number, rating: number) => {
    setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, rating } : app)))
  }

  const removeApplication = (applicationId: number) => {
    const application = applications.find((app) => app.id === applicationId)
    if (application) {
      // Decrease job applicant count
      setJobs((prev) =>
        prev.map((job) =>
          job.id === application.jobId ? { ...job, applicants: Math.max(0, job.applicants - 1) } : job,
        ),
      )
    }
    setApplications((prev) => prev.filter((app) => app.id !== applicationId))
  }

  const hasApplied = (jobId: number) => {
    // Check if any application exists for this jobId
    return applications.some((app) => app.jobId === jobId)
  }

  // Job seeker functions
  const toggleSaveJob = (jobId: number) => {
    setSavedJobs((prev) => (prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]))
  }

  // Search and filtering functions
  const updateFilters = (newFilters: Partial<JobFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const getFilteredJobs = (): Job[] => {
    return jobs.filter((job) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.requirements.some((req) => req.toLowerCase().includes(searchLower)) ||
          job.location.toLowerCase().includes(searchLower)

        if (!matchesSearch) return false
      }

      // Job type filter
      if (filters.jobTypes.length > 0 && !filters.jobTypes.includes(job.type)) {
        return false
      }

      // Location filter
      if (filters.locations.length > 0) {
        const matchesLocation = filters.locations.some(
          (loc) => job.location.includes(loc) || (loc === "Remote" && job.remote),
        )
        if (!matchesLocation) return false
      }

      // Remote filter
      if (filters.remote && !job.remote) {
        return false
      }

      // Experience filter
      if (filters.experience.length > 0 && !filters.experience.includes(job.experience)) {
        return false
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(job.category)) {
        return false
      }

      // Salary filter
      const jobSalaryMin = parseSalaryValue(job.salary)
      if (filters.salaryMin > 0 && jobSalaryMin < filters.salaryMin) {
        return false
      }

      return true
    })
  }

  const searchJobs = (query: string): Job[] => {
    if (!query.trim()) return jobs

    const searchLower = query.toLowerCase()
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        job.requirements.some((req) => req.toLowerCase().includes(searchLower)) ||
        job.location.toLowerCase().includes(searchLower) ||
        job.description.toLowerCase().includes(searchLower),
    )
  }

  // Analytics functions
  const getJobStats = (employerId?: number) => {
    const relevantJobs = employerId ? jobs.filter((job) => job.employerId === employerId) : jobs
    const totalApplications = applications.filter((app) => relevantJobs.some((job) => job.id === app.jobId)).length

    return {
      totalJobs: relevantJobs.length,
      activeJobs: relevantJobs.filter((job) => job.status === "Active").length,
      totalApplications,
      responseRate:
        totalApplications > 0
          ? Math.round(
              (applications.filter(
                (app) => app.status !== "Pending" && relevantJobs.some((job) => job.id === app.jobId),
              ).length /
                totalApplications) *
                100,
            )
          : 0,
    }
  }

  const contextValue: JobContextType = {
    jobs,
    applications,
    savedJobs,
    filters,
    loading,
    addJob,
    updateJob,
    deleteJob,
    refreshJobs,
    applyToJob,
    updateApplicationStatus,
    rateApplicant,
    removeApplication,
    hasApplied,
    toggleSaveJob,
    updateFilters,
    getFilteredJobs,
    searchJobs,
    getJobStats,
  }

  return <JobContext.Provider value={contextValue}>{children}</JobContext.Provider>
}

export function useJobs() {
  const context = useContext(JobContext)
  if (context === undefined) {
    throw new Error("useJobs must be used within a JobProvider")
  }
  return context
}
