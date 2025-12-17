"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"
import { useJobs } from "@/lib/job-context"

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function FilterPanel({ isOpen, onClose }: FilterPanelProps) {
  const { filters, updateFilters } = useJobs()
  const [salaryMin, setSalaryMin] = useState<number>(filters.salaryMin || 0)
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(filters.jobTypes || [])
  const [selectedLocations, setSelectedLocations] = useState<string[]>(filters.locations || [])
  const [isRemote, setIsRemote] = useState<boolean>(filters.remote || false)

  useEffect(() => {
    if (isOpen) {
      setSalaryMin(filters.salaryMin || 0)
      setSelectedJobTypes(filters.jobTypes || [])
      setSelectedLocations(filters.locations || [])
      setIsRemote(filters.remote || false)
    }
  }, [isOpen, filters])

  if (!isOpen) return null

  const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]
  const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Remote"]

  const handleJobTypeChange = (jobType: string, checked: boolean) => {
    if (checked) {
      setSelectedJobTypes((prev) => [...prev, jobType])
    } else {
      setSelectedJobTypes((prev) => prev.filter((type) => type !== jobType))
    }
  }

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations((prev) => [...prev, location])
    } else {
      setSelectedLocations((prev) => prev.filter((loc) => loc !== location))
    }
  }

  const handleApply = () => {
    updateFilters({
      jobTypes: selectedJobTypes,
      locations: selectedLocations,
      remote: isRemote,
      salaryMin,
    })
    onClose()
  }

  const handleClear = () => {
    setSelectedJobTypes([])
    setSelectedLocations([])
    setIsRemote(false)
    setSalaryMin(0)
    updateFilters({
      jobTypes: [],
      locations: [],
      remote: false,
      salaryMin: 0,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-96 bg-background h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        <Card className="h-full rounded-none border-l shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="font-geist">Filters</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Job Type */}
            <div className="animate-in fade-in slide-in-from-right duration-300 delay-100">
              <h3 className="font-semibold mb-3">Job Type</h3>
              <div className="space-y-3">
                {jobTypes.map((type, index) => (
                  <div
                    key={type}
                    className="flex items-center space-x-3 animate-in fade-in slide-in-from-left duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      id={type}
                      checked={selectedJobTypes.includes(type)}
                      onCheckedChange={(checked) => handleJobTypeChange(type, checked as boolean)}
                      className="transition-all duration-200"
                    />
                    <Label
                      htmlFor={type}
                      className="font-manrope cursor-pointer hover:text-primary transition-colors duration-200"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="animate-in fade-in slide-in-from-right duration-300 delay-200">
              <h3 className="font-semibold mb-3">Location</h3>
              <div className="space-y-3">
                {locations.map((location, index) => (
                  <div
                    key={location}
                    className="flex items-center space-x-3 animate-in fade-in slide-in-from-left duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      id={location}
                      checked={selectedLocations.includes(location)}
                      onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                      className="transition-all duration-200"
                    />
                    <Label
                      htmlFor={location}
                      className="font-manrope cursor-pointer hover:text-primary transition-colors duration-200"
                    >
                      {location}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Remote Work */}
            <div className="animate-in fade-in slide-in-from-right duration-300 delay-300">
              <h3 className="font-semibold mb-3">Work Style</h3>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="remote"
                  checked={isRemote}
                  onCheckedChange={(checked) => setIsRemote(checked as boolean)}
                  className="transition-all duration-200"
                />
                <Label
                  htmlFor="remote"
                  className="font-manrope cursor-pointer hover:text-primary transition-colors duration-200"
                >
                  Remote Only
                </Label>
              </div>
            </div>

            {/* Salary Range */}
            <div className="animate-in fade-in slide-in-from-right duration-300 delay-400">
              <h3 className="font-semibold mb-3">Minimum Salary</h3>
              <div className="space-y-4">
                <Slider
                  value={[salaryMin]}
                  onValueChange={(value) => setSalaryMin(value[0])}
                  max={300000}
                  min={0}
                  step={5000}
                  className="w-full"
                />
                <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 transition-all duration-200">
                  ${salaryMin.toLocaleString()}+ per year
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-6 border-t animate-in fade-in slide-in-from-bottom duration-300 delay-500">
              <Button
                className="w-full hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={handleApply}
              >
                Apply Filters
              </Button>
              <Button
                variant="outline"
                className="w-full bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-all duration-200"
                onClick={handleClear}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
