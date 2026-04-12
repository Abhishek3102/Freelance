"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { ESCROW_ABI } from '@/lib/abis'

export default function EscrowPage() {
  const params = useParams()
  const jobId = params?.jobId as string

  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [jobData, setJobData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // After deposit TX confirms: sync backend then redirect to Workroom
  useEffect(() => {
    if (isSuccess && jobId) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      fetch(`${apiUrl}/jobs/${jobId}/fund/`, { method: "POST" })
        .then(() => router.push(`/workroom/${jobId}`))
        .catch(err => console.error("Failed to sync fund status:", err))
    }
  }, [isSuccess, jobId])

  useEffect(() => {
    if (!jobId) return

    const fetchJobStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${apiUrl}/jobs/${jobId}/status/`)
        if (response.ok) {
          const data = await response.json()
          setJobData(data)
          
          // Auto-reconcile: if on-chain is ACTIVE but DB is still old status, sync it
          if (data.escrow_status === "ACTIVE" && data.proposal_status === "Proposal accepted, waiting for escrow funding.") {
            fetch(`${apiUrl}/jobs/${jobId}/fund/`, { method: "POST" })
              .catch(err => console.error("Auto-reconcile failed:", err))
          }
        }
      } catch (e) {
        console.error("Failed to fetch job status", e)
      } finally {
        setLoading(false)
      }
    }
    fetchJobStatus()
  }, [jobId])

  const handleDeposit = async () => {
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`; // Ensure this is set in .env.local
    if (!escrowAddress) {
        console.error("Escrow contract address not found");
        return;
    }
    if (!jobData || jobData.escrow_contract_id === undefined || jobData.escrow_contract_id === null) {
        console.error("On-chain contract ID not available for this job yet.");
        return;
    }

    try {
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [BigInt(jobData.escrow_contract_id)],
        value: parseEther(jobData.budget_eth.toString()),
      })
    } catch (error) {
      console.error("Error depositing:", error)
    }
  }

  if (loading) {
    return <div className="min-h-screen py-12 text-center text-white bg-black">Loading escrow details...</div>
  }

  if (!jobData) {
    return <div className="min-h-screen py-12 text-center text-white bg-black">Failed to load escrow details.</div>
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Fund Escrow</h1>
          <p className="text-zinc-400">
            Send funds to the smart contract. They'll be released when work is complete.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Job Details */}
          <Card className="bg-zinc-900 border-zinc-800 text-white md:col-span-2">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Title</p>
                <p className="text-white font-semibold">{jobData.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Client Address</p>
                    <p className="text-white font-semibold font-mono text-sm break-all">{jobData.client_address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Freelancer Address</p>
                    <p className="text-white font-semibold font-mono text-sm break-all">{jobData.freelancer_address}</p>
                  </div>
              </div>
              <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Job Status</p>
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      {jobData.proposal_status.replace("_", " ")}
                    </Badge>
                  </div>
                  {jobData.escrow_status !== "NONE" && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Escrow Status</p>
                        <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">
                          {jobData.escrow_status}
                        </Badge>
                      </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Deposit Card */}
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Required Amount</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-accent">{jobData.budget_eth}</p>
                    <p className="text-xs text-zinc-400">ETH</p>
                </div>
              </div>

              {hash && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">Transaction Hash</p>
                  <p className="text-xs font-mono text-accent break-all">{hash}</p>
                </div>
              )}

              {isConfirming && <div className="text-xs text-yellow-500">Confirming transaction...</div>}
              {isSuccess && <div className="text-xs text-green-500">Transaction confirmed!</div>}

              <Button
                onClick={handleDeposit}
                disabled={isPending || isConfirming || isSuccess || jobData.escrow_status !== "CREATED"}
                className={(jobData.escrow_status !== "CREATED" && jobData.escrow_status !== "NONE") ? "w-full bg-zinc-800 text-zinc-500" : "w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"}
                size="lg"
              >
                {jobData.escrow_status === "ACTIVE" ? "Already Funded" : isSuccess ? "✓ Deposited" : isPending || isConfirming ? "Depositing..." : "Deposit Funds"}
              </Button>

              {jobData.escrow_status === "ACTIVE" && (
                <Button
                  onClick={() => router.push(`/workroom/${jobId}`)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  size="lg"
                >
                  Go to Workroom →
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Note */}
        <Card className="bg-zinc-900 border-zinc-800 mt-6 text-white">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Smart Contract Security</h3>
                <p className="text-sm text-zinc-400">
                  Funds are held in a non-custodial smart contract using On-Chain ID #{jobData.escrow_contract_id}. Neither you nor the freelancer can withdraw until both
                  agree or arbitration is resolved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
