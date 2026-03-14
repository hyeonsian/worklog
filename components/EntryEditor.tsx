"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import {
  Save,
  Trash2,
  Tag as TagIcon,
  Calendar,
  Check,
  X,
  Plus,
  ChevronDown,
  Pencil,
} from "lucide-react";
import clsx from "clsx";
import type { Entry, Tag, EntryType, Section } from "@/types";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface EntryEditorProps {
  entry: Partial<Entry> | null;
  section: Section;
  selectedDate: Date;
  tags: Tag[];
  onSave: (data: Partial<Entry>) => Promise<Entry | null>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const SECTION_TO_TYPE: Record<Section, EntryType | null> = {
  DAILY: "DAILY",
  MEETING: "MEETING",
  MEMO: "MEMO",
  TODO: null,
};

const PLACEHOLDER: Record<string, string> = {
  DAILY: "오늘의 업무 내용을 기록하세요...",
  MEETING: "회의 내용을 기록하세요...",
  MEMO: "메모를 작성하세요...",
};

export default function EntryEditor({
  entry,
  section,
  selectedDate,
  tags,
  onSave,
  onDelete,
  onClose,
}: EntryEditorProps) {
  const [title, setTitle] = useState(entry?.title || "");
  const [content, setContent] = useState(entry?.content || "");
  const [date, setDate] = useState(
    entry?.date
      ? format(new Date(entry.date), "yyyy-MM-dd")
      : format(selectedDate, "yyyy-MM-dd")
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    entry?.tags?.map((et) => et.tag.id) || []
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNew = !entry?.id;

  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry?.title || "");
    setContent(entry?.content || "");
    setDate(
      entry?.date
        ? format(new Date(entry.date), "yyyy-MM-dd")
        : format(selectedDate, "yyyy-MM-dd")
    );
    setSelectedTagIds(entry?.tags?.map((et) => et.tag.id) || []);
    setSaved(false);
    setIsEditing(false);
  }, [entry?.id]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const type = SECTION_TO_TYPE[section];
      if (!type) return;
      await onSave({
        id: entry?.id,
        title: title.trim(),
        content,
        type,
        date: new Date(date).toISOString(),
        tags: selectedTagIds.map((id) => ({
          entryId: entry?.id || "",
          tagId: id,
          tag: tags.find((t) => t.id === id)!,
        })),
      });
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [title, content, date, selectedTagIds, entry?.id, section, tags, onSave]);

  // Auto-save for existing entries
  useEffect(() => {
    if (isNew) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title.trim()) handleSave();
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, date, selectedTagIds]);

  const handleDelete = async () => {
    if (!entry?.id) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
    } finally {
      setDeleting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (res.ok) {
        const tag = await res.json();
        setSelectedTagIds((prev) => [...prev, tag.id]);
        setNewTagName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {/* Save status */}
          {saving && (
            <span className="text-xs text-gray-400">저장 중...</span>
          )}
          {saved && !saving && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <Check className="w-3 h-3" />
              저장됨
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Tag picker */}
          <div className="relative">
            <button
              onClick={() => setShowTagPicker((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              <TagIcon className="w-3.5 h-3.5" />
              태그
              <ChevronDown className="w-3 h-3" />
            </button>

            {showTagPicker && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
                    >
                      <div
                        className={clsx(
                          "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                          selectedTagIds.includes(tag.id)
                            ? "border-transparent"
                            : "border-gray-300"
                        )}
                        style={
                          selectedTagIds.includes(tag.id)
                            ? { backgroundColor: tag.color }
                            : {}
                        }
                      >
                        {selectedTagIds.includes(tag.id) && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-2 flex gap-1">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    placeholder="새 태그..."
                    className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400"
                  />
                  <button
                    onClick={handleCreateTag}
                    className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 메모/회의록 저장 글: 편집 버튼 */}
          {(section === "MEMO" || section === "MEETING") && !isNew && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              편집
            </button>
          )}

          {/* Save button */}
          {(isNew || isEditing || (section !== "MEMO" && section !== "MEETING")) && (
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 px-3 py-1.5 rounded-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              저장
            </button>
          )}

          {/* Delete button (only for existing entries) */}
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-8 pt-6 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요..."
          className="w-full text-2xl font-bold text-gray-900 border-none focus:ring-0 placeholder:text-gray-300 bg-transparent"
        />

        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="tag-chip hover:opacity-80"
                style={{
                  backgroundColor: tag.color + "22",
                  color: tag.color,
                }}
              >
                {tag.name}
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div
        className="flex-1 overflow-hidden px-8 pb-6"
        data-color-mode="light"
      >
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || "")}
          height="100%"
          preview={(section === "MEMO" || section === "MEETING") && !isNew && !isEditing ? "preview" : "live"}
          hideToolbar={(section === "MEMO" || section === "MEETING") && !isNew && !isEditing}
          visibleDragbar={false}
          style={{ height: "100%" }}
          textareaProps={{
            placeholder: PLACEHOLDER[section] || "내용을 입력하세요...",
          }}
        />
      </div>

      {/* Click outside to close tag picker */}
      {showTagPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowTagPicker(false)}
        />
      )}
    </div>
  );
}
