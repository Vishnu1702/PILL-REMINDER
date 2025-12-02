package com.balivishnu.mymedalert;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int OVERLAY_PERMISSION_REQUEST_CODE = 5469;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // CRITICAL: Check and request overlay permission for showing alarm over lock screen
        checkOverlayPermission();
        
        // CRITICAL: Check SharedPreferences for active alarm BEFORE anything else
        boolean alarmActive = AlarmService.isAlarmActiveFromPrefs(this);
        Log.d(TAG, "MainActivity onCreate - isAlarmActive from prefs: " + alarmActive);
        
        // If alarm is active, redirect to AlarmActivity BEFORE calling super.onCreate()
        if (alarmActive) {
            Log.d(TAG, "🚨 ALARM ACTIVE during onCreate - redirecting to AlarmActivity immediately");
            redirectToAlarmActivity();
        }
        
        // Register custom plugins before calling super.onCreate()
        registerPlugin(MedicineAlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }
    
    /**
     * Check and request "Display over other apps" permission
     * This is CRITICAL for the alarm screen to appear over the lock screen
     */
    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.w(TAG, "⚠️ Overlay permission not granted - requesting...");
                // Show a dialog or directly open settings
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                try {
                    startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to request overlay permission: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "✅ Overlay permission already granted");
            }
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    Log.d(TAG, "✅ Overlay permission granted by user");
                } else {
                    Log.w(TAG, "⚠️ User denied overlay permission - alarm may not show on lock screen");
                }
            }
        }
    }
    
    @Override
    public void onResume() {
        super.onResume();
        
        // Check SharedPreferences on resume in case we're returning from lock screen
        boolean alarmActive = AlarmService.isAlarmActiveFromPrefs(this);
        Log.d(TAG, "MainActivity onResume - isAlarmActive from prefs: " + alarmActive);
        
        if (alarmActive) {
            Log.d(TAG, "🚨 ALARM ACTIVE during onResume - redirecting to AlarmActivity");
            // Use a small delay to ensure the activity is fully resumed
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (AlarmService.isAlarmActiveFromPrefs(this)) {
                    redirectToAlarmActivity();
                }
            }, 50);
        }
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        boolean alarmActive = AlarmService.isAlarmActiveFromPrefs(this);
        Log.d(TAG, "MainActivity onWindowFocusChanged: " + hasFocus + ", isAlarmActive: " + alarmActive);
        
        // If we gain focus while alarm is active, redirect immediately
        if (hasFocus && alarmActive) {
            Log.d(TAG, "🚨 MainActivity gained focus while alarm active - redirecting!");
            redirectToAlarmActivity();
        }
    }
    
    private void redirectToAlarmActivity() {
        Log.d(TAG, "➡️ Redirecting to AlarmActivity with medicine: " + AlarmService.currentMedicineName);
        
        Intent alarmIntent = new Intent(this, AlarmActivity.class);
        alarmIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        // Pass the current alarm details
        alarmIntent.putExtra("medicineName", AlarmService.currentMedicineName);
        alarmIntent.putExtra("dosage", AlarmService.currentDosage);
        alarmIntent.putExtra("patientName", AlarmService.currentPatientName);
        startActivity(alarmIntent);
        
        // Move this activity to back so AlarmActivity is visible
        moveTaskToBack(true);
    }
}
