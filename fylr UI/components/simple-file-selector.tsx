"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, FolderOpen, File, Loader2, Check } from "lucide-react"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  path: string
}

export function SimpleFileSelector({ mode }: { mode: "rename" | "re-sort" }) {
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDone, setIsDone] = useState(false)

  const handleFileSelect = () => {
    // Simulate file selection
    const newItems: FileItem[] = [
      { id: "1", name: "Documents", type: "folder", path: "/Documents" },
      { id: "2", name: "vacation_pics", type: "folder", path: "/Pictures" },
      { id: "3", name: "report.pdf", type: "file", path: "/Documents" },
    ]
    setSelectedItems(newItems)
  }

  const processFiles = () => {
    setIsProcessing(true)
    setProgress(0)
    setIsDone(false)

    // Simulate processing
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProcessing(false)
          setIsDone(true)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const reset = () => {
    setSelectedItems([])
    setIsProcessing(false)
    setProgress(0)
    setIsDone(false)
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          {selectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">
                {mode === "rename" ? "Select files to rename" : "Select a folder to re-sort"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {mode === "rename"
                  ? "Choose files or folders to rename with AI"
                  : "Choose a folder to automatically organize its contents"}
              </p>
              <Button onClick={handleFileSelect} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg border p-3">
                      {item.type === "folder" ? (
                        <FolderOpen className="h-4 w-4 text-purple-500" />
                      ) : (
                        <File className="h-4 w-4 text-blue-500" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.path}</div>
                      </div>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {isProcessing || isDone ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  {isDone && (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-900/50">
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="font-medium">Processing complete!</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={reset}>
                        Process More
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={reset} className="flex-1">
                    Clear Selection
                  </Button>
                  <Button onClick={processFiles} className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        {mode === "rename" ? "Smart Rename" : "Smart Re-Sort"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

