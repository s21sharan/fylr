"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Settings2, Star, Download, Zap, Binary, GitBranch, FileJson, RefreshCw } from "lucide-react"

interface Plugin {
  id: string
  name: string
  description: string
  icon: JSX.Element
  author: string
  version: string
  category: string
  installed: boolean
  enabled: boolean
  stars: number
  downloads: number
}

const plugins: Plugin[] = [
  {
    id: "jupyter-organizer",
    name: "Jupyter Notebook Manager",
    description:
      "Organize and version control Jupyter notebooks with automatic categorization by project and dataset. Includes smart tagging for data dependencies and experiment tracking.",
    icon: <Binary className="h-5 w-5" />,
    author: "DataSci Tools",
    version: "1.3.0",
    category: "Data Science",
    installed: true,
    enabled: true,
    stars: 4.9,
    downloads: 28000,
  },
  {
    id: "git-integrator",
    name: "Git Project Organizer",
    description:
      "Automatically organize source code files by project, branch, and feature implementation. Includes smart detection of related files and dependency management.",
    icon: <GitBranch className="h-5 w-5" />,
    author: "DevTools Co",
    version: "1.4.2",
    category: "Development",
    installed: true,
    enabled: true,
    stars: 4.7,
    downloads: 42000,
  },
  {
    id: "api-docs",
    name: "API Documentation Organizer",
    description:
      "Parse and organize API documentation, Swagger files, and endpoint specifications. Features automatic versioning and change tracking for API evolution.",
    icon: <FileJson className="h-5 w-5" />,
    author: "APITools",
    version: "1.1.0",
    category: "Development",
    installed: false,
    enabled: false,
    stars: 4.5,
    downloads: 22000,
  },
]

export function PluginManager() {
  const [searchQuery, setSearchQuery] = useState("")
  const [installedPlugins, setInstalledPlugins] = useState(plugins)

  const togglePlugin = (pluginId: string) => {
    setInstalledPlugins((prev) =>
      prev.map((plugin) => (plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin)),
    )
  }

  const installPlugin = (pluginId: string) => {
    setInstalledPlugins((prev) =>
      prev.map((plugin) => (plugin.id === pluginId ? { ...plugin, installed: true } : plugin)),
    )
  }

  const filteredPlugins = installedPlugins.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Developer Tools</CardTitle>
              <CardDescription>Essential plugins for development workflows</CardDescription>
            </div>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Check for Updates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plugins..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Plugins</TabsTrigger>
              <TabsTrigger value="installed">Installed</TabsTrigger>
              <TabsTrigger value="updates">Updates Available</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredPlugins.map((plugin) => (
                <Card key={plugin.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-950">{plugin.icon}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{plugin.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              by {plugin.author} • v{plugin.version}
                            </p>
                          </div>
                          {plugin.installed ? (
                            <Switch checked={plugin.enabled} onCheckedChange={() => togglePlugin(plugin.id)} />
                          ) : (
                            <Button onClick={() => installPlugin(plugin.id)}>Install</Button>
                          )}
                        </div>
                        <p className="text-sm">{plugin.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {plugin.stars}
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            {plugin.downloads.toLocaleString()}
                          </div>
                          <Badge variant="outline">{plugin.category}</Badge>
                        </div>
                      </div>
                    </div>
                    {plugin.installed && (
                      <div className="mt-4 flex items-center gap-2 border-t pt-4">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Settings2 className="h-4 w-4" />
                          Settings
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Zap className="h-4 w-4" />
                          Quick Actions
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="installed">
              {filteredPlugins
                .filter((p) => p.installed)
                .map((plugin) => (
                  <Card key={plugin.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-950">{plugin.icon}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{plugin.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                by {plugin.author} • v{plugin.version}
                              </p>
                            </div>
                            <Switch checked={plugin.enabled} onCheckedChange={() => togglePlugin(plugin.id)} />
                          </div>
                          <p className="text-sm">{plugin.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4" />
                              {plugin.stars}
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="h-4 w-4" />
                              {plugin.downloads.toLocaleString()}
                            </div>
                            <Badge variant="outline">{plugin.category}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 border-t pt-4">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Settings2 className="h-4 w-4" />
                          Settings
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Zap className="h-4 w-4" />
                          Quick Actions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="updates">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">All plugins are up to date</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

