"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, File, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"

const initialFiles = [
  { id: 1, originalName: "IMG_20240315.jpg", newName: "2024-03-15_Family_Picnic.jpg", status: "pending" },
  { id: 2, originalName: "doc1.pdf", newName: "2024-03-20_Project_Proposal.pdf", status: "pending" },
  { id: 3, originalName: "recording.mp3", newName: "2024-03-22_Team_Meeting_Minutes.mp3", status: "pending" },
  { id: 4, originalName: "Untitled.docx", newName: "2024-03-25_Monthly_Report_Draft.docx", status: "pending" },
  { id: 5, originalName: "screenshot.png", newName: "2024-03-28_UI_Design_Feedback.png", status: "pending" },
]

export function FileRenameProcess() {
  const [files, setFiles] = useState(initialFiles)
  const [isProcessing, setIsProcessing] = useState(false)
  const [specificity, setSpecificity] = useState([50])

  const processFiles = () => {
    setIsProcessing(true)
    const currentFiles = [...files]

    const updateFile = (index: number) => {
      if (index >= currentFiles.length) {
        setIsProcessing(false)
        return
      }

      setTimeout(() => {
        currentFiles[index].status = "renamed"
        setFiles([...currentFiles])
        updateFile(index + 1)
      }, 1000)
    }

    updateFile(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Renaming Process</CardTitle>
        <CardDescription>Watch as Fylr intelligently renames your files</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-8 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Simple Names</span>
              <span>Detailed Names</span>
            </div>
            <Slider value={specificity} onValueChange={setSpecificity} min={0} max={100} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground italic">
              <span>e.g., "Meeting_Notes"</span>
              <span>e.g., "2024-03-15_Q1_Budget_Meeting_Notes"</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-4">
              <File className="h-5 w-5 text-purple-500" />
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="text-sm">{file.originalName}</div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-purple-500" />
                  <div className="text-sm font-medium">{file.newName}</div>
                </div>
              </div>
              <Badge
                variant={file.status === "renamed" ? "default" : "secondary"}
                className={file.status === "renamed" ? "bg-green-500" : ""}
              >
                {file.status === "renamed" ? "Renamed" : "Pending"}
              </Badge>
              {isProcessing && file.status === "pending" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  <Loader2 className="h-4 w-4 text-purple-500" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
        <Button className="mt-6 bg-purple-600 hover:bg-purple-700" onClick={processFiles} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Start Renaming"}
        </Button>
      </CardContent>
    </Card>
  )
}

