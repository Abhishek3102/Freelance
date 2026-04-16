"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, MapPin } from "lucide-react"
import { ApplyJobDialog } from "@/components/apply-job-dialog"

interface Job {
  id: string
  title: string
  description: string
  budget: number
  clientName: string
  postedAt: string
  skills: string[]
  duration: string
}

export default function FindWorkPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            const response = await fetch(`${apiUrl}/jobs/`)
            
            if (response.ok) {
                const data = await response.json()
                // Map backend data to frontend model
                const mappedJobs = data.map((job: any) => ({
                    id: job.id,
                    title: job.title,
                    description: job.description,
                    budget: job.budget_eth,
                    clientName: job.client_address ? `${job.client_address.slice(0, 6)}...${job.client_address.slice(-4)}` : "DAO Client", // Format address
                    postedAt: new Date(job.posted_at).toLocaleDateString(), // Format date
                    skills: job.required_skills || [],
                    duration: "Fixed Price" // Default as we don't store duration yet
                }))
                setJobs(mappedJobs)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    fetchJobs()
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-60"
      >
        <source src="/videos/freelancer%20walking%20and%20seeing%20tab.mp4" type="video/mp4" />
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10 backdrop-blur-[1px]" />

      <div className="relative z-20 font-sans text-white">
        <Navigation />
        <div className="container mx-auto py-12 px-4 sm:px-6">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Find Work</h1>
              <p className="text-white/70">Explore top freelance opportunities tailored to your skills</p>
            </div>
            {/* Filter or Search could go here */}
          </div>

          {loading ? (
             <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {jobs.map((job) => (
                <Card key={job.id} className="cursor-pointer bg-white/5 backdrop-blur-md border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 group flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                         <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">{job.duration}</Badge>
                         <span className="text-xs text-white/50">{job.postedAt}</span>
                    </div>
                    <CardTitle className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{job.title}</CardTitle>
                    <CardDescription className="text-white/60 line-clamp-2 mt-2">
                      {job.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex flex-wrap gap-2 mt-2">
                        {job.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="bg-white/10 text-white/80 hover:bg-white/20 border-transparent text-xs">{skill}</Badge>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 mt-6 text-sm text-white/70">
                        <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="font-semibold text-green-400">${job.budget}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Fixed Price</span>
                        </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-white/5">
                    <ApplyJobDialog jobId={job.id} jobTitle={job.title} />
                  </CardFooter>
                </Card>
              ))}
               {jobs.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                      <p className="text-xl text-white/60">No active jobs found.</p>
                      <p className="text-sm text-white/40 mt-2">Check back later.</p>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
