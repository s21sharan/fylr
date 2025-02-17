"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Moon, Sun, Laptop, FolderOpen, Settings2, Zap, HardDrive, RefreshCw, AlertCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function Settings() {
  const [defaultLocation, setDefaultLocation] = useState("/Users/Documents")
  const [theme, setTheme] = useState("system")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure your Fylr experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Theme Preference</Label>
            <RadioGroup defaultValue={theme} onValueChange={setTheme} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-2">
                  <Laptop className="h-4 w-4" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Default Save Location</Label>
            <div className="flex gap-2">
              <Input value={defaultLocation} onChange={(e) => setDefaultLocation(e.target.value)} />
              <Button variant="outline" size="icon">
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Processing Speed</Label>
            <Select defaultValue="balanced">
              <SelectTrigger>
                <SelectValue placeholder="Select processing speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Performance
                  </div>
                </SelectItem>
                <SelectItem value="balanced">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Balanced
                  </div>
                </SelectItem>
                <SelectItem value="efficiency">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Storage Efficient
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File Handling</CardTitle>
          <CardDescription>Configure how Fylr manages your files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-organize" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Auto-organize new files
            </Label>
            <Switch id="auto-organize" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="keep-original" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Keep original file copies
            </Label>
            <Switch id="keep-original" />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="process-hidden" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Process hidden files
            </Label>
            <Switch id="process-hidden" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="process-complete" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Processing complete
            </Label>
            <Switch id="process-complete" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sync-status" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Sync status changes
            </Label>
            <Switch id="sync-status" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="error-notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Error notifications
            </Label>
            <Switch id="error-notifications" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Configure advanced features and performance options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Cache Management</Label>
            <Select defaultValue="1week">
              <SelectTrigger>
                <SelectValue placeholder="Select cache duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">Clear cache daily</SelectItem>
                <SelectItem value="1week">Clear cache weekly</SelectItem>
                <SelectItem value="1month">Clear cache monthly</SelectItem>
                <SelectItem value="never">Never clear cache</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="debug-mode" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Debug mode
            </Label>
            <Switch id="debug-mode" />
          </div>

          <div className="pt-4">
            <Button variant="destructive" className="w-full">
              Reset All Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

