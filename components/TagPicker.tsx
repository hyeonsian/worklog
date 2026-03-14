"use client";

import { useState } from "react";
import { Check, Plus, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Tag } from "@/types";

export const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#14b8a6",
  "#f97316", "#64748b",
];

interface TagPickerProps {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string, color: string) => Promise<Tag | null>;
  onUpdate: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function TagPicker({
  tags, selectedIds, onToggle, onCreate, onUpdate, onDelete,
}: TagPickerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tag = await onCreate(newName.trim(), newColor);
    if (tag) {
      onToggle(tag.id); // auto-select
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    await onUpdate(editingId, editName.trim(), editColor);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 태그를 삭제할까요? 연결된 모든 항목에서 제거됩니다.")) return;
    await onDelete(id);
  };

  return (
    <div className="w-60 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Tag list */}
      <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
        {tags.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-2 text-center">
            태그가 없습니다. 아래에서 추가하세요.
          </p>
        )}
        {tags.map((tag) => (
          <div key={tag.id} className="group rounded-lg hover:bg-gray-50">
            {editingId === tag.id ? (
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={clsx(
                        "w-4 h-4 rounded-full transition-transform hover:scale-110",
                        editColor === c && "scale-125 ring-2 ring-offset-1 ring-gray-300"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleUpdate}
                    className="text-xs px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                  >저장</button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  >취소</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <button
                  onClick={() => onToggle(tag.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span
                    className={clsx(
                      "w-3 h-3 rounded-full flex-shrink-0 border-2 transition-colors",
                      selectedIds.includes(tag.id) ? "border-transparent" : "border-gray-300"
                    )}
                    style={selectedIds.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                  />
                  <span className="text-xs text-gray-700 flex-1 truncate">{tag.name}</span>
                  {selectedIds.includes(tag.id) && (
                    <Check size={11} className="text-indigo-500 flex-shrink-0" />
                  )}
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 pr-1.5 transition-opacity">
                  <button
                    onClick={() => startEdit(tag)}
                    className="p-1 text-gray-400 hover:text-indigo-500 rounded-md transition-colors"
                    title="태그 수정"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                    title="태그 삭제"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create new tag */}
      <div className="border-t border-gray-100 p-2 space-y-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="새 태그..."
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="p-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 text-white rounded-lg transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="flex gap-1 flex-wrap px-0.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={clsx(
                "w-4 h-4 rounded-full transition-transform hover:scale-110",
                newColor === c && "scale-125 ring-2 ring-offset-1 ring-gray-300"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
