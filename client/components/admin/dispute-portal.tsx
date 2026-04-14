"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"

interface Dispute {
  _id: string
  title: string
  client_address: string
  freelancer_address: string
  budget_eth: number
  status: string
  created_at?: string
}

export default function DisputePortal() {
  const { data: session } = useSession()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [clientShare, setClientShare] = useState(50)
  const [isResolving, setIsResolving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!session?.user) return;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const token = (session as any)?.accessToken;
        const res = await fetch(`${apiUrl}/admin/disputes/`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        if (res.ok) {
            const data = await res.json()
            setDisputes(data)
        }
      } catch (err) {
        console.error("Failed to fetch disputes:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchDisputes()
  }, [session])

  const handleResolveDispute = async () => {
    if (!selectedDispute || !session?.user) return

    setIsResolving(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const token = (session as any)?.accessToken;
      
      const res = await fetch(`${apiUrl}/jobs/${selectedDispute._id}/resolve-dispute/`, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
              client_share: clientShare
          })
      })

      if (res.ok) {
          const data = await res.json()
          console.log(`Dispute resolved successfully: ${data.tx_hash}`)
          setDisputes((prev) => prev.map((d) => (d._id === selectedDispute._id ? { ...d, status: "RESOLVED" } : d)))
          setSelectedDispute(null)
      } else {
          console.error("Failed to resolve dispute:", await res.text())
      }
    } catch (error) {
      console.error("Error resolving dispute:", error)
    } finally {
      setIsResolving(false)
    }
  }

  if (loading) {
      return <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading disputes...</div>
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
          {disputes.filter(d => d.status !== "RESOLVED").length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No active disputes to resolve</p>
              </CardContent>
            </Card>
          ) : (
            disputes.filter(d => d.status !== "RESOLVED").map((dispute) => (
              <Card
                key={dispute._id}
                onClick={() => setSelectedDispute(dispute)}
                className={`bg-card border-border cursor-pointer transition ${
                  selectedDispute?._id === dispute._id ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-foreground">{dispute.title}</h3>
                    <Badge className="bg-destructive/20 border-destructive/40 text-destructive">
                      {dispute.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Client: {dispute.client_address}</p>
                    <p>Freelancer: {dispute.freelancer_address}</p>
                    <p>Budget: {dispute.budget_eth} ETH</p>
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
                    Client: {((Number.parseFloat(selectedDispute.budget_eth.toString()) * clientShare) / 100).toFixed(4)} ETH
                  </p>
                  <p className="text-foreground">
                    Freelancer: {((Number.parseFloat(selectedDispute.budget_eth.toString()) * (100 - clientShare)) / 100).toFixed(4)}{" "}
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
