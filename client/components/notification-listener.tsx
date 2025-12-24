"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { Bell } from "lucide-react"

export function NotificationListener() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    // Connect to WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace("http", "").replace("https", "")
        : "localhost:8000"
    
    // Clean host just in case
    const cleanHost = host.replace("://", "")
    
    const wsUrl = `${protocol}//${cleanHost}/ws/${session.user.id}`
    
    console.log("Connecting to WebSocket:", wsUrl)

    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      console.log("WebSocket connected for notifications")
    }

    ws.onmessage = (event) => {
      console.log("Notification received:", event.data)
      toast({
        title: "New Notification",
        description: event.data,
        action: <div className="p-2 bg-primary/20 rounded-full"><Bell className="w-4 h-4 text-primary"/></div>,
        duration: 5000,
      })
    }

    ws.onclose = () => {
        console.log("WebSocket disconnected")
    }

    return () => {
      ws.close()
    }
  }, [session, toast])

  return null // Headless component
}
