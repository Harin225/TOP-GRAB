"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X, MapPin, Briefcase, DollarSign } from "lucide-react"
import { useJobs } from "@/lib/job-context"

interface EnhancedSearchProps {
  onOpenFilters: () => void
}

export function EnhancedSearch({ onOpenFilters }: EnhancedSearchProps) {
  const { filters, updateFilters, getFilteredJobs } = useJobs()
  const [searchQuery, setSearchQuery] = useState(filters.search)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const popularSearches = [
    "Frontend Developer",
    "React",
    "Python",
    "Remote",
    "Senior",
    "Full Stack",
    "Designer",
    "DevOps",
    "JavaScript",
    "Node.js",
  ]

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    updateFilters({ search: query })

    if (query.length > 2) {
      // Generate suggestions based on job titles, companies, and skills
      const allJobs = getFilteredJobs()
      const titleSuggestions = allJobs
        .filter((job) => job.title.toLowerCase().includes(query.toLowerCase()))
        .map((job) => job.title)
        .slice(0, 3)

      const companySuggestions = allJobs
        .filter((job) => job.company.toLowerCase().includes(query.toLowerCase()))
        .map((job) => job.company)
        .slice(0, 2)

      setSuggestions([...new Set([...titleSuggestions, ...companySuggestions])])
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    updateFilters({ search: "" })
    setShowSuggestions(false)
  }

  const activeFiltersCount =
    filters.jobTypes.length +
    filters.locations.length +
    filters.experience.length +
    filters.categories.length +
    (filters.remote ? 1 : 0) +
    (filters.salaryMin > 0 ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-primary transition-colors duration-200" />
            <Input
              placeholder="Search jobs, companies, or skills..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={onOpenFilters}
            className="flex items-center gap-2 relative bg-transparent hover:bg-accent hover:scale-105 transition-all duration-200"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3 hover:bg-accent transition-all duration-200 animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    handleSearch(suggestion)
                    setShowSuggestions(false)
                  }}
                >
                  <Search className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span className="font-manrope">{suggestion}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Popular Searches */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
          <span className="text-sm text-muted-foreground mr-2">Popular:</span>
          {popularSearches.slice(0, 6).map((search, index) => (
            <Badge
              key={search}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleSearch(search)}
            >
              {search}
            </Badge>
          ))}
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {filters.jobTypes.map((type, index) => (
            <Badge
              key={type}
              variant="outline"
              className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Briefcase className="h-3 w-3" />
              {type}
              <X
                className="h-3 w-3 cursor-pointer hover:scale-125 transition-transform duration-200"
                onClick={() =>
                  updateFilters({
                    jobTypes: filters.jobTypes.filter((t) => t !== type),
                  })
                }
              />
            </Badge>
          ))}
          {filters.locations.map((location, index) => (
            <Badge
              key={location}
              variant="outline"
              className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              style={{ animationDelay: `${(filters.jobTypes.length + index) * 50}ms` }}
            >
              <MapPin className="h-3 w-3" />
              {location}
              <X
                className="h-3 w-3 cursor-pointer hover:scale-125 transition-transform duration-200"
                onClick={() =>
                  updateFilters({
                    locations: filters.locations.filter((l) => l !== location),
                  })
                }
              />
            </Badge>
          ))}
          {filters.remote && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              Remote Only
              <X
                className="h-3 w-3 cursor-pointer hover:scale-125 transition-transform duration-200"
                onClick={() => updateFilters({ remote: false })}
              />
            </Badge>
          )}
          {filters.salaryMin > 0 && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <DollarSign className="h-3 w-3" />${filters.salaryMin.toLocaleString()}+
              <X
                className="h-3 w-3 cursor-pointer hover:scale-125 transition-transform duration-200"
                onClick={() => updateFilters({ salaryMin: 0 })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
