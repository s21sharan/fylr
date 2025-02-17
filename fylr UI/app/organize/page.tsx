import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FolderOpen, RefreshCw } from "lucide-react"
import { SimpleFileSelector } from "@/components/simple-file-selector"

export default function OrganizePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-purple-600">Rename & Re-Sort</h1>
        <p className="text-muted-foreground">Quickly organize your files with AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Organization</CardTitle>
          <CardDescription>Select files or folders to organize</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rename" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rename" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Smart Rename
              </TabsTrigger>
              <TabsTrigger value="resort" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Smart Re-Sort
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rename">
              <SimpleFileSelector mode="rename" />
            </TabsContent>
            <TabsContent value="resort">
              <SimpleFileSelector mode="resort" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

