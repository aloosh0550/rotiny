import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.routini.app",
  appName: "روتيني",
  webDir: "out",
  backgroundColor: "#0f1216",
  android: {
    backgroundColor: "#0f1216",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      backgroundColor: "#0f1216",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f1216",
    },
    LocalNotifications: {
      iconColor: "#2DD4BF",
    },
  },
};

export default config;
