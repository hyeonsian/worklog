"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, FileText, BookOpen, MapPin } from "lucide-react";
import type { DailyCard, DailySlot, DailyReflection, Tag, CalDAVEvent } from "@/types";
import CardModal from "./CardModal";
import ReflectionModal from "./ReflectionModal";

const SLOTS: { key: DailySlot; label: string; emptyColor: string }[] = [
  { key: "WORK",     label: "📌 업무",      emptyColor: "border-indigo-100 bg-indigo-50/50" },
  { key: "TOMORROW", label: "📋 내일 할 일", emptyColor: "border-violet-100 bg-violet-50/60" },
];

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

interface DailyWeekViewProps {
  tags: Tag[];
  selectedTags: string[];
  caldavEnabled?: boolean;
}

export default function DailyWeekView({ tags, selectedTags, caldavEnabled }: DailyWeekViewProps) {
  const [weekBase, setWeekBase] = useState(new Date());
  const [cards, setCards] = useState<DailyCard[]>([]);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [calEvents, setCalEvents] = useState<CalDAVEvent[]>([]);
  const [modal, setModal] = useState<{ card: Partial<DailyCard>; isNew: boolean } | null>(null);
  const [reflectionDay, setReflectionDay] = useState<Date | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after">("after");

  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(weekBase,   { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekParams = new URLSearchParams({
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekEnd:   format(weekEnd,   "yyyy-MM-dd"),
  }).toString();

  const loadAll = useCallback(async () => {
    try {
      const [cardsRes, reflRes] = await Promise.all([
        fetch(`/api/daily-cards?${weekParams}`),
        fetch(`/api/daily-reflections?${weekParams}`),
      ]);
      if (cardsRes.ok) setCards(await cardsRes.json());
      if (reflRes.ok)  setReflections(await reflRes.json());
    } catch (e) {
      console.error(e);
    }
  }, [weekStart.toISOString()]);

  // Load CalDAV events
  const loadCalEvents = useCallback(async () => {
    if (!caldavEnabled) { setCalEvents([]); return; }
    try {
      const params = new URLSearchParams({
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      });
      const res = await fetch(`/api/caldav/events?${params}`);
      if (res.ok) setCalEvents(await res.json());
    } catch (e) {
      console.error("CalDAV fetch error:", e);
    }
  }, [weekStart.toISOString(), caldavEnabled]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadCalEvents(); }, [loadCalEvents]);

  const calEventsFor = (day: Date) =>
    calEvents.filter((ev) => {
      const evDate = ev.start.slice(0, 10);
      return evDate === format(day, "yyyy-MM-dd");
    });

  const allCardsFor = (day: Date, slot: DailySlot) =>
    cards
      .filter((c) => isSameDay(parseISO(c.date), day) && c.slot === slot)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

  const cardsFor = (day: Date, slot: DailySlot) => {
    let result = allCardsFor(day, slot);
    if (selectedTags.length > 0) {
      result = result.filter((c) =>
        c.tags.some((t) => selectedTags.includes(t.tag.name))
      );
    }
    return result;
  };

  // dateStr("yyyy-MM-dd") 직접 비교 - DateTime 변환 없이 정확하게 매칭
  const reflectionFor = (day: Date) =>
    reflections.find((r) => r.dateStr === format(day, "yyyy-MM-dd")) || null;

  // ── Card modal ──────────────────────────────────────────────
  const openNew = (day: Date, slot: DailySlot) =>
    setModal({ isNew: true, card: { slot, date: day.toISOString(), title: "", content: "", startTime: null, endTime: null, done: false, tags: [] } });

  const openEdit = (card: DailyCard) => setModal({ isNew: false, card });

  const handleSave = async (data: Partial<DailyCard>) => {
    const body = {
      title: data.title, content: data.content,
      slot: data.slot,   date: data.date,
      startTime: data.startTime || null,
      endTime:   data.endTime   || null,
      tagIds: data.tags?.map((t) => t.tagId) || [],
    };
    if (data.id) {
      const res = await fetch(`/api/daily-cards/${data.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated: DailyCard = await res.json();
        setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } else {
      const res = await fetch("/api/daily-cards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { const created = await res.json(); setCards((prev) => [...prev, created]); }
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/daily-cards/${id}`, { method: "DELETE" });
    if (res.ok) setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleDone = async (card: DailyCard) => {
    const res = await fetch(`/api/daily-cards/${card.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: card.title, content: card.content, slot: card.slot,
        date: card.date, startTime: card.startTime, endTime: card.endTime,
        done: !card.done, tagIds: card.tags.map((t) => t.tagId),
      }),
    });
    if (res.ok) {
      const updated: DailyCard = await res.json();
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  // ── Reflection ──────────────────────────────────────────────
  const handleSaveReflection = async (date: Date, content: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const res = await fetch("/api/daily-reflections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, content }),
    });
    if (res.ok) {
      const saved: DailyReflection = await res.json();
      // 직접 state 업데이트 (즉각 반영)
      setReflections((prev) => {
        const exists = prev.findIndex((r) => r.dateStr === saved.dateStr);
        return exists >= 0
          ? prev.map((r) => (r.dateStr === saved.dateStr ? saved : r))
          : [...prev, saved];
      });
    }
  };

  // ── Drag & Drop ─────────────────────────────────────────────
  const dropKey = (day: Date, slot: DailySlot) => `${format(day, "yyyy-MM-dd")}__${slot}`;

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("cardId", cardId);
    setDraggingId(cardId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
    setDragOverCardId(null);
  };

  const handleCardDragOver = (e: React.DragEvent, card: DailyCard) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDragOverCardId(card.id);
    setDragOverPosition(position);
  };

  const handleDragOver = (e: React.DragEvent, day: Date, slot: DailySlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const draggingCard = cards.find((c) => c.id === draggingId);
    const isSameSlot = draggingCard && isSameDay(parseISO(draggingCard.date), day) && draggingCard.slot === slot;
    if (!isSameSlot) {
      setDropTarget(dropKey(day, slot));
    }
  };

  const handleDrop = async (e: React.DragEvent, day: Date, slot: DailySlot) => {
    e.preventDefault();
    setDropTarget(null);
    setDragOverCardId(null);
    const cardId = e.dataTransfer.getData("cardId");
    if (!cardId) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const isSameSlot = isSameDay(parseISO(card.date), day) && card.slot === slot;

    if (isSameSlot && dragOverCardId) {
      // 같은 슬롯 내 순서 변경
      const fullList = allCardsFor(day, slot);
      const fromIndex = fullList.findIndex((c) => c.id === cardId);
      const targetIndex = fullList.findIndex((c) => c.id === dragOverCardId);
      if (targetIndex === -1) return;

      const insertIndex = dragOverPosition === "before" ? targetIndex : targetIndex + 1;
      if (fromIndex === insertIndex || fromIndex + 1 === insertIndex) return;

      const newList = [...fullList];
      newList.splice(fromIndex, 1);
      const adj = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
      newList.splice(adj, 0, card);

      const updates = newList.map((c, i) => ({ id: c.id, order: i }));
      setCards((prev) =>
        prev.map((c) => {
          const u = updates.find((o) => o.id === c.id);
          return u ? { ...c, order: u.order } : c;
        })
      );
      await fetch("/api/daily-cards/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: updates }),
      });
      return;
    }

    if (isSameSlot) return;

    // 다른 슬롯/날짜로 이동
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, slot, date: day.toISOString() } : c))
    );
    const res = await fetch(`/api/daily-cards/${cardId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: card.title, content: card.content, slot, date: day.toISOString(),
        startTime: card.startTime, endTime: card.endTime, done: card.done,
        tagIds: card.tags.map((t) => t.tagId),
      }),
    });
    if (res.ok) {
      const updated: DailyCard = await res.json();
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      loadAll();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekBase((d) => subWeeks(d, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-gray-700">
            {format(weekStart, "yyyy년 M월 d일", { locale: ko })}
            {" — "}
            {format(weekEnd, "M월 d일", { locale: ko })}
          </h2>
          <button onClick={() => setWeekBase((d) => addWeeks(d, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <button onClick={() => setWeekBase(new Date())}
          className="text-xs font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
          오늘
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex h-full min-w-[560px]">
          {days.map((day, idx) => {
            const isCurrentDay = isToday(day);
            const isSat = idx === 5;
            const isSun = idx === 6;
            const reflection = reflectionFor(day);
            const hasReflection = !!reflection?.content?.trim();

            return (
              <div key={day.toISOString()}
                className={`flex flex-col flex-1 min-w-[120px] border-r border-gray-100 last:border-r-0 ${isSat ? "bg-blue-50/20" : isSun ? "bg-red-50/20" : ""}`}>

                {/* Day header */}
                <div className={`px-3 py-2.5 flex items-center justify-between border-b border-gray-100 flex-shrink-0 ${isCurrentDay ? "bg-indigo-50/70" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isSun ? "text-red-400" : isSat ? "text-blue-400" : isCurrentDay ? "text-indigo-500" : "text-gray-400"}`}>
                      {DAY_LABELS[idx]}
                    </span>
                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isCurrentDay ? "bg-indigo-500 text-white" : isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* 회고 버튼 */}
                  <button
                    onClick={() => setReflectionDay(day)}
                    title={hasReflection ? "회고 보기/편집" : "회고 작성"}
                    className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 ${
                      hasReflection
                        ? "text-indigo-500"
                        : "text-gray-300 hover:text-indigo-400"
                    }`}
                  >
                    <BookOpen size={13} />
                  </button>
                </div>

                {/* Slots */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {/* Apple Calendar events */}
                  {caldavEnabled && calEventsFor(day).length > 0 && (
                    <div className="p-2 bg-blue-50/30">
                      <span className="text-[10px] font-semibold text-blue-400 tracking-wide mb-1 block">🍎 캘린더</span>
                      <div className="space-y-1">
                        {calEventsFor(day).map((ev) => (
                          <CalEventItem key={ev.uid} event={ev} />
                        ))}
                      </div>
                    </div>
                  )}
                  {SLOTS.map(({ key, label, emptyColor }) => {
                    const slotCards = cardsFor(day, key);
                    const isTomorrow = key === "TOMORROW";
                    const isOver = dropTarget === dropKey(day, key);

                    return (
                      <div key={key}
                        className={`p-2 transition-colors ${isOver ? "bg-indigo-50/60" : ""}`}
                        onDragOver={(e) => handleDragOver(e, day, key)}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setDropTarget(null);
                            setDragOverCardId(null);
                          }
                        }}
                        onDrop={(e) => handleDrop(e, day, key)}>

                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold text-gray-400 tracking-wide">{label}</span>
                          <button onClick={() => openNew(day, key)}
                            className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {slotCards.map((card) => {
                            const showBefore = dragOverCardId === card.id && dragOverPosition === "before" && draggingId !== card.id;
                            const showAfter = dragOverCardId === card.id && dragOverPosition === "after" && draggingId !== card.id;
                            return (
                              <div key={card.id}>
                                {showBefore && (
                                  <div className="h-0.5 bg-indigo-400 rounded mx-1 mb-1.5" />
                                )}
                                {isTomorrow ? (
                                  <TomorrowCardItem card={card}
                                    isDragging={draggingId === card.id}
                                    onDragStart={(e) => handleDragStart(e, card.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleCardDragOver(e, card)}
                                    onToggle={() => handleToggleDone(card)}
                                    onClick={() => openEdit(card)} />
                                ) : (
                                  <CardItem card={card}
                                    isDragging={draggingId === card.id}
                                    onDragStart={(e) => handleDragStart(e, card.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleCardDragOver(e, card)}
                                    onClick={() => openEdit(card)} />
                                )}
                                {showAfter && (
                                  <div className="h-0.5 bg-indigo-400 rounded mx-1 mt-1.5" />
                                )}
                              </div>
                            );
                          })}

                          {isOver && slotCards.every((c) => c.id !== draggingId) && (
                            <div className="h-10 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50" />
                          )}

                          {slotCards.length === 0 && !isOver && (
                            <button onClick={() => openNew(day, key)}
                              className={`w-full text-left px-2 py-2 rounded-lg border border-dashed ${emptyColor} text-[10px] text-gray-300 hover:text-gray-400 transition-colors`}>
                              + 추가
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Modal */}
      {modal && (
        <CardModal card={modal.card} isNew={modal.isNew} tags={tags}
          onSave={handleSave}
          onDelete={modal.isNew ? undefined : handleDelete}
          onClose={() => setModal(null)} />
      )}

      {/* Reflection Modal */}
      {reflectionDay && (
        <ReflectionModal
          date={reflectionDay}
          existing={reflectionFor(reflectionDay)}
          onSave={handleSaveReflection}
          onClose={() => setReflectionDay(null)} />
      )}
    </div>
  );
}

/* ── 업무 카드 ── */
function CardItem({ card, isDragging, onDragStart, onDragEnd, onDragOver, onClick }: {
  card: DailyCard; isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  const hasContent = card.content.trim().length > 0;
  const hasTime = card.startTime || card.endTime;
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onClick={onClick}
      className={`w-full text-left bg-white border rounded-xl px-2.5 py-2 transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-40 border-indigo-200 shadow-md" : "border-gray-100 hover:border-indigo-200 hover:shadow-sm"}`}>
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-medium text-gray-700 leading-tight line-clamp-2 flex-1">{card.title}</span>
        {hasContent && (
          <span className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500">
            <FileText size={9} />
          </span>
        )}
      </div>
      {hasTime && (
        <p className="text-[10px] text-gray-400 mt-1 font-mono">
          {card.startTime || "—"}{card.endTime ? ` → ${card.endTime}` : ""}
        </p>
      )}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {card.tags.slice(0, 2).map((t) => (
            <span key={t.tagId} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white" style={{ backgroundColor: t.tag.color }}>
              {t.tag.name}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-gray-400 bg-gray-100">+{card.tags.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Apple Calendar 이벤트 ── */
function CalEventItem({ event }: { event: CalDAVEvent }) {
  const time = event.allDay
    ? "종일"
    : `${event.start.slice(11, 16)}${event.end ? ` → ${event.end.slice(11, 16)}` : ""}`;
  return (
    <div className="w-full text-left bg-white/80 border border-blue-100 rounded-lg px-2 py-1.5 select-none">
      <div className="flex items-start gap-1">
        <span className="text-xs font-medium text-blue-700 leading-tight line-clamp-1 flex-1">
          {event.title}
        </span>
      </div>
      <p className="text-[10px] text-blue-400 mt-0.5 font-mono">{time}</p>
      {event.location && (
        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5 line-clamp-1">
          <MapPin size={8} className="flex-shrink-0" />
          {event.location}
        </p>
      )}
    </div>
  );
}

/* ── 내일 할 일 카드 ── */
function TomorrowCardItem({ card, isDragging, onDragStart, onDragEnd, onDragOver, onToggle, onClick }: {
  card: DailyCard; isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onToggle: () => void; onClick: () => void;
}) {
  const hasContent = card.content.trim().length > 0;
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}
      className={`flex items-start gap-2 bg-white border rounded-xl px-2.5 py-2 transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-40 border-violet-200 shadow-md" : "border-gray-100 hover:border-violet-200"}`}>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          card.done ? "bg-violet-500 border-violet-500" : "border-gray-300 hover:border-violet-400"}`}>
        {card.done && (
          <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-white fill-current">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <div className="flex items-start justify-between gap-1">
          <span className={`text-xs font-medium leading-tight line-clamp-2 flex-1 ${card.done ? "line-through text-gray-400" : "text-gray-700"}`}>
            {card.title}
          </span>
          {hasContent && !card.done && (
            <span className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-violet-100 text-violet-500">
              <FileText size={9} />
            </span>
          )}
        </div>
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {card.tags.slice(0, 2).map((t) => (
              <span key={t.tagId} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white"
                style={{ backgroundColor: t.tag.color, opacity: card.done ? 0.5 : 1 }}>
                {t.tag.name}
              </span>
            ))}
            {card.tags.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-gray-400 bg-gray-100">+{card.tags.length - 2}</span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
