"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Info, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession } from "next-auth/react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notification {
    id: string
    message: string
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
    read: boolean
    created_at: string
}

export function NotificationsDropdown() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    if (!session) return
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${apiUrl}/notifications/`, {
            headers: {
                "Authorization": `Bearer ${(session as any)?.accessToken}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            setNotifications(data)
            setUnreadCount(data.filter((n: Notification) => !n.read).length)
        }
    } catch (e) {
        console.error("Failed to fetch notifications", e)
    }
  }

  useEffect(() => {
    if (session) {
        fetchNotifications()
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }
  }, [session])

  const markRead = async (id: string) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        await fetch(`${apiUrl}/notifications/${id}/read`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${(session as any)?.accessToken}`
            }
        })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (e) {
          console.error(e)
      }
  }

  const getIcon = (type: string) => {
      switch (type) {
          case "SUCCESS": return <Check className="h-4 w-4 text-green-500" />
          case "WARNING": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
          case "ERROR": return <XCircle className="h-4 w-4 text-red-500" />
          default: return <Info className="h-4 w-4 text-blue-500" />
      }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
        setIsOpen(open)
        if (open) fetchNotifications()
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white/70 hover:text-white hover:bg-white/10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-black animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-zinc-900 border-zinc-800 text-white" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && <span className="text-xs text-zinc-500">{unreadCount} unread</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">No notifications</div>
            ) : (
                notifications.map(notification => (
                    <DropdownMenuItem 
                        key={notification.id} 
                        className={`flex gap-3 p-3 cursor-pointer focus:bg-white/5 ${!notification.read ? "bg-white/5" : ""}`}
                        onClick={() => !notification.read && markRead(notification.id)}
                    >
                        <div className="mt-1 shrink-0">
                            {getIcon(notification.type)}
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className={`text-sm ${!notification.read ? "font-semibold text-white" : "text-zinc-400"}`}>
                                {notification.message}
                            </p>
                            <span className="text-[10px] text-zinc-600">
                                {new Date(notification.created_at).toLocaleString()}
                            </span>
                        </div>
                        {!notification.read && (
                            <div className="ml-auto flex items-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            </div>
                        )}
                    </DropdownMenuItem>
                ))
            )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
