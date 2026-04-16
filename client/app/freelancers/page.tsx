"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Briefcase } from "lucide-react"

interface Freelancer {
  id: string
  name: string
  email: string
  role: string
  gender: string
  age: number
}

export default function FindTalentPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFreelancers = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${apiUrl}/freelancers/`)
        
        if (response.ok) {
            const data = await response.json()
            setFreelancers(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchFreelancers()
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
        <source src="/videos/dot%20connections%20good%20color%20imo%20for%20bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10 backdrop-blur-[1px]" />
      
      <div className="relative z-20 font-sans text-white">
        <Navigation />
        <div className="container mx-auto py-12 px-4 sm:px-6">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Find Talent</h1>
              <p className="text-white/70">Connect with top-tier freelancers for your projects</p>
            </div>
            <Button 
                onClick={() => router.push("/jobs/create")}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
                Post a Job
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {freelancers.map((f) => (
                <Card key={f.id} className="cursor-pointer bg-white/5 backdrop-blur-md border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 group">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-14 w-14 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.email}`} />
                      <AvatarFallback className="bg-primary/20 text-white">{f.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <CardTitle className="text-lg font-semibold truncate text-white group-hover:text-primary transition-colors">{f.name}</CardTitle>
                      <div className="flex items-center text-sm text-white/50 mt-1">
                        <Briefcase className="w-3 h-3 mr-1" />
                        <span className="truncate">{f.role}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                     <div className="flex gap-2 mb-4 flex-wrap">
                        <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white/90 border-transparent transition-colors">{f.gender}</Badge>
                        <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white/90 border-transparent transition-colors">{f.age} years old</Badge>
                     </div>
                     <p className="text-sm text-white/60 line-clamp-2">
                        Skilled professional available for new opportunities. Experienced in delivering high-quality results.
                     </p>
                  </CardContent>
                  <CardFooter className="pt-2">
                     <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-white/10 border backdrop-blur-sm transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white">View Profile</Button>
                  </CardFooter>
                </Card>
              ))}
              {freelancers.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                      <p className="text-xl text-white/60">No freelancers found.</p>
                      <p className="text-sm text-white/40 mt-2">Check back later or adjust your filters.</p>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
