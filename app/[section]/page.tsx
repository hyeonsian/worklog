"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import EntryList from "@/components/EntryList";
import EntryEditor from "@/components/EntryEditor";
import TodoList from "@/components/TodoList";
import DailyWeekView from "@/components/DailyWeekView";
import type { Entry, Todo, Tag, Section } from "@/types";

const SECTION_MAP: Record<string, Section> = {
  daily: "DAILY",
  meeting: "MEETING",
  todo: "TODO",
  memo: "MEMO",
};

const SECTION_TO_PATH: Record<Section, string> = {
  DAILY: "daily",
  MEETING: "meeting",
  TODO: "todo",
  MEMO: "memo",
};

export default function SectionPage({
  params,
}: {
  params: { section: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const selectedSection = SECTION_MAP[params.section] || "DAILY";

  // Redirect invalid section
  useEffect(() => {
    if (!SECTION_MAP[params.section]) {
      router.replace("/daily");
    }
  }, [params.section, router]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [tags, setTags] = useState<Tag[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Partial<Entry> | null>(
    null
  );
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [sendingToDaily, setSendingToDaily] = useState(false);
  const [sentToDaily, setSentToDaily] = useState(false);

  // Persist sidebar collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load tags
  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) loadTags();
  }, [session?.user?.id, loadTags]);

  // Load entries
  const loadEntries = useCallback(async () => {
    if (selectedSection === "TODO") return;
    setLoadingEntries(true);
    try {
      const params = new URLSearchParams();
      params.set("type", selectedSection);

      if (search) {
        params.set("search", search);
      } else {
        params.set("date", format(selectedDate, "yyyy-MM-dd"));
      }

      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }

      const res = await fetch(`/api/entries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedSection, selectedDate, search, selectedTags]);

  useEffect(() => {
    if (session?.user?.id && selectedSection !== "TODO") {
      loadEntries();
    }
  }, [selectedSection, selectedDate, search, selectedTags, session?.user?.id]);

  // Load todos
  const loadTodos = useCallback(async () => {
    if (selectedSection !== "TODO") return;
    setLoadingTodos(true);
    try {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }
      const res = await fetch(`/api/todos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTodos(false);
    }
  }, [selectedSection, selectedTags]);

  useEffect(() => {
    if (session?.user?.id && selectedSection === "TODO") {
      loadTodos();
    }
  }, [selectedSection, selectedTags, session?.user?.id]);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleTagCreate = async (name: string) => {
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newTag = await res.json();
        setTags((prev) =>
          prev.find((t) => t.id === newTag.id)
            ? prev
            : [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
        );
        return newTag;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const handleTagDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) {
        const deleted = tags.find((t) => t.id === id);
        setTags((prev) => prev.filter((t) => t.id !== id));
        if (deleted) {
          setSelectedTags((prev) =>
            prev.filter((name) => name !== deleted.name)
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSectionChange = (section: Section) => {
    router.push(`/${SECTION_TO_PATH[section]}`);
  };

  const handleNewEntry = () => {
    setIsNewEntry(true);
    setSelectedEntry({
      type:
        selectedSection === "DAILY"
          ? "DAILY"
          : selectedSection === "MEETING"
            ? "MEETING"
            : "MEMO",
      date: selectedDate.toISOString(),
      title: "",
      content: "",
      tags: [],
    });
  };

  const handleSelectEntry = (entry: Entry) => {
    setIsNewEntry(false);
    setSelectedEntry(entry);
  };

  const handleSaveEntry = async (
    data: Partial<Entry>
  ): Promise<Entry | null> => {
    try {
      const tagIds = data.tags?.map((et) => et.tagId || et.tag?.id) || [];

      if (data.id) {
        // Update
        const res = await fetch(`/api/entries/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            type: data.type,
            date: data.date,
            tagIds,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setEntries((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          );
          setSelectedEntry(updated);
          return updated;
        }
      } else {
        // Create
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            type: data.type,
            date: data.date,
            tagIds,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setEntries((prev) => [created, ...prev]);
          setSelectedEntry(created);
          setIsNewEntry(false);
          return created;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setSelectedEntry(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseEditor = () => {
    setSelectedEntry(null);
    setIsNewEntry(false);
  };

  const handleSendToDaily = async (
    title: string,
    date: string,
    meetingTime: string
  ) => {
    setSendingToDaily(true);
    try {
      let meetingTag = tags.find((t) => t.name === "회의");
      if (!meetingTag) {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "회의", color: "#8b5cf6" }),
        });
        if (res.ok) {
          meetingTag = await res.json();
          if (meetingTag) {
            setTags((prev) =>
              prev.find((t) => t.id === meetingTag!.id)
                ? prev
                : [...prev, meetingTag!].sort((a, b) =>
                    a.name.localeCompare(b.name)
                  )
            );
          }
        }
      }

      const cardDate = date;
      const cardStartTime =
        meetingTime && meetingTime !== "00:00" ? meetingTime : undefined;

      const res = await fetch("/api/daily-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "회의",
          date: cardDate,
          startTime: cardStartTime,
          slot: "WORK",
          tagIds: meetingTag ? [meetingTag.id] : [],
        }),
      });

      if (res.ok) {
        setSentToDaily(true);
        setTimeout(() => setSentToDaily(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingToDaily(false);
    }
  };

  // Todo handlers
  const handleAddTodo = async (
    title: string,
    options: { dueDate?: string; priority?: string; tagIds?: string[] }
  ) => {
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, ...options }),
      });
      if (res.ok) {
        const created = await res.json();
        setTodos((prev) => [created, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTodo = async (id: string, done: boolean) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTodo = async (id: string, data: Partial<Todo>) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedSection={selectedSection}
        onSectionChange={handleSectionChange}
        search={search}
        onSearchChange={setSearch}
        tags={tags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onTagCreate={handleTagCreate}
        onTagDelete={handleTagDelete}
      />

      {/* Main content */}
      <main
        className="flex-1 flex overflow-hidden transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 52 : 260 }}
      >
        {selectedSection === "DAILY" ? (
          <div className="flex-1 overflow-hidden">
            <DailyWeekView tags={tags} selectedTags={selectedTags} />
          </div>
        ) : selectedSection === "TODO" ? (
          <div className="flex-1 overflow-hidden">
            <TodoList
              todos={todos}
              tags={tags}
              onAdd={handleAddTodo}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
              onUpdate={handleUpdateTodo}
              loading={loadingTodos}
            />
          </div>
        ) : (
          <>
            {/* Entry list panel */}
            <div
              className="border-r border-gray-200 overflow-hidden flex-shrink-0"
              style={{ width: 280 }}
            >
              <EntryList
                entries={entries}
                selectedId={selectedEntry?.id || null}
                onSelect={handleSelectEntry}
                onNew={handleNewEntry}
                section={selectedSection}
                loading={loadingEntries}
              />
            </div>

            {/* Editor panel */}
            <div className="flex-1 overflow-hidden">
              {selectedEntry !== null ? (
                <EntryEditor
                  entry={selectedEntry}
                  section={selectedSection}
                  selectedDate={selectedDate}
                  tags={tags}
                  onSave={handleSaveEntry}
                  onDelete={handleDeleteEntry}
                  onClose={handleCloseEditor}
                  onTagCreated={handleTagCreate}
                  onSendToDaily={handleSendToDaily}
                  isSendingToDaily={sendingToDaily}
                  isSentToDaily={sentToDaily}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <span className="text-3xl">📝</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">
                      항목을 선택하거나
                    </p>
                    <p className="text-sm text-gray-400">
                      새 항목을 만들어보세요
                    </p>
                  </div>
                  <button
                    onClick={handleNewEntry}
                    className="text-sm font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    + 새 항목 만들기
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
