"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileIcon, HistoryIcon, UndoIcon, Eye, Bot, UserCircle2, ArrowRight, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface VersionChange {
  id: string
  fileName: string
  previousName: string
  newName: string
  timestamp: string
  type: "rename" | "move" | "organize"
  source: "ai" | "manual"
}

interface DayHistory {
  date: string
  changes: VersionChange[]
}

const mockHistory: DayHistory[] = [
  {
    date: "Today",
    changes: [
      {
        id: "1",
        fileName: "quarterly-report-q1.pdf",
        previousName: "Q1report_final_v2.pdf",
        newName: "2024_Q1_Financial_Report_FINAL.pdf",
        timestamp: "2:30 PM",
        type: "rename",
        source: "ai",
      },
      {
        id: "2",
        fileName: "meeting-recording.mp4",
        previousName: "Documents/Recordings",
        newName: "Meetings/2024/Q1/Team_Sync",
        timestamp: "11:45 AM",
        type: "move",
        source: "manual",
      },
    ],
  },
  {
    date: "Yesterday",
    changes: [
      {
        id: "3",
        fileName: "project-proposal.docx",
        previousName: "Downloads/proposal_draft1.docx",
        newName: "Projects/Client_X/Proposals/Initial_Draft.docx",
        timestamp: "4:15 PM",
        type: "organize",
        source: "ai",
      },
      {
        id: "4",
        fileName: "budget-2024.xlsx",
        previousName: "budget24_final.xlsx",
        newName: "2024_Annual_Budget_Approved.xlsx",
        timestamp: "2:20 PM",
        type: "rename",
        source: "ai",
      },
    ],
  },
  {
    date: "March 12, 2024",
    changes: [
      {
        id: "5",
        fileName: "presentation.pptx",
        previousName: "final_pres.pptx",
        newName: "2024_Q1_Board_Meeting_Presentation.pptx",
        timestamp: "3:30 PM",
        type: "rename",
        source: "manual",
      },
    ],
  },
]

export function VersionHistory() {
  const [history] = useState<DayHistory[]>(mockHistory)
  const [openDays, setOpenDays] = useState<string[]>(["Today"])

  const toggleDay = (date: string) => {
    setOpenDays((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]))
  }

  const getChangeIcon = (type: VersionChange["type"]) => {
    switch (type) {
      case "rename":
        return <FileIcon className="h-4 w-4" />
      case "move":
        return <ArrowRight className="h-4 w-4" />
      case "organize":
        return <HistoryIcon className="h-4 w-4" />
    }
  }

  const getChangeDescription = (change: VersionChange) => {
    switch (change.type) {
      case "rename":
        return "Renamed from"
      case "move":
        return "Moved from"
      case "organize":
        return "Organized from"
    }
  }

  const getSourceIcon = (source: VersionChange["source"]) => {
    return source === "ai" ? (
      <Bot className="h-4 w-4 text-purple-500" />
    ) : (
      <UserCircle2 className="h-4 w-4 text-blue-500" />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Changes History</CardTitle>
        <CardDescription>Track and restore previous versions of your files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {history.map((day) => (
          <Collapsible key={day.date} open={openDays.includes(day.date)} onOpenChange={() => toggleDay(day.date)}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-purple-600">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openDays.includes(day.date) ? "transform rotate-180" : ""
                  }`}
                />
                <h3 className="font-semibold">{day.date}</h3>
                <Badge variant="secondary" className="ml-2">
                  {day.changes.length} changes
                </Badge>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-4 space-y-4">
              {day.changes.map((change) => (
                <div key={change.id} className="rounded-lg border p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-purple-50 p-2 dark:bg-purple-950">
                        {getChangeIcon(change.type)}
                      </div>
                      <div>
                        <div className="font-medium">{change.fileName}</div>
                        <div className="text-sm text-muted-foreground">{change.timestamp}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSourceIcon(change.source)}
                      <Badge variant="outline">{change.source === "ai" ? "AI Organized" : "Manual Change"}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {getChangeDescription(change)} <span className="font-mono">{change.previousName}</span>
                    </div>
                    <div className="text-sm">
                      Now: <span className="font-mono">{change.newName}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Compare
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <UndoIcon className="h-4 w-4" />
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  )
}

