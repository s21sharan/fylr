import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Brain, Folder, Shield } from "lucide-react"

export function OrganizeStatus() {
  return (
    <Card className="bg-purple-50 dark:bg-purple-950/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <CardTitle>Organization Status</CardTitle>
        </div>
        <CardDescription>Current processing status and statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Files Processed</span>
              </div>
              <span className="text-sm text-muted-foreground">85%</span>
            </div>
            <Progress value={85} className="bg-purple-200 dark:bg-purple-800">
              <div className="bg-purple-600" style={{ width: "85%" }} />
            </Progress>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Files</div>
              <div className="text-2xl font-bold text-purple-600">1,234</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Processed</div>
              <div className="text-2xl font-bold text-purple-600">1,049</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Renamed</div>
              <div className="text-2xl font-bold text-purple-600">892</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Organized</div>
              <div className="text-2xl font-bold text-purple-600">157</div>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-white/50 dark:bg-black/50">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="font-medium">Processing Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Local Processing</span>
                <span className="text-green-500">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>AI Analysis</span>
                <span className="text-purple-500">Running</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cloud Backup</span>
                <span className="text-yellow-500">Paused</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

