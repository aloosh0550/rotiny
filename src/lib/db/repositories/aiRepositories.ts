import { db } from "@/lib/db/schema";
import type { AiConversation, AiMemory, AiMemoryKind, AiMessage } from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";
import { generateId } from "@/lib/utils/id";
import { makeSyncedRepository } from "./helpers";

const conversations = makeSyncedRepository<AiConversation>(db.aiConversations, "aiConversations");
const memory = makeSyncedRepository<AiMemory>(db.aiMemory, "aiMemory");

export const aiConversationsRepository = {
  ...conversations,

  /** Newest first. */
  async getRecent(limit = 20): Promise<AiConversation[]> {
    return (await conversations.getAll())
      .sort((a, b) => b.sync.updatedAt.localeCompare(a.sync.updatedAt))
      .slice(0, limit);
  },

  async createWith(first: AiMessage): Promise<AiConversation> {
    return conversations.create({
      id: generateId(),
      title: first.content.slice(0, 60),
      messages: [first],
      pinned: false,
      sync: createSyncMeta(),
    });
  },

  async appendMessages(id: string, msgs: AiMessage[]): Promise<AiConversation> {
    const existing = await conversations.getById(id);
    if (!existing) throw new Error(`conversation not found: ${id}`);
    const messages = [...existing.messages, ...msgs];
    const patch: Partial<AiConversation> = { messages };
    if (!existing.title && messages[0]) patch.title = messages[0].content.slice(0, 60);
    return conversations.update(id, patch);
  },
};

export const aiMemoryRepository = {
  ...memory,

  async byKind(kind: AiMemoryKind): Promise<AiMemory[]> {
    return (await memory.getAll()).filter((m) => m.kind === kind);
  },

  async add(kind: AiMemoryKind, text: string, source?: string | null): Promise<AiMemory> {
    // de-dupe on identical text (case/space-insensitive)
    const norm = text.trim().toLowerCase();
    const dup = (await memory.getAll()).find((m) => m.text.trim().toLowerCase() === norm);
    if (dup) return dup;
    return memory.create({
      id: generateId(),
      kind,
      text: text.trim(),
      source: source ?? null,
      enabled: true,
      confidence: null,
      sync: createSyncMeta(),
    });
  },

  async setEnabled(id: string, enabled: boolean): Promise<AiMemory> {
    return memory.update(id, { enabled });
  },
};
