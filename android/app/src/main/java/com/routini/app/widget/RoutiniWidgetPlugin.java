package com.routini.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * JS ↔ native bridge for the Routini home-screen widget.
 * - setTodaySnapshot({ json }) persists the payload the widget renders.
 * - refresh() forces every placed widget to redraw from that payload.
 */
@CapacitorPlugin(name = "RoutiniWidget")
public class RoutiniWidgetPlugin extends Plugin {

    @PluginMethod
    public void setTodaySnapshot(PluginCall call) {
        String json = call.getString("json", "");
        WidgetStore.writeSnapshot(getContext(), json);
        pushUpdate(getContext());
        call.resolve();
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        pushUpdate(getContext());
        call.resolve();
    }

    static void pushUpdate(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        ComponentName cn = new ComponentName(ctx, RoutiniWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(cn);
        if (ids.length == 0) return;
        mgr.notifyAppWidgetViewDataChanged(ids, com.routini.app.R.id.widget_list);
        Intent intent = new Intent(ctx, RoutiniWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        ctx.sendBroadcast(intent);
    }
}
