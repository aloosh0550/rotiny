import { ROUTES } from "@/lib/constants/routes";

export interface ResolvedLink {
  /** In-app path to navigate to (next/router). */
  path: string;
  /** Optional side-effect the app should run after navigating. */
  action?: "openSmartAdd" | "completeTask";
  /** Entity id the action operates on (e.g. the task to complete). */
  actionId?: string;
}

/**
 * Resolves a `routini://…` deep link (from a notification, the widget, or an
 * Android VIEW intent) to an in-app route. Also accepts an https link whose path
 * matches an app route, and a bare in-app path.
 */
export function resolveDeepLink(url: string): ResolvedLink | null {
  if (!url) return null;

  let scheme = "";
  let rest = url;
  const m = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(url);
  if (m) {
    scheme = m[1].toLowerCase();
    rest = m[2];
  }

  // An https/app link is already an in-app path — navigate to it verbatim.
  if (scheme === "http" || scheme === "https") {
    try {
      const u = new URL(url);
      const path = u.pathname + u.search;
      return { path: path === "" || path === "/" ? ROUTES.home : path };
    } catch {
      return null;
    }
  }

  const [pathPart, query = ""] = rest.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const host = segments[0] ?? "";
  const id = segments[1] ?? "";

  switch (host) {
    case "":
    case "home":
      return { path: ROUTES.home };
    case "add":
      return { path: `${ROUTES.home}?add-smart=1`, action: "openSmartAdd" };
    case "plan":
      return { path: ROUTES.plan };
    case "search":
      return { path: `${ROUTES.search}${query ? `?${query}` : ""}` };
    case "task":
    case "tasks": {
      if (!id) return { path: ROUTES.tasks };
      const params = new URLSearchParams(query);
      if (params.get("complete") === "1") {
        return { path: ROUTES.task(id), action: "completeTask", actionId: id };
      }
      return { path: ROUTES.task(id) };
    }
    case "appointment":
    case "appointments":
      return id ? { path: ROUTES.appointment(id) } : { path: ROUTES.appointments };
    case "habit":
    case "habits":
      return id ? { path: ROUTES.habit(id) } : { path: ROUTES.habits };
    case "adhkar":
      return { path: id ? `${ROUTES.adhkar}?category=${encodeURIComponent(id)}` : ROUTES.adhkar };
    default:
      return null;
  }
}
