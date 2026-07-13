// plugins/withHireScopeForegroundService.js
//
// Expo config plugin: registers an Android foreground service so the research
// (hidden-WebView) scrape keeps running while the app is backgrounded.
//
// Without a foreground service, Android pauses the WebView and throttles JS
// timers the moment the app goes to background, so a long research job appears
// frozen. A foreground service keeps the process alive (and out of Doze), which
// lets the WebView's network + JS execution continue. A persistent notification
// also tells the user research is ongoing.
//
// The service itself does NOT host the WebView — the WebView stays in the React
// Activity. The service only keeps the process prioritized and shows the
// notification. JS calls start/stop via the ResearchModule native bridge.

const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.rutambh.hirescope';

const SERVICE_SRC = `package ${PACKAGE}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class ResearchForegroundService : Service() {
    private val channelId = "hirescope_research"
    private val notifId = 1001

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra("title") ?: "HireScope"
        val text = intent?.getStringExtra("text") ?: "Researching…"
        startForeground(notifId, buildNotification(title, text))
        return START_STICKY
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (mgr.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(channelId, "Research", NotificationManager.IMPORTANCE_LOW)
                channel.setShowBadge(false)
                mgr.createNotificationChannel(channel)
            }
        }
    }

    private fun buildNotification(title: String, text: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val contentIntent = if (launchIntent != null) {
            PendingIntent.getActivity(this, 0, launchIntent, flags)
        } else {
            null
        }
        val builder = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(getNotificationIcon())
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
        return builder.build()
    }

    private fun getNotificationIcon(): Int {
        // Use our own monochrome drawable (added by the config plugin). Fall back
        // to the app icon if it is somehow missing.
        val res = resources.getIdentifier("ic_research_notification", "drawable", packageName)
        return if (res != 0) res else android.R.drawable.ic_dialog_info
    }

    override fun onDestroy() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
`;

const MODULE_SRC = `package ${PACKAGE}

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ResearchModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ResearchModule"

    @ReactMethod
    fun startService(params: ReadableMap?) {
        val intent = Intent(reactContext, ResearchForegroundService::class.java)
        intent.putExtra("title", params?.getString("title") ?: "HireScope")
        intent.putExtra("text", params?.getString("text") ?: "Researching…")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun updateNotification(params: ReadableMap?) {
        // Best-effort: restart the foreground notification with new text.
        val intent = Intent(reactContext, ResearchForegroundService::class.java)
        intent.putExtra("title", params?.getString("title") ?: "HireScope")
        intent.putExtra("text", params?.getString("text") ?: "Researching…")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactContext, ResearchForegroundService::class.java)
        reactContext.stopService(intent)
    }
}
`;

const PACKAGE_SRC = `package ${PACKAGE}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ResearchPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ResearchModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

const NOTIFICATION_DRAWABLE = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM11,19L11,17L13,17L13,19L11,19zM12.61,15.98L12.01,16.58L12.01,11L10.99,11L10.99,11L10.99,17.58L10.39,17L9,16.99L9,15.99L11.31,13.69C11.71,13.29 12,12.79 12,12.29L12,12.29C12,11.09 11.11,10.19 9.91,10.19C8.7,10.19 7.81,11.09 7.81,12.29L5.81,12.29C5.81,9.79 7.81,7.79 10.31,7.79C12.81,7.79 14.81,9.79 14.81,12.29C14.81,13.29 14.41,14.19 13.81,14.89L12.61,15.98z" />
</vector>
`;

function addManifestEntries(config) {
  return withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults;
    // Only the Android manifest has <application>; skip on iOS/other platforms.
    if (!manifest.manifest || !manifest.manifest.application) return cfg;
    const android = manifest.manifest;

    // Permissions
    const perms = android['uses-permission'] || [];
    const hasPerm = (name) => perms.some((p) => p.$ && p.$['android:name'] === name);
    if (!hasPerm('android.permission.FOREGROUND_SERVICE')) {
      perms.push({ $: { 'android:name': 'android.permission.FOREGROUND_SERVICE' } });
    }
    // API 34+ requires a typed foreground-service permission for dataSync.
    if (!hasPerm('android.permission.FOREGROUND_SERVICE_DATA_SYNC')) {
      perms.push({ $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_DATA_SYNC' } });
    }
    android['uses-permission'] = perms;

    // Application block. In config-plugins the manifest is an XML object where
    // <application> is an array (usually a single element).
    const apps = android.application;
    if (!apps || !apps.length) {
      throw new Error('withHireScopeForegroundService: <application> missing in AndroidManifest');
    }
    const app = apps[0];

    const services = app.service || [];
    const svcName = '.ResearchForegroundService';
    const hasSvc = services.some((s) => s.$ && s.$['android:name'] === svcName);
    if (!hasSvc) {
      services.push({
        $: {
          'android:name': svcName,
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      });
    }
    app.service = services;

    cfg.modResults = manifest;
    return cfg;
  });
}

function writeNativeSources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const javaDir = path.join(
        cfg.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'rutambh',
        'hirescope'
      );
      const resDir = path.join(
        cfg.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'drawable'
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(resDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, 'ResearchForegroundService.kt'), SERVICE_SRC);
      fs.writeFileSync(path.join(javaDir, 'ResearchModule.kt'), MODULE_SRC);
      fs.writeFileSync(path.join(javaDir, 'ResearchPackage.kt'), PACKAGE_SRC);
      fs.writeFileSync(path.join(resDir, 'ic_research_notification.xml'), NOTIFICATION_DRAWABLE);

      // Register the package in MainApplication.kt.
      const mainAppPath = path.join(
        cfg.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'rutambh',
        'hirescope',
        'MainApplication.kt'
      );
      if (fs.existsSync(mainAppPath)) {
        let mainApp = fs.readFileSync(mainAppPath, 'utf8');

        if (!mainApp.includes('import com.rutambh.hirescope.ResearchPackage')) {
          mainApp = mainApp.replace(
            /(^package .*$)/m,
            `$1\nimport com.rutambh.hirescope.ResearchPackage`
          );
        }

        if (!mainApp.includes('add(ResearchPackage())')) {
          // Inject into the PackageList(...).getPackages().apply { ... } block.
          const anchor = 'PackageList(this).getPackages().apply {';
          if (mainApp.includes(anchor)) {
            mainApp = mainApp.replace(
              anchor,
              `${anchor}\n            add(ResearchPackage())`
            );
          }
        }
        fs.writeFileSync(mainAppPath, mainApp);
      }

      return cfg;
    },
  ]);
}

module.exports = function withHireScopeForegroundService(config) {
  config = addManifestEntries(config);
  config = writeNativeSources(config);
  return config;
};
