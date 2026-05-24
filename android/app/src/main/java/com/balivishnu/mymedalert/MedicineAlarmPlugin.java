package com.balivishnu.mymedalert;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "MedicineAlarm")
public class MedicineAlarmPlugin extends Plugin {
    private static final String TAG = "MedicineAlarmPlugin";
    private static final String ALARM_PREFS_NAME = "ScheduledAlarmsRegistry";
    private static final String KEY_ALL_ALARM_IDS = "allAlarmIds";

    // Native Helper: Save alarm info to native registry for reboot resilience
    public static void saveAlarmToRegistry(Context context, int alarmId, String medicineName, String dosage, String patientName, long triggerTime) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ALARM_PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Add alarm ID to the set of all active alarms
            Set<String> alarmIds = new HashSet<>(prefs.getStringSet(KEY_ALL_ALARM_IDS, new HashSet<>()));
            alarmIds.add(String.valueOf(alarmId));
            editor.putStringSet(KEY_ALL_ALARM_IDS, alarmIds);
            
            // Save individual properties
            editor.putString("alarm_" + alarmId + "_name", medicineName);
            editor.putString("alarm_" + alarmId + "_dosage", dosage);
            editor.putString("alarm_" + alarmId + "_patient", patientName);
            editor.putLong("alarm_" + alarmId + "_trigger", triggerTime);
            
            editor.apply();
            Log.d(TAG, "💾 Alarm " + alarmId + " successfully written to registry: " + medicineName + " at " + triggerTime);
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to save alarm to registry: " + e.getMessage());
        }
    }

    // Native Helper: Remove alarm info from native registry
    public static void removeAlarmFromRegistry(Context context, int alarmId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(ALARM_PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Remove alarm ID from the set
            Set<String> alarmIds = new HashSet<>(prefs.getStringSet(KEY_ALL_ALARM_IDS, new HashSet<>()));
            alarmIds.remove(String.valueOf(alarmId));
            editor.putStringSet(KEY_ALL_ALARM_IDS, alarmIds);
            
            // Remove individual properties
            editor.remove("alarm_" + alarmId + "_name");
            editor.remove("alarm_" + alarmId + "_dosage");
            editor.remove("alarm_" + alarmId + "_patient");
            editor.remove("alarm_" + alarmId + "_trigger");
            
            editor.apply();
            Log.d(TAG, "🗑️ Alarm " + alarmId + " successfully removed from registry");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to remove alarm from registry: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        try {
            String medicineName = call.getString("medicineName", "Medicine");
            String dosage = call.getString("dosage", "1 tablet");
            String patientName = call.getString("patientName", "");
            Long triggerTime = call.getLong("triggerTime");
            Integer alarmId = call.getInt("alarmId", 1);

            if (triggerTime == null) {
                call.reject("Trigger time is required");
                return;
            }

            Context context = getContext();
            
            // CRITICAL FIX: Create intent for AlarmReceiver (BroadcastReceiver)
            // This is the ONLY way alarms work when app is closed!
            Intent receiverIntent = new Intent(context, AlarmReceiver.class);
            receiverIntent.putExtra("medicineName", medicineName);
            receiverIntent.putExtra("dosage", dosage);
            receiverIntent.putExtra("patientName", patientName);

            // CRITICAL: Use getBroadcast instead of getService
            // This allows alarm to fire even when app is completely closed
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    alarmId,
                    receiverIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager != null) {
                // Use setExactAndAllowWhileIdle for exact timing and to work in Doze mode
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                }
                
                // CRITICAL CHECKPOINT: Save alarm details to native registry to survive reboots!
                saveAlarmToRegistry(context, alarmId, medicineName, dosage, patientName, triggerTime);
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Alarm scheduled successfully");
                result.put("alarmId", alarmId);
                result.put("triggerTime", triggerTime);
                call.resolve(result);
            } else {
                call.reject("AlarmManager not available");
            }
        } catch (Exception e) {
            call.reject("Error scheduling alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        try {
            Integer alarmId = call.getInt("alarmId");
            
            if (alarmId == null) {
                call.reject("Alarm ID is required");
                return;
            }

            Context context = getContext();
            
            // CRITICAL FIX: Create intent for AlarmReceiver (BroadcastReceiver)
            Intent receiverIntent = new Intent(context, AlarmReceiver.class);
            
            // CRITICAL: Use getBroadcast instead of getService for cancellation
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    alarmId,
                    receiverIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                alarmManager.cancel(pendingIntent);
                
                // CRITICAL CHECKPOINT: Remove from native registry!
                removeAlarmFromRegistry(context, alarmId);
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Alarm cancelled successfully");
                result.put("alarmId", alarmId);
                call.resolve(result);
            } else {
                call.reject("AlarmManager not available");
            }
        } catch (Exception e) {
            call.reject("Error cancelling alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkExactAlarmPermission(PluginCall call) {
        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            
            JSObject result = new JSObject();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ requires explicit permission
                boolean canScheduleExactAlarms = alarmManager != null && alarmManager.canScheduleExactAlarms();
                result.put("hasPermission", canScheduleExactAlarms);
                result.put("requiresPermission", true);
                result.put("androidVersion", Build.VERSION.SDK_INT);
            } else {
                // Pre-Android 12 doesn't need this permission
                result.put("hasPermission", true);
                result.put("requiresPermission", false);
                result.put("androidVersion", Build.VERSION.SDK_INT);
            }
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error checking exact alarm permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Context context = getContext();
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                
                if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                    // Open the exact alarm permission settings
                    Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(android.net.Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Opened exact alarm permission settings");
                    call.resolve(result);
                } else {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Exact alarm permission already granted");
                    call.resolve(result);
                }
            } else {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Exact alarm permission not required on this Android version");
                call.resolve(result);
            }
        } catch (Exception e) {
            call.reject("Error requesting exact alarm permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isBatteryOptimizationIgnored(PluginCall call) {
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean ignored = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                ignored = pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
            } else {
                ignored = true; // Pre-M devices don't have battery optimization categories
            }
            JSObject result = new JSObject();
            result.put("isIgnored", ignored);
            call.resolve(result);
            Log.d(TAG, "isBatteryOptimizationIgnored check: " + ignored);
        } catch (Exception e) {
            call.reject("Error checking battery optimization status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(android.net.Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Requested ignore battery optimization");
                    call.resolve(result);
                } else {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Battery optimization already ignored");
                    call.resolve(result);
                }
            } else {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Battery optimization ignore not required on this Android version");
                call.resolve(result);
            }
        } catch (Exception e) {
            call.reject("Error requesting ignore battery optimization: " + e.getMessage());
        }
    }
}
