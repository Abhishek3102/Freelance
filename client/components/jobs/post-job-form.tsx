"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAccount } from "wagmi"

export default function PostJobForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    skills: [] as string[],
  })

  const skillOptions = ["React", "Node.js", "Smart Contracts", "UI/UX Design", "DevOps", "Python", "TypeScript", "Web3"]

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }))
  }

  const { address } = useAccount()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      console.error("No wallet connected")
      return
    }
    setIsLoading(true)

    try {
      await api.postJob(formData, address)
      // Redirect to the matches page for the newly created job
      // In a real app we'd get the ID back from the API
      router.push("/jobs/1/matches") 
    } catch (error) {
      console.error("Error posting job:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Post a Job</CardTitle>
        <CardDescription>Describe your project. AI will find the perfect match.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Job Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g., Build React Dashboard"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Job Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-40"
              placeholder="Describe the project in detail (important for AI matching)"
              required
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Budget (ETH)</label>
            <input
              type="number"
              step="0.1"
              value={formData.budget}
              onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="2.5"
              required
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Required Skills</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {skillOptions.map((skill) => (
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

          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isLoading ? "Posting Job..." : "Post Job"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
