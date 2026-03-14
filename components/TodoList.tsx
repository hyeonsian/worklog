"use client";

import { useState, useEffect } from "react";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  Trash2,
  Calendar,
  Tag as TagIcon,
  Check,
  CheckSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import type { Todo, Tag, TodoPriority } from "@/types";

type PriorityFilter = "ALL" | TodoPriority;

interface TodoListProps {
  todos: Todo[];
  tags: Tag[];
  onAdd: (title: string, options: { dueDate?: string; priority: TodoPriority; tagIds?: string[] }) => Promise<void>;
  onToggle: (id: string, done: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<Todo> & { tagIds?: string[] }) => Promise<void>;
  loading?: boolean;
}

const PRIORITY_CONFIG: Record<TodoPriority, {
  label: string; headerBg: string; dotColor: string;
  textColor: string; borderColor: string; addBg: string;
}> = {
  HIGH: {
    label: "높음",
    headerBg: "bg-red-50/80",
    dotColor: "bg-red-400",
    textColor: "text-red-600",
    borderColor: "border-red-100",
    addBg: "bg-red-50/40",
  },
  MEDIUM: {
    label: "보통",
    headerBg: "bg-amber-50/80",
    dotColor: "bg-amber-400",
    textColor: "text-amber-600",
    borderColor: "border-amber-100",
    addBg: "bg-amber-50/40",
  },
  LOW: {
    label: "낮음",
    headerBg: "bg-green-50/80",
    dotColor: "bg-green-400",
    textColor: "text-green-600",
    borderColor: "border-green-100",
    addBg: "bg-green-50/40",
  },
};

const PRIORITIES: TodoPriority[] = ["HIGH", "MEDIUM", "LOW"];

