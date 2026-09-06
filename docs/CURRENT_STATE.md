# RoutinI / روتيني — CURRENT_STATE

_Verified against the repo on branch `redesign/routini-v2` (HEAD `5af8586`). Read-only inspection._

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.3.3** App Router, React **19.2.8** | pre-release/patched build (`AGENTS.md`); docs in `node_modules/next/dist/docs/` |
| Output | **`output: "export"`** + `trailingSlash: true` + `images.unoptimized` | `next.config.ts` — **pure static**, no server |
| Language | TypeScript ^5, `strict: true`, path alias `@/* → src/*` | |
| Styling | **Tailwind v4** CSS-first (`@theme inline` in `src/app/globals.css`), tokens in `src/styles/tokens.css` | no `tailwind.config` file |
| Local DB | **Dexie ^4.4.5** / IndexedDB (`routini-db`), `dexie-react-hooks` | schema **v2** |
| State | React context + Dexie live queries only | no Redux/Zustand/RTK |
| Animation | `framer-motion` ^13 · Icons `lucide-react` ^1.34 · Dates `date-fns` ^4 · Validation `zod` ^4 |
| Prayer calc | `adhan` 4.4.4 | offline, on-device |
| Native shell | **Capacitor 8.5.0** → Android (`appId com.routini.app`, label روتيني) | `webDir: "out"` |
| Cap plugins | `app` 8.1.1 · `app-launcher` 8.0.1 · `keyboard` 8.0.5 · `local-notifications` 8.3.1 · `splash-screen` 8.0.2 · `status-bar` 8.0.3 · `@ebarooni/capacitor-calendar` 8.3.0 · **custom `RoutiniWidget`** (Java) |
| Tests | `vitest` ^4 (node env, `tests/**/*.test.ts`) · `playwright` ^1.62 (only `scripts/qa.mjs`) |
| Build tooling | JDK 17/21 + Android SDK platform/build-tools 36 |
| Deploy | Vercel (linked project `rotiny`, `.vercel/project.json`), static hosting |
| **Absent** | backend, `app/api/**`, route handlers, server actions, `middleware.ts`, `.env*`, auth lib, LLM/ML dep, CI (`.github/` absent), `vercel.json`, state lib |

Only `process.env` read in the whole codebase: `NODE_ENV` in `src/components/shared/ServiceWorkerManager.tsx`.

---

## 2. Architecture

```
UI (client components, "use client" throughout)
 └─ hooks: src/lib/hooks/*  (useTasks, useAppointments, useHabits, useAdhkar, useSettings,
                             useNow, useTimeOfDay, useOnlineStatus, useInstallPrompt, useDebounced)
     └─ repositories: src/lib/db/repositories/*  (makeSyncedRepository(table) base +
                       per-entity extras)
         └─ Dexie schema: src/lib/db/schema.ts  (IndexedDB)

Post-write side-effects seam:
 form / toggle / SmartAdd.commit / detail-delete
   → onEntityMutated(m)  [src/lib/services/effects/appEffects.ts]
       ├─ syncQueueRepository.enqueue()          — local outbox, NEVER transmitted
       ├─ registered EffectHandlers               — native only
       ├─ ReminderScheduler.syncReminders()       — native: cancel-all + reschedule
       ├─ WidgetBridgeService.refreshWidget()     — native: rebuild today snapshot
       └─ CalendarSyncService.onAppointmentMutated — native: mirror to device calendar

Native bootstrap: src/components/shared/NativeBootstrap.tsx
  (statusbar overlay + dark, keyboard resize, splash hide, initial syncReminders + refreshWidget,
   App resume → re-sync, setTimeout to local midnight → widget refresh)
```

- **`SyncMeta` on every row**: `{ createdAt, updatedAt, deletedAt?, syncStatus, remoteId?, version }` — the model was designed for a sync engine that was never built.
- **Soft-delete (tombstones)** everywhere except `habitCompletions` / `dhikrProgress` (hard delete on toggle-off).
- Native plugin code is **lazy `import()`ed** — the web bundle never pulls Capacitor plugin code unless it runs.
- Theme + i18n applied pre-hydration via inline bootstrap scripts in `<head>` (no FOUC).

---

## 3. Routes (static export, App Router)

Root: `src/app/layout.tsx` (`<html lang="ar" dir="rtl">`, IBM Plex Sans Arabic), `src/app/providers.tsx`, `src/app/offline/page.tsx`, `_not-found`.

**`(onboarding)` group** — `/onboarding` (4-step; sets prefs, `onboardingCompleted`, seeds adhkar + demo data).

