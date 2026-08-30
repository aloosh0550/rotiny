package com.routini.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.routini.app.widget.RoutiniWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RoutiniWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
