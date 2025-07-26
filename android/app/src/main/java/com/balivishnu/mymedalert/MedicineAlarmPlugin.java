package com.balivishnu.mymedalert;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MedicineAlarm")
public class MedicineAlarmPlugin extends Plugin {

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
            
            // Create intent for AlarmService
            Intent serviceIntent = new Intent(context, AlarmService.class);
            serviceIntent.putExtra("medicineName", medicineName); // Match AlarmService field names
            serviceIntent.putExtra("dosage", dosage);
            serviceIntent.putExtra("patientName", patientName);

            PendingIntent pendingIntent = PendingIntent.getService(
                    context,
                    alarmId,
                    serviceIntent,
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
            
            Intent serviceIntent = new Intent(context, AlarmService.class);
            PendingIntent pendingIntent = PendingIntent.getService(
                    context,
                    alarmId,
                    serviceIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                alarmManager.cancel(pendingIntent);
                
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
}
