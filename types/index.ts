// EntryType values stored as strings (SQLite doesn't support enums)
export type EntryType = "DAILY" | "MEETING" | "MEMO";

export type DailySlot = "WORK" | "TOMORROW";

export interface DailyReflection {
  id: string;
  dateStr: string; // "yyyy-MM-dd"
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface DailyCardTag {
  cardId: string;
  tagId: string;
  tag: Tag;
}

export interface DailyCard {
  id: string;
  title: string;
  content: string;
  slot: DailySlot;
  date: string;
  startTime: string | null;
  endTime: string | null;
  done: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags: DailyCardTag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface EntryTag {
  entryId: string;
  tagId: string;
  tag: Tag;
}

export interface Entry {
  id: string;
  title: string;
  content: string;
  type: EntryType;
  date: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags: EntryTag[];
}

export interface TodoTag {
  todoId: string;
  tagId: string;
  tag: Tag;
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  priority: TodoPriority;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags: TodoTag[];
}

export type Section = "DAILY" | "MEETING" | "TODO" | "MEMO";

export type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
