"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, Edit, MapPin, Briefcase, User } from "lucide-react"
import Link from "next/link"

interface UserProfile {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: 'job-seeker' | 'employer';
    createdAt: string;
    email?: string;
    phone?: string;
    location?: string;
    title?: string;
    bio?: string;
    skills?: string[];
    website?: string;
    linkedin?: string;
    github?: string;
    availability?: string;
    salaryExpectation?: string;
    photo?: string;
}

export function ProfileCard() {
    const router = useRouter()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [imageKey, setImageKey] = useState(0) // For cache-busting

    useEffect(() => {
        async function fetchProfile() {
            try {
                // Add cache-busting parameter to ensure fresh data
                const response = await fetch(`/api/user/profile?t=${Date.now()}`, {
                    method: 'GET',
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
                        const data: UserProfile = await response.json()
                        setProfile(data)
                        // Force image refresh by updating key
                        setImageKey(prev => prev + 1)
                    } else {
                        // Response is not JSON (might be HTML redirect)
                        const text = await response.text()
                        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                            console.warn('Received HTML instead of JSON for user profile')
                            setProfile(null)
                        } else {
                            try {
                                const data: UserProfile = JSON.parse(text)
                                setProfile(data)
                                setImageKey(prev => prev + 1)
                            } catch {
                                setProfile(null)
                            }
                        }
                    }
                } else if (response.status === 401 || response.status === 403) {
                    // Authentication error - set to null
                    setProfile(null)
                } else {
                    // If not authenticated or error, set to null (will show blank state)
                    setProfile(null)
                }
            } catch (err) {
                console.error('Error fetching profile:', err)
                setProfile(null)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()

        // Refresh profile when updated or window regains focus
        const handleProfileUpdate = (event?: CustomEvent) => {
            console.log('ProfileCard: Profile updated event received, refreshing...', event?.detail)
            // Immediately update image key to force refresh
            setImageKey(prev => prev + 1)
            // Then fetch fresh data from API
            fetchProfile()
        }
        const handleFocus = () => {
            fetchProfile()
        }
        
        window.addEventListener('profileUpdated', handleProfileUpdate)
        window.addEventListener('focus', handleFocus)
        
        // Also listen for storage events (in case profile is updated in another tab)
        window.addEventListener('storage', handleProfileUpdate)
        
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate)
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('storage', handleProfileUpdate)
        }
    }, [])

    // Check if profile is essentially empty (new account)
    const isProfileEmpty = !profile || (
        !profile.firstName && 
        !profile.lastName && 
        !profile.title && 
        !profile.location && 
        (!profile.skills || profile.skills.length === 0)
    )

    const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : ''
    const initials = profile 
        ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
        : ''

    if (loading) {
        return (
            <Card className="sticky top-24">
                <CardHeader className="text-center pb-4">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted animate-pulse" />
                    <div className="h-6 w-32 mx-auto mb-2 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 mx-auto bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-muted rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    </div>
                    <div>
                        <div className="h-4 w-16 mb-2 bg-muted rounded animate-pulse" />
                        <div className="flex flex-wrap gap-1">
                            <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="h-9 w-full bg-muted rounded animate-pulse" />
                </CardContent>
            </Card>
        )
    }

    // Show blank/empty state for new accounts
    if (isProfileEmpty) {
        return (
            <Card className="sticky top-24">
                <CardHeader className="text-center pb-4">
                    <Avatar className="w-20 h-20 mx-auto mb-4">
                        <AvatarFallback className="bg-muted">
                            <User className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <h3 className="font-geist text-xl font-semibold text-muted-foreground">Your Profile</h3>
                    <p className="text-sm text-muted-foreground mt-2">Complete your profile to get started</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your information to help employers find you
                        </p>
                        <Button 
                            className="w-full" 
                            onClick={() => router.push('/job-seeker/profile')}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Create Profile
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Show profile with actual data
    return (
        <Card className="sticky top-24">
            <CardHeader className="text-center pb-4">
                <Avatar className="w-20 h-20 mx-auto mb-4" key={`avatar-${imageKey}-${profile.photo ? 'has-photo' : 'no-photo'}`}>
                    <AvatarImage 
                        src={profile.photo || `/placeholder-user.jpg?t=${imageKey}`} 
                        alt={fullName}
                        key={`img-${imageKey}-${profile._id}`}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {initials || 'U'}
                    </AvatarFallback>
                </Avatar>
                <h3 className="font-geist text-xl font-semibold">
                    {fullName || 'Your Name'}
                </h3>
                <p className="text-muted-foreground font-manrope">
                    {profile.title || 'Your Title'}
                </p>
                {profile.title && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                            <Star 
                                key={i} 
                                className={`h-4 w-4 ${
                                    i < 5 ? 'fill-primary text-primary' : 'fill-none text-muted-foreground'
                                }`} 
                            />
                        ))}
                        <span className="text-sm text-muted-foreground ml-1">(4.9)</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {(profile.location || profile.bio) && (
                    <div className="space-y-2">
                        {profile.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {profile.location}
                            </div>
                        )}
                        {profile.bio && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Briefcase className="h-4 w-4" />
                                {profile.title || 'Professional'}
                            </div>
                        )}
                    </div>
                )}

                {profile.skills && profile.skills.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Top Skills</h4>
                        <div className="flex flex-wrap gap-1">
                            {profile.skills.slice(0, 4).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                </Badge>
                            ))}
                            {profile.skills.length > 4 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{profile.skills.length - 4}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold mb-2 text-sm">Quick Stats</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Profile Views</span>
                            <span>0</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Applications</span>
                            <span>0</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Response Rate</span>
                            <span>--</span>
                        </div>
                    </div>
                </div>

                <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => router.push('/job-seeker/profile')}
                >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                </Button>
            </CardContent>
        </Card>
    )
}
