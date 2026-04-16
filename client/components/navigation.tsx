"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, LogOut, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

export default function Navigation() {
  const router = useRouter()
  const { data: session } = useSession()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnectWallet = () => {
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }

  const handleDisconnect = () => {
    disconnect()
    router.push("/")
  }

  if (!mounted) return null

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary/80 group-hover:bg-primary rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-primary/20 shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white group-hover:text-primary transition-colors hidden sm:block">Freelance</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-8 mx-2">
            {session?.user && (
              <>
                {/* Client-only nav links */}
                {session.user.role === "client" && (
                    <>
                    {isConnected ? (
                        <Link href="/client/jobs" className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm font-medium whitespace-nowrap">
                        My Jobs
                        </Link>
                    ) : (
                        <span onClick={() => toast.error("Please connect your wallet first!")} className="text-white/40 hover:text-white/60 transition-colors text-xs sm:text-sm font-medium cursor-not-allowed whitespace-nowrap">
                        My Jobs
                        </span>
                    )}

                    {isConnected ? (
                        <Link href="/jobs/create" className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm font-medium whitespace-nowrap">
                        Post Job
                        </Link>
                    ) : (
                        <span onClick={() => toast.error("Please connect your wallet first!")} className="text-white/40 hover:text-white/60 transition-colors text-xs sm:text-sm font-medium cursor-not-allowed whitespace-nowrap">
                        Post Job
                        </span>
                    )}
                    </>
                )}

                {/* Freelancer-only nav links */}
                {session.user.role === "freelancer" && (
                    isConnected ? (
                        <Link href="/jobs" className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm font-medium whitespace-nowrap">
                        Find Work
                        </Link>
                    ) : (
                        <span onClick={() => toast.error("Please connect your wallet first!")} className="text-white/40 hover:text-white/60 transition-colors text-xs sm:text-sm font-medium cursor-not-allowed whitespace-nowrap">
                        Find Work
                        </span>
                    )
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 sm:gap-4 items-center shrink-0">
            {/* Notifications */}
            {session?.user && <NotificationsDropdown />}

            {/* Auth (Identity) */}
            {session?.user ? (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-white/10 focus:ring-0">
                     <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-primary/20">
                       <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                       <AvatarFallback className="bg-primary/20 text-white font-medium">
                         {session.user.name?.charAt(0).toUpperCase() || "U"}
                       </AvatarFallback>
                     </Avatar>
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-56 bg-black/80 backdrop-blur-xl border-white/10 text-white" align="end" forceMount>
                   <DropdownMenuLabel className="font-normal">
                     <div className="flex flex-col space-y-1">
                       <p className="text-sm font-medium leading-none">{session.user.name}</p>
                       <p className="text-xs leading-none text-white/50">{session.user.email}</p>
                       {session.user.role && (
                           <p className="text-xs font-semibold text-primary mt-1 capitalize">{session.user.role} Account</p>
                       )}
                     </div>
                   </DropdownMenuLabel>
                   <DropdownMenuSeparator className="bg-white/10" />
                   <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer group">
                     <User className="mr-2 h-4 w-4 text-white/70 group-hover:text-white" />
                     <span>Profile</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer group">
                     <Settings className="mr-2 h-4 w-4 text-white/70 group-hover:text-white" />
                     <span>Settings</span>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator className="bg-white/10" />
                   <DropdownMenuItem onClick={() => signOut()} className="focus:bg-red-500/20 focus:text-red-400 text-red-400 cursor-pointer">
                     <LogOut className="mr-2 h-4 w-4" />
                     <span>Log out</span>
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push("/signin")} 
                    className="text-white hover:text-primary hover:bg-white/5 transition-colors"
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => router.push("/signup")} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-5"
                  >
                    Sign Up
                  </Button>
                </div>
            )}

            {/* Web3 (Wallet) */}
            {isConnected && address ? (
              <div className="flex items-center gap-2 bg-white/5 rounded-full pl-3 pr-1 py-1 border border-white/10 hover:border-white/20 transition-all">
                <span className="text-xs text-white/80 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDisconnect}
                  className="h-7 w-7 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleConnectWallet} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-3 sm:px-6 text-xs sm:text-sm h-8 sm:h-10 whitespace-nowrap"
              >
                Connect<span className="hidden sm:inline">&nbsp;Wallet</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
