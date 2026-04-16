"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"

import { ESCROW_ABI } from "@/lib/abis"
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi"

export default function WorkroomView({ jobId }: { jobId: string }) {
  const [showDispute, setShowDispute] = useState(false)
  const { address: userAddress } = useAccount()
  
  const [jobData, setJobData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)

  const pendingActionRef = useRef<"RELEASE" | "DISPUTE" | null>(null)

  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Watch for transaction success and sync with backend
  useEffect(() => {
    if (isSuccess) {
      const action = pendingActionRef.current
      console.log("[Workroom] TX confirmed. Pending action:", action)
      if (action === "RELEASE") {
         fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/jobs/${jobId}/complete/`, { method: "POST" })
          .then(res => { if (!res.ok) throw new Error(`Backend complete failed: ${res.status}`); return res })
          .then(() => fetchStatus().then(() => setSynced(true)))
          .catch(err => console.error("[Workroom] Failed to sync RELEASE:", err))
      } else if (action === "DISPUTE") {
         fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/jobs/${jobId}/dispute/`, { method: "POST" })
          .then(res => { if (!res.ok) throw new Error(`Backend dispute failed: ${res.status}`); return res })
          .then(() => fetchStatus().then(() => setSynced(true)))
          .catch(err => console.error("[Workroom] Failed to sync DISPUTE:", err))
      } else {
        console.warn("[Workroom] TX confirmed but no pending action was set in ref!")
      }
    }
  }, [isSuccess])

  const fetchStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/jobs/${jobId}/status/`)
      if (res.ok) {
        const data = await res.json()
        setJobData(data)
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [jobId])

  if (loading) return <div className="text-center py-20">Loading Workroom...</div>
  if (!jobData) return <div className="text-center py-20 text-red-500">Failed to load job data</div>

  const isClient = userAddress?.toLowerCase() === jobData?.client_address?.toLowerCase()
  const isFreelancer = userAddress?.toLowerCase() === jobData?.freelancer_address?.toLowerCase()
  
  // Only the client and freelancer should normally see this page
  const isAuthorized = isClient || isFreelancer

  const handleReleasePayment = async () => {
    try {
      pendingActionRef.current = "RELEASE" // flag for the watcher
      const contractId = jobData.escrow_contract_id
      const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`;
      writeContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'releasePayment',
        args: [BigInt(contractId)],
      })
    } catch (error) {
      console.error("Error releasing payment:", error)
    }
  }

  const handleRaiseDispute = async () => {
    try {
      pendingActionRef.current = "DISPUTE" // flag for the watcher
      const contractId = jobData.escrow_contract_id
      const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`;
      writeContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'raiseDispute',
        args: [BigInt(contractId)],
      })
    } catch (error) {
      console.error("Error raising dispute:", error)
    }
  }

  const handleSubmitWork = async () => {
    try {
      // Stub for file submission implementation (link or ipfs)
      toast.error("Work Submission placeholder. Currently off-chain collaboration takes place here.")
    } catch (error) {
      console.error("Error submitting work:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {!isAuthorized && <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">Warning: You are not recognized as the client or the freelancer for this job. You are in read-only mode.</div>}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{jobData.title}</h1>
            <p className="text-muted-foreground mt-2">Workroom • {isClient ? "Client View" : isFreelancer ? "Freelancer View" : "Public View"}</p>
          </div>
          <Badge className="bg-accent/20 text-accent border-accent/30">{jobData.proposal_status}</Badge>
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
              <p className="text-muted-foreground">The workroom serves as your decentralized hub to complete the requested deliverables. Off-chain coordination and work submission occurs here until completion is approved via smart contract.</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow Contract ID</span>
                <span className="text-foreground font-semibold">#{jobData.escrow_contract_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Smart Contract Status</span>
                <span className="text-foreground font-semibold">{jobData.escrow_status}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-muted-foreground">Freelancer Wallet</span>
                <span className="text-foreground font-semibold text-sm truncate max-w-[150px]">{jobData.freelancer_address}</span>
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
            {isConfirming && !synced && <div className="text-yellow-500 mb-2 font-bold animate-pulse">Waiting for Web3 Transaction to confirm...</div>}
            {isSuccess && !synced && <div className="text-green-500 mb-2 font-bold">Transaction Confirmed! Syncing...</div>}
            
            {isClient ? (
              <>
                <Button
                  onClick={handleReleasePayment}
                  disabled={isPending || isConfirming || jobData.escrow_status !== "ACTIVE" || jobData.proposal_status === "COMPLETED"}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold disabled:opacity-50"
                  size="lg"
                >
                  {isPending ? "Confirming..." : "Release Payment"}
                </Button>
                <Button
                  onClick={() => setShowDispute(true)}
                  disabled={isPending || isConfirming || jobData.escrow_status !== "ACTIVE"}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  size="lg"
                >
                  Raise Dispute
                </Button>
              </>
            ) : isFreelancer ? (
              <>
                <Button
                  onClick={handleSubmitWork}
                  disabled={jobData.escrow_status !== "ACTIVE" || jobData.proposal_status === "COMPLETED"}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:opacity-50"
                  size="lg"
                >
                  {jobData.proposal_status === "COMPLETED" ? "Payment Released!" : "Submit Work"}
                </Button>
                <Button
                  onClick={() => setShowDispute(true)}
                  disabled={isPending || isConfirming || jobData.escrow_status !== "ACTIVE"}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  size="lg"
                >
                  Raise Dispute
                </Button>
              </>
            ) : null}

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Escrow Locked Budget</p>
              <p className="text-2xl font-bold text-accent">{jobData.escrow_balance_eth || jobData.budget_eth} ETH</p>
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