export default function TodoList({
  todos, tags, onAdd, onToggle, onDelete, onUpdate, loading,
}: TodoListProps) {
  const [filter, setFilter] = useState<PriorityFilter>("ALL");
  const [addingTo, setAddingTo] = useState<TodoPriority | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TodoPriority | null>(null);
  const handleAdd = async () => {
    if (!newTitle.trim() || !addingTo) return;
    await onAdd(newTitle.trim(), {
      priority: addingTo,
      dueDate: newDueDate || undefined,
      tagIds: newTagIds,
    });
    setNewTitle("");
    setNewDueDate("");
    setNewTagIds([]);
    setAddingTo(null);
  };

  const startAdding = (priority: TodoPriority) => {
    setAddingTo(priority);
    setNewTitle("");
    setNewDueDate("");
    setNewTagIds([]);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("todoId", id);
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, priority: TodoPriority) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(priority);
  };

  const handleDrop = async (e: React.DragEvent, priority: TodoPriority) => {
    e.preventDefault();
    setDropTarget(null);
    const todoId = e.dataTransfer.getData("todoId");
    if (!todoId) return;
    const todo = todos.find((t) => t.id === todoId);
    if (!todo || todo.priority === priority) return;
    await onUpdate(todoId, { priority });
  };

  const todoCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;
  const visiblePriorities = filter === "ALL" ? PRIORITIES : [filter as TodoPriority];

  // 마감 임박: 오늘 또는 내일 마감이고 미완료인 항목
  const urgentTodos = todos.filter((t) => {
    if (t.done || !t.dueDate) return false;
    const d = new Date(t.dueDate);
    return isToday(d) || isTomorrow(d);
  });
  const [urgentCollapsed, setUrgentCollapsed] = useState(false);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">개인 할일</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {todoCount}개 남음
            </span>
          </div>
          {/* Priority filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(
              [["ALL", "전체"], ["HIGH", "높음"], ["MEDIUM", "보통"], ["LOW", "낮음"]] as [PriorityFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={clsx(
                  "text-xs px-2.5 py-1 rounded-md transition-colors",
                  filter === key
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 마감 임박 배너 */}
      {urgentTodos.length > 0 && (
        <div className="flex-shrink-0 border-b border-orange-100 bg-orange-50/60">
          <button
            onClick={() => setUrgentCollapsed((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-orange-50 transition-colors"
          >
            <AlertCircle size={14} className="text-orange-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-orange-700 flex-1">
              마감 임박
              <span className="ml-1.5 font-normal text-orange-500">
                {urgentTodos.length}개
              </span>
            </span>
            {urgentCollapsed ? (
              <ChevronDown size={13} className="text-orange-400" />
            ) : (
              <ChevronUp size={13} className="text-orange-400" />
            )}
          </button>
          {!urgentCollapsed && (
            <ul className="pb-2 px-4 space-y-1">
              {urgentTodos.map((todo) => {
                const d = new Date(todo.dueDate!);
                const label = isToday(d) ? "오늘" : "내일";
                const isUrgentToday = isToday(d);
                const config = PRIORITY_CONFIG[todo.priority];
                return (
                  <li key={todo.id} className="flex items-center gap-2 py-1">
                    <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dotColor)} />
                    <span className="text-xs text-gray-700 flex-1 truncate">{todo.title}</span>
                    <span
                      className={clsx(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
                        isUrgentToday
                          ? "bg-red-100 text-red-600"
                          : "bg-orange-100 text-orange-600"
                      )}
                    >
                      {label} 마감
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Columns */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-5 h-5 rounded" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full divide-x divide-gray-100">
            {visiblePriorities.map((priority) => {
              const config = PRIORITY_CONFIG[priority];
              const sectionTodos = todos.filter((t) => t.priority === priority);
              const remaining = sectionTodos.filter((t) => !t.done).length;
              const isAdding = addingTo === priority;

              return (
                <div
                  key={priority}
                  className={clsx(
                    "flex flex-col flex-1 min-w-0 overflow-hidden transition-colors",
                    dropTarget === priority && draggingId && todos.find((t) => t.id === draggingId)?.priority !== priority
                      ? "bg-indigo-50/40"
                      : ""
                  )}
                  onDragOver={(e) => handleDragOver(e, priority)}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
                  }}
                  onDrop={(e) => handleDrop(e, priority)}
                >
                  {/* Column header */}
                  <div className={clsx("flex items-center justify-between px-4 py-3 flex-shrink-0", config.headerBg)}>
                    <div className="flex items-center gap-2">
                      <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", config.dotColor)} />
                      <span className={clsx("text-xs font-semibold", config.textColor)}>{config.label}</span>
                      <span className="text-xs text-gray-400">
                        {remaining > 0 ? `${remaining}` : sectionTodos.length > 0 ? "✓" : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => startAdding(priority)}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-indigo-500 hover:bg-white/70 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Column body */}
                  <div className="flex-1 overflow-y-auto">
                    <ul>
                      {sectionTodos.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          tags={tags}
                          isDragging={draggingId === todo.id}
                          onDragStart={(e) => handleDragStart(e, todo.id)}
                          onDragEnd={handleDragEnd}
                          onToggle={onToggle}
                          onDelete={onDelete}
                          onUpdate={onUpdate}
                        />
                      ))}
                      {sectionTodos.length === 0 && !isAdding && (
                        <li className="px-4 py-4 text-xs text-gray-300 italic text-center">할일이 없습니다</li>
                      )}
                    </ul>

                    {/* Inline add form */}
                    {isAdding && (
                      <div className={clsx("p-3 border-t", config.borderColor, config.addBg)}>
                        <input
                          autoFocus
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                            if (e.key === "Escape") setAddingTo(null);
                          }}
                          placeholder="할일 입력..."
                          className="w-full text-sm bg-transparent border-none focus:ring-0 placeholder:text-gray-400 mb-2"
                        />
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <div className="flex items-center gap-1 border border-gray-200 rounded-md px-1.5 py-1 bg-white">
                            <Calendar size={11} className="text-gray-400" />
                            <input
                              type="date"
                              value={newDueDate}
                              onChange={(e) => setNewDueDate(e.target.value)}
                              className="text-xs text-gray-500 bg-transparent border-none focus:ring-0 w-[95px]"
                            />
                          </div>
                          <TagPickerDropdown
                            tags={tags}
                            selectedIds={newTagIds}
                            onChange={setNewTagIds}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAddingTo(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                          >
                            취소
                          </button>
                          <button
                            onClick={handleAdd}
                            disabled={!newTitle.trim()}
                            className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 px-3 py-1.5 rounded-md transition-colors"
                          >
                            추가
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {todos.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">
            총 {todos.length}개 중 {doneCount}개 완료
          </span>
          {doneCount > 0 && (
            <div className="w-32 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(doneCount / todos.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 할일 아이템 ── */
function TodoItem({
  todo, tags, isDragging, onDragStart, onDragEnd, onToggle, onDelete, onUpdate,
}: {
  todo: Todo; tags: Tag[]; isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggle: (id: string, done: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<Todo> & { tagIds?: string[] }) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(
    todo.dueDate ? format(new Date(todo.dueDate), "yyyy-MM-dd") : ""
  );
  const [editTagIds, setEditTagIds] = useState<string[]>(todo.tags.map((t) => t.tagId));

  useEffect(() => {
    if (!expanded) {
      setEditTitle(todo.title);
      setEditDueDate(todo.dueDate ? format(new Date(todo.dueDate), "yyyy-MM-dd") : "");
      setEditTagIds(todo.tags.map((t) => t.tagId));
    }
  }, [todo, expanded]);

  const handleSave = async () => {
    await onUpdate(todo.id, {
      title: editTitle.trim() || todo.title,
      dueDate: editDueDate || null,
      tagIds: editTagIds,
    });
    setExpanded(false);
  };

  const isOverdue =
    todo.dueDate &&
    startOfDay(new Date(todo.dueDate)) < startOfDay(new Date()) &&
    !todo.done;

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        "group border-b border-gray-50 last:border-b-0 cursor-grab active:cursor-grabbing select-none transition-opacity",
        isDragging ? "opacity-40" : "",
        expanded && "bg-gray-50/50"
      )}
    >
      <div className="flex items-start gap-3 px-5 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo.id, !todo.done)}
          className={clsx(
            "mt-0.5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all",
            todo.done ? "bg-indigo-500 border-indigo-500" : "border-gray-300 hover:border-indigo-400"
          )}
          style={{ width: 18, height: 18 }}
        >
          {todo.done && <Check size={11} className="text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
          <p className={clsx("text-sm leading-snug", todo.done ? "line-through text-gray-400" : "text-gray-800")}>
            {todo.title}
          </p>
          {!expanded && (todo.dueDate || todo.tags.length > 0) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {todo.dueDate && (
                <span className={clsx("flex items-center gap-1 text-[10px]", isOverdue ? "text-red-500" : "text-gray-400")}>
                  <Calendar size={10} />
                  {format(new Date(todo.dueDate), "MM/dd (eee)", { locale: ko })}
                </span>
              )}
              {todo.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: tag.color + "22", color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(todo.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 rounded flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded edit */}
      {expanded && (
        <div className="px-5 pb-3 space-y-2" style={{ paddingLeft: 44 }}>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setExpanded(false);
            }}
            className="w-full text-sm border-b border-indigo-300 bg-transparent focus:ring-0 focus:outline-none pb-0.5"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2 py-1 bg-white">
              <Calendar size={11} className="text-gray-400" />
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="text-xs text-gray-500 bg-transparent border-none focus:ring-0 w-[105px]"
              />
            </div>
            <TagPickerDropdown
              tags={tags}
              selectedIds={editTagIds}
              onChange={setEditTagIds}
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-md transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/* ── 태그 선택 드롭다운 ── */
function TagPickerDropdown({
  tags, selectedIds, onChange,
}: {
  tags: Tag[]; selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = tags.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-2 py-1 bg-white transition-colors"
      >
        <TagIcon size={11} className="text-gray-400 flex-shrink-0" />
        {selected.length > 0 ? (
          <span className="flex gap-1 items-center">
            {selected.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="px-1.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: t.color + "22", color: t.color }}
              >
                {t.name}
              </span>
            ))}
            {selected.length > 2 && <span className="text-gray-400">+{selected.length - 2}</span>}
          </span>
        ) : (
          <span className="text-gray-400">태그</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5">
            {tags.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-1.5">태그 없음</p>
            ) : (
              tags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() =>
                      onChange(
                        isSelected
                          ? selectedIds.filter((id) => id !== tag.id)
                          : [...selectedIds, tag.id]
                      )
                    }
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
                  >
                    <div
                      className="w-3 h-3 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: "#d1d5db" }}
                    >
                      {isSelected && <Check size={8} className="text-white" />}
                    </div>
                    <span className="text-xs font-medium" style={{ color: tag.color }}>
                      {tag.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
