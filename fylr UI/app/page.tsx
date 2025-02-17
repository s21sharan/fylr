import { FileOrganizer } from "@/components/file-organizer"
import { FileRenameProcess } from "@/components/file-rename-process"
import { OrganizationSummary } from "@/components/organization-summary"
import { SmartSearch } from "@/components/smart-search"
import { DailyQueue } from "@/components/daily-queue"
import { DuplicateFiles } from "@/components/duplicate-files"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <div className="space-y-6">
      <SmartSearch />
      <DailyQueue />
      <OrganizationSummary />
      <Tabs defaultValue="rename" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rename">Rename Files</TabsTrigger>
          <TabsTrigger value="organize">Organize Files</TabsTrigger>
        </TabsList>
        <TabsContent value="rename" className="space-y-4">
          <FileRenameProcess />
        </TabsContent>
        <TabsContent value="organize" className="space-y-4">
          <FileOrganizer />
          <DuplicateFiles />
        </TabsContent>
      </Tabs>
    </div>
  )
}

