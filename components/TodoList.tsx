"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  Trash2,
  Calendar,
  Tag as TagIcon,
  Check,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";
import clsx from "clsx";
import type { Todo, Tag } from "@/types";

interface TodoListProps {
  todos: Todo[];
  tags: Tag[];
  onAdd: (title: string, dueDate?: string) => Promise<void>;
  onToggle: (id: string, done: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<Todo>) => Promise<void>;
  loading?: boolean;
}

type FilterType = "all" | "todo" | "done";

export default function TodoList({
  todos,
  tags,
  onAdd,
  onToggle,
  onDelete,
  onUpdate,
  loading,
}: TodoListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await onAdd(newTitle.trim(), newDueDate || undefined);
    setNewTitle("");
    setNewDueDate("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const finishEdit = async (id: string) => {
    if (editingTitle.trim()) {
      await onUpdate(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === "todo") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const todoCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">개인 할일</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {todoCount}개 남음
            </span>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "todo", "done"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "text-xs px-2.5 py-1 rounded-md transition-colors",
                  filter === f
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {f === "all" ? "전체" : f === "todo" ? "할일" : "완료"}
              </button>
            ))}
          </div>
        </div>

        {/* Add new todo */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
            <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="새 할일 추가..."
              className="flex-1 text-sm bg-transparent border-none focus:ring-0 placeholder:text-gray-400"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="text-xs text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer"
              title="마감일"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-5 h-5 rounded" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <CheckSquare className="w-10 h-10 text-gray-200" />
            <p className="text-sm">
              {filter === "done"
                ? "완료된 항목이 없습니다"
                : "할일이 없습니다"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 px-4 py-2">
            {filteredTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-start gap-3 py-3 group"
              >
                {/* Checkbox */}
                <button
                  onClick={() => onToggle(todo.id, !todo.done)}
                  className={clsx(
                    "mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    todo.done
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-gray-300 hover:border-indigo-400"
                  )}
                >
                  {todo.done && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => finishEdit(todo.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishEdit(todo.id);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingTitle("");
                        }
                      }}
                      autoFocus
                      className="w-full text-sm border-b border-indigo-400 focus:ring-0 bg-transparent pb-0.5"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => startEdit(todo)}
                      className={clsx(
                        "text-sm cursor-text",
                        todo.done
                          ? "line-through text-gray-400"
                          : "text-gray-800"
                      )}
                    >
                      {todo.title}
                    </p>
                  )}

                  {/* Meta: due date + tags */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {todo.dueDate && (
                      <span
                        className={clsx(
                          "flex items-center gap-1 text-[10px]",
                          new Date(todo.dueDate) < new Date() && !todo.done
                            ? "text-red-500"
                            : "text-gray-400"
                        )}
                      >
                        <Calendar className="w-3 h-3" />
                        {format(new Date(todo.dueDate), "MM/dd (eee)", {
                          locale: ko,
                        })}
                      </span>
                    )}
                    {todo.tags.map(({ tag }) => (
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
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer summary */}
      {todos.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-between">
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
