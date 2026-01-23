'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Trash2,
  Loader2,
  Copy,
  Link2,
} from 'lucide-react';
import { useCollaboration } from '@/hooks/useCollaboration';

interface CollaboratorManagerProps {
  examId: string;
  examName?: string;
  trigger?: React.ReactNode;
}

export default function CollaboratorManager({
  examId,
  examName,
  trigger
}: CollaboratorManagerProps) {
  const [open, setOpen] = useState(false);
  const [newCollaboratorId, setNewCollaboratorId] = useState('');
  const [adding, setAdding] = useState(false);

  const {
    collaborators,
    isOwner,
    loadingCollaborators,
    addCollaborator,
    removeCollaborator,
  } = useCollaboration({ examId, enabled: open });

  const handleAdd = async () => {
    if (!newCollaboratorId.trim()) {
      toast.error('Please enter an email or user ID');
      return;
    }

    setAdding(true);
    const result = await addCollaborator(newCollaboratorId.trim());

    if (result.success) {
      toast.success('Collaborator added successfully');
      setNewCollaboratorId('');
    } else {
      toast.error(result.error || 'Failed to add collaborator');
    }

    setAdding(false);
  };

  const handleRemove = async (collaboratorId: string) => {
    const result = await removeCollaborator(collaboratorId);
    if (result.success) {
      toast.success('Collaborator removed');
    } else {
      toast.error(result.error || 'Failed to remove collaborator');
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/exam/${examId}/edit`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Collaborate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborators
          </DialogTitle>
          <DialogDescription>
            Share {examName ? `"${examName}"` : 'this exam'} with others to edit together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Collaborator Section */}
          {isOwner && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Add collaborator</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email or user ID"
                    value={newCollaboratorId}
                    onChange={(e) => setNewCollaboratorId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1"
                  />
                  <Button onClick={handleAdd} disabled={adding}>
                    {adding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter their email address or Clerk user ID. They must have an account to be added.
                </p>
              </div>

              <Separator />
            </>
          )}

          {/* Share Link */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Share link</span>
            </div>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>

          {/* Collaborators List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {collaborators.length > 0
                ? `Collaborators (${collaborators.length})`
                : 'No collaborators yet'}
            </Label>

            {loadingCollaborators ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No collaborators have been added</p>
                {isOwner && (
                  <p className="text-xs mt-1">
                    Enter an email or user ID above to add a collaborator
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[240px]">
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10">
                            {collaborator.name
                              ? collaborator.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : collaborator.email?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {collaborator.name || collaborator.email || collaborator.id}
                          </p>
                          {collaborator.email && collaborator.name && (
                            <p className="text-xs text-muted-foreground">
                              {collaborator.email}
                            </p>
                          )}
                          <Badge variant="secondary" className="text-xs mt-0.5">
                            Editor
                          </Badge>
                        </div>
                      </div>

                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(collaborator.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-muted-foreground">
            Collaborators can edit all questions and settings
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
