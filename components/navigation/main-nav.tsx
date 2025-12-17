"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import {
  Briefcase,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  Search,
  Building,
  Users,
  FileText,
  BookmarkIcon,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { EnhancedSearch } from "@/components/enhanced-search"

interface MainNavProps {
  currentPage?: string
  showSearch?: boolean
  notifications?: number
  userType?: "job-seeker" | "employer" | "guest"
}

export function MainNav({ currentPage = "", showSearch = false, notifications = 0, userType: propUserType = "guest" }: MainNavProps) {
  const router = useRouter()
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [userType, setUserType] = useState<"job-seeker" | "employer" | "guest">(propUserType)
  const [isCheckingAuth, setIsCheckingAuth] = useState(propUserType === "guest")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [imageKey, setImageKey] = useState(0) // For cache-busting

  // Fetch user profile data
  useEffect(() => {
    async function fetchUserProfile() {
      if (userType === "guest") return
      
      try {
        // Fetch user profile
        const userResponse = await fetch(`/api/user/profile?t=${Date.now()}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          
          // If employer, also fetch company profile data
          if (userType === "employer") {
            try {
              const employerResponse = await fetch(`/api/employer/profile?t=${Date.now()}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                },
              })
              
              if (employerResponse.ok) {
                // Check if response is JSON before parsing
                const contentType = employerResponse.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                  const employerData = await employerResponse.json()
                  // Merge employer company data with user data
                  setUserProfile({ ...userData, ...employerData })
                } else {
                  // Response is not JSON (might be HTML redirect)
                  console.warn('Employer profile response is not JSON, using user data only')
                  setUserProfile(userData)
                }
              } else if (employerResponse.status === 401 || employerResponse.status === 403) {
                // Authentication error - clear profile and don't retry
                console.warn('Authentication error when fetching employer profile')
                setUserProfile(userData)
              } else {
                setUserProfile(userData)
              }
            } catch (err) {
              console.error('Error fetching employer profile:', err)
              setUserProfile(userData)
            }
          } else {
            setUserProfile(userData)
          }
          
          setImageKey(prev => prev + 1)
        } else if (userResponse.status === 401 || userResponse.status === 403) {
          // Authentication error - user is not logged in or token expired
          setUserProfile(null)
          setUserType("guest")
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
      }
    }

    fetchUserProfile()

    // Listen for profile updates
    const handleProfileUpdate = (event?: CustomEvent) => {
      console.log('MainNav: Profile updated event received, refreshing...', event?.detail)
      setImageKey(prev => prev + 1)
      fetchUserProfile()
    }

    const handleEmployerProfileUpdate = (event?: CustomEvent) => {
      console.log('MainNav: Employer profile updated event received, refreshing...', event?.detail)
      setImageKey(prev => prev + 1)
      fetchUserProfile()
    }

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener)
    window.addEventListener('employerProfileUpdated', handleEmployerProfileUpdate as EventListener)
    window.addEventListener('focus', fetchUserProfile)

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener)
      window.removeEventListener('employerProfileUpdated', handleEmployerProfileUpdate as EventListener)
      window.removeEventListener('focus', fetchUserProfile)
    }
  }, [userType])

  // Auto-detect user type if not provided
  useEffect(() => {
    if (propUserType !== "guest") {
      setUserType(propUserType)
      setIsCheckingAuth(false)
      return
    }

    // Check authentication status
    async function checkAuth() {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
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
            setUserType(data.role || "guest")
          } else {
            // Response is not JSON (might be HTML redirect)
            const text = await response.text()
            if (!text.includes('<!DOCTYPE') && !text.includes('<html')) {
              try {
                const data = JSON.parse(text)
                setUserType(data.role || "guest")
              } catch {
                setUserType("guest")
              }
            } else {
              setUserType("guest")
            }
          }
        } else {
          setUserType("guest")
        }
      } catch (err) {
        setUserType("guest")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [propUserType])

  const mockNotifications = [
    {
      id: 1,
      message: userType === "employer" ? "New application received" : "Application status updated",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: 2,
      message: userType === "employer" ? "Job posting approved" : "New job matches your profile",
      time: "1 day ago",
      unread: true,
    },
    {
      id: 3,
      message: "Profile viewed by employer",
      time: "2 days ago",
      unread: false,
    },
  ]

  const getNavLinks = () => {
    switch (userType) {
      case "job-seeker":
        return [
          { href: "/job-seeker", label: "Jobs", active: currentPage === "jobs" },
        ]
      case "employer":
        return [
          { href: "/employer", label: "Dashboard", active: currentPage === "dashboard" },
        ]
      default:
        return [
          { href: "#jobs", label: "Jobs", active: false },
          { href: "#companies", label: "Companies", active: false },
          { href: "#about", label: "About", active: false },
        ]
    }
  }

  const getUserInfo = () => {
    if (userType === "guest") return null

    // Use actual profile data if available
    if (userProfile) {
      if (userType === "job-seeker") {
        const firstName = userProfile.firstName || ''
        const lastName = userProfile.lastName || ''
        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
        return {
          name: `${firstName} ${lastName}`.trim() || 'User',
          email: userProfile.email || '',
          avatar: userProfile.photo || "/placeholder-user.jpg",
          fallback: initials || 'U',
        }
      } else {
        // For employer, fetch company data
        return {
          name: userProfile.name || userProfile.firstName || 'Company',
          email: userProfile.email || '',
          avatar: userProfile.photo || "/placeholder-user.jpg",
          fallback: (userProfile.name || 'CO').substring(0, 2).toUpperCase(),
        }
      }
    }

    // Fallback to default values
    return {
      name: userType === "job-seeker" ? "User" : "Company",
      email: "",
      avatar: userType === "job-seeker" ? "/placeholder-user.jpg" : "/placeholder-user.jpg",
      fallback: userType === "job-seeker" ? "U" : "CO",
    }
  }

  const navLinks = getNavLinks()
  const userInfo = getUserInfo()

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center space-x-8">
            {userType === "job-seeker" ? (
              <div className="flex items-center space-x-2">
                <Briefcase className="h-8 w-8 text-primary" />
                <span className="font-geist text-2xl font-bold text-foreground">TopGrab</span>
              </div>
            ) : (
              <Link 
                href="/"
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Briefcase className="h-8 w-8 text-primary" />
                <span className="font-geist text-2xl font-bold text-foreground">TopGrab</span>
              </Link>
            )}

            {/* Desktop Navigation */}
            <div className="hidden md:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  {navLinks.map((link) => (
                    <NavigationMenuItem key={link.href}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={link.href}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            link.active
                              ? "text-foreground bg-accent"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}

                  {/* Search Jobs Button for Job Seekers */}
                  {userType === "job-seeker" && (
                    <NavigationMenuItem>
                      <Button
                        variant="outline"
                        className="ml-2"
                        onClick={() => router.push('/job-seeker')}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Search Jobs
                      </Button>
                    </NavigationMenuItem>
                  )}

                  {/* Additional Navigation for Authenticated Users */}
                  {userType !== "guest" && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-muted-foreground hover:text-foreground">
                        More
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid gap-3 p-4 w-[400px]">
                          {userType === "job-seeker" ? (
                            <>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/job-seeker/applications"
                                  className="flex items-center gap-3 p-3 rounded-md hover:bg-accent"
                                >
                                  <FileText className="h-5 w-5" />
                                  <div>
                                    <div className="font-medium">My Applications</div>
                                    <div className="text-sm text-muted-foreground">Track your job applications</div>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/job-seeker/saved"
                                  className="flex items-center gap-3 p-3 rounded-md hover:bg-accent"
                                >
                                  <BookmarkIcon className="h-5 w-5" />
                                  <div>
                                    <div className="font-medium">Saved Jobs</div>
                                    <div className="text-sm text-muted-foreground">Jobs you've bookmarked</div>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </>
                          ) : (
                            <>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/employer/jobs"
                                  className="flex items-center gap-3 p-3 rounded-md hover:bg-accent"
                                >
                                  <Briefcase className="h-5 w-5" />
                                  <div>
                                    <div className="font-medium">My Jobs</div>
                                    <div className="text-sm text-muted-foreground">Manage your job postings</div>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/employer/candidates"
                                  className="flex items-center gap-3 p-3 rounded-md hover:bg-accent"
                                >
                                  <Users className="h-5 w-5" />
                                  <div>
                                    <div className="font-medium">Candidates</div>
                                    <div className="text-sm text-muted-foreground">Browse and manage applicants</div>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </>
                          )}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          {showSearch && (
            <div className="hidden lg:flex flex-1 max-w-lg mx-8">
              <EnhancedSearch onOpenFilters={() => {}} />
            </div>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Button (Mobile) */}
            {showSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Notifications */}
            {userType !== "guest" && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {notifications}
                    </Badge>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <h3 className="font-semibold mb-3">Notifications</h3>
                      <div className="space-y-3">
                        {mockNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 rounded-lg ${
                              notification.unread ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                            }`}
                          >
                            <p className="text-sm font-manrope">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full mt-3 bg-transparent" size="sm">
                        View All Notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu or Auth Buttons */}
            {userType !== "guest" && userInfo ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8" key={`nav-avatar-${imageKey}`}>
                      <AvatarImage 
                        src={userInfo.avatar || "/placeholder.svg"} 
                        alt={userInfo.name}
                        key={`nav-img-${imageKey}-${userInfo.avatar ? 'has-photo' : 'no-photo'}`}
                      />
                      <AvatarFallback>{userInfo.fallback}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userInfo.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userInfo.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      // Direct navigation - let middleware handle authentication
                      const profilePath = userType === "job-seeker" ? "/job-seeker/profile" : "/employer/profile";
                      window.location.href = profilePath;
                    }}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      window.location.href = '/settings';
                    }}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                      } catch (e) {
                        console.error("Logout request failed:", e);
                      }
                      window.location.href = "/";
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">Login</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/auth/login/job-seeker">Job Seeker Login</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/login/employer">Employer Login</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>Sign Up</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/auth/register/job-seeker">Job Seeker Sign Up</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/register/employer">Employer Sign Up</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-4">
                  {/* Mobile User Info */}
                  {userInfo && (
                    <div className="flex items-center space-x-3 pb-4 border-b">
                      <Avatar className="h-10 w-10" key={`mobile-avatar-${imageKey}`}>
                        <AvatarImage 
                          src={userInfo.avatar || "/placeholder.svg"} 
                          alt={userInfo.name}
                          key={`mobile-img-${imageKey}-${userInfo.avatar ? 'has-photo' : 'no-photo'}`}
                        />
                        <AvatarFallback>{userInfo.fallback}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{userInfo.name}</p>
                        <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Mobile Navigation Links */}
                  <div className="space-y-2">
                    {navLinks.map((link) => (
                      <Button
                        key={link.href}
                        variant={link.active ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href={link.href}>
                          {link.label === "Jobs" && <Search className="mr-2 h-4 w-4" />}
                          {link.label === "Dashboard" && <Building className="mr-2 h-4 w-4" />}
                          {link.label}
                        </Link>
                      </Button>
                    ))}
                    {/* Search Jobs Button for Job Seekers (Mobile) */}
                    {userType === "job-seeker" && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => router.push('/job-seeker')}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search Jobs
                      </Button>
                    )}
                  </div>

                  {/* Mobile Additional Links */}
                  {userType !== "guest" && (
                    <div className="space-y-2 pt-4 border-t">
                      {/* Profile link in mobile menu */}
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start cursor-pointer"
                        onClick={() => {
                          // Direct navigation - let middleware handle authentication
                          const profilePath = userType === "job-seeker" ? "/job-seeker/profile" : "/employer/profile";
                          window.location.href = profilePath;
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        View Profile
                      </Button>
                      {userType === "job-seeker" ? (
                        <>
                          <Button variant="ghost" className="w-full justify-start" asChild>
                            <Link href="/job-seeker/applications">
                              <FileText className="mr-2 h-4 w-4" />
                              My Applications
                            </Link>
                          </Button>
                          <Button variant="ghost" className="w-full justify-start" asChild>
                            <Link href="/job-seeker/saved">
                              <BookmarkIcon className="mr-2 h-4 w-4" />
                              Saved Jobs
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" className="w-full justify-start" asChild>
                            <Link href="/employer/jobs">
                              <Briefcase className="mr-2 h-4 w-4" />
                              My Jobs
                            </Link>
                          </Button>
                          <Button variant="ghost" className="w-full justify-start" asChild>
                            <Link href="/employer/candidates">
                              <Users className="mr-2 h-4 w-4" />
                              Candidates
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mobile Auth Actions */}
                  {userType !== "guest" && (
                    <div className="space-y-2 pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          window.location.href = '/settings';
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={async () => {
                          try {
                            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                          } catch (e) {
                            console.error("Logout request failed:", e);
                          }
                          window.location.href = "/";
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && showMobileSearch && (
          <div className="lg:hidden py-4 border-t">
            <EnhancedSearch onOpenFilters={() => {}} />
          </div>
        )}
      </div>
    </nav>
  )
}
