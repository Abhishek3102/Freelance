"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
        const response = await fetch(`${apiUrl}/freelancers/`, {
           credentials: "include"
        })
        
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Find Talent</h1>
        <Button onClick={() => router.push("/jobs/post")}>Post a Job</Button>
      </div>

      {loading ? (
        <p>Loading freelancers...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {freelancers.map((f) => (
            <Card key={f.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.email}`} />
                  <AvatarFallback>{f.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{f.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{f.role}</p>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="flex gap-2 mb-2">
                    <Badge variant="outline">{f.gender}</Badge>
                    <Badge variant="outline">{f.age} years old</Badge>
                 </div>
                 <p className="text-sm text-muted-foreground">
                    Available for hire.
                 </p>
              </CardContent>
              <CardFooter>
                 <Button className="w-full">View Profile</Button>
              </CardFooter>
            </Card>
          ))}
          {freelancers.length === 0 && <p className="col-span-3 text-center text-muted-foreground">No freelancers found.</p>}
        </div>
      )}
    </div>
  )
}
