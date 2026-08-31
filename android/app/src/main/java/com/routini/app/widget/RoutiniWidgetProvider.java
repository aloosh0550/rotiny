package com.routini.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import com.routini.app.R;

import org.json.JSONObject;

public class RoutiniWidgetProvider extends AppWidgetProvider {

    private static PendingIntent deepLink(Context ctx, String url, int reqCode) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        i.setPackage(ctx.getPackageName());
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, reqCode, i, flags);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) render(ctx, mgr, id);
    }

    static void render(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_medium);

        String snapshotJson = WidgetStore.readSnapshot(ctx);
        String progressText = "";
        String dateText = "";
        try {
            if (!snapshotJson.isEmpty()) {
                JSONObject s = new JSONObject(snapshotJson);
                JSONObject p = s.optJSONObject("progress");
                if (p != null) progressText = p.optInt("done") + " / " + p.optInt("total");
                dateText = s.optString("date", "");
            }
        } catch (Exception ignored) {}

        views.setTextViewText(R.id.widget_progress, progressText);

        // Header + "add" tap targets.
        views.setOnClickPendingIntent(R.id.widget_header, deepLink(ctx, "routini://home", 1));
        views.setOnClickPendingIntent(R.id.widget_add, deepLink(ctx, "routini://add", 2));

        // The list is served by RoutiniWidgetService (RemoteViewsFactory).
        Intent svc = new Intent(ctx, RoutiniWidgetService.class);
        svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list, svc);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // Row taps resolve their own deep link via a template + fillInIntent.
        Intent tpl = new Intent(ctx, com.routini.app.MainActivity.class);
        tpl.setAction(Intent.ACTION_VIEW);
        tpl.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tplPi = PendingIntent.getActivity(
            ctx, 3, tpl,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.widget_list, tplPi);

        mgr.updateAppWidget(widgetId, views);
        mgr.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list);
    }
}
