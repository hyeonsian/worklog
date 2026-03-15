"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  MapPin,
  Clock,
  Loader2,
  Calendar,
  AlignLeft,
  Search,
  Trash2,
  Pencil,
} from "lucide-react";
import clsx from "clsx";
import type { CalDAVEvent } from "@/types";

interface MonthlyScheduleProps {
  caldavEnabled: boolean;
}

const DAY_HEADERS = ["월", "화", "수", "목", "금", "토", "일"];

export default function MonthlySchedule({ caldavEnabled }: MonthlyScheduleProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalDAVEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalDAVEvent | null>(null);
  const [search, setSearch] = useState("");

  // Editor form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const loadEvents = useCallback(async () => {
    if (!caldavEnabled) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/caldav/events?start=${calStart.toISOString()}&end=${calEnd.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setEvents(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth.toISOString(), caldavEnabled]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q)
    );
  }, [events, search]);

  const eventsForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return filteredEvents
        .filter((ev) => ev.start.slice(0, 10) === dateStr)
        .sort((a, b) => a.start.localeCompare(b.start));
    },
    [filteredEvents]
  );

  // Search results grouped (when searching)
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return filteredEvents.sort((a, b) => a.start.localeCompare(b.start));
  }, [filteredEvents, search]);

  const resetForm = (date?: Date) => {
    setFormTitle("");
    setFormDate(format(date || new Date(), "yyyy-MM-dd"));
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormLocation("");
    setFormDescription("");
    setFormAllDay(false);
    setEditingEvent(null);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    resetForm(day);
    setEditorOpen(true);
    setTimeout(() => titleInputRef.current?.focus(), 300);
  };

  const handleEventClick = (ev: CalDAVEvent, day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(day);
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormDate(ev.start.slice(0, 10));
    setFormStartTime(ev.allDay ? "09:00" : ev.start.slice(11, 16));
    setFormEndTime(ev.allDay ? "10:00" : (ev.end?.slice(11, 16) || "10:00"));
    setFormLocation(ev.location || "");
    setFormDescription(ev.description || "");
    setFormAllDay(ev.allDay);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setTimeout(() => {
      setEditingEvent(null);
    }, 300);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const start = formAllDay
        ? `${formDate}T00:00:00`
        : `${formDate}T${formStartTime}:00`;
      const end = formAllDay
        ? `${formDate}T23:59:59`
        : `${formDate}T${formEndTime || formStartTime}:00`;

      if (editingEvent) {
        // Update existing event
        await fetch("/api/caldav/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: editingEvent.uid,
            url: editingEvent.url,
            etag: editingEvent.etag,
            title: formTitle.trim(),
            start,
            end,
            location: formLocation || undefined,
            description: formDescription || undefined,
            allDay: formAllDay,
          }),
        });
      } else {
        // Create new event
        await fetch("/api/caldav/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            start,
            end,
            location: formLocation || undefined,
            description: formDescription || undefined,
            allDay: formAllDay,
          }),
        });
      }
      await loadEvents();
      resetForm(selectedDate || undefined);
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    setDeleting(true);
    try {
      await fetch(
        `/api/caldav/events?url=${encodeURIComponent(editingEvent.url)}&etag=${encodeURIComponent(editingEvent.etag)}`,
        { method: "DELETE" }
      );
      await loadEvents();
      resetForm(selectedDate || undefined);
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleNewFromEditor = () => {
    resetForm(selectedDate || undefined);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  if (!caldavEnabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 p-8">
        <Calendar className="w-16 h-16 text-gray-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">
            Apple 캘린더가 연결되지 않았습니다
          </p>
          <p className="text-xs text-gray-400 mt-1">
            사이드바 하단의 &quot;캘린더 연동&quot; 버튼으로 iCloud 캘린더를
            연결하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-base font-semibold text-gray-700 min-w-[140px] text-center">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <button
              onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="일정 검색..."
                className="text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-44 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              오늘
            </button>
            <button
              onClick={() => handleDayClick(selectedDate || new Date())}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              일정 추가
            </button>
          </div>
        </div>

        {/* Search results overlay */}
        {searchResults ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                <span className="font-medium">&quot;{search}&quot;</span> 검색 결과: {searchResults.length}건
              </p>
              <button
                onClick={() => setSearch("")}
                className="text-xs text-indigo-500 hover:text-indigo-600"
              >
                검색 닫기
              </button>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                검색 결과가 없습니다
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((ev) => {
                  const evDate = new Date(ev.start);
                  return (
                    <button
                      key={ev.uid}
                      onClick={(e) => handleEventClick(ev, evDate, e)}
                      className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                          {format(evDate, "M/d (eee)", { locale: ko })}
                        </span>
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {ev.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          {ev.allDay ? "종일" : `${ev.start.slice(11, 16)} - ${ev.end?.slice(11, 16) || ""}`}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={10} />
                            {ev.location}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0">
              {DAY_HEADERS.map((d, i) => (
                <div
                  key={d}
                  className={clsx(
                    "py-2 text-center text-xs font-semibold",
                    i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : "text-gray-400"
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const dayEvents = eventsForDate(day);
                  const isSat = day.getDay() === 6;
                  const isSun = day.getDay() === 0;

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={clsx(
                        "border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors",
                        !isCurrentMonth && "bg-gray-50/50",
                        isSelected && "bg-blue-50/70 ring-1 ring-inset ring-blue-200",
                        !isSelected && "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={clsx(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            isToday(day) && "bg-blue-500 text-white",
                            !isToday(day) && !isCurrentMonth && "text-gray-300",
                            !isToday(day) && isCurrentMonth && isSun && "text-red-500",
                            !isToday(day) && isCurrentMonth && isSat && "text-blue-500",
                            !isToday(day) && isCurrentMonth && !isSun && !isSat && "text-gray-700"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[9px] text-blue-400 font-medium">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <button
                            key={ev.uid}
                            onClick={(e) => handleEventClick(ev, day, e)}
                            className="w-full text-left px-1.5 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors truncate flex items-center min-h-[22px]"
                          >
                            <span className="text-[10px] text-blue-700 font-medium leading-none truncate">
                              {!ev.allDay && (
                                <span className="text-blue-400 mr-0.5">
                                  {ev.start.slice(11, 16)}
                                </span>
                              )}
                              {ev.title}
                            </span>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[9px] text-gray-400 px-1.5">
                            +{dayEvents.length - 3}개 더
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Slide-in editor panel */}
      <div
        className={clsx(
          "flex-shrink-0 border-l border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-in-out",
          editorOpen ? "w-[360px] opacity-100" : "w-0 opacity-0"
        )}
      >
        <div className="w-[360px] h-full flex flex-col">
          {/* Editor header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {editingEvent ? "일정 수정" : "새 일정 추가"}
              </h3>
              {selectedDate && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {editingEvent && (
                <button
                  onClick={handleNewFromEditor}
                  title="새 일정"
                  className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}
              <button
                onClick={handleCloseEditor}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Events for selected date */}
          {selectedDate && eventsForDate(selectedDate).length > 0 && (
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 max-h-[200px] overflow-y-auto">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                이 날의 일정
              </p>
              <div className="space-y-1.5">
                {eventsForDate(selectedDate).map((ev) => (
                  <button
                    key={ev.uid}
                    onClick={() => {
                      setEditingEvent(ev);
                      setFormTitle(ev.title);
                      setFormDate(ev.start.slice(0, 10));
                      setFormStartTime(ev.allDay ? "09:00" : ev.start.slice(11, 16));
                      setFormEndTime(ev.allDay ? "10:00" : (ev.end?.slice(11, 16) || "10:00"));
                      setFormLocation(ev.location || "");
                      setFormDescription(ev.description || "");
                      setFormAllDay(ev.allDay);
                    }}
                    className={clsx(
                      "w-full text-left p-2.5 rounded-lg border transition-colors",
                      editingEvent?.uid === ev.uid
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-100 hover:border-blue-200 hover:bg-blue-50/30"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Pencil size={10} className="text-gray-300 flex-shrink-0" />
                      <p className="text-xs font-medium text-gray-800 truncate">{ev.title}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 ml-4">
                      {ev.allDay ? "종일" : `${ev.start.slice(11, 16)} - ${ev.end?.slice(11, 16) || ""}`}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor form */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  제목
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && formTitle.trim()) handleSave(); }}
                  placeholder="일정 제목을 입력하세요"
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  날짜
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formAllDay}
                      onChange={(e) => setFormAllDay(e.target.checked)}
                      className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    종일
                  </label>
                </div>
              </div>

              {!formAllDay && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    시간
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full text-sm pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <span className="text-gray-300 text-sm">→</span>
                    <div className="flex-1 relative">
                      <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full text-sm pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  장소
                </label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="장소 (선택)"
                    className="w-full text-sm pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  메모
                </label>
                <div className="relative">
                  <AlignLeft size={13} className="absolute left-3 top-3 text-gray-400" />
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="메모 (선택)"
                    rows={4}
                    className="w-full text-sm pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editor footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCloseEditor}
                className="flex-1 text-sm text-gray-600 hover:text-gray-800 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                className="flex-1 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingEvent ? (
                  <Pencil size={14} />
                ) : (
                  <Plus size={14} />
                )}
                {editingEvent ? "수정" : "추가"}
              </button>
            </div>
            {editingEvent && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full text-sm text-red-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                일정 삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
