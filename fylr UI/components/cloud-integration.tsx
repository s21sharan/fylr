"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Cloud, Database, UploadCloud, RefreshCw, CheckCircle2, Clock, Settings2 } from "lucide-react"

interface CloudProvider {
  id: string
  name: string
  icon: string
  connected: boolean
  lastSync: string
  usedStorage: number
  totalStorage: number
  autoSync: boolean
}

const initialProviders: CloudProvider[] = [
  {
    id: "gdrive",
    name: "Google Drive",
    icon: "/placeholder.svg?height=40&width=40",
    connected: true,
    lastSync: "10 minutes ago",
    usedStorage: 15,
    totalStorage: 100,
    autoSync: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: "/placeholder.svg?height=40&width=40",
    connected: true,
    lastSync: "1 hour ago",
    usedStorage: 8,
    totalStorage: 50,
    autoSync: false,
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: "/placeholder.svg?height=40&width=40",
    connected: false,
    lastSync: "Never",
    usedStorage: 0,
    totalStorage: 0,
    autoSync: false,
  },
]

export function CloudIntegration() {
  const [providers, setProviders] = useState<CloudProvider[]>(initialProviders)
  const [syncInProgress, setSyncInProgress] = useState(false)

  const toggleAutoSync = (providerId: string) => {
    setProviders(
      providers.map((provider) =>
        provider.id === providerId ? { ...provider, autoSync: !provider.autoSync } : provider,
      ),
    )
  }

  const formatStorage = (used: number, total: number) => {
    return `${used} GB of ${total} GB used`
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cloud Storage Providers</CardTitle>
          <CardDescription>Connect and manage your cloud storage services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border p-4 transition-colors hover:bg-accent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img src={provider.icon || "/placeholder.svg"} alt={provider.name} className="h-10 w-10 rounded-lg" />
                  <div>
                    <h3 className="font-semibold">{provider.name}</h3>
                    {provider.connected ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last synced {provider.lastSync}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not connected</div>
                    )}
                  </div>
                </div>
                <Button variant={provider.connected ? "outline" : "default"}>
                  {provider.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>

              {provider.connected && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Storage</span>
                      <span>{formatStorage(provider.usedStorage, provider.totalStorage)}</span>
                    </div>
                    <Progress value={(provider.usedStorage / provider.totalStorage) * 100} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor={`autosync-${provider.id}`} className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Auto-sync
                    </Label>
                    <Switch
                      id={`autosync-${provider.id}`}
                      checked={provider.autoSync}
                      onCheckedChange={() => toggleAutoSync(provider.id)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      Settings
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Sync Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Recent cloud synchronization activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="font-medium">Last sync completed successfully</p>
              <p className="text-sm text-muted-foreground">All files are up to date</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              10 mins ago
            </Badge>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-4 font-medium">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <UploadCloud className="h-4 w-4 text-blue-500" />
                <span>Uploaded 5 files to Google Drive</span>
                <Badge variant="outline" className="ml-auto">
                  15 mins ago
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-purple-500" />
                <span>Synced Dropbox folder structure</span>
                <Badge variant="outline" className="ml-auto">
                  1 hour ago
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Cloud className="h-4 w-4 text-green-500" />
                <span>Updated file metadata</span>
                <Badge variant="outline" className="ml-auto">
                  2 hours ago
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

