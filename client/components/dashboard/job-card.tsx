"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface JobCardProps {
  job: {
    id: string
    title: string
    description: string
    budget: string
    status: "OPEN" | "PROPOSAL_ACCEPTED" | "ACTIVE" | "COMPLETED"
    createdAt: string
  }
}

export default function JobCard({ job }: JobCardProps) {
  const statusColors = {
    OPEN: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    PROPOSAL_ACCEPTED: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    ACTIVE: "bg-accent/20 text-accent border-accent/30",
    COMPLETED: "bg-muted/20 text-muted-foreground border-muted/30",
  }

  const actionButton = {
    OPEN: { label: "View Matches", href: `/jobs/${job.id}/matches` },
    PROPOSAL_ACCEPTED: { label: "Fund Escrow", href: `/jobs/${job.id}/escrow` },
    ACTIVE: { label: "Go to Workroom", href: `/workroom/${job.id}` },
    COMPLETED: { label: "View Details", href: `/jobs/${job.id}` },
  }

  const action = actionButton[job.status]

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition">
      <CardHeader>
        <Badge className={statusColors[job.status]}>{job.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2">{job.description}</p>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <span className="text-xl font-bold text-accent">{job.budget} ETH</span>
          <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</span>
        </div>

        <Link href={action.href} className="w-full">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {action.label}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
