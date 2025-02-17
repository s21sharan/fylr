"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, File, FileText, Image, Music, Video } from "lucide-react"
import { cn } from "@/lib/utils"

interface QueuedFile {
  id: string
  name: string
  type: "image" | "document" | "video" | "audio" | "other"
  size: string
  addedAt: string
}

const mockFiles: QueuedFile[] = [
  {
    id: "1",
    name: "screenshot-2024-03-15.png",
    type: "image",
    size: "2.4 MB",
    addedAt: "10:30 AM",
  },
  {
    id: "2",
    name: "lecture-recording.mp4",
    type: "video",
    size: "156 MB",
    addedAt: "11:45 AM",
  },
  {
    id: "3",
    name: "meeting-notes.docx",
    type: "document",
    size: "45 KB",
    addedAt: "12:15 PM",
  },
  {
    id: "4",
    name: "voice-memo.mp3",
    type: "audio",
    size: "3.2 MB",
    addedAt: "2:20 PM",
  },
]

export function DailyQueue() {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>(mockFiles)
  const [nextProcessTime, setNextProcessTime] = useState("11:59 PM")
  const [progress, setProgress] = useState(65)

  const getFileIcon = (type: QueuedFile["type"]) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Daily Processing Queue</CardTitle>
            <CardDescription>Files waiting to be organized in today's batch</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Next processing at {nextProcessTime}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{queuedFiles.length} files queued</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Today's Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-4">
          {queuedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div
                className={cn(
                  "rounded-full p-2",
                  file.type === "image" && "bg-blue-50 text-blue-500",
                  file.type === "document" && "bg-purple-50 text-purple-500",
                  file.type === "video" && "bg-red-50 text-red-500",
                  file.type === "audio" && "bg-green-50 text-green-500",
                  file.type === "other" && "bg-gray-50 text-gray-500",
                )}
              >
                {getFileIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-sm text-muted-foreground">
                  Added at {file.addedAt} • {file.size}
                </div>
              </div>
              <Badge variant="secondary">Queued</Badge>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Files will be automatically processed at the end of the day
          </div>
          <Button variant="outline" size="sm">
            Process Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

