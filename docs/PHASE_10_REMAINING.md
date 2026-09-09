# Phase 10 — remaining work (J1 native widget · J4 FCM push)

Phase 10 (Widgets / PWA + Push) shipped its verifiable half:

- **J3 · PWA / Service Worker** — done & verified (`npm run pwa:check`): every top-level
  route precached, offline navigation, Background Sync + Periodic Sync to flush the
  outbox on reconnect, `/offline/` fallback for unknown routes.
- **J2 · Widget snapshot** — done & verified (`tests/widget/snapshot.test.ts`):
  `buildSnapshot()` now carries `v`, `now` (deterministic planner item + reason),
  `energy`, and `goals` (real derived progress), one-way from the Dexie replica. The
  current widget Java reads JSON with `optString`/`optJSONArray`, so it ignores the new
  fields safely — no APK change required to keep working.

The two pieces below are **blocked on things this environment can't provide** (no Android
SDK / device; no Firebase project). They are specified here so the owner can unblock them.

---

## J1 · Responsive native widget rendering

**Blocked by:** no Android SDK + no device/emulator in the build environment
(`ANDROID_HOME` unset; `./gradlew assembleDebug` cannot run here). Changing the widget
Java/XML without being able to compile or see it risks breaking the APK build — so the
committed native code was left untouched.

**What to build** (all in `android/app/src/main/`):

1. **Size buckets** — `res/xml/routini_widget_info.xml` already allows resize. Add
   `res/xml/routini_widget_info.xml` `android:targetCellWidth/Height` breakpoints and,
   on Android 12+, use `AppWidgetProviderInfo` `OPTION_APPWIDGET_MAX/MIN_WIDTH` in
   `RoutiniWidgetProvider.onAppWidgetOptionsChanged()` to pick a layout:
   | Size | Layout | Content |
   |---|---|---|
   | 2×1 | `widget_small.xml` (new) | `now.title` + `progress.done/total` ring |
   | 3×2 | `widget_medium.xml` (existing) | Now + list (tasks/appts/habits) |
   | 4×3 | `widget_large.xml` (new) | Now + progress + goals list + habits |
2. **New layouts** — `res/layout/widget_small.xml`, `widget_large.xml`,
   `widget_goal_row.xml` (title + horizontal `ProgressBar` bound to `goals[i].pct`).
3. **`RoutiniWidgetProvider.java`** — read `snapshot.now`, `snapshot.energy`,
   `snapshot.goals` (guard with `optJSONObject`/`optJSONArray`); render the Now block
   (`R.id.now_title`, `R.id.now_reason`); for the large layout attach a second
   `RemoteAdapter` for a goals `RemoteViewsService` (or inline up to 3 `goals` rows
   since the array is capped at 3).
4. **`RoutiniWidgetService.java`** — no change needed for tasks/appts/habits; add a
   parallel `GoalsFactory` only if the large layout uses a scrollable goals list.

**Snapshot contract (already shipped):**
```jsonc
{
  "v": 2,
  "progress": { "done": 0, "total": 0 },
  "now": { "id": "...", "type": "task|appointment|habit", "title": "...", "reason": "...", "at": null },
  "energy": "high|good|medium|low" | null,
  "goals": [ { "id": "...", "title": "...", "pct": 0 } ],   // ≤ 3, active only
  "tasks": [...], "appointments": [...], "habits": [...], "adhkar": {...}|null
}
```

**Verification:** owner builds the APK (`npm run android:apk`), adds the widget at each
size on a device, resizes it. Nothing here is testable in CI.

---

## J4 · FCM push

**Blocked by:** needs a **free Firebase project** + `@capacitor/push-notifications`
(not installed) + `google-services.json` + an FCM server key stored as a Supabase
secret. Also depends on Phase 9's interactive notification actions (I1), which the
owner deferred — until those land, push can only deliver a tap-to-open notification,
not Complete/Snooze/Reschedule/Skip.

**Migration (created, NOT applied):** `supabase/migrations/20260913000000_phase10_devices.sql`
— adds `public.devices` (`id, user_id, kind, name, platform, push_token, push_provider,
last_seen_at` + sync columns + RLS "owner all" + `set_updated_at` trigger + realtime).
Additive, verified on the local stack. **Apply only after owner approval.**

**Client wiring (do AFTER the migration is applied — a separate commit):**
1. `src/lib/types/models.ts` — `Device` interface; `EntityType += "device"`;
   `schemas.ts` `deviceSchema` + backup; Dexie `version(8)` store `devices: "id, sync.deletedAt"`.
2. `src/lib/data/tables.ts` — add `"devices"` to `SYNCED_TABLES` + `DEXIE_TABLE`.
   *(Not done now: the realtime channel subscribes to every `SYNCED_TABLES` entry, and
   a binding to a table that doesn't exist yet on the project can fault the channel.)*
3. `src/lib/db/repositories/devicesRepository.ts` — `makeSyncedRepository(db.devices, "devices")`
   + `registerThisDevice(userId)` (deterministic `deviceId` in localStorage, upsert row,
   bump `last_seen_at` on each app start).
4. Call `registerThisDevice()` from `SyncEngine.start()` after the initial pull.

**Push provider layer:**
- `src/lib/integrations/push/` — `PushProvider` interface + `getPushProvider()` registry
  (mirrors `src/lib/ai/registry.ts`): returns `null` unless configured.
  - `webPush.ts` — `PushManager` + VAPID public key (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`);
    `subscribe()` → store the `PushSubscription` JSON as `devices.push_token`,
    `push_provider = 'webpush'`.
  - `nativePush.ts` — `@capacitor/push-notifications` `register()` → FCM token →
    `devices.push_token`, `push_provider = 'fcm'`. Requires the plugin + Firebase.
- Notification settings gain a `pushEnabled` toggle (default off), shown disabled with
  "يحتاج إعداد Firebase" until a provider is configured.

**Edge Function (skeleton to add): `supabase/functions/push-send/`**
- Reads `FCM_SERVICE_ACCOUNT_JSON` (or legacy server key) from secrets — never in the client.
- Input `{ userId, notification: { title, body, url, actions? } }` → look up the user's
  `devices` rows → POST to FCM v1 (`https://fcm.googleapis.com/v1/projects/<id>/messages:send`)
  per token → prune tokens FCM reports as stale.
- Triggered by the same code path that schedules a local reminder, for the
  server-authoritative reminders (daily plan, streaks) — user-initiated / cron, never on render.

**Owner setup checklist:**
1. Create a free Firebase project; enable Cloud Messaging.
2. `npm i @capacitor/push-notifications` + `npx cap sync android`; drop
   `google-services.json` into `android/app/`.
3. `supabase secrets set FCM_SERVICE_ACCOUNT_JSON=@service-account.json`
   (via the CLI file arg — never pasted into chat, never committed).
4. Deploy `supabase functions deploy push-send`.
5. (web push) generate a VAPID key pair; public → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   private → `supabase secrets set VAPID_PRIVATE_KEY=...`.

**Verification:** server → device delivery testable with a real signed-in device once
set up; notification *display* is device-pending. Web push testable in a desktop browser.
