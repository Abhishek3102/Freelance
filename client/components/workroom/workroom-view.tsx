"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function WorkroomView({ jobId }: { jobId: string }) {
  const [showDispute, setShowDispute] = useState(false)
  const userAddress = typeof window !== "undefined" ? localStorage.getItem("walletAddress") : null

  // Mock data
  const jobData = {
    id: jobId,
    title: "Build React Dashboard",
    description: "Create a responsive dashboard with charts and analytics",
    budget: "2.5",
    freelancer: "Alex Chen",
    freelancerAddress: "0x123...",
    clientAddress: "0x456...",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }

  const isClient = userAddress?.toLowerCase() === jobData.clientAddress.toLowerCase()

  const handleReleasePayment = async () => {
    try {
      // TODO: Call POST /jobs/{id}/release API endpoint
      console.log("Releasing payment...")
    } catch (error) {
      console.error("Error releasing payment:", error)
    }
  }

  const handleRaiseDispute = async () => {
    try {
      // TODO: Call POST /jobs/{id}/dispute API endpoint
      console.log("Raising dispute...")
    } catch (error) {
      console.error("Error raising dispute:", error)
    }
  }

  const handleSubmitWork = async () => {
    try {
      // TODO: Call POST /jobs/{id}/submit API endpoint
      console.log("Submitting work...")
    } catch (error) {
      console.error("Error submitting work:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{jobData.title}</h1>
            <p className="text-muted-foreground mt-2">Workroom • Active</p>
          </div>
          <Badge className="bg-accent/20 text-accent border-accent/30">Active</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{jobData.description}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground font-semibold">{jobData.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due</span>
                <span className="text-foreground font-semibold">{jobData.dueDate.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-muted-foreground">Freelancer</span>
                <span className="text-foreground font-semibold">{jobData.freelancer}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <Card className="bg-card border-border h-fit">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isClient ? (
              <>
                <Button
                  onClick={handleReleasePayment}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  size="lg"
                >
                  Release Payment
                </Button>
                <Button
                  onClick={() => setShowDispute(true)}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  size="lg"
                >
                  Raise Dispute
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleSubmitWork}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  size="lg"
                >
                  Submit Work
                </Button>
                <Button
                  onClick={() => setShowDispute(true)}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  size="lg"
                >
                  Raise Dispute
                </Button>
              </>
            )}

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Budget</p>
              <p className="text-2xl font-bold text-accent">{jobData.budget} ETH</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispute Modal */}
      {showDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-card border-border max-w-md w-full">
            <CardHeader>
              <CardTitle>Raise Dispute</CardTitle>
              <CardDescription>This will initiate arbitration. Both parties will be notified.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => setShowDispute(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleRaiseDispute()
                  setShowDispute(false)
                }}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                Confirm
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
