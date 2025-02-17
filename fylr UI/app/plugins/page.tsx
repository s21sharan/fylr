import { PluginManager } from "@/components/plugin-manager"

export default function PluginsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-purple-600">Plugins</h1>
      <PluginManager />
    </div>
  )
}

