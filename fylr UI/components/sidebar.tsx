"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Cloud, History, Lock, Puzzle, Settings, RefreshCw } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

const sidebarItems = [
  {
    title: "Smart Organization",
    href: "/",
  },
  {
    title: "Rename & Re-Sort",
    icon: RefreshCw,
    href: "/organize",
  },
  {
    title: "Version History",
    icon: History,
    href: "/history",
  },
  {
    title: "Cloud Integration",
    icon: Cloud,
    href: "/cloud",
  },
  {
    title: "Plugins",
    icon: Puzzle,
    href: "/plugins",
  },
  {
    title: "Privacy",
    icon: Lock,
    href: "/privacy",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden border-r bg-purple-50 dark:bg-purple-950/50 lg:block lg:w-64">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fylr_logo-removebg-preview-QaO1TGzYc6k0kMyScG7jpfHpYal2lN.png"
            alt="Fylr Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain p-0"
          />
          <span className="text-purple-600">Fylr</span>
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="flex flex-col gap-1 p-4">
          {sidebarItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "justify-start gap-2",
                pathname === item.href && "bg-purple-100 text-purple-600 dark:bg-purple-900",
              )}
              asChild
            >
              <Link href={item.href}>
                {item.icon && <item.icon className={cn("h-4 w-4")} />}
                {item.title}
              </Link>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

