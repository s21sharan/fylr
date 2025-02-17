"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Command, CommandInput } from "@/components/ui/command"
import { FileText, Clock, Brain, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const suggestions = [
  {
    icon: FileText,
    text: "Find all BIO 101 documents",
    category: "Course",
  },
  {
    icon: Clock,
    text: "Recently modified files",
    category: "Time-based",
  },
  {
    icon: Brain,
    text: "Find similar research papers",
    category: "Smart Search",
  },
]

export function SmartSearch() {
  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardContent className="p-0">
          <Command className="rounded-lg border-0">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="h-4 w-4 text-purple-500" />
              <CommandInput
                placeholder="Smart search across all your files... (e.g., 'Show me last week's assignments')"
                className="h-14 w-full"
              />
            </div>
          </Command>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-sm font-medium mb-3">Smart Suggestions</div>
          <div className="grid gap-2">
            {suggestions.map((item) => (
              <button
                key={item.text}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent text-left w-full group"
              >
                <item.icon className="h-4 w-4 text-purple-500" />
                <span className="flex-1">{item.text}</span>
                <Badge variant="secondary" className="group-hover:bg-background">
                  {item.category}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

