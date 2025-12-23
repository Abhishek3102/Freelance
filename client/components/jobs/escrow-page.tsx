"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { ESCROW_ABI } from '@/lib/abis'
import { config } from '@/lib/web3-config' // Ensure config is imported if needed, though hooks usually suffice via Provider

export default function EscrowPage({ jobId }: { jobId: string }) {
  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Mock job data (In real app, fetch via API or props)
  const jobData = {
    id: jobId,
    title: "Build React Dashboard",
    budget: "2.5",
    freelancer: "Alex Chen",
    status: "PROPOSAL_ACCEPTED",
  }

  const handleDeposit = async () => {
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`; // Ensure this is set in .env.local
    if (!escrowAddress) {
        console.error("Escrow contract address not found");
        return;
    }

    try {
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [BigInt(jobId)],
        value: parseEther(jobData.budget),
      })
    } catch (error) {
      console.error("Error depositing:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Fund Escrow</h1>
        <p className="text-muted-foreground">
          Send funds to the smart contract. They'll be released when work is complete.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job Details */}
        <Card className="bg-card border-border md:col-span-2">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Title</p>
              <p className="text-foreground font-semibold">{jobData.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Freelancer</p>
              <p className="text-foreground font-semibold">{jobData.freelancer}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                {jobData.status.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p className="text-3xl font-bold text-accent">{jobData.budget}</p>
              <p className="text-xs text-muted-foreground">ETH</p>
            </div>

            {hash && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                <p className="text-xs font-mono text-accent break-all">{hash}</p>
              </div>
            )}

            {isConfirming && <div className="text-xs text-yellow-500">Confirming transaction...</div>}
            {isSuccess && <div className="text-xs text-green-500">Transaction confirmed!</div>}

            <Button
              onClick={handleDeposit}
              disabled={isPending || isConfirming || isSuccess}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              size="lg"
            >
              {isSuccess ? "✓ Deposited" : isPending || isConfirming ? "Depositing..." : "Deposit Funds"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Note */}
      <Card className="bg-card border-border mt-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="text-2xl">🔒</div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Smart Contract Security</h3>
              <p className="text-sm text-muted-foreground">
                Funds are held in a non-custodial smart contract. Neither you nor the freelancer can withdraw until both
                agree or arbitration is resolved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
