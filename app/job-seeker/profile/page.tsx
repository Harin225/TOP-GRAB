"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, Edit, MapPin, Mail, Phone, Globe, Linkedin, Github, 
  Upload, Save, X, Plus, Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MainNav } from '@/components/navigation/main-nav';

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
    profileCompleteness?: number;
    rating?: number;
}

const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
);

export default function JobSeekerProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedData, setEditedData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: '',
        title: '',
        bio: '',
        skills: [] as string[],
        website: '',
        linkedin: '',
        github: '',
        availability: '',
        salaryExpectation: '',
        photo: '',
    });
    const [newSkill, setNewSkill] = useState('');

    // Empty profile structure for new accounts
    const emptyProfile: UserProfile = {
        _id: '',
        username: '',
        firstName: '',
        lastName: '',
        role: 'job-seeker',
        createdAt: new Date().toISOString(),
        email: '',
        phone: '',
        location: '',
        title: '',
        bio: '',
        skills: [],
        website: '',
        linkedin: '',
        github: '',
        availability: '',
        salaryExpectation: '',
        profileCompleteness: 0,
        rating: 0,
    };

    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await fetch('/api/job-seeker/profile', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.ok) {
                    // Check if response is JSON before parsing
                    const contentType = response.headers.get('content-type')
                    let data: UserProfile
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        // Response is not JSON (might be HTML redirect)
                        const text = await response.text()
                        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                            console.error('Authentication error: Redirecting to login');
                            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                            window.location.href = '/auth/login/job-seeker';
                            return
                        }
                        try {
                            data = JSON.parse(text);
                        } catch {
                            setError('Failed to parse profile data.');
                            setProfile(emptyProfile);
                            return
                        }
                    }
                    // Use only the data from backend, no merging with defaults
                    setProfile(data);
                    // Initialize editedData with fetched data (or empty if not present)
                    setEditedData({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        location: data.location || '',
                        title: data.title || '',
                        bio: data.bio || '',
                        skills: data.skills || [],
                        website: data.website || '',
                        linkedin: data.linkedin || '',
                        github: data.github || '',
                        availability: data.availability || '',
                        salaryExpectation: data.salaryExpectation || '',
                        photo: data.photo || '',
                    });
                } else if (response.status === 401 || response.status === 403) {
                    console.error('Authentication error: Redirecting to login');
                    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    window.location.href = '/auth/login/job-seeker';
                } else {
                    // Check if response is JSON before parsing
                    const contentType = response.headers.get('content-type')
                    let errorData
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    } else {
                        const text = await response.text().catch(() => '')
                        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                            errorData = { message: 'Session expired. Please log in again.' }
                        } else {
                            try {
                                errorData = JSON.parse(text)
                            } catch {
                                errorData = { message: 'Unknown error' }
                            }
                        }
                    }
                    setError(errorData.message || 'Failed to fetch profile data.');
                    // Set empty profile on error
                    setProfile(emptyProfile);
                }
            } catch (err) {
                console.error('Network error during profile fetch:', err);
                setError('Could not connect to the server to load profile.');
                // Set empty profile on error
                setProfile(emptyProfile);
            } finally {
                setLoading(false);
            }
        }
        
        fetchProfile();
    }, []);

    // Retry function for network requests
    const retryFetch = async (
        url: string,
        options: RequestInit,
        maxRetries: number = 3,
        delayMs: number = 1000
    ): Promise<Response> => {
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                // Don't retry on client errors (4xx) except network errors
                if (response.ok || (response.status >= 400 && response.status < 500)) {
                    return response;
                }
                // Retry on server errors (5xx) or network failures
                if (attempt < maxRetries) {
                    console.log(`Retry attempt ${attempt}/${maxRetries} for ${url}`);
                    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                    continue;
                }
                return response;
            } catch (error: any) {
                lastError = error;
                console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                } else {
                    throw error;
                }
            }
        }
        
        throw lastError;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Prepare the data to be sent to the API
            const updatePayload = {
                // Required fields
                firstName: editedData.firstName?.trim() || '',
                lastName: editedData.lastName?.trim() || '',
                
                // Profile details being edited (these will be pushed to database)
                title: editedData.title?.trim() || '', // Job Title
                email: editedData.email?.trim() || '',
                phone: editedData.phone?.trim() || '',
                location: editedData.location?.trim() || '',
                
                // Additional profile fields
                bio: editedData.bio?.trim() || '',
                skills: Array.isArray(editedData.skills) ? editedData.skills.map((s: string) => s.trim()).filter(Boolean) : [],
                website: editedData.website?.trim() || '',
                linkedin: editedData.linkedin?.trim() || '',
                github: editedData.github?.trim() || '',
                availability: editedData.availability?.trim() || '',
                salaryExpectation: editedData.salaryExpectation?.trim() || '',
                photo: editedData.photo || '',
            };

            console.log('📤 Sending profile update request:', {
                title: updatePayload.title,
                email: updatePayload.email,
                phone: updatePayload.phone,
                location: updatePayload.location,
            });

            // Update all profile fields with retry logic
            const response = await retryFetch('/api/job-seeker/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(updatePayload),
            });

            const responseText = await response.text();
            console.log('📥 API Response status:', response.status);
            console.log('📥 API Response:', responseText);

            if (response.ok) {
                let updatedProfile;
                try {
                    updatedProfile = JSON.parse(responseText);
                } catch (e) {
                    console.error('❌ Failed to parse API response:', e);
                    throw new Error('Invalid response from server');
                }
                
                console.log('✅ Profile updated successfully:', {
                    title: updatedProfile.title,
                    email: updatedProfile.email,
                    phone: updatedProfile.phone,
                    location: updatedProfile.location,
                });
                
                // Use the response from API (already contains all updated fields from database)
                setProfile(updatedProfile);
                // Also update editedData to match the saved profile
                setEditedData({
                    firstName: updatedProfile.firstName || '',
                    lastName: updatedProfile.lastName || '',
                    email: updatedProfile.email || '',
                    phone: updatedProfile.phone || '',
                    location: updatedProfile.location || '',
                    title: updatedProfile.title || '',
                    bio: updatedProfile.bio || '',
                    skills: updatedProfile.skills || [],
                    website: updatedProfile.website || '',
                    linkedin: updatedProfile.linkedin || '',
                    github: updatedProfile.github || '',
                    availability: updatedProfile.availability || '',
                    salaryExpectation: updatedProfile.salaryExpectation || '',
                    photo: updatedProfile.photo || '',
                });
                setIsEditing(false);
                setNewSkill('');
                toast({
                    title: "Success",
                    description: "Profile updated successfully",
                });
                // Dispatch event to notify ProfileCard to refresh immediately
                window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { photo: updatedProfile.photo } }));
                // Also update local state immediately to show preview
                setProfile(updatedProfile);
                // Force a page refresh after a short delay to ensure all components update
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            } else {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    errorData = { message: responseText || `Failed to update profile (Status: ${response.status})` };
                }
                console.error('❌ Profile update failed:', {
                    status: response.status,
                    error: errorData,
                });
                toast({
                    title: "Error",
                    description: errorData.message || "Failed to update profile",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            toast({
                title: "Error",
                description: "Could not update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl text-red-500">Access Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => router.replace('/auth/login/job-seeker')} className="mt-4">
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const displayProfile = profile || emptyProfile;
    // Use editedData photo if editing, otherwise use profile photo
    const displayPhoto = isEditing && editedData.photo ? editedData.photo : displayProfile.photo;
    const fullName = `${displayProfile.firstName} ${displayProfile.lastName}`;
    const initials = `${displayProfile.firstName?.[0] || ''}${displayProfile.lastName?.[0] || ''}`;

    return (
        <div className="min-h-screen bg-background">
            <MainNav currentPage="profile" userType="job-seeker" showSearch={false} />
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Profile Header Section */}
                    <Card className="mb-6 border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Profile Picture */}
                                <div className="relative">
                                    <Avatar className="w-32 h-32">
                                        <AvatarImage src={displayPhoto || "/placeholder-user.jpg"} alt={fullName} />
                                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="file"
                                                id="photo-upload"
                                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        // Validate file type
                                                        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                                                        if (!validTypes.includes(file.type)) {
                                                            toast({
                                                                title: "Invalid file type",
                                                                description: "Please upload a JPEG, PNG, GIF, or WebP image",
                                                                variant: "destructive",
                                                            });
                                                            return;
                                                        }
                                                        
                                                        // Validate file size (5MB max)
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            toast({
                                                                title: "File too large",
                                                                description: "Image size must be less than 5MB",
                                                                variant: "destructive",
                                                            });
                                                            return;
                                                        }
                                                        
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setEditedData({ ...editedData, photo: reader.result as string });
                                                            toast({
                                                                title: "Image loaded",
                                                                description: "Click Save to update your profile picture",
                                                            });
                                                        };
                                                        reader.onerror = () => {
                                                            toast({
                                                                title: "Error",
                                                                description: "Failed to read image file",
                                                                variant: "destructive",
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <div className="absolute bottom-0 right-0 flex gap-1">
                                                <Button 
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                                                    onClick={() => document.getElementById("photo-upload")?.click()}
                                                    title="Upload new photo"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                </Button>
                                                {editedData.photo && (
                                                    <Button 
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90"
                                                        onClick={() => {
                                                            setEditedData({ ...editedData, photo: '' });
                                                            toast({
                                                                title: "Photo removed",
                                                                description: "Click Save to remove your profile picture",
                                                            });
                                                        }}
                                                        title="Remove photo"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <Button 
                                            size="icon"
                                            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <Upload className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Profile Info */}
                                <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                {isEditing ? (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="firstName">First Name *</Label>
                                            <Input
                                                                id="firstName"
                                                value={editedData.firstName}
                                                onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                                                                required
                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="lastName">Last Name *</Label>
                                            <Input
                                                                id="lastName"
                                                value={editedData.lastName}
                                                onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="title">Job Title</Label>
                                                        <Input
                                                            id="title"
                                                            value={editedData.title}
                                                            onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                                                            placeholder="e.g., Senior Frontend Developer"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="email">Email</Label>
                                                        <Input
                                                            id="email"
                                                            type="email"
                                                            value={editedData.email}
                                                            onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="phone">Phone</Label>
                                                        <Input
                                                            id="phone"
                                                            type="tel"
                                                            value={editedData.phone}
                                                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="location">Location</Label>
                                                        <Input
                                                            id="location"
                                                            value={editedData.location}
                                                            onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                                                            placeholder="e.g., San Francisco, CA"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                                <>
                                                    <h1 className="text-4xl font-bold text-foreground mb-2">
                                                        {fullName || 'Your Name'}
                                                    </h1>
                                                    {displayProfile.title && (
                                                        <p className="text-xl text-muted-foreground mb-3">
                                                            {displayProfile.title}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            
                                            {!isEditing && (
                                                <>
                                                    {/* Rating */}
                                                    {displayProfile.rating && displayProfile.rating > 0 && (
                                                        <div className="flex items-center gap-2 mb-4">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`h-5 w-5 ${
                                                                        i < Math.floor(displayProfile.rating || 0)
                                                                            ? 'fill-primary text-primary'
                                                                            : 'fill-none text-muted-foreground'
                                                                    }`}
                                                                />
                                                            ))}
                                                            <span className="text-sm font-medium text-muted-foreground">
                                                                ({displayProfile.rating.toFixed(1)})
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Contact Information */}
                                                    <div className="space-y-2 mb-4">
                                                        {displayProfile.location && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <MapPin className="h-4 w-4" />
                                                                <span>{displayProfile.location}</span>
                                                            </div>
                                                        )}
                                                        {displayProfile.email && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Mail className="h-4 w-4" />
                                                                <span>{displayProfile.email}</span>
                                                            </div>
                                                        )}
                                                        {displayProfile.phone && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Phone className="h-4 w-4" />
                                                                <span>{displayProfile.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Edit Profile Button */}
                                        {!isEditing ? (
                                            <Button 
                                                onClick={() => setIsEditing(true)}
                                                className="bg-primary hover:bg-primary/90 text-white"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Profile
                                            </Button>
                                        ) : (
                            <div className="flex gap-2">
                                        <Button 
                                            onClick={handleSave}
                                            disabled={isSaving}
                                                    className="bg-primary hover:bg-primary/90"
                                        >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditing(false);
                                                        // Reset editedData to current profile
                                                        if (profile) {
                                                            setEditedData({
                                                                firstName: profile.firstName || '',
                                                                lastName: profile.lastName || '',
                                                                email: profile.email || '',
                                                                phone: profile.phone || '',
                                                                location: profile.location || '',
                                                                title: profile.title || '',
                                                                bio: profile.bio || '',
                                                                skills: profile.skills || [],
                                                                website: profile.website || '',
                                                                linkedin: profile.linkedin || '',
                                                                github: profile.github || '',
                                                                availability: profile.availability || '',
                                                                salaryExpectation: profile.salaryExpectation || '',
                                                                photo: profile.photo || '',
                                                            });
                                                            setNewSkill('');
                                                        }
                                                    }}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* External Links */}
                            <div className="flex gap-2">
                                        {displayProfile.website && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={displayProfile.website} target="_blank" rel="noopener noreferrer">
                                                    <Globe className="h-4 w-4 mr-2" />
                                                    Website
                                                </a>
                                            </Button>
                                        )}
                                        {displayProfile.linkedin && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={displayProfile.linkedin} target="_blank" rel="noopener noreferrer">
                                                    <Linkedin className="h-4 w-4 mr-2" />
                                                    LinkedIn
                                                </a>
                                        </Button>
                                        )}
                                        {displayProfile.github && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={displayProfile.github} target="_blank" rel="noopener noreferrer">
                                                    <Github className="h-4 w-4 mr-2" />
                                                    GitHub
                                                </a>
                                        </Button>
                                )}
                            </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profile Content */}
                    <div className="space-y-6">
                            {/* Professional Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Professional Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isEditing ? (
                                        <Textarea
                                            value={editedData.bio}
                                            onChange={(e) => setEditedData({ ...editedData, bio: e.target.value })}
                                            rows={4}
                                            placeholder="Tell us about yourself, your experience, and what you're looking for..."
                                        />
                                    ) : (
                                        <p className="text-muted-foreground leading-relaxed">
                                            {displayProfile.bio || 'No bio added yet. Click Edit Profile to add your professional summary.'}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Skills */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Skills</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            {editedData.skills.length === 0 ? (
                                                <p className="text-muted-foreground text-sm">No skills added yet. Add your first skill below.</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {editedData.skills.map((skill, index) => (
                                                        <Badge key={index} variant="secondary" className="text-sm py-1 px-3 flex items-center gap-1">
                                                            {skill}
                                                            <button
                                                                onClick={() => {
                                                                    setEditedData({
                                                                        ...editedData,
                                                                        skills: editedData.skills.filter((_, i) => i !== index)
                                                                    });
                                                                }}
                                                                className="ml-1 hover:text-destructive"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add a skill (e.g., JavaScript, React, Node.js)"
                                                    value={newSkill}
                                                    onChange={(e) => setNewSkill(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (newSkill.trim() && !editedData.skills.includes(newSkill.trim())) {
                                                                setEditedData({
                                                                    ...editedData,
                                                                    skills: [...editedData.skills, newSkill.trim()]
                                                                });
                                                                setNewSkill('');
                                                            }
                                                        }
                                                    }}
                                                />
                                                <Button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (newSkill.trim() && !editedData.skills.includes(newSkill.trim())) {
                                                            setEditedData({
                                                                ...editedData,
                                                                skills: [...editedData.skills, newSkill.trim()]
                                                            });
                                                            setNewSkill('');
                                                        }
                                                    }}
                                                    size="sm"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {displayProfile.skills && displayProfile.skills.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {displayProfile.skills.map((skill, index) => (
                                                        <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground text-sm">No skills added yet. Click Edit Profile to add your skills.</p>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Availability and Salary Expectation */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Availability</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isEditing ? (
                                            <Input
                                                value={editedData.availability}
                                                onChange={(e) => setEditedData({ ...editedData, availability: e.target.value })}
                                                placeholder="e.g., Open to work"
                                            />
                                        ) : (
                                            displayProfile.availability ? (
                                                <Button variant="outline" className="bg-primary/10 border-primary text-primary hover:bg-primary/20">
                                                    {displayProfile.availability}
                                                </Button>
                                            ) : (
                                                <p className="text-muted-foreground text-sm">Not specified</p>
                                            )
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Salary Expectation</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isEditing ? (
                                            <Input
                                                value={editedData.salaryExpectation}
                                                onChange={(e) => setEditedData({ ...editedData, salaryExpectation: e.target.value })}
                                                placeholder="e.g., $120k - $160k"
                                            />
                                        ) : (
                                            displayProfile.salaryExpectation ? (
                                                <p className="text-2xl font-semibold text-foreground">
                                                    {displayProfile.salaryExpectation}
                                                </p>
                                            ) : (
                                                <p className="text-muted-foreground text-sm">Not specified</p>
                                            )
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
