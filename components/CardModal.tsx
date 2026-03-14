"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Tag as TagIcon, Check, Clock, MoveRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DailyCard, DailySlot, Tag } from "@/types";

const SLOT_OPTIONS: { value: DailySlot; label: string }[] = [
  { value: "WORK",     label: "📌 업무" },
  { value: "TOMORROW", label: "📋 내일 할 일" },
];

function validateTime(val: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
}

interface CardModalProps {
  card: Partial<DailyCard> | null;
  isNew: boolean;
  tags: Tag[];
  onSave: (data: Partial<DailyCard>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function CardModal({
  card,
  isNew,
  tags,
  onSave,
  onDelete,
  onClose,
}: CardModalProps) {
  const [title, setTitle] = useState(card?.title || "");
  const [content, setContent] = useState(card?.content || "");
  const [startTime, setStartTime] = useState(card?.startTime || "");
  const [endTime, setEndTime] = useState(card?.endTime || "");
  const [slot, setSlot] = useState<DailySlot>((card?.slot as DailySlot) || "MORNING");
  const [date, setDate] = useState(
    card?.date ? format(parseISO(card.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    card?.tags?.map((t) => t.tagId) || []
  );
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close tag picker on outside click
  useEffect(() => {
    if (!showTagPicker) return;
    const handler = (e: MouseEvent) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTagPicker]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      ...card,
      title: title.trim(),
      content,
      slot,
      date: new Date(date).toISOString(),
      startTime: startTime && validateTime(startTime) ? startTime : null,
      endTime: endTime && validateTime(endTime) ? endTime : null,
      tags: selectedTagIds.map((id) => ({
        cardId: card?.id || "",
        tagId: id,
        tag: tags.find((t) => t.id === id)!,
      })),
    });
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!card?.id || !onDelete) return;
    if (!confirm("이 카드를 삭제할까요?")) return;
    await onDelete(card.id);
    onClose();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs font-medium text-gray-400">
            {isNew ? "새 카드" : "카드 편집"}
          </span>
          <div className="flex items-center gap-1">
            {!isNew && onDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="카드 제목"
            className="w-full text-lg font-semibold text-gray-800 placeholder-gray-300 outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상세 내용을 입력하세요..."
            rows={5}
            className="w-full text-sm text-gray-700 placeholder-gray-300 outline-none border border-gray-100 rounded-xl p-3 resize-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-50 transition-all"
          />

          {/* Time inputs */}
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-gray-300 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="09:00"
                  maxLength={5}
                  className={`w-full text-sm text-center border rounded-lg px-2 py-1.5 outline-none transition-colors ${
                    startTime && !validateTime(startTime)
                      ? "border-red-200 bg-red-50 text-red-500"
                      : "border-gray-100 focus:border-indigo-200"
                  }`}
                />
                <p className="text-[10px] text-gray-300 text-center mt-0.5">시작</p>
              </div>
              <span className="text-gray-300 text-sm flex-shrink-0">—</span>
              <div className="flex-1">
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="10:00"
                  maxLength={5}
                  className={`w-full text-sm text-center border rounded-lg px-2 py-1.5 outline-none transition-colors ${
                    endTime && !validateTime(endTime)
                      ? "border-red-200 bg-red-50 text-red-500"
                      : "border-gray-100 focus:border-indigo-200"
                  }`}
                />
                <p className="text-[10px] text-gray-300 text-center mt-0.5">종료</p>
              </div>
            </div>
          </div>

          {/* Move: date + slot */}
          <div className="flex items-center gap-3">
            <MoveRight size={14} className="text-gray-300 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 text-sm border border-gray-100 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-200 transition-colors text-gray-700"
              />
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as DailySlot)}
                className="flex-1 text-sm border border-gray-100 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-200 transition-colors text-gray-700 bg-white"
              >
                {SLOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="relative" ref={tagPickerRef}>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowTagPicker((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <TagIcon size={11} />
                태그
              </button>
              {selectedTagIds.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => toggleTag(tagId)}
                      className="ml-0.5 opacity-70 hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>

            {showTagPicker && (
              <div className="absolute bottom-8 left-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-52 max-h-48 overflow-y-auto">
                {tags.length === 0 && (
                  <p className="text-xs text-gray-400 px-2 py-1">태그 없음</p>
                )}
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                    {selectedTagIds.includes(tag.id) && (
                      <Check size={13} className="text-indigo-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? "저장 중..." : isNew ? "추가" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
