"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tag, TagBadge } from "./tag-badge";
import { Check, Plus, Tags, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
}

const TAG_COLORS = [
  { name: "gray", class: "bg-gray-400" },
  { name: "red", class: "bg-red-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "yellow", class: "bg-yellow-500" },
  { name: "green", class: "bg-green-500" },
  { name: "blue", class: "bg-blue-500" },
  { name: "purple", class: "bg-purple-500" },
  { name: "pink", class: "bg-pink-500" },
];

export function TagSelector({
  selectedTagIds,
  onTagsChange,
  className,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("gray");

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();
      if (data.success) {
        setTags(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag_name: newTagName.trim(),
          tag_color: newTagColor,
          tag_category: "custom",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTags([...tags, data.data]);
        onTagsChange([...selectedTagIds, data.data.tag_id]);
        setNewTagName("");
        setCreatingTag(false);
        toast.success("Tag created");
      } else {
        toast.error(data.error || "Failed to create tag");
      }
    } catch (error) {
      toast.error("Failed to create tag");
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.tag_id));
  const filteredTags = tags.filter(
    (tag) =>
      tag.tag_name.toLowerCase().includes(search.toLowerCase()) ||
      tag.tag_category?.toLowerCase().includes(search.toLowerCase())
  );

  // Group tags by category
  const tagsByCategory = filteredTags.reduce(
    (acc, tag) => {
      const category = tag.tag_category || "custom";
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    },
    {} as Record<string, Tag[]>
  );

  const categoryLabels: Record<string, string> = {
    difficulty: "Difficulty",
    bloom: "Bloom's Taxonomy",
    topic: "Topic",
    chapter: "Chapter",
    custom: "Custom",
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.tag_id}
              tag={tag}
              size="sm"
              onRemove={() => toggleTag(tag.tag_id)}
            />
          ))}
        </div>
      )}

      {/* Tag selector popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-fit gap-1.5 h-7 text-xs"
          >
            <Tags className="h-3 w-3" />
            {selectedTags.length > 0 ? `${selectedTags.length} tags` : "Add tags"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      No tags found
                    </div>
                  </CommandEmpty>

                  {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
                    <CommandGroup
                      key={category}
                      heading={categoryLabels[category] || category}
                    >
                      {categoryTags.map((tag) => (
                        <CommandItem
                          key={tag.tag_id}
                          value={tag.tag_name}
                          onSelect={() => toggleTag(tag.tag_id)}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border",
                              selectedTagIds.includes(tag.tag_id)
                                ? "bg-primary border-primary"
                                : "border-muted"
                            )}
                          >
                            {selectedTagIds.includes(tag.tag_id) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <TagBadge tag={tag} size="sm" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </>
              )}

              <CommandSeparator />

              {/* Create new tag section */}
              <div className="p-2">
                {creatingTag ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateTag();
                        }
                        if (e.key === "Escape") {
                          setCreatingTag(false);
                          setNewTagName("");
                        }
                      }}
                    />
                    <div className="flex gap-1 flex-wrap">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          className={cn(
                            "h-5 w-5 rounded-full border-2",
                            color.class,
                            newTagColor === color.name
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-transparent"
                          )}
                          onClick={() => setNewTagColor(color.name)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setCreatingTag(false);
                          setNewTagName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 justify-start text-xs"
                    onClick={() => setCreatingTag(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create new tag
                  </Button>
                )}
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
