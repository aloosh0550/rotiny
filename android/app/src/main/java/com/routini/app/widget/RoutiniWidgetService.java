package com.routini.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.routini.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Serves the scrollable list of today's items to the medium/large widget. */
public class RoutiniWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    static final class Row {
        String title;
        String time;
        String url;
        boolean done;
        String badge; // "مهمة" / "موعد" / "عادة"
    }

    static final class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private final List<Row> rows = new ArrayList<>();

        Factory(Context ctx) { this.ctx = ctx; }

        @Override public void onCreate() {}
        @Override public void onDestroy() { rows.clear(); }
        @Override public int getCount() { return rows.size(); }
        @Override public long getItemId(int i) { return i; }
        @Override public boolean hasStableIds() { return false; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public RemoteViews getLoadingView() { return null; }

        @Override
        public void onDataSetChanged() {
            rows.clear();
            try {
                String json = WidgetStore.readSnapshot(ctx);
                if (json.isEmpty()) return;
                JSONObject s = new JSONObject(json);
                addAll(s.optJSONArray("appointments"), "موعد", "appointment");
                addAll(s.optJSONArray("tasks"), "مهمة", "task");
                addAll(s.optJSONArray("habits"), "عادة", "habit");
            } catch (Exception ignored) {}
        }

        private void addAll(JSONArray arr, String badge, String kind) {
            if (arr == null) return;
            for (int i = 0; i < arr.length() && rows.size() < 12; i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                Row r = new Row();
                r.title = o.optString("title", "");
                r.time = o.optString("time", "");
                r.done = o.optBoolean("done", false);
                r.badge = badge;
                r.url = "routini://" + kind + "/" + o.optString("id", "");
                rows.add(r);
            }
        }

        @Override
        public RemoteViews getViewAt(int position) {
            Row r = rows.get(position);
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_row);
            v.setTextViewText(R.id.row_title, r.title);
            v.setTextViewText(R.id.row_time, r.time);
            v.setTextViewText(R.id.row_badge, r.badge);
            v.setInt(R.id.row_title, "setPaintFlags", r.done ? 0x10 | 0x01 : 0x01); // STRIKE_THRU when done

            Intent fill = new Intent();
            fill.setData(Uri.parse(r.url));
            v.setOnClickFillInIntent(R.id.row_root, fill);
            return v;
        }
    }
}
