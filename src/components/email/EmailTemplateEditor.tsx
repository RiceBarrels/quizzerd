"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Mail,
  Eye,
  Code,
  Plus,
  Save,
  Loader2,
  Variable,
  Trash2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmailTemplateType =
  | "exam_invitation"
  | "exam_reminder"
  | "result_notification"
  | "session_closed";

interface TemplateVariable {
  key: string;
  label: string;
  description: string;
}

interface EmailTemplate {
  template_id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  html_content: string;
  is_active: boolean;
  is_default: boolean;
}

const TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  exam_invitation: "Exam Invitation",
  exam_reminder: "Exam Reminder",
  result_notification: "Result Notification",
  session_closed: "Session Closed",
};

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  exam_name: "Midterm Exam",
  course_name: "Mathematics 101",
  teacher_name: "Dr. Smith",
  exam_url: "https://example.com/exam/123",
  due_date: "January 15, 2026 at 5:00 PM",
  student_name: "John Doe",
  remaining_time: "2 hours",
  score: "85",
  max_score: "100",
  percentage: "85",
  result_url: "https://example.com/results/123",
  total_students: "25",
  average_score: "78",
};

interface EmailTemplateEditorProps {
  type: EmailTemplateType;
  variables: TemplateVariable[];
  initialData?: Partial<EmailTemplate>;
  onSave: (data: {
    name: string;
    subject: string;
    html_content: string;
    is_default: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

export function EmailTemplateEditor({
  type,
  variables,
  initialData,
  onSave,
  onCancel,
  saving = false,
}: EmailTemplateEditorProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [content, setContent] = useState(initialData?.html_content || "");
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (key: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variable = `{{${key}}}`;
    const newContent =
      content.substring(0, start) + variable + content.substring(end);
    setContent(newContent);

    // Restore cursor position after variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + variable.length,
        start + variable.length
      );
    }, 0);
  };

  const insertVariableToSubject = (key: string) => {
    setSubject((prev) => prev + `{{${key}}}`);
  };

  const getPreviewContent = (text: string) => {
    let result = text;
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });
    return result;
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !content.trim()) return;
    await onSave({
      name: name.trim(),
      subject: subject.trim(),
      html_content: content.trim(),
      is_default: isDefault,
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Name and Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            placeholder="My Custom Template"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Template Type</Label>
          <div className="flex items-center gap-2 h-10">
            <Badge variant="outline" className="text-sm">
              {TEMPLATE_TYPE_LABELS[type]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Subject Line */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Subject Line</Label>
          <VariableDropdown
            variables={variables}
            onSelect={insertVariableToSubject}
            label="Insert variable"
          />
        </div>
        <Input
          id="subject"
          placeholder="Email subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        {subject && (
          <p className="text-xs text-muted-foreground">
            Preview: {getPreviewContent(subject)}
          </p>
        )}
      </div>

      {/* Content Editor with Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Email Content (HTML)</Label>
          <VariableDropdown
            variables={variables}
            onSelect={insertVariable}
            label="Insert variable"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="gap-2">
              <Code className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-2">
            <Textarea
              ref={contentRef}
              placeholder="<h2>Hello {{student_name}}</h2>..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-2">
            <Card>
              <CardContent className="p-4">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: getPreviewContent(content),
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Available Variables */}
      <div className="space-y-2">
        <Label>Available Variables</Label>
        <div className="flex flex-wrap gap-2">
          {variables.map((v) => (
            <Badge
              key={v.key}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => insertVariable(v.key)}
              title={v.description}
            >
              <Variable className="h-3 w-3 mr-1" />
              {`{{${v.key}}}`}
            </Badge>
          ))}
        </div>
      </div>

      {/* Default Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Set as Default Template
          </Label>
          <p className="text-sm text-muted-foreground">
            This template will be used automatically for {TEMPLATE_TYPE_LABELS[type].toLowerCase()} emails
          </p>
        </div>
        <Switch checked={isDefault} onCheckedChange={setIsDefault} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim() || !subject.trim() || !content.trim()}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Variable dropdown component
function VariableDropdown({
  variables,
  onSelect,
  label,
}: {
  variables: TemplateVariable[];
  onSelect: (key: string) => void;
  label: string;
}) {
  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {variables.map((v) => (
          <SelectItem key={v.key} value={v.key}>
            <span className="font-mono">{`{{${v.key}}}`}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Template list component
interface EmailTemplateListProps {
  templates: EmailTemplate[];
  variables: Record<EmailTemplateType, TemplateVariable[]>;
  onEdit: (template: EmailTemplate) => void;
  onDelete: (templateId: string) => void;
  onSetDefault: (templateId: string) => void;
  loading?: boolean;
}

export function EmailTemplateList({
  templates,
  variables,
  onEdit,
  onDelete,
  onSetDefault,
  loading = false,
}: EmailTemplateListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No custom templates yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first email template to get started
        </p>
      </div>
    );
  }

  // Group templates by type
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<EmailTemplateType, EmailTemplate[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
        <div key={type} className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            {TEMPLATE_TYPE_LABELS[type as EmailTemplateType]}
          </h3>
          <div className="grid gap-3">
            {typeTemplates.map((template) => (
              <Card
                key={template.template_id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  !template.is_active && "opacity-50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        {template.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        Subject: {template.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetDefault(template.template_id);
                          }}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(template)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(template.template_id);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Create template dialog
interface CreateTemplateDialogProps {
  variables: Record<EmailTemplateType, TemplateVariable[]>;
  onSave: (data: {
    type: EmailTemplateType;
    name: string;
    subject: string;
    html_content: string;
    is_default: boolean;
  }) => Promise<void>;
  trigger?: React.ReactNode;
}

export function CreateTemplateDialog({
  variables,
  onSave,
  trigger,
}: CreateTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EmailTemplateType>("exam_invitation");
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: {
    name: string;
    subject: string;
    html_content: string;
    is_default: boolean;
  }) => {
    setSaving(true);
    try {
      await onSave({ ...data, type: selectedType });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Email Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as EmailTemplateType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <EmailTemplateEditor
            type={selectedType}
            variables={variables[selectedType] || []}
            onSave={handleSave}
            onCancel={() => setOpen(false)}
            saving={saving}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
