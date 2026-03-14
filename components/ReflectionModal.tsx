"use client";

import { useState, useEffect, useRef } from "react";
import { X, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { DailyReflection } from "@/types";

interface ReflectionModalProps {
  date: Date;
  existing: DailyReflection | null;
  onSave: (date: Date, content: string) => Promise<void>;
  onClose: () => void;
}

export default function ReflectionModal({
  date,
  existing,
  onSave,
  onClose,
}: ReflectionModalProps) {
  const [content, setContent] = useState(existing?.content || "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave(date, content);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-400" />
            <div>
              <p className="text-sm font-semibold text-gray-700">하루 회고</p>
              <p className="text-xs text-gray-400">
                {format(date, "yyyy년 M월 d일 (eee)", { locale: ko })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`오늘 하루를 돌아보며 자유롭게 기록해보세요.\n\n잘된 점, 아쉬운 점, 내일의 다짐 등...`}
            className="w-full h-64 text-sm text-gray-700 placeholder-gray-300 outline-none border border-gray-100 rounded-xl p-4 resize-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-50 transition-all leading-relaxed"
          />
          <p className="text-[11px] text-gray-300 mt-2 text-right">
            이 내용은 주간 뷰에 표시되지 않습니다.
          </p>
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
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg transition-colors"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
