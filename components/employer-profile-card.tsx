"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, Edit, MapPin, Building, Users, Calendar } from "lucide-react"

interface CompanyData {
  name: string
  industry: string
  location: string
  size: string
  founded: string
  specialties: string[]
  website?: string
  linkedin?: string
  email?: string
  phone?: string
  description?: string
  mission?: string
  culture?: string
  photo?: string
}

export function EmployerProfileCard() {
  const router = useRouter()
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageKey, setImageKey] = useState(0) // For cache-busting

  useEffect(() => {
    async function loadCompanyData() {
      try {
        // Fetch company data from database with cache-busting
        const response = await fetch(`/api/employer/profile?t=${Date.now()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        })

        if (response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            setCompanyData(data)
            // Force image refresh by updating key
            setImageKey(prev => prev + 1)
          } else {
            // Response is not JSON (might be HTML redirect)
            const text = await response.text()
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              console.warn('Received HTML instead of JSON for employer profile')
            } else {
              try {
                const data = JSON.parse(text)
                setCompanyData(data)
                setImageKey(prev => prev + 1)
              } catch {
                console.error('Failed to parse employer profile response')
              }
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          console.warn('Authentication error when fetching employer profile')
        } else {
          console.error('Failed to fetch employer profile:', response.status)
        }
      } catch (err) {
        console.error('Error loading company data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyData()

    // Listen for profile updates
    const handleProfileUpdate = (event?: CustomEvent) => {
      console.log('EmployerProfileCard: Profile updated event received, refreshing...', event?.detail)
      // Immediately update image key to force refresh
      setImageKey(prev => prev + 1)
      // Then fetch fresh data from API
      loadCompanyData()
    }

    // Also refresh when window gains focus
    const handleFocus = () => {
      loadCompanyData()
    }

    window.addEventListener('employerProfileUpdated', handleProfileUpdate)
    window.addEventListener('focus', handleFocus)
    
    // Also listen for storage events (in case profile is updated in another tab)
    window.addEventListener('storage', handleProfileUpdate)

    return () => {
      window.removeEventListener('employerProfileUpdated', handleProfileUpdate)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleProfileUpdate)
    }
  }, [])

  if (loading) {
    return (
      <Card className="sticky top-24">
        <CardHeader className="text-center pb-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted animate-pulse"></div>
          <div className="h-6 w-32 bg-muted mx-auto mb-2 animate-pulse rounded"></div>
          <div className="h-4 w-24 bg-muted mx-auto animate-pulse rounded"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const companyName = companyData?.name || 'Your Company'
  const industry = companyData?.industry || ''
  const location = companyData?.location || ''
  const size = companyData?.size || ''
  const founded = companyData?.founded || ''
  const specialties = companyData?.specialties || []

  return (
    <Card className="sticky top-24">
      <CardHeader className="text-center pb-4">
        <Avatar className="w-20 h-20 mx-auto mb-4" key={`avatar-${imageKey}-${companyData?.photo ? 'has-photo' : 'no-photo'}`}>
          <AvatarImage 
            src={companyData?.photo || `/placeholder-user.jpg?t=${imageKey}`} 
            alt={companyName}
            key={`img-${imageKey}-${companyData?.name || 'company'}`}
          />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {companyName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-geist text-xl font-semibold">{companyName}</h3>
        {industry && <p className="text-muted-foreground font-manrope">{industry}</p>}
        {/* Rating hidden for now since it's not in the data */}
      </CardHeader>
      <CardContent className="space-y-4">
        {(location || industry || size || founded) && (
          <div className="space-y-2">
            {location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {location}
              </div>
            )}
            {industry && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                {industry}
              </div>
            )}
            {size && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {size} employees
              </div>
            )}
            {founded && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Founded {founded}
              </div>
            )}
          </div>
        )}

        {specialties.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">Company Focus</h4>
            <div className="flex flex-wrap gap-1">
              {specialties.slice(0, 4).map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          className="w-full bg-transparent" 
          variant="outline"
          onClick={() => router.push('/employer/profile')}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </CardContent>
    </Card>
  )
}
