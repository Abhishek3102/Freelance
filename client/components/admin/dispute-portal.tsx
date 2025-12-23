"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Dispute {
  id: string
  jobId: string
  jobTitle: string
  clientAddress: string
  freelancerAddress: string
  budget: string
  status: "PENDING" | "RESOLVED"
  createdAt: string
}

const mockDisputes: Dispute[] = [
  {
    id: "1",
    jobId: "1",
    jobTitle: "Build React Dashboard",
    clientAddress: "0x1234...",
    freelancerAddress: "0x5678...",
    budget: "2.5",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
]

export default function DisputePortal() {
  const [disputes, setDisputes] = useState<Dispute[]>(mockDisputes)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [clientShare, setClientShare] = useState(50)
  const [isResolving, setIsResolving] = useState(false)

  const handleResolveDispute = async () => {
    if (!selectedDispute) return

    setIsResolving(true)
    try {
      const freelancerShare = 100 - clientShare
      // TODO: Call POST /disputes/{id}/resolve API endpoint
      console.log(`Resolving dispute: Client ${clientShare}%, Freelancer ${freelancerShare}%`)

      setDisputes((prev) => prev.map((d) => (d.id === selectedDispute.id ? { ...d, status: "RESOLVED" as const } : d)))
      setSelectedDispute(null)
    } catch (error) {
      console.error("Error resolving dispute:", error)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dispute Resolution</h1>
        <p className="text-muted-foreground">Arbitrate and resolve disputes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disputes List */}
        <div className="lg:col-span-2 space-y-4">
          {disputes.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No disputes to resolve</p>
              </CardContent>
            </Card>
          ) : (
            disputes.map((dispute) => (
              <Card
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className={`bg-card border-border cursor-pointer transition ${
                  selectedDispute?.id === dispute.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-foreground">{dispute.jobTitle}</h3>
                    <Badge
                      className={
                        dispute.status === "PENDING"
                          ? "bg-destructive/20 border-destructive/40 text-destructive"
                          : "bg-accent/20 border-accent/40 text-accent"
                      }
                    >
                      {dispute.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Client: {dispute.clientAddress}</p>
                    <p>Freelancer: {dispute.freelancerAddress}</p>
                    <p>Budget: {dispute.budget} ETH</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Resolution Panel */}
        {selectedDispute && (
          <Card className="bg-card border-border h-fit">
            <CardHeader>
              <CardTitle>Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Client Share: {clientShare}%</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={clientShare}
                  onChange={(e) => setClientShare(Number.parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">Freelancer Share: {100 - clientShare}%</p>
              </div>

              <div className="bg-card/50 border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Distribution</p>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">
                    Client: {((Number.parseFloat(selectedDispute.budget) * clientShare) / 100).toFixed(4)} ETH
                  </p>
                  <p className="text-foreground">
                    Freelancer: {((Number.parseFloat(selectedDispute.budget) * (100 - clientShare)) / 100).toFixed(4)}{" "}
                    ETH
                  </p>
                </div>
              </div>

              <Button
                onClick={handleResolveDispute}
                disabled={isResolving}
                className="w-full bg-primary hover:bg-primary/90 font-semibold"
                size="lg"
              >
                {isResolving ? "Resolving..." : "Resolve Dispute"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
