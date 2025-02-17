import { VersionHistory } from "@/components/version-history"

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-purple-600">Version History</h1>
      <VersionHistory />
    </div>
  )
}

