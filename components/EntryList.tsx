"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, FileText, Users, StickyNote } from "lucide-react";
import clsx from "clsx";
import type { Entry, Section } from "@/types";

interface EntryListProps {
  entries: Entry[];
  selectedId: string | null;
  onSelect: (entry: Entry) => void;
  onNew: () => void;
  section: Section;
  loading?: boolean;
}

const SECTION_LABELS: Record<Section, string> = {
  DAILY: "일일 업무일지",
  MEETING: "회의록",
  TODO: "개인 할일",
  MEMO: "메모",
};

const SECTION_ICONS: Record<Section, React.ReactNode> = {
  DAILY: <FileText className="w-4 h-4" />,
  MEETING: <Users className="w-4 h-4" />,
  TODO: null,
  MEMO: <StickyNote className="w-4 h-4" />,
};

function getPreview(content: string): string {
  // Strip markdown syntax for preview
  return content
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 80);
}

export default function EntryList({
  entries,
  selectedId,
  onSelect,
  onNew,
  section,
  loading,
}: EntryListProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="text-gray-400">{SECTION_ICONS[section]}</span>
          <h2 className="font-semibold text-sm">{SECTION_LABELS[section]}</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {entries.length}
          </span>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          새 항목
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm">항목이 없습니다</p>
            <button
              onClick={onNew}
              className="text-xs text-indigo-500 hover:text-indigo-600 underline"
            >
              새 항목 만들기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => onSelect(entry)}
                  className={clsx(
                    "entry-card w-full text-left px-5 py-4",
                    selectedId === entry.id
                      ? "bg-indigo-50 border-l-2 border-indigo-400"
                      : "hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3
                      className={clsx(
                        "text-sm font-medium leading-snug truncate",
                        selectedId === entry.id
                          ? "text-indigo-700"
                          : "text-gray-900"
                      )}
                    >
                      {entry.title || "제목 없음"}
                    </h3>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                      {format(new Date(entry.date), "MM/dd", { locale: ko })}
                    </span>
                  </div>

                  {entry.content && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                      {getPreview(entry.content)}
                    </p>
                  )}

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 3).map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="tag-chip"
                          style={{
                            backgroundColor: tag.color + "22",
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="tag-chip bg-gray-100 text-gray-500">
                          +{entry.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