**`(app)` group** (`src/app/(app)/layout.tsx` redirects to `/onboarding` if `!onboardingCompleted`; wraps `AppShell`; `template.tsx` for transitions):

| Route | File | Notes |
|---|---|---|
| `/` | `(app)/page.tsx` | Home |
| `/plan` | `(app)/plan/page.tsx` | Daily Plan — **derived at render, nothing persisted** |
| `/tasks` · `/tasks/detail?id=` | `(app)/tasks/{page,detail/page}.tsx` | query-param detail (no `[id]`) |
| `/appointments` · `/appointments/detail?id=` | `(app)/appointments/...` | day/week/hours views + conflict banner |
| `/habits` · `/habits/detail?id=` | `(app)/habits/...` | streak strip + heat grid |
| `/adhkar` | `(app)/adhkar/page.tsx` | accepts `?category=` |
| `/search` | `(app)/search/page.tsx` | literal text/filter match; `?q=` |
| `/more` | `(app)/more/page.tsx` | hub |
| `/more/statistics` · `/more/summary` | | weekly-ish aggregation |
| `/more/settings` + 8 sub | `about, backup, calendar, intelligence, notifications, prayer, privacy, sync` | |

All detail routes use `ROUTES.*(id)` → `/…/detail?id=` builders in `src/lib/constants/routes.ts`. **No dynamic `[id]` segments anywhere** (static-export constraint).

---

## 4. Components (84 `.tsx` under `src/components/`)

