"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [role, setRole] = useState("")
  const [gender, setGender] = useState("")
  const [age, setAge] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, gender, age }),
      })

      if (res.ok) {
        // Update session locally to reflect changes immediately
        await update({ role, gender, age })
        router.push("/") // Redirect home after success
      } else {
        console.error("Failed to update profile")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // If already has role, redirect home (side effect)
  useEffect(() => {
    if (session?.user?.role) {
      router.push("/")
    }
  }, [session, router])

  if (session?.user?.role) {
    return null // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary-foreground" />
             </div>
          <CardTitle className="text-2xl">Welcome to Freelance!</CardTitle>
          <CardDescription>To get started, please tell us a bit about yourself.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="role">I am a...</Label>
              <Select onValueChange={setRole} required>
                <SelectTrigger id="role" className="cursor-pointer">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer" className="cursor-pointer">Freelancer (I want to work)</SelectItem>
                  <SelectItem value="client" className="cursor-pointer">Client (I want to hire)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={setGender} required>
                <SelectTrigger id="gender" className="cursor-pointer">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male" className="cursor-pointer">Male</SelectItem>
                  <SelectItem value="female" className="cursor-pointer">Female</SelectItem>
                  <SelectItem value="other" className="cursor-pointer">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age" 
                type="number" 
                placeholder="Enter your age" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min={18}
                max={100}
                className="cursor-text"
              />
            </div>

            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
