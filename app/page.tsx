"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Briefcase,
  Star,
  ArrowRight,
  Building,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { MainNav } from "@/components/navigation/main-nav"

function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    setCount(0)

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * (end || 0)))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return (
    <span className="tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [stats, setStats] = useState({ jobs: 0, jobSeekers: 0, companies: 0 })

  // Redirect logged-in job seekers to job search page
  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.role === 'job-seeker') {
            router.replace('/job-seeker')
          }
        }
      } catch (err) {
        // User not logged in or error - stay on landing page
      }
    }

    checkAuthAndRedirect()
  }, [router])

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      try {
        const response = await fetch('/api/stats', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (isMounted && data) {
          setStats({
            jobs: Number(data.jobs) || 0,
            jobSeekers: Number(data.jobSeekers) || 0,
            companies: Number(data.companies) || 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const successStories = [
    {
      name: "Sarah Chen",
      role: "Software Engineer",
      type: "job-seeker",
      icon: Users,
      color: "primary",
      testimonial:
        "Found my dream job at a tech startup within 2 weeks. The platform made it so easy to showcase my skills and connect with the right employers.",
    },
    {
      name: "TechCorp Inc.",
      role: "HR Director",
      type: "employer",
      icon: Building,
      color: "accent",
      testimonial:
        "TopGrab helped us find 5 amazing developers in just one month. The quality of candidates is exceptional and the process is streamlined.",
    },
    {
      name: "Marcus Johnson",
      role: "Marketing Manager",
      type: "job-seeker",
      icon: Users,
      color: "primary",
      testimonial:
        "The platform's matching algorithm is incredible. I received interview requests from companies that were perfect fits for my background.",
    },
    {
      name: "Emily Rodriguez",
      role: "UX Designer",
      type: "job-seeker",
      icon: Users,
      color: "primary",
      testimonial:
        "After months of searching, I found the perfect remote position through TopGrab. The application process was seamless and professional.",
    },
    {
      name: "InnovateLabs",
      role: "Startup Founder",
      type: "employer",
      icon: Building,
      color: "accent",
      testimonial:
        "As a growing startup, we needed to hire fast. TopGrab delivered quality candidates quickly, helping us build our core team in record time.",
    },
    {
      name: "David Park",
      role: "Data Scientist",
      type: "job-seeker",
      icon: Users,
      color: "primary",
      testimonial:
        "I was impressed by how well the platform understood my technical skills. Got multiple offers from top companies within 3 weeks!",
    },
    {
      name: "GlobalTech Solutions",
      role: "Talent Acquisition Lead",
      type: "employer",
      icon: Building,
      color: "accent",
      testimonial:
        "We've hired 15+ professionals through TopGrab this year. The platform saves us countless hours in recruitment and delivers excellent results.",
    },
    {
      name: "Priya Sharma",
      role: "Product Manager",
      type: "job-seeker",
      icon: Users,
      color: "primary",
      testimonial:
        "TopGrab connected me with opportunities I wouldn't have found elsewhere. Now I'm leading product strategy at an amazing company!",
    },
  ]

  const nextStories = () => {
    setCurrentStoryIndex((prev) => (prev + 3 >= successStories.length ? 0 : prev + 3))
  }

  const prevStories = () => {
    setCurrentStoryIndex((prev) => (prev - 3 < 0 ? Math.max(0, successStories.length - 3) : prev - 3))
  }

  const visibleStories = successStories.slice(currentStoryIndex, currentStoryIndex + 3)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <MainNav currentPage="home" />

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-geist text-5xl md:text-6xl font-bold text-foreground mb-6">
              Connect Talent with
              <span className="text-primary"> Opportunity</span>
            </h1>
            <p className="font-manrope text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              TopGrab bridges the gap between exceptional job seekers and forward-thinking employers. Find your
              perfect match in minutes, not months.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 rounded-xl" asChild>
                <a href="/job-seeker">
                  <Users className="mr-2 h-5 w-5" />
                  I'm Looking for Jobs
                </a>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl bg-transparent" asChild>
                <a href="/employer">
                  <Building className="mr-2 h-5 w-5" />
                  I'm Hiring Talent
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 overflow-hidden">
        {/* Background with overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url('/modern-office-collaboration.png')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="font-geist text-4xl font-bold text-foreground mb-4">Trusted by Thousands</h2>
            <p className="font-manrope text-lg text-muted-foreground">Real numbers, real impact</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Stat Card 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-card/80 backdrop-blur-sm border-2 border-primary/20 rounded-2xl p-8 text-center transform transition-all duration-500 hover:scale-105 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <div className="text-5xl font-bold text-primary mb-2 font-geist">
                  <AnimatedCounter end={stats.jobs} suffix="+" />
                </div>
                <div className="text-muted-foreground font-manrope font-medium">Active Jobs</div>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-card/80 backdrop-blur-sm border-2 border-blue-500/20 rounded-2xl p-8 text-center transform transition-all duration-500 hover:scale-105 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/20">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/10 rounded-full flex items-center justify-center transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-5xl font-bold text-blue-500 mb-2 font-geist">
                  <AnimatedCounter end={stats.jobSeekers} suffix="+" />
                </div>
                <div className="text-muted-foreground font-manrope font-medium">Job Seekers</div>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-card/80 backdrop-blur-sm border-2 border-green-500/20 rounded-2xl p-8 text-center transform transition-all duration-500 hover:scale-105 hover:border-green-500/40 hover:shadow-2xl hover:shadow-green-500/20">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-5xl font-bold text-green-500 mb-2 font-geist">
                  <AnimatedCounter end={stats.companies} suffix="+" />
                </div>
                <div className="text-muted-foreground font-manrope font-medium">Companies</div>
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-card/80 backdrop-blur-sm border-2 border-amber-500/20 rounded-2xl p-8 text-center transform transition-all duration-500 hover:scale-105 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/20">
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 rounded-full flex items-center justify-center transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <Award className="h-8 w-8 text-amber-500" />
                </div>
                <div className="text-5xl font-bold text-amber-500 mb-2 font-geist">
                  <AnimatedCounter end={95} suffix="%" />
                </div>
                <div className="text-muted-foreground font-manrope font-medium">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-geist text-4xl font-bold text-foreground mb-4">How TopGrab Works</h2>
            <p className="font-manrope text-xl text-muted-foreground max-w-2xl mx-auto">
              Our streamlined process makes job searching and hiring effortless for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Job Seekers Flow */}
            <div>
              <h3 className="font-geist text-2xl font-semibold mb-6 text-center">For Job Seekers</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Create Your Profile</h4>
                    <p className="text-muted-foreground font-manrope">
                      Build a compelling profile showcasing your skills and experience
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Browse & Apply</h4>
                    <p className="text-muted-foreground font-manrope">
                      Search through thousands of jobs and apply with one click
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Get Hired</h4>
                    <p className="text-muted-foreground font-manrope">Connect with employers and land your dream job</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employers Flow */}
            <div>
              <h3 className="font-geist text-2xl font-semibold mb-6 text-center">For Employers</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Post Your Job</h4>
                    <p className="text-muted-foreground font-manrope">
                      Create detailed job listings to attract the right candidates
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Review Applications</h4>
                    <p className="text-muted-foreground font-manrope">
                      Browse qualified candidates and manage applications efficiently
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Hire Top Talent</h4>
                    <p className="text-muted-foreground font-manrope">
                      Connect with the best candidates and build your team
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-muted/30 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-geist text-4xl font-bold text-foreground mb-4">Success Stories</h2>
            <p className="font-manrope text-xl text-muted-foreground max-w-2xl mx-auto">
              Hear from job seekers and employers who found their perfect match through TopGrab
            </p>
          </div>

          <div className="relative">
            {/* Left Navigation Button */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 h-12 w-12 rounded-full shadow-lg bg-background hover:bg-accent hover:scale-110 transition-all duration-300"
              onClick={prevStories}
              disabled={currentStoryIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* Stories Grid with transition */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-500">
              {visibleStories.map((story, index) => {
                const Icon = story.icon
                return (
                  <Card
                    key={currentStoryIndex + index}
                    className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-12 h-12 ${story.color === "primary" ? "bg-primary/10" : "bg-accent/10"} rounded-full flex items-center justify-center`}
                        >
                          <Icon className={`h-6 w-6 ${story.color === "primary" ? "text-primary" : "text-accent"}`} />
                        </div>
                        <div>
                          <CardTitle className="font-geist">{story.name}</CardTitle>
                          <CardDescription>{story.role}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${story.color === "primary" ? "fill-primary text-primary" : "fill-accent text-accent"}`}
                          />
                        ))}
                      </div>
                      <p className="font-manrope text-muted-foreground">{story.testimonial}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Right Navigation Button */}
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 h-12 w-12 rounded-full shadow-lg bg-background hover:bg-accent hover:scale-110 transition-all duration-300"
              onClick={nextStories}
              disabled={currentStoryIndex + 3 >= successStories.length}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: Math.ceil(successStories.length / 3) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStoryIndex(index * 3)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  Math.floor(currentStoryIndex / 3) === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
                aria-label={`Go to story set ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-geist text-4xl font-bold text-foreground mb-6">Ready to Transform Your Career?</h2>
            <p className="font-manrope text-xl text-muted-foreground mb-8">
              Join thousands of professionals who have already found success through TopGrab
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 rounded-xl" asChild>
                <a href="/job-seeker">
                  Register as Job Seeker
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl bg-transparent" asChild>
                <a href="/employer">
                  Register as Employer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Briefcase className="h-6 w-6 text-primary" />
                <span className="font-geist text-xl font-bold">TopGrab</span>
              </div>
              <p className="font-manrope text-muted-foreground">
                Connecting talent with opportunity through innovative job matching technology.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 font-manrope text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Browse Jobs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Career Advice
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Resume Builder
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Salary Guide
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 font-manrope text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Post Jobs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Find Candidates
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Resources
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 font-manrope text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center font-manrope text-muted-foreground">
            <p>&copy; 2025 TopGrab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
