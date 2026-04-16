"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import toast from "react-hot-toast"

export default function ClientJobsPage() {
    const { data: session } = useSession()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPostedJobs = async () => {
            if (!session) return
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                const response = await fetch(`${apiUrl}/jobs/posted/`, {
                    headers: {
                        "Authorization": `Bearer ${(session as any)?.accessToken}`
                    }
                })
                if (response.ok) {
                    const data = await response.json()
                    setJobs(data)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchPostedJobs()
    }, [session])

    return (
        <div className="min-h-screen relative bg-black text-white">
            <Navigation />
            <div className="container mx-auto py-12 px-4">
                <h1 className="text-3xl font-bold mb-8">My Posted Jobs</h1>

                {loading ? (
                    <div className="text-center">Loading...</div>
                ) : (
                    <div className="grid gap-6">
                        {jobs.map(job => (
                            <Card key={job.id} className="bg-white/5 border-white/10 text-white">
                                <CardHeader>
                                    <div className="flex justify-between">
                                        <div>
                                            <CardTitle>{job.title}</CardTitle>
                                            <CardDescription className="text-white/60">{job.description}</CardDescription>
                                        </div>
                                        <Badge variant={job.status === "OPEN" ? "default" : "secondary"}>{job.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-white/50">Posted on: {new Date(job.posted_at || Date.now()).toLocaleDateString()}</div>
                                        <ApplicantsDialog job={job} onJobUpdated={(updatedJob) => setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {jobs.length === 0 && <div className="text-white/50">No jobs posted yet.</div>}
                    </div>
                )}
            </div>
        </div>
    )
}

const JOB_STATUS_OPEN = "Job is open for proposals.";
const JOB_STATUS_ACCEPTED = "Proposal accepted, waiting for escrow funding.";
const JOB_STATUS_ACTIVE = "Escrow funded, work in progress.";
const JOB_STATUS_COMPLETED = "Job finished and payment released.";

function ApplicantsDialog({ job, onJobUpdated }: { job: any, onJobUpdated: (updated: any) => void }) {
    const jobId = job.id;
    const jobTitle = job.title;
    const clientAddress = job.client_address;
    const { data: session } = useSession()
    const [applicants, setApplicants] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const fetchApplicants = async () => {
        setLoading(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            const response = await fetch(`${apiUrl}/jobs/${jobId}/applicants/`, {
                headers: {
                    "Authorization": `Bearer ${(session as any)?.accessToken}`
                }
            })
            if (response.ok) {
                setApplicants(await response.json())
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const isJobLocked = job.status !== JOB_STATUS_OPEN || applicants.some(a => a.status === "ACCEPTED");

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (open) fetchApplicants()
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-white/20 hover:bg-white/10">View Applicants</Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Applicants for {jobTitle}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                    {loading ? (
                        <div className="text-center py-8">Loading applicants...</div>
                    ) : (
                        <div className="space-y-6">
                            {applicants.length === 0 && (
                                <div className="text-center text-zinc-500 py-8">No applicants yet.</div>
                            )}

                            {applicants
                                .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
                                .map((app, index) => (
                                    <div key={app.id} className="p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/50 relative overflow-hidden transition-all hover:bg-zinc-800/60 hover:border-zinc-600">
                                        {/* Rank Badge */}
                                        {index === 0 && <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-bl font-bold tracking-wider">TOP MATCH</div>}

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-lg text-white">
                                                        {app.resume_structured?.name || "Freelancer"}
                                                    </span>
                                                    <span className="font-mono text-xs text-zinc-500">
                                                        ({app.freelancer_address ? `${app.freelancer_address.slice(0, 6)}...${app.freelancer_address.slice(-4)}` : "Unknown"})
                                                    </span>
                                                </div>

                                                {/* AI Score Indicator */}
                                                {app.ai_score !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-400">AI Match Score:</span>
                                                        <div className={`h-2 w-24 rounded-full bg-zinc-700 overflow-hidden`}>
                                                            <div
                                                                className={`h-full ${app.ai_score >= 80 ? "bg-green-500" :
                                                                        app.ai_score >= 50 ? "bg-yellow-500" : "bg-red-500"
                                                                    }`}
                                                                style={{ width: `${app.ai_score}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-bold ${app.ai_score >= 80 ? "text-green-400" :
                                                                app.ai_score >= 50 ? "text-yellow-400" : "text-red-400"
                                                            }`}>{app.ai_score}%</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant="outline" className={`border-zinc-600 ${(app.status === 'ACCEPTED' || (job.status !== JOB_STATUS_OPEN && job.freelancer_address?.toLowerCase() === app.freelancer_address?.toLowerCase())) ? 'text-green-400 bg-green-500/10' : app.status === 'REJECTED' ? 'text-red-400 bg-red-500/10' : 'text-zinc-400'}`}>
                                                {(app.status === 'ACCEPTED' || (job.status !== JOB_STATUS_OPEN && job.freelancer_address?.toLowerCase() === app.freelancer_address?.toLowerCase())) ? 'ACCEPTED' : app.status}
                                            </Badge>
                                        </div>

                                        {/* Cover Letter */}
                                        <div className="mb-4">
                                            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Cover Letter</h4>
                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap italic pl-2 border-l-2 border-zinc-700">
                                                "{app.message}"
                                            </p>
                                        </div>

                                        {/* Structured Resume Data - Simplified & Actionable */}
                                        {app.resume_structured ? (
                                            <div className="space-y-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                                                {/* AI Summary */}
                                                {app.resume_structured.summary && (
                                                    <div>
                                                        <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">AI Summary</h4>
                                                        <p className="text-sm text-zinc-300 leading-relaxed font-medium">{app.resume_structured.summary}</p>
                                                    </div>
                                                )}

                                                {/* Key Insights (Why they fit) */}
                                                {app.resume_structured.key_insights && app.resume_structured.key_insights.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs uppercase tracking-wider text-green-500/80 mb-2">Key Insights (Why they match)</h4>
                                                        <ul className="space-y-1.5">
                                                            {app.resume_structured.key_insights.map((insight: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                                                                    <span>{insight}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Fallback for legacy proposals */
                                            app.resume_text && (
                                                <div className="mb-4 p-3 bg-zinc-900/50 rounded border border-zinc-800">
                                                    <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Resume Snippet</h4>
                                                    <p className="text-xs text-zinc-500 line-clamp-3 font-mono">
                                                        {app.resume_text.substring(0, 300)}...
                                                    </p>
                                                </div>
                                            )
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            {(app.status === "ACCEPTED" || (job.status !== JOB_STATUS_OPEN && job.freelancer_address?.toLowerCase() === app.freelancer_address?.toLowerCase())) && job.status === JOB_STATUS_ACCEPTED && job.escrow_contract_id !== undefined && job.escrow_contract_id !== null && (
                                                <Button
                                                    size="sm"
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold cursor-pointer"
                                                    onClick={() => window.location.href = `/jobs/${jobId}/escrow`}
                                                >
                                                    Fund Escrow
                                                </Button>
                                            )}

                                            {(app.status === "ACCEPTED" || (job.status !== JOB_STATUS_OPEN && job.freelancer_address?.toLowerCase() === app.freelancer_address?.toLowerCase())) && (job.status === JOB_STATUS_ACTIVE || job.status === JOB_STATUS_COMPLETED) && (
                                                <Button
                                                    size="sm"
                                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                                                    onClick={() => window.location.href = `/workroom/${jobId}`}
                                                >
                                                    Enter Workroom
                                                </Button>
                                            )}

                                            {app.status === "PENDING" && !isJobLocked && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 cursor-pointer w-32"
                                                    onClick={async () => {
                                                        if (!confirm(`Accept proposal from ${app.resume_structured?.name || "Freelancer"}? This will create an Escrow contract.`)) return

                                                        try {
                                                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                                                            // Construct query params
                                                            const params = new URLSearchParams({
                                                                freelancer_address: app.freelancer_address,
                                                                client_address_from_request: clientAddress // Passed from props
                                                            })

                                                            const response = await fetch(`${apiUrl}/jobs/${jobId}/accept/?${params.toString()}`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Authorization": `Bearer ${(session as any)?.accessToken}`
                                                                }
                                                            })

                                                            if (response.ok) {
                                                                const data = await response.json()
                                                                toast.success(`Success! Escrow created. TX: ${data.escrow_tx_hash.slice(0,10)}...`)
                                                                // Update applicant state
                                                                setApplicants(prev => prev.map(p => p.id === app.id ? { ...p, status: "ACCEPTED" } : p))
                                                                // Update the parent job card with the new status + escrow ID
                                                                onJobUpdated({
                                                                    ...job,
                                                                    status: "Proposal accepted, waiting for escrow funding.",
                                                                    freelancer_address: app.freelancer_address,
                                                                    escrow_contract_id: data.escrow_contract_job_id
                                                                })
                                                            } else {
                                                                const err = await response.json()
                                                                toast.error(`Failed: ${err.detail}`)
                                                            }
                                                        } catch (e) {
                                                            console.error("Accept failed", e)
                                                            toast.error("Failed to accept proposal. Check console.")
                                                        }
                                                    }}
                                                >
                                                    Accept Proposal
                                                </Button>
                                            )}

                                            {/* View Resume Button */}
                                            {app.resume_link && (
                                                <a href={app.resume_link} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer">
                                                        View Full Resume (PDF)
                                                    </Button>
                                                </a>
                                            )}

                                            {app.status === "PENDING" && !isJobLocked && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer ml-auto"
                                                    onClick={async () => {
                                                        if (!confirm("Are you sure you want to reject this proposal?")) return
                                                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                                                        try {
                                                            const response = await fetch(`${apiUrl}/proposals/${app.id}/reject/`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Authorization": `Bearer ${(session as any)?.accessToken}`
                                                                }
                                                            })
                                                            if (response.ok) {
                                                                setApplicants(prev => prev.map(p => p.id === app.id ? { ...p, status: "REJECTED" } : p))
                                                            }
                                                        } catch (e) {
                                                            console.error("Failed to reject", e)
                                                        }
                                                    }}
                                                >
                                                    Reject
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            {applicants.length === 0 && (
                                <div className="text-center text-zinc-500 py-8">No applicants yet.</div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
