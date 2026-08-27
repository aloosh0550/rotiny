"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { tasksRepository } from "@/lib/db/repositories";
import type { Task } from "@/lib/types";

export function useTasks(): Task[] | undefined {
  return useLiveQuery(() => tasksRepository.getAll(), []);
}

export function useTask(id: string | undefined): Task | undefined {
  return useLiveQuery(() => (id ? tasksRepository.getById(id) : undefined), [id]);
}
