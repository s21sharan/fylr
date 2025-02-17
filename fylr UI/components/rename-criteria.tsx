"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Hash, FileType, Plus, X } from "lucide-react"

interface RenameRule {
  id: string
  type: string
  value: string
}

export function RenameCriteria() {
  const [rules, setRules] = useState<RenameRule[]>([{ id: "1", type: "prefix", value: "" }])
  const [preserveExtension, setPreserveExtension] = useState(true)
  const [addCounter, setAddCounter] = useState(false)
  const [counterStart, setCounterStart] = useState("1")
  const [counterPadding, setCounterPadding] = useState("2")

  const addRule = () => {
    const newRule: RenameRule = {
      id: Date.now().toString(),
      type: "prefix",
      value: "",
    }
    setRules([...rules, newRule])
  }

  const removeRule = (id: string) => {
    setRules(rules.filter((rule) => rule.id !== id))
  }

  const updateRule = (id: string, field: keyof RenameRule, value: string) => {
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <div key={rule.id} className="flex items-start gap-2">
              <Select value={rule.type} onValueChange={(value) => updateRule(rule.id, "type", value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefix">Prefix</SelectItem>
                  <SelectItem value="suffix">Suffix</SelectItem>
                  <SelectItem value="replace">Replace</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="type">File Type</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1">
                {rule.type === "date" ? (
                  <Select value={rule.value} onValueChange={(value) => updateRule(rule.id, "value", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                      <SelectItem value="created">Creation Date</SelectItem>
                      <SelectItem value="modified">Modified Date</SelectItem>
                    </SelectContent>
                  </Select>
                ) : rule.type === "type" ? (
                  <Select value={rule.value} onValueChange={(value) => updateRule(rule.id, "value", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category (Doc, Image, etc)</SelectItem>
                      <SelectItem value="extension">Extension (.pdf, .jpg, etc)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={
                      rule.type === "replace"
                        ? "Find text,Replace text"
                        : rule.type === "prefix"
                          ? "Add before filename"
                          : "Add after filename"
                    }
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                  />
                )}
              </div>

              {rules.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={addRule}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="preserve-extension" className="flex items-center gap-2">
              <FileType className="h-4 w-4" />
              Preserve file extension
            </Label>
            <Switch id="preserve-extension" checked={preserveExtension} onCheckedChange={setPreserveExtension} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="add-counter" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Add counter to filename
            </Label>
            <Switch id="add-counter" checked={addCounter} onCheckedChange={setAddCounter} />
          </div>

          {addCounter && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="counter-start">Start from</Label>
                <Input
                  id="counter-start"
                  type="number"
                  value={counterStart}
                  onChange={(e) => setCounterStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-padding">Padding zeros</Label>
                <Input
                  id="counter-padding"
                  type="number"
                  value={counterPadding}
                  onChange={(e) => setCounterPadding(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">Preview</div>
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
            Example: vacation_photo.jpg → 2024-03-15_beach_vacation_001.jpg
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

