package com.balivishnu.mymedalert;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * CRITICAL: This receiver listens for SCREEN_ON events.
 * When the screen turns on (even while locked), we check if an alarm is active
 * and immediately launch the AlarmActivity to ensure it appears over everything.
 */
public class ScreenOnReceiver extends BroadcastReceiver {
    private static final String TAG = "ScreenOnReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "🔔 ScreenOnReceiver received action: " + action);
        
        if (Intent.ACTION_SCREEN_ON.equals(action) || Intent.ACTION_USER_PRESENT.equals(action)) {
            // Check if alarm is currently active using SharedPreferences
            if (AlarmService.isAlarmActiveFromPrefs(context)) {
                Log.d(TAG, "🚨 Screen turned on/unlocked and alarm is ACTIVE - launching AlarmActivity");
                
                // Launch AlarmActivity with high-priority flags
                Intent alarmIntent = new Intent(context, AlarmActivity.class);
                alarmIntent.setFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_CLEAR_TOP |
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                alarmIntent.putExtra("medicineName", AlarmService.currentMedicineName);
                alarmIntent.putExtra("dosage", AlarmService.currentDosage);
                alarmIntent.putExtra("patientName", AlarmService.currentPatientName);
                
                try {
                    context.startActivity(alarmIntent);
                    Log.d(TAG, "✅ AlarmActivity launched from ScreenOnReceiver");
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to launch AlarmActivity: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "No active alarm, ignoring screen on event");
            }
        }
    }
}
