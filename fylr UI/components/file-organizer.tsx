"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileIcon, FolderIcon, FolderOpen, Plus, X } from "lucide-react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  isExpanded?: boolean
  children?: FileItem[]
}

const initialFiles: FileItem[] = []

interface CustomLocation {
  id: string
  path: string
  name: string
}

const exampleLocations: CustomLocation[] = [
  {
    id: "1",
    path: "C:/Users/YourName/Pictures/Family Photos",
    name: "Family Photos",
  },
  {
    id: "2",
    path: "D:/Movies",
    name: "Movies",
  },
  {
    id: "3",
    path: "C:/Users/YourName/Documents/Projects/Robot Parts",
    name: "Robot Parts",
  },
]

export function FileOrganizer() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles)
  const [specificity, setSpecificity] = useState([50])
  const [outputLocation, setOutputLocation] = useState("desktop")
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>(exampleLocations)

  const onDragEnd = (result: DropResult) => {
    // Your drag end logic here
    console.log(result)
  }

  const renderItem = (item: FileItem, index: number) => {
    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
            {item.type === "file" ? <FileIcon /> : <FolderIcon />} {item.name}
          </div>
        )}
      </Draggable>
    )
  }

  const addCustomLocation = () => {
    const newLocation: CustomLocation = {
      id: Date.now().toString(),
      path: "",
      name: "",
    }
    setCustomLocations([...customLocations, newLocation])
  }

  const removeCustomLocation = (id: string) => {
    setCustomLocations(customLocations.filter((location) => location.id !== id))
  }

  const updateCustomLocation = (id: string, field: "path" | "name", value: string) => {
    setCustomLocations(
      customLocations.map((location) => (location.id === id ? { ...location, [field]: value } : location)),
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Card>
        <CardHeader>
          <CardTitle>File Organization</CardTitle>
          <CardDescription>Drag and drop files to reorganize your directory structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-8 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Broader Categories</span>
                <span>Specific Subfolders</span>
              </div>
              <Slider
                value={specificity}
                onValueChange={setSpecificity}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground italic">
                <span>e.g., "Documents", "Media"</span>
                <span>e.g., "2024/Q1/Reports"</span>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <Label>Output Location</Label>
              <RadioGroup value={outputLocation} onValueChange={setOutputLocation} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="desktop" id="desktop" />
                  <Label htmlFor="desktop">Desktop</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="downloads" id="downloads" />
                  <Label htmlFor="downloads">Downloads Folder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom Location</Label>
                </div>
              </RadioGroup>

              {outputLocation === "custom" && (
                <div className="space-y-4 mt-4">
                  {customLocations.map((location) => (
                    <div key={location.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Location name..."
                          value={location.name}
                          onChange={(e) => updateCustomLocation(location.id, "name", e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeCustomLocation(location.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter folder path..."
                          value={location.path}
                          onChange={(e) => updateCustomLocation(location.id, "path", e.target.value)}
                        />
                        <Button variant="outline" size="icon">
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addCustomLocation} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Droppable droppableId="root">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {files.map((item, index) => renderItem(item, index))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline">Reset</Button>
            <Button className="bg-purple-600 hover:bg-purple-700">Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </DragDropContext>
  )
}

