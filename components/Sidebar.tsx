"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  BookOpen,
  FileText,
  Users,
  CheckSquare,
  StickyNote,
  LogOut,
  ChevronDown,
  Tag as TagIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import clsx from "clsx";
import Calendar from "./Calendar";
import SearchBar from "./SearchBar";
import type { Tag, Section } from "@/types";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedSection: Section;
  onSectionChange: (section: Section) => void;
  search: string;
  onSearchChange: (s: string) => void;
  tags: Tag[];
  selectedTags: string[];
  onTagToggle: (tagName: string) => void;
}

const NAV_ITEMS: { label: string; section: Section; icon: React.ReactNode }[] = [
  { label: "일일 업무일지", section: "DAILY",   icon: <FileText    className="w-4 h-4" /> },
  { label: "회의록",        section: "MEETING",  icon: <Users       className="w-4 h-4" /> },
  { label: "개인 할일",     section: "TODO",     icon: <CheckSquare className="w-4 h-4" /> },
  { label: "메모",          section: "MEMO",     icon: <StickyNote  className="w-4 h-4" /> },
];

const SIDEBAR_W = 260;
const COLLAPSED_W = 52;

export default function Sidebar({
  collapsed,
  onToggle,
  selectedDate,
  onDateChange,
  selectedSection,
  onSectionChange,
  search,
  onSearchChange,
  tags,
  selectedTags,
  onTagToggle,
}: SidebarProps) {
  const { data: session } = useSession();
  const [showTags, setShowTags] = useState(true);

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col overflow-hidden border-r border-gray-200 transition-all duration-200"
      style={{ width: collapsed ? COLLAPSED_W : SIDEBAR_W, background: "var(--notion-sidebar)" }}
    >
      {/* ── Header ── */}
      <div className={clsx(
        "flex items-center border-b border-gray-200 py-4 flex-shrink-0",
        collapsed ? "justify-center px-2" : "px-4 gap-2.5"
      )}>
        {!collapsed && (
          <>
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 leading-tight">Worklog</p>
              <p className="text-xs text-gray-500 truncate">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
          </>
        )}

        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Collapsed: icon-only nav ── */}
      {collapsed && (
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ label, section, icon }) => (
            <button
              key={section}
              onClick={() => onSectionChange(section)}
              title={label}
              className={clsx(
                "w-full flex items-center justify-center py-3 transition-colors",
                selectedSection === section
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              )}
            >
              {icon}
            </button>
          ))}
        </nav>
      )}

      {/* ── Expanded: full content ── */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          {/* Calendar */}
          <div className="py-3 border-b border-gray-200">
            <Calendar selectedDate={selectedDate} onDateChange={onDateChange} />
            <div className="px-4 mt-2">
              <p className="text-xs text-gray-500 font-medium">
                {format(selectedDate, "yyyy년 MM월 dd일 (eee)", { locale: ko })}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-200">
            <SearchBar value={search} onChange={onSearchChange} />
          </div>

          {/* Navigation */}
          <nav className="py-2 border-b border-gray-200">
            <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              섹션
            </p>
            {NAV_ITEMS.map(({ label, section, icon }) => (
              <button
                key={section}
                onClick={() => onSectionChange(section)}
                className={clsx(
                  "sidebar-item w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                  selectedSection === section
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className={clsx(selectedSection === section ? "text-indigo-500" : "text-gray-400")}>
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </nav>

          {/* Tags */}
          <div className="py-2">
            <button
              onClick={() => setShowTags((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-1"
            >
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <TagIcon className="w-3 h-3" />
                태그
              </span>
              <ChevronDown className={clsx("w-3 h-3 text-gray-400 transition-transform", showTags ? "rotate-0" : "-rotate-90")} />
            </button>

            {showTags && (
              <div className="px-4 py-1 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onTagToggle(tag.name)}
                    className={clsx(
                      "tag-chip transition-all",
                      selectedTags.includes(tag.name) ? "opacity-100 ring-2 ring-offset-1" : "opacity-70 hover:opacity-100"
                    )}
                    style={{ backgroundColor: tag.color + "22", color: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="text-xs text-gray-400 px-1">태그 없음</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="로그아웃"
          className={clsx(
            "flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors",
            collapsed ? "w-full justify-center py-2" : "w-full px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "로그아웃"}
        </button>
      </div>
    </aside>
  );
}
