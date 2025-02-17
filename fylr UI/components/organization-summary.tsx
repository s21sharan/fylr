import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function OrganizationSummary() {
  return (
    <Card className="bg-purple-50 dark:bg-purple-950/50">
      <CardHeader>
        <CardTitle>Organization Summary</CardTitle>
        <CardDescription>Overview of your file organization progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span>Files Processed</span>
              <span>78%</span>
            </div>
            <Progress value={78} className="bg-purple-200 dark:bg-purple-800">
              <div className="bg-purple-600" style={{ width: "78%" }} />
            </Progress>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Files</p>
              <p className="text-2xl font-bold text-purple-600">1,234</p>
            </div>
            <div>
              <p className="text-muted-foreground">Renamed Files</p>
              <p className="text-2xl font-bold text-purple-600">962</p>
            </div>
            <div>
              <p className="text-muted-foreground">Organized Folders</p>
              <p className="text-2xl font-bold text-purple-600">57</p>
            </div>
            <div>
              <p className="text-muted-foreground">Space Saved</p>
              <p className="text-2xl font-bold text-purple-600">156 MB</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

