import { Button } from "@/components/ui/button"
import { Cloud } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function Header() {
  return (
    <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-black/50">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="gap-2">
            <Cloud className="h-4 w-4" />
            Connect Cloud Storage
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

