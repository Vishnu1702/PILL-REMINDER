package com.balivishnu.mymedalert;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import java.util.HashSet;
import java.util.Set;

/**
 * CRITICAL COMPONENT: Reschedules all native alarms on device reboot.
 * This loads future alarms from ScheduledAlarmsRegistry and schedules them,
 * ensuring reminders are never lost when the device is restarted.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    private static final String ALARM_PREFS_NAME = "ScheduledAlarmsRegistry";
    private static final String KEY_ALL_ALARM_IDS = "allAlarmIds";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "🔄 BootReceiver received intent action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            Log.d(TAG, "🚀 Initiating self-healing Native Alarm Rescheduling after boot...");
            
            SharedPreferences prefs = context.getSharedPreferences(ALARM_PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> alarmIdsSet = prefs.getStringSet(KEY_ALL_ALARM_IDS, null);
            
            if (alarmIdsSet == null || alarmIdsSet.isEmpty()) {
                Log.d(TAG, "📭 No registered active alarms found to reschedule.");
                return;
            }
            
            Set<String> alarmIds = new HashSet<>(alarmIdsSet);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "❌ AlarmManager system service is unavailable.");
                return;
            }
            
            long now = System.currentTimeMillis();
            int rescheduledCount = 0;
            int cleanedCount = 0;
            
            SharedPreferences.Editor cleanEditor = prefs.edit();
            Set<String> updatedAlarmIds = new HashSet<>(alarmIds);
            
            for (String idStr : alarmIds) {
                try {
                    int alarmId = Integer.parseInt(idStr);
                    long triggerTime = prefs.getLong("alarm_" + alarmId + "_trigger", 0);
                    String medicineName = prefs.getString("alarm_" + alarmId + "_name", "Medicine");
                    String dosage = prefs.getString("alarm_" + alarmId + "_dosage", "1 tablet");
                    String patientName = prefs.getString("alarm_" + alarmId + "_patient", "");
                    
                    if (triggerTime > now) {
                        // Reschedule future alarm!
                        Intent receiverIntent = new Intent(context, AlarmReceiver.class);
                        receiverIntent.putExtra("medicineName", medicineName);
                        receiverIntent.putExtra("dosage", dosage);
                        receiverIntent.putExtra("patientName", patientName);
                        
                        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                                context,
                                alarmId,
                                receiverIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        
                        // Exact timing trigger
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            if (alarmManager.canScheduleExactAlarms()) {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                                rescheduledCount++;
                                Log.d(TAG, "✅ Rescheduled exact alarm: " + medicineName + " for " + new java.util.Date(triggerTime).toString());
                            } else {
                                Log.w(TAG, "⚠️ SCHEDULE_EXACT_ALARM permission not granted, scheduling fallback alarm");
                                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                                rescheduledCount++;
                            }
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                            rescheduledCount++;
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                            rescheduledCount++;
                        }
                    } else {
                        // Clean up past/expired alarm from the registry!
                        cleanEditor.remove("alarm_" + alarmId + "_name");
                        cleanEditor.remove("alarm_" + alarmId + "_dosage");
                        cleanEditor.remove("alarm_" + alarmId + "_patient");
                        cleanEditor.remove("alarm_" + alarmId + "_trigger");
                        
                        updatedAlarmIds.remove(idStr);
                        cleanedCount++;
                        Log.d(TAG, "🧹 Purged expired alarm (ID: " + alarmId + ") from boot registry");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to reschedule alarm ID " + idStr + ": " + e.getMessage());
                }
            }
            
            // Commit all cleanup changes
            cleanEditor.putStringSet(KEY_ALL_ALARM_IDS, updatedAlarmIds);
            cleanEditor.apply();
            
            Log.d(TAG, "🎉 Native self-healing complete: " + rescheduledCount + " alarm(s) rescheduled, " + cleanedCount + " expired alarm(s) purged.");
        }
    }
}
