"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  MapPin,
  Mail,
  Phone,
  Globe,
  Users,
  Calendar,
  Edit,
  Save,
  X,
  Upload,
  Star,
  Briefcase,
  Award,
  Plus,
  Linkedin,
} from "lucide-react";
import { MainNav } from "@/components/navigation/main-nav";



interface UserProfile {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: 'job-seeker' | 'employer';
    createdAt: string;
}

export default function EmployerProfile() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>("/placeholder-user.jpg");
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState({ firstName: '', lastName: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [companyData, setCompanyData] = useState({
    name: "",
    industry: "",
    size: "",
    founded: "",
    location: "",
    website: "",
    linkedin: "",
    email: "",
    phone: "",
    description: "",
    mission: "",
    specialties: [] as string[],
    photo: "",
  });

  const [newSpecialty, setNewSpecialty] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Fetch user profile
        const userResponse = await fetch('/api/user/profile', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (userResponse.ok) {
          // Check if response is JSON before parsing
          const contentType = userResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const userData: UserProfile = await userResponse.json();
            setProfile(userData);
            setEditedData({ firstName: userData.firstName, lastName: userData.lastName });
          } else {
            // Response is not JSON (might be HTML redirect)
            const text = await userResponse.text()
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              router.replace('/auth/login/employer');
              return
            }
            try {
              const userData: UserProfile = JSON.parse(text);
              setProfile(userData);
              setEditedData({ firstName: userData.firstName, lastName: userData.lastName });
            } catch {
              document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              router.replace('/auth/login/employer');
              return
            }
          }
        } else if (userResponse.status === 401 || userResponse.status === 403) {
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          router.replace('/auth/login/employer');
          return
        }

        // Fetch employer company data from database
        const employerResponse = await fetch('/api/employer/profile', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (employerResponse.ok) {
          // Check if response is JSON before parsing
          const contentType = employerResponse.headers.get('content-type')
          let employerData
          if (contentType && contentType.includes('application/json')) {
            employerData = await employerResponse.json();
          } else {
            // Response is not JSON (might be HTML redirect)
            const text = await employerResponse.text()
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              // Skip employer data if HTML redirect
              return
            }
            try {
              employerData = JSON.parse(text);
            } catch {
              // Skip employer data if parsing fails
              return
            }
          }
          setCompanyData({
            name: employerData.name || '',
            industry: employerData.industry || '',
            size: employerData.size || '',
            founded: employerData.founded || '',
            location: employerData.location || '',
            website: employerData.website || '',
            linkedin: employerData.linkedin || '',
            email: employerData.email || '',
            phone: employerData.phone || '',
            description: employerData.description || '',
            mission: employerData.mission || '',
            specialties: employerData.specialties || [],
            photo: employerData.photo || '',
          });
          // Set company logo from database photo
          if (employerData.photo) {
            setCompanyLogo(employerData.photo);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        toast({
          title: "Error",
          description: "Could not load profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, []);



  const profileCompleteness = 92;
  const rating = 0; // No default rating

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

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
      // Update user profile (firstName, lastName)
      if (profile) {
        const userResponse = await retryFetch('/api/user/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(editedData),
        });

        if (userResponse.ok) {
          // Check if response is JSON before parsing
          const contentType = userResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const updatedProfile = await userResponse.json();
            setProfile(updatedProfile);
          } else {
            // Response is not JSON - try to parse or skip
            const text = await userResponse.text()
            if (!text.includes('<!DOCTYPE') && !text.includes('<html')) {
              try {
                const updatedProfile = JSON.parse(text);
                setProfile(updatedProfile);
              } catch {
                console.error('Failed to parse updated profile response')
              }
            }
          }
        } else {
          console.error('Failed to update user profile');
        }
      }

      // Validate URLs if provided (but don't require them)
      if (companyData.website && !isValidUrl(companyData.website)) {
        toast({
          title: "Error",
          description: "Please enter a valid website URL (e.g., https://example.com)",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      if (companyData.linkedin && !isValidUrl(companyData.linkedin)) {
        toast({
          title: "Error",
          description: "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/company/example)",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Validate email format if provided (but don't require it)
      if (companyData.email && companyData.email.trim() && !companyData.email.includes("@")) {
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Save company data to database with retry logic
      console.log('📤 Sending employer profile update to database:', companyData);
      const employerResponse = await retryFetch('/api/employer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(companyData),
      });

      if (employerResponse.ok) {
        // Check if response is JSON before parsing
        const contentType = employerResponse.headers.get('content-type')
        let updatedEmployer
        if (contentType && contentType.includes('application/json')) {
          updatedEmployer = await employerResponse.json();
        } else {
          // Response is not JSON - try to parse or skip
          const text = await employerResponse.text()
          if (!text.includes('<!DOCTYPE') && !text.includes('<html')) {
            try {
              updatedEmployer = JSON.parse(text);
            } catch {
              console.error('Failed to parse updated employer response')
              // Continue anyway - the update might have succeeded
            }
          }
        }
        if (updatedEmployer) {
          console.log('✅ Employer profile saved to database:', updatedEmployer);
        }
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        // Dispatch custom event to notify EmployerProfileCard to refresh immediately
        window.dispatchEvent(new CustomEvent('employerProfileUpdated', { detail: { photo: updatedEmployer.photo } }));
        // Force a page refresh after a short delay to ensure all components update
        setTimeout(() => {
            window.location.reload();
        }, 300);
      } else {
        const errorData = await employerResponse.json();
        console.error('❌ Failed to save employer profile:', errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to save company profile",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      toast({
        title: "Error",
        description: "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const base64String = reader.result as string;
        setCompanyLogo(base64String);
        // Update companyData with the photo
        setCompanyData((prev) => ({
          ...prev,
          photo: base64String,
        }));
        toast({
          title: "Image loaded",
          description: "Click Save to update your company logo",
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
  };

  const handleRemoveLogo = () => {
    setCompanyLogo("/company-logo.png");
    setCompanyData((prev) => ({
      ...prev,
      photo: '',
    }));
    toast({
      title: "Logo removed",
      description: "Click Save to remove your company logo",
    });
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !companyData.specialties.includes(newSpecialty.trim())) {
      setCompanyData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()],
      }));
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setCompanyData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== specialty),
    }));
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Could not load profile data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav currentPage="profile" userType="employer" showSearch={false} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Company Header Section */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Company Logo */}
                  <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={companyData.photo || companyLogo || "/placeholder-user.jpg"} alt={companyData.name} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {companyData.name ? companyData.name.substring(0, 2).toUpperCase() : 'CO'}
                    </AvatarFallback>
                    </Avatar>
                  {isEditing ? (
                    <>
                      <input
                        type="file"
                        id="company-logo-upload"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                      <div className="absolute bottom-0 right-0 flex gap-1">
                        <Button
                          size="icon"
                          className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                          onClick={() => document.getElementById("company-logo-upload")?.click()}
                          title="Upload new logo"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        {companyData.photo && (
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90"
                            onClick={handleRemoveLogo}
                            title="Remove logo"
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
                      title="Edit profile"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  )}
                    </div>

                {/* Company Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                              id="name"
                              value={companyData.name}
                              onChange={(e) => setCompanyData((prev) => ({ ...prev, name: e.target.value }))}
                              className="text-2xl font-bold"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="industry">Industry</Label>
                            <Select
                              value={companyData.industry}
                              onValueChange={(value) => setCompanyData((prev) => ({ ...prev, industry: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Healthcare">Healthcare</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Education">Education</SelectItem>
                                <SelectItem value="Retail">Retail</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="location">Location</Label>
                              <Input
                                id="location"
                                value={companyData.location}
                                onChange={(e) => setCompanyData((prev) => ({ ...prev, location: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="size">Company Size</Label>
                              <Select
                                value={companyData.size}
                                onValueChange={(value) => setCompanyData((prev) => ({ ...prev, size: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1-10">1-10 employees</SelectItem>
                                  <SelectItem value="10-50">10-50 employees</SelectItem>
                                  <SelectItem value="50-200">50-200 employees</SelectItem>
                                  <SelectItem value="200+">200+ employees</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="founded">Founded Year</Label>
                              <Input
                                id="founded"
                                value={companyData.founded}
                                onChange={(e) => setCompanyData((prev) => ({ ...prev, founded: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h1 className="text-4xl font-bold text-foreground mb-2">
                            {companyData.name || 'Your Company Name'}
                          </h1>
                          {companyData.industry && (
                            <p className="text-xl text-muted-foreground mb-3">
                              {companyData.industry}
                            </p>
                          )}
                          
                          {/* Rating - only show if rating exists */}
                          {rating > 0 && (
                            <div className="flex items-center gap-2 mb-4">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-5 w-5 ${
                                    i < Math.floor(rating)
                                      ? 'fill-primary text-primary'
                                      : 'fill-none text-muted-foreground'
                                  }`}
                                />
                              ))}
                              <span className="text-sm font-medium text-muted-foreground">
                                ({rating})
                              </span>
                            </div>
                          )}

                          {/* Company Details - only show if data exists */}
                          {(companyData.location || companyData.size || companyData.founded) && (
                            <div className="space-y-2 mb-4">
                              {companyData.location && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{companyData.location}</span>
                                </div>
                              )}
                              {companyData.size && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Users className="h-4 w-4" />
                                  <span>{companyData.size} employees</span>
                                </div>
                              )}
                              {companyData.founded && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Building className="h-4 w-4" />
                                  <span>Founded {companyData.founded}</span>
                                </div>
                              )}
                            </div>
                          )}
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
                        <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Contact Links - only show if data exists */}
                  {(companyData.website || companyData.linkedin || companyData.email || companyData.phone) && (
                    <div className="flex gap-2 flex-wrap">
                      {companyData.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={companyData.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            Website
                          </a>
                        </Button>
                      )}
                      {companyData.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={companyData.linkedin} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-4 w-4 mr-2" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {companyData.email && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${companyData.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </a>
                        </Button>
                      )}
                      {companyData.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${companyData.phone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Phone
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Profile Content */}
          <div className="space-y-6">
              {/* Company Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={companyData.description}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      placeholder="Describe your company, what you do, and what makes you unique..."
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {companyData.description || 'No description added yet. Click Edit Profile to add one.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Mission Statement */}
              <Card>
                <CardHeader>
                  <CardTitle>Mission Statement</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={companyData.mission}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, mission: e.target.value }))}
                      rows={3}
                      placeholder="What is your company's mission and vision?"
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {companyData.mission || 'No mission statement added yet. Click Edit Profile to add one.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card>
                <CardHeader>
                  <CardTitle>Specialties</CardTitle>
                </CardHeader>
                <CardContent>
                  {companyData.specialties.length === 0 && !isEditing ? (
                    <p className="text-muted-foreground text-sm">
                      No specialties added yet. Click Edit Profile to add some.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {companyData.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="text-sm py-1 px-3 flex items-center gap-1">
                          {specialty}
                          {isEditing && (
                            <button
                              onClick={() => handleRemoveSpecialty(specialty)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {isEditing && (
                        <div className="flex gap-2 w-full mt-2">
                          <Input
                            placeholder="Add a specialty"
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddSpecialty()}
                          />
                          <Button onClick={handleAddSpecialty} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

