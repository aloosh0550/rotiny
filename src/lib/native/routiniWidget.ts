import { registerPlugin } from "@capacitor/core";

export interface RoutiniWidgetPlugin {
  /** Persist the today-snapshot JSON where the AppWidgetProvider can read it. */
  setTodaySnapshot(options: { json: string }): Promise<void>;
  /** Force every placed Routini widget to redraw from the stored snapshot. */
  refresh(): Promise<void>;
}

/** Bridge to the hand-written Android App Widget. On web every call is a no-op. */
export const routiniWidget = registerPlugin<RoutiniWidgetPlugin>("RoutiniWidget", {
  web: {
    async setTodaySnapshot() {},
    async refresh() {},
  },
});
