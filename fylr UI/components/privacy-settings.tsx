import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EyeOff, Shield } from "lucide-react"

export function PrivacySettings() {
  return (
    <div className="space-y-6">
      <Card className="bg-purple-50 dark:bg-purple-950/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <CardTitle>Incognito Mode Settings</CardTitle>
          </div>
          <CardDescription>Customize your privacy preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="incognito" className="flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Enable Incognito Mode
            </Label>
            <Switch id="incognito" />
          </div>

          <div className="space-y-4">
            <Label>Privacy Level</Label>
            <div className="flex gap-2">
              <Button variant="outline">Basic</Button>
              <Button variant="outline">Standard</Button>
              <Button variant="outline">Strict</Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 dark:bg-zinc-950">
            <h4 className="mb-4 font-medium">Current Privacy Settings</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">File Content Reading</span>
                <Badge variant="outline" className="bg-red-50 text-red-500">
                  Disabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Metadata Analysis</span>
                <Badge variant="outline" className="bg-green-50 text-green-500">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Local Storage</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-500">
                  Limited
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blacklisted Files</CardTitle>
          <CardDescription>Files and folders that will be ignored by Fylr</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {["Private Documents/*", "*.key", "Sensitive Data/", ".env"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border p-2">
                <span className="font-mono text-sm">{item}</span>
                <Badge variant="secondary">Ignored</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

