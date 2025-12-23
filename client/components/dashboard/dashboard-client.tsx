"use client"

import { useState } from "react"
import JobCard from "@/components/dashboard/job-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  description: string
  budget: string
  status: "OPEN" | "PROPOSAL_ACCEPTED" | "ACTIVE" | "COMPLETED"
  createdAt: string
}

// Mock data - replace with actual API calls
const mockJobs: Job[] = [
  {
    id: "1",
    title: "Build React Dashboard",
    description: "Create a responsive dashboard with charts and analytics",
    budget: "2.5",
    status: "OPEN",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Smart Contract Audit",
    description: "Review and audit Solidity smart contract",
    budget: "5.0",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

export default function DashboardClient({ userAddress }: { userAddress?: string }) {
  const [jobs, setJobs] = useState<Job[]>(mockJobs)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your jobs and proposals</p>
        </div>
        <Link href="/jobs/create">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Post Job
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {["All", "Open", "Active", "Completed"].map((filter) => (
          <button
            key={filter}
            className="px-4 py-2 rounded-lg border border-border bg-card/50 hover:bg-card text-foreground transition whitespace-nowrap"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No jobs yet</p>
          <Link href="/jobs/create">
            <Button className="bg-primary hover:bg-primary/90">Post Your First Job</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
