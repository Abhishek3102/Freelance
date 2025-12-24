"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ApplyJobDialogProps {
  jobId: string
  jobTitle: string
}

export function ApplyJobDialog({ jobId, jobTitle }: ApplyJobDialogProps) {
  const { data: session } = useSession()
  const [message, setMessage] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  
  const handleApply = async () => {
    if (!session) {
      alert("Please login first!")
      return
    }

    if (!resumeFile) {
        alert("Please upload your resume (PDF).")
        return
    }

    // In a real app we'd get this from the wallet connect state
    // For now we mock it or grab from session if available
    const freelancerAddress = "0xfafafafafafafafafafafafafafafafafafafafa"; 

    setLoading(true)
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        
        const formData = new FormData()
        formData.append("freelancer_address", freelancerAddress)
        formData.append("message", message)
        formData.append("resume_file", resumeFile)

        const response = await fetch(`${apiUrl}/jobs/${jobId}/propose/`, {
            method: "POST",
            body: formData, // Auto-sets Content-Type to multipart/form-data
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || "Failed to apply")
        }

        const data = await response.json()
        alert("Application Submitted! The client will be notified.")
        setOpen(false)
        setMessage("")
        setResumeFile(null)
    } catch (err: any) {
        console.error(err)
        alert(err.message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-white/10 border backdrop-blur-sm transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white">
          Apply Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Explain why you are the best fit for this role.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-zinc-400">Cover Letter</label>
            <Textarea 
                placeholder="I have 5 years of experience..." 
                className="bg-zinc-800 border-zinc-700 text-white h-24"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-zinc-400">Resume / CV (PDF Only)</label>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <input 
                    type="file" 
                    accept="application/pdf"
                    className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                    onChange={(e) => {
                        if (e.target.files) {
                            setResumeFile(e.target.files[0])
                        }
                    }}
                />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Cancel</Button>
          <Button onClick={handleApply} disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
            {loading ? "Sending..." : "Submit Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
