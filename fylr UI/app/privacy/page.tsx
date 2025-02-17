import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-purple-600">Privacy Settings</h1>

      <Card className="bg-purple-50 dark:bg-purple-950/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <CardTitle>Privacy Settings</CardTitle>
          </div>
          <CardDescription>Customize your privacy preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-white p-4 dark:bg-zinc-950">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="file-content" className="text-sm">
                  File Content Reading
                </Label>
                <Switch id="file-content" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cloud" className="text-sm">
                  Run on Fylr Cloud
                </Label>
                <Switch id="cloud" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics" className="text-sm">
                  Share Data Analytics
                </Label>
                <Switch id="analytics" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blacklisted Directories</CardTitle>
          <CardDescription>Directories that will be ignored by Fylr</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {["Passwords/", "Personal Data/", "Legal Documents/", ".env"].map((item) => (
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

