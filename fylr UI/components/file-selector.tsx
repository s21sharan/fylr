"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderOpen, File, Search, FileText, ImageIcon, Music, Video, X, ChevronRight } from "lucide-react"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder" | "image" | "document" | "audio" | "video"
  path: string
  size?: string
  selected?: boolean
}

const mockFiles: FileItem[] = [
  {
    id: "1",
    name: "Documents",
    type: "folder",
    path: "/Documents",
  },
  {
    id: "2",
    name: "presentation.pptx",
    type: "document",
    path: "/Documents",
    size: "2.4 MB",
  },
  {
    id: "3",
    name: "screenshot.png",
    type: "image",
    path: "/Pictures",
    size: "856 KB",
  },
  {
    id: "4",
    name: "meeting-recording.mp4",
    type: "video",
    path: "/Videos",
    size: "45.2 MB",
  },
  {
    id: "5",
    name: "voice-memo.mp3",
    type: "audio",
    path: "/Music",
    size: "2.1 MB",
  },
]

export function FileSelector() {
  const [files, setFiles] = useState<FileItem[]>(mockFiles)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  const [filterType, setFilterType] = useState<string>("all")

  const getFileIcon = (type: FileItem["type"]) => {
    switch (type) {
      case "folder":
        return <FolderOpen className="h-4 w-4 text-purple-500" />
      case "document":
        return <FileText className="h-4 w-4 text-yellow-500" />
      case "image":
        return <ImageIcon className="h-4 w-4 text-blue-500" />
      case "video":
        return <Video className="h-4 w-4 text-red-500" />
      case "audio":
        return <Music className="h-4 w-4 text-green-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const toggleFileSelection = (id: string) => {
    setFiles(
      files.map((file) => {
        if (file.id === id) {
          const newSelected = !file.selected
          setSelectedCount((prev) => (newSelected ? prev + 1 : prev - 1))
          return { ...file, selected: newSelected }
        }
        return file
      }),
    )
  }

  const clearSelection = () => {
    setFiles(files.map((file) => ({ ...file, selected: false })))
    setSelectedCount(0)
  }

  const filteredFiles = files.filter((file) => {
    if (filterType === "all") return true
    return file.type === filterType
  })

  return (
    <Card className="border-2 border-dashed">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPath((prev) => prev.slice(0, -1))}>
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>/</span>
              {currentPath.map((path, index) => (
                <span key={index}>{path}/</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="folder">Folders</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search files..." className="pl-8 h-9" />
            </div>
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-purple-50 px-4 py-2 dark:bg-purple-900/50">
            <span className="text-sm">
              {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className="h-[300px] rounded-lg border">
          <div className="space-y-1 p-2">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-2 rounded-lg p-2 hover:bg-accent ${
                  file.selected ? "bg-purple-50 dark:bg-purple-900/50" : ""
                }`}
              >
                <Checkbox checked={file.selected} onCheckedChange={() => toggleFileSelection(file.id)} />
                {getFileIcon(file.type)}
                <div className="flex-1">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {file.path} {file.size && `• ${file.size}`}
                  </div>
                </div>
                <Badge variant="outline">{file.type}</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

