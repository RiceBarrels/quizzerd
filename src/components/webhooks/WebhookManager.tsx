"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface WebhookData {
  webhook_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  exam_ids: string[] | null;
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

interface WebhookEvent {
  id: string;
  label: string;
  description: string;
}

interface WebhookLog {
  log_id: string;
  event_type: string;
  payload: any;
  status_code: number | null;
  response_time_ms: number | null;
  success: boolean | null;
  error_message: string | null;
  created_at: string;
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks/manage");
      const data = await response.json();
      if (data.success) {
        setWebhooks(data.data || []);
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const fetchLogs = async (webhookId: string) => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/webhooks/manage?webhookId=${webhookId}`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName || !formUrl || formEvents.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          events: formEvents,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateDialog(false);
        setFormName("");
        setFormUrl("");
        setFormEvents([]);
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Failed to create webhook:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/webhooks/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_id: webhookId, is_active: isActive }),
      });

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Failed to toggle webhook:", error);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      const response = await fetch(`/api/webhooks/manage?webhookId=${webhookId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Failed to delete webhook:", error);
    }
  };

  const handleTest = async (webhookId: string) => {
    setTesting(webhookId);
    try {
      const response = await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", webhook_id: webhookId }),
      });

      const data = await response.json();
      if (data.success && data.data?.success) {
        alert(`Test successful! Response time: ${data.data.responseTimeMs}ms`);
      } else {
        alert(`Test failed: ${data.data?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to test webhook:", error);
      alert("Failed to test webhook");
    } finally {
      setTesting(null);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Send event notifications to external services
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No webhooks configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a webhook to receive event notifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.webhook_id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">
                    {webhook.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) =>
                          handleToggle(webhook.webhook_id, checked)
                        }
                      />
                      {webhook.failure_count > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {webhook.failure_count} failures
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(webhook.last_triggered_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(webhook.webhook_id)}
                        disabled={testing === webhook.webhook_id}
                      >
                        {testing === webhook.webhook_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          fetchLogs(webhook.webhook_id);
                          setShowLogsDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(webhook.webhook_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook to receive event notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Webhook"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/webhook"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <Checkbox
                      id={event.id}
                      checked={formEvents.includes(event.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormEvents([...formEvents, event.id]);
                        } else {
                          setFormEvents(formEvents.filter((e) => e !== event.id));
                        }
                      }}
                    />
                    <div>
                      <Label htmlFor={event.id} className="cursor-pointer">
                        {event.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName || !formUrl || formEvents.length === 0}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Webhook
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Logs - {selectedWebhook?.name}</DialogTitle>
          </DialogHeader>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.log_id}
                  className={cn(
                    "p-3 rounded-lg border",
                    log.success
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <Badge variant="secondary">{log.event_type}</Badge>
                      {log.status_code && (
                        <span className="text-sm text-muted-foreground">
                          HTTP {log.status_code}
                        </span>
                      )}
                      {log.response_time_ms && (
                        <span className="text-sm text-muted-foreground">
                          {log.response_time_ms}ms
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                  {log.error_message && (
                    <p className="mt-2 text-sm text-red-600">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