- **layout/** — `AppShell`, `BottomNav` (mobile, **5 items**: Home · Appointments · Tasks · Habits · Adhkar; animated `layoutId` pill), `Sidebar` (desktop), `TopBar`, `OfflineBanner`.
- **home/** — `GreetingHeader`, `PrayerStrip`, `SmartSuggestionBanner` (rule-based), `TodayOverviewCard`, `ImportantTaskCard`, `UpcomingAppointmentCard`, `HabitsProgressStrip`, `AdhkarQuickAccess`, `EndOfDaySummaryCard`.
- **tasks/ · appointments/ · habits/ · adhkar/** — forms, lists, rows, detail widgets, pickers (`PriorityPicker`, `ColorPicker`, `RecurrenceEditor`, `ReminderEditor`, `StreakBadge`, `HabitHistoryGrid`, `ConflictBanner`, day/week/hours views).
- **shared/** — `SmartInputBox` (2-screen parse→confirm/edit→commit), `QuickAddProvider` + `QuickAddFab`, `DeepLinkHandler`, `NativeBootstrap`, `ServiceWorkerManager`, `SubpageHeader`.
- **ui/** — `Card`, `Button`, `Input`, `Textarea`, `Select`, `Switch`, `Chip`, `Sheet`, `DatePicker`, `TimePicker`, `ProgressBar`, `ProgressRing`, `Toast`, `Skeleton`, `DirectionalIcon`, `EmptyState`.
- **more/** — settings list components incl. `NotificationSettingsList`.

---

## 5. Data model (`src/lib/types/`)

### Stores (Dexie schema v2, `src/lib/db/schema.ts`)

`appointments · tasks · taskCategories · habits · habitCompletions · dhikrCategories · adhkar · dhikrProgress · settings · syncQueue` — all keyed by string `id`.

- **v1** — 9 stores (no `taskCategories`).
- **v2** — additive: adds `taskCategories` store, indexes `categoryId,pinned` on `tasks` + `externalId` on `appointments`; `.upgrade(tx)` backfills `categoryId=null / pinned=false / deviceCalendarId=null / externalId=null` and inserts 4 `DEFAULT_TASK_CATEGORIES` (عمل/blue، شخصي/green، المنزل/amber، صحة/cyan) if the table is empty.
- Compound indexes `[habitId+date]` / `[dhikrId+date]` declared but **unused** (repos do full `toArray()` scans).

### Interfaces (`models.ts`, `shared.ts`, `settings.ts`)

- **`Appointment`** — `id, title, notes?, location?, startAt, endAt, allDay, recurrence?, recurrenceParentId?, reminders[], participants?, color?, calendarProviderId, externalId?, deviceCalendarId?, sync`
- **`Task`** — `id, title, notes?, dueAt?, hasTime, durationMinutes?, priority, status, completedAt?, recurrence?, reminders[], linkedAppointmentId?, originTaskId?, categoryId?, pinned?, sync` · `TaskStatus = pending|completed|carried_over|cancelled`
- **`TaskCategory`** — `id, name, color(palette key), order, sync`
- **`Habit`** — `id, title, notes?, recurrence(required), timeOfDay?, target?{type:count|duration,value,unit?}, reminders[], color?, archivedAt?, sync`
- **`HabitCompletion`** — `id, habitId, date(YYYY-MM-DD), completedAt, value?, sync` (row presence = done that day)
- **`DhikrCategory`** — `id, kind(morning|evening|after_prayer|sleep|wake|istighfar|custom), title, order, isCustom, sync`
- **`Dhikr`** (table `adhkar`) — `id, categoryId, text, transliteration?, translation?, targetCount, source?, order, isCustom, sync`
- **`DhikrProgress`** — `id, dhikrId, date, count, completedAt?(sticky), sync`
- **`Reminder`** — `id, offsetMinutes, method(push|inapp)` — **embedded array**, not a table
- **`RecurrenceRule`** — `frequency(daily|weekly|monthly|custom), interval, byWeekday?[], byMonthDay?[], count?, until?`
- **`SyncMeta`** — `createdAt, updatedAt, deletedAt?, syncStatus(synced|pending|conflict), remoteId?, version`
- **`Priority`** — `important | normal | later`
- **`EntityType`** — `appointment | task | habit | dhikr` (**omits** taskCategory / settings)
- **`UserSettings`** (`id: "singleton"`) — `locale, theme, onboardingCompleted, weekStartsOn, notifications, intelligence, calendarProvider, calendarIntegration, prayerTimes, lastDailySummaryDate?, lastSyncedAt?, seedVersion, createdAt, updatedAt`
  - `NotificationPreferences` — 9 booleans + `dailyPlanReminderTime, adhkarTimes{morning,evening,afterPrayer,sleep,wake,istighfar}, reminderDefaults:number[], quietHoursStart?, quietHoursEnd?`
  - `IntelligenceSettings` — `nlpEnabled, autoFillConfidenceThreshold(0..1), suggestFreeSlots, conflictDetection` — **last two have no consumer**
  - `PrayerTimesSettings` — `enabled, method(9 options), city, latitude, longitude, notify, notifyOffsetMinutes`
  - `CalendarIntegrationSettings` — `enabled, deviceCalendarId?, deviceCalendarName?, showDeviceEvents`
- **`SyncQueueEntry`** — `id, entityType(EntityType|settings|taskCategory), entityId, operation, payload, createdAt, attempts, lastError?`

### Repositories (`src/lib/db/repositories/`)

`makeSyncedRepository<T>(table)` base: `getAll` (filters `sync.deletedAt`), `getById`, `create`, `update` (merge + `touchSyncMeta`), `delete` (soft), `hardDelete`, `query`.
Extras: appointments `getInRange/getUpcoming` · tasks `getByStatus/getOverdue` · taskCategories `getAllSorted/ensureDefaults` · habits `getActive` · habitCompletions `getForHabit/getForDate/isCompletedOn/toggleForDate` · dhikrProgress `getForDate/getForDhikrOnDate/increment/resetForDate` · dhikrCategories/adhkar `getAllSorted/getForCategory` · syncQueue `enqueue/getAll/count/clear/remove`.

### Seed (`src/lib/db/seed.ts`)

`CURRENT_SEED_VERSION = 3`. `seedIfNeeded()`: early-return if `seedVersion >= 3`; else `taskCategoriesRepository.ensureDefaults()` + `seedAdhkar()` (**idempotent per `kind`** — 6 categories incl. wake + istighfar, 3–5 hardcoded adhkar each); demo tasks/appointments/habits only if `seedVersion < 1`; then `settings.update({ seedVersion: 3 })`.

### Settings migration (`settingsRepository.ts`)

`migrateSettingsShape(s)` — additive spread-merge of **4 nested objects only** (`notifications`, `intelligence`, `calendarIntegration`, `prayerTimes`) over their `DEFAULT_*`. **Top-level new keys are NOT backfilled.** `get()` returns the migrated shape; `ensureDefaults()` writes back only if `JSON.stringify` differs.

### Backup (`(app)/more/settings/backup/page.tsx`)

`BACKUP_VERSION = 1`. Export = `toArray()` of every table. Import = `safeParse` → one `rw` transaction that **clears all 10 tables and `bulkAdd`s** the file (destructive full-replace, no merge, no pre-snapshot). `confirmReset()` clears all + routes to onboarding.

---

## 6. Services (`src/lib/services/`)

| Folder | Purpose | Platform |
|---|---|---|
| `nlp/` | `RuleBasedIntentParser` — **regex + AR/EN lexicons, ZERO LLM**. Extractors: date, time (ambiguous-hour clarification), duration, recurrence, countTarget, reminder cue/offset, priority, entities (~30-name allowlist + location keywords). Additive keyword intent scoring → `create_task/appointment/habit \| search_query \| unknown` + confidence + clarifications. | pure JS |
| `smartAdd/SmartAddService.ts` | wraps parser → editable `Interpretation`; `needsConfirmation` if unknown / clarifications / `confidence < autoFillConfidenceThreshold`. `commit()` routes to `localCalendarService.createEvent` / `habitsRepository` / `tasksRepository`, then `onEntityMutated`. | pure JS |
| `effects/appEffects.ts` | `onEntityMutated` fan-out (see §2); `registerEffectHandler`. | both |
| `calendar/LocalCalendarService.ts` | appointments CRUD over the Dexie repo. | both |
| `calendar/CalendarSyncService.ts` | mirror appointments → device calendar via `@ebarooni/capacitor-calendar`; `checkPermission/requestPermission/listCalendars/listEventsInRange` (de-dupes rows whose id ∈ appointment `externalId`s) `/openInSystemCalendar/onAppointmentMutated` (create/modify/delete, stores `externalId`+`deviceCalendarId`+`calendarProviderId:"device"`). | **native only** |
| `notifications/ReminderScheduler.ts` | `syncReminders()` — native only, single-flight. 6 channels (`routini-appointments/tasks/habits/adhkar/daily-plan/prayer`). Cancel-all → rebuild. Schedules tasks / appointments (recurrence, 30-day horizon, ≤8 occ) / habits (14 daily) / adhkar (6×7) / daily-plan (7) / **prayer (5 prayers × 7 days at `−notifyOffsetMinutes`)**. Filters `≤ now+30s` + quiet hours, sort asc, **cap 100**. IDs = FNV-1a → 31-bit int. `schedule:{at, allowWhileIdle:true}`, `extra:{url}`. Boot restore delegated to the plugin's own receiver. | **native only** |
| `notifications/index.ts` | `getNotificationService()` → web (`Notification`) or native impl: `getPermission/requestPermission/canScheduleExact(checkExactNotificationSetting)/showImmediate/openSystemSettings`. | both |
| `widget/WidgetBridgeService.ts` | `buildSnapshot()` (today's tasks/appts/habits/adhkar + progress) → `routiniWidget.setTodaySnapshot({json})` + `.refresh()`, debounced 250 ms. | native push, pure build |
| `prayer/PrayerTimesService.ts` | `adhan` — `dayTimes()`, `next()`; 9 calculation methods. | both |
| `deepLink/DeepLinkService.ts` | `resolveDeepLink(url)` → `{path, action?, actionId?}`. `routini://` host/id → routes; `?complete=1` on task → `{action:"completeTask"}`; https/bare path passthrough; malformed → safe fallback. **11 unit tests.** | both |
| `sync/LocalNoopSyncService.ts` | honest no-op — `enqueue` writes local queue, `sync()` always `{pushed:0,pulled:0,errors:0}`. Docstring: "no backend at all." `ISyncService` interface ready for a swap. | both |
| `storage/IRepository.ts` | generic interface only. | — |

**No `auth/`, no `ai/`, no `analytics/`, no `integrations/` folder.**

---

## 7. Integrations

| Integration | State |
|---|---|
| Device Calendar (Android) | ✅ implemented (`@ebarooni/capacitor-calendar`) — contextual `WRITE_CALENDAR`, create/modify/delete mirrored events, read + de-dupe, graceful denial. **Not device-verified.** |
| Local notifications (Android) | ✅ implemented — 6 channels, deterministic ids, boot restore via plugin. **Not device-verified.** |
| Home-screen widget (Android) | ✅ implemented — custom plugin + RemoteViews list + snapshot bridge. **Not device-verified.** |
| Deep links | ✅ implemented + 11 tests. **Not device-verified.** |
| Prayer times | ✅ offline `adhan`. |
| Google / Apple / Microsoft Calendar (cloud) | ❌ enum values only, no code. |
| Cloud sync / account | ❌ `LocalNoopSyncService`. |
| Galaxy Watch / Wear OS | ❌ none. |
| Samsung Health / Health Connect | ❌ none. |
| Location | ❌ none. |
| Voice / STT | ❌ none. |
| AI / LLM | ❌ none. |

---

## 8. Native Android (`android/app/src/main/`)

- **`MainActivity.java`** — `BridgeActivity`; `registerPlugin(RoutiniWidgetPlugin.class)` in `onCreate` before `super`.
- **`AndroidManifest.xml`** — permissions `INTERNET, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED, READ_CALENDAR, WRITE_CALENDAR`. `MainActivity` `exported`, `singleTask`, `adjustResize`, filters: LAUNCHER + `VIEW`/`BROWSABLE`/`DEFAULT` for `android:scheme="routini"`. `RoutiniWidgetProvider` `<receiver exported=true>` (`APPWIDGET_UPDATE` + `routini_widget_info` meta). `RoutiniWidgetService` `<service exported=false permission=BIND_REMOTEVIEWS>`. `FileProvider` (`${applicationId}.fileprovider`). **No app-level `BOOT_COMPLETED` receiver** — delegated to the local-notifications plugin's merged receiver.
- **`widget/`** — `RoutiniWidgetProvider` (renders `widget_medium`, wires header→`routini://home`, add→`routini://add`, `RemoteAdapter` + `PendingIntent` template), `RoutiniWidgetService` (RemoteViewsFactory rows from snapshot), `WidgetStore` (SharedPreferences JSON), `RoutiniWidgetPlugin` (`@CapacitorPlugin(name="RoutiniWidget")`, `setTodaySnapshot/refresh`, `pushUpdate` broadcast).
- **JS bridge** — `src/lib/native/routiniWidget.ts` (`registerPlugin("RoutiniWidget", {web: no-ops})`), `src/lib/native/platform.ts` (`isNativePlatform`).
- `res/xml/` — `routini_widget_info.xml`, `file_paths.xml`, `config.xml`. Layouts `widget_medium.xml`, `widget_row.xml`.

---

## 9. Tests, build, QA

- **Tests** (`vitest run`, node env) — **5 files ≈ 46 cases**: `tests/deepLink/deepLink.test.ts` (11), `tests/nlp/ruleBasedIntentParser.test.ts` (15), `tests/nlp/upgradeExamples.test.ts` (6), `tests/time/recurrence.test.ts` (8), `tests/time/streak.test.ts` (6). **Pure logic only** — no component/DOM/integration/e2e.
- **Scripts** — `npm run icons` (`scripts/generate-icons.mjs`, sharp + png-to-ico), `npm run qa` (`scripts/qa.mjs` — own http server :4178 over `out/`, Playwright Chromium at 360 & 393 px, `locale ar` + dark, onboarding auto-click, ~13 screen screenshots + smart-add flow, horizontal-overflow check).
- **Build** — `next build` → static `out/`; `npm run cap:sync` → `out/` into Android; `npm run android:apk` → `app-debug.apk`. Currently green; `tsc`/`lint`/`vitest`/`build`/`assembleDebug` all pass. `Routini-debug.apk` (6.2 MB) committed at repo root is `.apk`-gitignored — actually present on disk, not tracked.
- **CI** — none.

---

## 10. Existing features (all working — DO NOT regress)

Tasks (category · color · pin · priority · due date/time · duration · recurrence · multi-reminder · اليوم/القادمة/المكتملة filter · fast add · reminder defaults from settings) ·
Appointments (start/end · recurrence · reminders · color · participants · **device-calendar mirror** · read + de-dupe device events · conflict banner · day/week/hours views) ·
Habits (target count/duration · timeOfDay · recurrence incl. specific weekdays + interval · reminders · streak / longest / completion-rate computed on the fly · best-streak surfaced · heat grid) ·
Adhkar (6 categories incl. wake + **istighfar** · per-day counters · sticky completion · idempotent per-kind seeding · sources shown) ·
Smart Add (rule-based Arabic NLP · confirm/edit · routes task/appointment/habit/search · never silently saves ambiguous) ·
Home (greeting · prayer strip · rule-based suggestion banner · today overview · important task · upcoming appointment · habits strip · adhkar quick access · evening summary · plan CTA) ·
Daily Plan `/plan` (derived buckets صباح/ظهر/مساء) · Weekly Summary · Statistics ·
Prayer Times (offline `adhan` · 9 methods · 14 preset cities · Home strip · pre-prayer notifications) ·
Notifications (6 channels · deterministic ids · quiet hours · cap 100 · `allowWhileIdle` · deep-link on tap · boot restore · resume + midnight re-sync) ·
Home-screen widget (custom plugin · RemoteViews · progress · row → deep link · task circle → `routini://task/{id}?complete=1`) ·
Deep links (`routini://` · cold + warm start · notification + widget taps · malformed → safe fallback) ·
PWA (manifest RTL/ar/standalone/maskable icons · hand-written `sw.js` offline-first · install prompt · update toast · SW disabled inside WebView) ·
Backup / restore (JSON full-replace) · Reset-to-onboarding ·
i18n (hand-rolled ar/en dictionary switch, `localStorage` `routini:locale`) ·
Theme (dark default, light/system, pre-hydration bootstrap) ·
Section accents (teal + indigo/amber/green/violet/slate, live CSS-var swap by `SectionProvider`).
