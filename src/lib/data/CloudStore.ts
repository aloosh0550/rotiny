/**
 * CloudStore — the Supabase side of the data layer. Talks to Postgres directly
 * with the user's JWT (RLS enforced). Never holds a service key.
 *
 * All methods are no-ops / empty when Supabase is unconfigured or there is no
 * session, so callers can invoke them unconditionally.
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { modelToRow, rowToModel, type Model, type Row } from "@/lib/data/rowMapping";
import { SYNCED_TABLES, type SyncedTable } from "@/lib/data/tables";

async function client() {
  const sb = await getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session ? sb : null;
}

export interface PullResult {
  table: SyncedTable;
  rows: Model[];
  /** Max updated_at seen — the next `since` cursor. */
  cursor: string | null;
}

/**
 * True for a Postgres/PostgREST "this table doesn't exist (yet)" error — e.g. a
 * table whose entry was added to `SYNCED_TABLES` before its migration was
 * applied to this project. We degrade gracefully instead of throwing, so
 * shipping the client code ahead of a migration never breaks sync for every
 * OTHER table: `42P01` is Postgres' `undefined_table`; `PGRST205` is
 * PostgREST's "could not find the table in the schema cache".
 */
function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /relation .* does not exist|could not find the table/i.test(error.message ?? "");
}

const warnedMissing = new Set<string>();
function warnMissingOnce(table: string, op: string) {
  const key = `${table}:${op}`;
  if (warnedMissing.has(key)) return;
  warnedMissing.add(key);
  console.warn(
    `[sync] "${table}" isn't on the server yet (${op}) — skipping until its migration is applied.`,
  );
}

export const cloudStore = {
  async isReady(): Promise<boolean> {
    return (await client()) !== null;
  },

  /** Rows changed since `sinceIso` (inclusive-ish), oldest first. Includes tombstones. */
  async pull(table: SyncedTable, sinceIso: string | null): Promise<PullResult> {
    const sb = await client();
    if (!sb) return { table, rows: [], cursor: sinceIso };
    let q = sb.from(table).select("*").order("updated_at", { ascending: true }).limit(1000);
    if (sinceIso) q = q.gt("updated_at", sinceIso);
    const { data, error } = await q;
    if (error) {
      if (isMissingTable(error)) {
        warnMissingOnce(table, "pull");
        return { table, rows: [], cursor: sinceIso };
      }
      throw new Error(`pull ${table}: ${error.message}`);
    }
    const rows = (data ?? []).map((r) => rowToModel(r as Row));
    const cursor =
      rows.length > 0 ? String((data![data!.length - 1] as Row).updated_at) : sinceIso;
    return { table, rows, cursor };
  },

  /** Fetch a single row by id, or null. */
  async getOne(table: SyncedTable, id: string): Promise<Model | null> {
    const sb = await client();
    if (!sb) return null;
    const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
    if (error) {
      if (isMissingTable(error)) {
        warnMissingOnce(table, "getOne");
        return null;
      }
      throw new Error(`getOne ${table} ${id}: ${error.message}`);
    }
    return data ? rowToModel(data as Row) : null;
  },

  /**
   * Upsert one model (id-preserving). Returns the server's canonical row.
   *
   * Unlike `pull`/`getOne`, a missing table here still THROWS (after a one-time
   * warning) rather than resolving — this is a write from the offline outbox,
   * and `SyncEngine.flushEntry` only removes a queue entry once its push
   * resolves without error. Swallowing it here would silently drop the
   * mutation forever instead of retrying once the migration is applied.
   */
  async push(table: SyncedTable, model: Model, userId: string): Promise<Model | null> {
    const sb = await client();
    if (!sb) return null;
    const row = modelToRow(model, userId);
    // the DB trigger owns updated_at/version — don't fight it on write
    delete row.updated_at;
    delete row.version;
    const { data, error } = await sb.from(table).upsert(row, { onConflict: "id" }).select().single();
    if (error) {
      if (isMissingTable(error)) warnMissingOnce(table, "push");
      throw new Error(`push ${table} ${model.id}: ${error.message}`);
    }
    return data ? rowToModel(data as Row) : null;
  },

  /** Soft-delete (tombstone) on the server. Missing-table still throws — see `push`. */
  async remove(table: SyncedTable, id: string): Promise<void> {
    const sb = await client();
    if (!sb) return;
    const { error } = await sb
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      if (isMissingTable(error)) warnMissingOnce(table, "remove");
      throw new Error(`remove ${table} ${id}: ${error.message}`);
    }
  },

  /** Read the user's `profiles.settings` blob (or null). */
  async pullSettings(userId: string): Promise<Record<string, unknown> | null> {
    const sb = await client();
    if (!sb) return null;
    const { data, error } = await sb
      .from("profiles")
      .select("settings, locale")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`pullSettings: ${error.message}`);
    if (!data) return null;
    const s = (data.settings ?? {}) as Record<string, unknown>;
    return Object.keys(s).length ? s : null;
  },

  /** Write the user's settings blob to `profiles`. */
  async pushSettings(userId: string, settings: Record<string, unknown>): Promise<void> {
    const sb = await client();
    if (!sb) return;
    const locale = typeof settings.locale === "string" ? settings.locale : "ar";
    const { error } = await sb
      .from("profiles")
      .update({ settings, locale })
      .eq("id", userId);
    if (error) throw new Error(`pushSettings: ${error.message}`);
  },

  /** Subscribe to the user's `profiles` row. */
  async subscribeSettings(
    userId: string,
    onChange: (settings: Record<string, unknown>) => void,
  ): Promise<() => void> {
    const sb = await client();
    if (!sb) return () => {};
    const channel = sb.channel(`routini-profile-${userId}`);
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
      (payload) => {
        const s = (payload.new as { settings?: Record<string, unknown> }).settings;
        if (s && Object.keys(s).length) onChange(s);
      },
    );
    await new Promise<void>((resolve) => channel.subscribe(() => resolve()));
    return () => {
      void sb.removeChannel(channel);
    };
  },

  /**
   * Subscribe to every synced table for the current user. `onChange` gets the
   * new model (or `{ id }` for a hard delete). Returns an unsubscribe fn.
   */
  async subscribe(
    userId: string,
    onChange: (table: SyncedTable, model: Model | { id: string }, event: string) => void,
  ): Promise<() => void> {
    const sb = await client();
    if (!sb) return () => {};
    const channel: RealtimeChannel = sb.channel(`routini-sync-${userId}`);
    for (const table of SYNCED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            onChange(table, { id: String((payload.old as Row).id) }, "DELETE");
          } else {
            onChange(table, rowToModel(payload.new as Row), payload.eventType);
          }
        },
      );
    }
    await new Promise<void>((resolve) => channel.subscribe(() => resolve()));
    return () => {
      void sb.removeChannel(channel);
    };
  },
};
