"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Copy, File, FileText, Image, Music, Trash2, Video } from "lucide-react"

interface DuplicateFile {
  id: string
  name: string
  path: string
  size: string
  type: "image" | "document" | "video" | "audio"
  lastModified: string
}

interface DuplicatePair {
  id: string
  files: DuplicateFile[]
  size: string
}

// Sample data
const duplicatePairs: DuplicatePair[] = [
  {
    id: "1",
    files: [
      {
        id: "1a",
        name: "presentation_final.pptx",
        path: "/Work/Presentations/",
        size: "2.4 MB",
        type: "document",
        lastModified: "2024-03-15",
      },
      {
        id: "1b",
        name: "presentation_final_copy.pptx",
        path: "/Downloads/",
        size: "2.4 MB",
        type: "document",
        lastModified: "2024-03-16",
      },
    ],
    size: "2.4 MB",
  },
  {
    id: "2",
    files: [
      {
        id: "2a",
        name: "profile_pic.jpg",
        path: "/Pictures/",
        size: "1.8 MB",
        type: "image",
        lastModified: "2024-03-10",
      },
      {
        id: "2b",
        name: "profile_picture_backup.jpg",
        path: "/Documents/Backups/",
        size: "1.8 MB",
        type: "image",
        lastModified: "2024-03-12",
      },
    ],
    size: "1.8 MB",
  },
  {
    id: "3",
    files: [
      {
        id: "3a",
        name: "meeting_recording.mp4",
        path: "/Videos/Meetings/",
        size: "45.6 MB",
        type: "video",
        lastModified: "2024-03-01",
      },
      {
        id: "3b",
        name: "team_sync_march.mp4",
        path: "/Downloads/",
        size: "45.6 MB",
        type: "video",
        lastModified: "2024-03-01",
      },
    ],
    size: "45.6 MB",
  },
]

export function DuplicateFiles() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const totalDuplicates = duplicatePairs.length
  const totalSpace = "49.8 MB"
  const [showConfirmation, setShowConfirmation] = useState(false)

  const getFileIcon = (type: DuplicateFile["type"]) => {
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

  const handleSelect = (fileId: string) => {
    setSelectedFiles((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]))
  }

  const handleDeleteSelected = () => {
    // In a real app, this would delete the files
    setShowConfirmation(true)
    setTimeout(() => {
      setShowConfirmation(false)
      setSelectedFiles([])
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-purple-500" />
              Duplicate Files
            </CardTitle>
            <CardDescription>Found {totalDuplicates} sets of duplicate files</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{totalSpace}</div>
            <div className="text-xs text-muted-foreground">potential space savings</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Analysis Progress</span>
            <span>100%</span>
          </div>
          <Progress value={100} />
        </div>

        <div className="space-y-6">
          {duplicatePairs.map((pair) => (
            <div key={pair.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getFileIcon(pair.files[0].type)}
                  <span className="font-medium">Duplicate Set</span>
                </div>
                <Badge variant="outline">{pair.size}</Badge>
              </div>
              <div className="space-y-3">
                {pair.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-4 rounded-lg border bg-muted/50 p-3">
                    <Checkbox checked={selectedFiles.includes(file.id)} onCheckedChange={() => handleSelect(file.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {file.path} • Last modified {file.lastModified}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedFiles.length === 0 || showConfirmation}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {showConfirmation ? "Deleted!" : `Delete Selected (${selectedFiles.length} files)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

