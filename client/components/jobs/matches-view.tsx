"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Match {
  id: string
  freelancerId: string
  name: string
  skillMatch: number
  priceMatch: number
  hourlyRate: string
  skills: string[]
  portfolioSummary: string
}

const mockMatches: Match[] = [
  {
    id: "1",
    freelancerId: "free_1",
    name: "Alex Chen",
    skillMatch: 95,
    priceMatch: 88,
    hourlyRate: "0.05",
    skills: ["React", "Node.js", "TypeScript"],
    portfolioSummary: "Senior full-stack developer with 5+ years experience in Web3",
  },
  {
    id: "2",
    freelancerId: "free_2",
    name: "Jordan Smith",
    skillMatch: 87,
    priceMatch: 92,
    hourlyRate: "0.04",
    skills: ["React", "UI/UX Design", "TypeScript"],
    portfolioSummary: "Frontend specialist with strong design focus",
  },
  {
    id: "3",
    freelancerId: "free_3",
    name: "Casey Williams",
    skillMatch: 92,
    priceMatch: 85,
    hourlyRate: "0.06",
    skills: ["React", "Node.js", "Web3", "Smart Contracts"],
    portfolioSummary: "Web3 expert with blockchain background",
  },
]

export default function MatchesView({ jobId }: { jobId: string }) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [isHiring, setIsHiring] = useState(false)

  const handleHire = async (match: Match) => {
    setIsHiring(true)
    try {
      console.log("Hiring freelancer:", match)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error hiring freelancer:", error)
    } finally {
      setIsHiring(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">AI Matched Freelancers</h1>
        <p className="text-muted-foreground">Based on your job description, these freelancers are the best fit</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Matches List */}
        <div className="lg:col-span-2 space-y-4">
          {mockMatches.map((match) => (
            <Card
              key={match.id}
              onClick={() => setSelectedMatch(match)}
              className={`bg-card border-border cursor-pointer transition ${
                selectedMatch?.id === match.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{match.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{match.portfolioSummary}</p>
                  </div>
                  <span className="text-xl font-bold text-accent">${match.hourlyRate}/hr</span>
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {match.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Skill Match</p>
                    <div className="mt-2 w-full bg-border rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${match.skillMatch}%` }} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">{match.skillMatch}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price Match</p>
                    <div className="mt-2 w-full bg-border rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: `${match.priceMatch}%` }} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">{match.priceMatch}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Match Details & Hire Button */}
        {selectedMatch && (
          <Card className="bg-card border-border h-fit sticky top-24">
            <CardHeader>
              <CardTitle>{selectedMatch.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Hourly Rate</p>
                <p className="text-2xl font-bold text-accent">{selectedMatch.hourlyRate} ETH</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Match Score</p>
                <Badge variant="secondary">
                  {Math.round((selectedMatch.skillMatch + selectedMatch.priceMatch) / 2)}% Overall
                </Badge>
              </div>

              <Button
                onClick={() => handleHire(selectedMatch)}
                disabled={isHiring}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                size="lg"
              >
                {isHiring ? "Creating Contract..." : "Accept & Create Escrow"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
