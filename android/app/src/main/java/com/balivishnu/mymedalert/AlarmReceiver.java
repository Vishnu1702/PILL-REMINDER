package com.balivishnu.mymedalert;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * CRITICAL COMPONENT: AlarmReceiver receives alarm broadcasts when app is closed
 * This is the ONLY way alarms can fire when app is not running
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "🚨 AlarmReceiver.onReceive() - ALARM TRIGGERED!");
        
        // Extract medicine details from intent
        String medicineName = intent.getStringExtra("medicineName");
        String dosage = intent.getStringExtra("dosage");
        String patientName = intent.getStringExtra("patientName");
        
        Log.d(TAG, "Medicine: " + medicineName + ", Dosage: " + dosage + ", Patient: " + patientName);
        
        // CRITICAL: Start AlarmService to handle the alarm sound/vibration
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medicineName", medicineName);
        serviceIntent.putExtra("dosage", dosage);
        serviceIntent.putExtra("patientName", patientName);
        
        try {
            // Use startForegroundService for Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
                Log.d(TAG, "✅ Started AlarmService as foreground service");
            } else {
                context.startService(serviceIntent);
                Log.d(TAG, "✅ Started AlarmService");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start AlarmService: " + e.getMessage());
            e.printStackTrace();
        }
        
        // CRITICAL: Also launch AlarmActivity DIRECTLY from receiver
        // This ensures the red screen shows immediately, even before service is fully started
        try {
            Intent activityIntent = new Intent(context, AlarmActivity.class);
            activityIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );
            activityIntent.putExtra("medicineName", medicineName);
            activityIntent.putExtra("dosage", dosage);
            activityIntent.putExtra("patientName", patientName);
            context.startActivity(activityIntent);
            Log.d(TAG, "✅ Launched AlarmActivity directly from receiver");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to launch AlarmActivity: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
