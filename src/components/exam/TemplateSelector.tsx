"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  LayoutTemplate,
  Loader2,
  Save,
  ChevronDown,
  Clock,
  Shield,
  Shuffle,
  Eye,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExamSettings {
  duration_minutes: number;
  attempts_allowed: number;
  passing_score: number;
  shuffle_items: boolean;
  show_results_immediately: boolean;
  console_detection: boolean;
  translation_detection: boolean;
  visibility_change_detection: boolean;
  location_detection: boolean;
  [key: string]: number | boolean | string | undefined;
}

interface Template {
  template_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  settings: ExamSettings;
}

interface TemplateSelectorProps {
  onApply: (settings: ExamSettings) => void;
  className?: string;
}

export function TemplateSelector({ onApply, className }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/exam-templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (template: Template) => {
    onApply(template.settings);
    setOpen(false);
    toast.success(`Applied "${template.name}" template`);

    // Update usage count
    if (!template.is_system) {
      await fetch("/api/exam-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: template.template_id }),
      });
    }
  };

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/exam-templates?templateId=${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.template_id !== templateId));
        toast.success("Template deleted");
      } else {
        toast.error("Failed to delete template");
      }
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const getSettingsSummary = (settings: ExamSettings) => {
    const items: string[] = [];
    if (settings.duration_minutes > 0) {
      items.push(`${settings.duration_minutes}min`);
    } else {
      items.push("No limit");
    }
    if (settings.shuffle_items) items.push("Shuffled");
    if (settings.visibility_change_detection || settings.console_detection) {
      items.push("Anti-cheat");
    }
    return items.join(" • ");
  };

  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <LayoutTemplate className="h-4 w-4" />
          Apply Template
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {/* System Templates */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              System Templates
            </div>
            {systemTemplates.map((template) => (
              <DropdownMenuItem
                key={template.template_id}
                onClick={() => handleApply(template)}
                className="flex flex-col items-start gap-1 py-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium">{template.name}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    System
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getSettingsSummary(template.settings)}
                </span>
              </DropdownMenuItem>
            ))}

            {/* User Templates */}
            {userTemplates.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  My Templates
                </div>
                {userTemplates.map((template) => (
                  <DropdownMenuItem
                    key={template.template_id}
                    onClick={() => handleApply(template)}
                    className="flex items-center justify-between py-2 group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {getSettingsSummary(template.settings)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDelete(template.template_id, e)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SaveAsTemplateButtonProps {
  currentSettings: ExamSettings;
  className?: string;
}

export function SaveAsTemplateButton({
  currentSettings,
  className,
}: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/exam-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          settings: currentSettings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Template saved successfully");
        setOpen(false);
        setName("");
        setDescription("");
      } else {
        toast.error(data.error || "Failed to save template");
      }
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Save className="h-4 w-4" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Settings as Template</DialogTitle>
          <DialogDescription>
            Save your current exam settings as a reusable template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Final Exam Settings"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description (Optional)</Label>
            <Textarea
              id="template-description"
              placeholder="Describe when to use this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Settings Preview */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">Current Settings:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>
                  {currentSettings.duration_minutes > 0
                    ? `${currentSettings.duration_minutes} min`
                    : "No limit"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-muted-foreground" />
                <span>{currentSettings.attempts_allowed} attempt(s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shuffle className="h-3 w-3 text-muted-foreground" />
                <span>
                  Shuffle: {currentSettings.shuffle_items ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span>
                  Results: {currentSettings.show_results_immediately ? "Immediate" : "After"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span>
                  Anti-cheat:{" "}
                  {currentSettings.visibility_change_detection ||
                  currentSettings.console_detection ||
                  currentSettings.translation_detection
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
