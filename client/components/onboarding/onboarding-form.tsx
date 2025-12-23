"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OnboardingForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    skills: [] as string[],
    hourlyRate: "",
    portfolio: "",
  })

  const availableSkills = [
    "React",
    "Node.js",
    "Smart Contracts",
    "UI/UX Design",
    "DevOps",
    "Python",
    "TypeScript",
    "Web3",
  ]

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const walletAddress = localStorage.getItem("walletAddress")
      // TODO: Call POST /freelancers/ API endpoint
      console.log("Submitting profile:", { ...formData, walletAddress })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/dashboard")
    } catch (error) {
      console.error("Error submitting profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Create Your Profile</CardTitle>
        <CardDescription>Help clients find you with AI matching</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Your name"
              required
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Skills (Select at least 3)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSkillToggle(skill)}
                  className={`px-4 py-2 rounded-lg border transition text-sm font-medium ${
                    formData.skills.includes(skill)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Hourly Rate (ETH)</label>
            <input
              type="number"
              step="0.01"
              value={formData.hourlyRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, hourlyRate: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="0.05"
              required
            />
          </div>

          {/* Portfolio */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Portfolio Summary</label>
            <textarea
              value={formData.portfolio}
              onChange={(e) => setFormData((prev) => ({ ...prev, portfolio: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-32"
              placeholder="Brief summary of your work and experience (used for AI matching)"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isLoading ? "Creating Profile..." : "Create Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
