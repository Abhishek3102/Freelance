"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { useAccount } from 'wagmi'
import toast from "react-hot-toast"

export default function PostJobPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
      title: "",
      description: "",
      budget: "",
      skills: ""
  })

  // Basic check for client role
  if (!session || session?.user?.role !== "client") {
      // In a real app we'd redirect or show unauthorized
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
        toast.error("Please connect your Web3 Wallet before posting a job.");
        return;
    }
    
    setLoading(true)

    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const clientAddress = address; // Dynamically bind connected wallet
        
        const response = await fetch(`${apiUrl}/jobs/post/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // @ts-ignore
                "Authorization": `Bearer ${session?.accessToken}`
            },
            body: JSON.stringify({
                client_address: clientAddress,
                title: formData.title,
                description: formData.description,
                budget_eth: parseFloat(formData.budget),
                required_skills: formData.skills.split(",").map(s => s.trim())
            })
        })

        if (!response.ok) throw new Error("Failed to post job")

        router.push("/client/jobs")
    } catch (e) {
        console.error(e)
        toast.error("Error posting job")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative bg-black text-white">
      <Navigation />
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Post a New Job</h1>
        
        <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription className="text-white/60">Fill in the details to find the perfect freelancer.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Job Title</Label>
                        <Input 
                            id="title" 
                            placeholder="e.g. Smart Contract Developer" 
                            className="bg-zinc-900 border-white/10 text-white"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                            id="description" 
                            placeholder="Describe the project requirements..." 
                            className="bg-zinc-900 border-white/10 text-white min-h-[150px]"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="budget">Budget (ETH)</Label>
                            <Input 
                                id="budget" 
                                type="number" 
                                step="0.01" 
                                placeholder="1.5" 
                                className="bg-zinc-900 border-white/10 text-white"
                                value={formData.budget}
                                onChange={e => setFormData({...formData, budget: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="skills">Skills (Comma separated)</Label>
                            <Input 
                                id="skills" 
                                placeholder="React, Solidity, Rust" 
                                className="bg-zinc-900 border-white/10 text-white"
                                value={formData.skills}
                                onChange={e => setFormData({...formData, skills: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
                        {loading ? "Posting..." : "Post Job"}
                    </Button>
                </form>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
