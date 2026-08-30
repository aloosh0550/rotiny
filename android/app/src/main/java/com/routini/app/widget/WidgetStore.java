package com.routini.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The bridge between the WebView (IndexedDB) data and the home-screen widget.
 * The web app writes a "today snapshot" JSON here via RoutiniWidgetPlugin; the
 * AppWidgetProvider + RemoteViewsFactory read it. SharedPreferences is process-safe
 * enough for this small, single-writer payload and survives the app being killed.
 */
public final class WidgetStore {
    private static final String PREFS = "routini_widget";
    private static final String KEY_SNAPSHOT = "today_snapshot";

    private WidgetStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void writeSnapshot(Context ctx, String json) {
        prefs(ctx).edit().putString(KEY_SNAPSHOT, json).apply();
    }

    /** Raw JSON string, or "" when nothing has been written yet. */
    public static String readSnapshot(Context ctx) {
        return prefs(ctx).getString(KEY_SNAPSHOT, "");
    }
}
