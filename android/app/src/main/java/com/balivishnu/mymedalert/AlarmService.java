package com.balivishnu.mymedalert;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.Vibrator;
import android.util.Log;
import android.content.IntentFilter;
import androidx.core.app.NotificationCompat;

public class AlarmService extends Service {
    private static final String TAG = "AlarmService";
    private static final String CHANNEL_ID = "MEDICINE_ALARM_CHANNEL";
    private static final int NOTIFICATION_ID = 12345;
    private static final String PREFS_NAME = "AlarmPrefs";
    private static final String KEY_ALARM_ACTIVE = "isAlarmActive";
    private static final String KEY_MEDICINE_NAME = "medicineName";
    private static final String KEY_DOSAGE = "dosage";
    private static final String KEY_PATIENT_NAME = "patientName";
    
    // CRITICAL: Static flag to track if alarm is currently active
    // This is used by MainActivity to check if it should show AlarmActivity
    public static boolean isAlarmActive = false;
    public static String currentMedicineName = "";
    public static String currentDosage = "";
    public static String currentPatientName = "";
    
    // Screen on receiver for lock screen detection
    private ScreenOnReceiver screenOnReceiver;
    
    // Helper methods to persist alarm state using SharedPreferences
    public static void setAlarmActive(Context context, boolean active, String medicineName, String dosage, String patientName) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putBoolean(KEY_ALARM_ACTIVE, active);
        editor.putString(KEY_MEDICINE_NAME, medicineName != null ? medicineName : "");
        editor.putString(KEY_DOSAGE, dosage != null ? dosage : "");
        editor.putString(KEY_PATIENT_NAME, patientName != null ? patientName : "");
        editor.apply();
        
        // Also update static variables
        isAlarmActive = active;
        currentMedicineName = medicineName != null ? medicineName : "";
        currentDosage = dosage != null ? dosage : "";
        currentPatientName = patientName != null ? patientName : "";
        
        Log.d(TAG, "Alarm state saved to SharedPreferences: active=" + active);
    }
    
    public static boolean isAlarmActiveFromPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean active = prefs.getBoolean(KEY_ALARM_ACTIVE, false);
        // Also sync static variables
        if (active) {
            isAlarmActive = true;
            currentMedicineName = prefs.getString(KEY_MEDICINE_NAME, "");
            currentDosage = prefs.getString(KEY_DOSAGE, "");
            currentPatientName = prefs.getString(KEY_PATIENT_NAME, "");
        }
        return active;
    }
    
    public static void clearAlarmState(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
        isAlarmActive = false;
        currentMedicineName = "";
        currentDosage = "";
        currentPatientName = "";
        Log.d(TAG, "Alarm state cleared from SharedPreferences");
    }
    
    private Ringtone ringtone;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private Handler handler;
    private Runnable stopAlarmRunnable;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "AlarmService onCreate");
        
        handler = new Handler(Looper.getMainLooper());
        
        // Create notification channel
        createNotificationChannel();
        
        // Initialize vibrator
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        
        // Acquire wake lock to keep device awake
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "MedicineAlarm::WakeLock"
        );
        
        // CRITICAL: Register ScreenOnReceiver dynamically
        // This catches SCREEN_ON events (even on lock screen) to show alarm
        try {
            screenOnReceiver = new ScreenOnReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
            registerReceiver(screenOnReceiver, filter);
            Log.d(TAG, "✅ ScreenOnReceiver registered successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register ScreenOnReceiver: " + e.getMessage());
        }
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "AlarmService onStartCommand");
        
        if (intent != null) {
            String action = intent.getAction();
            
            // Handle alarm actions
            if ("DISMISS_ALARM".equals(action)) {
                Log.d(TAG, "User dismissed alarm");
                stopAlarm();
                stopSelf();
                return START_NOT_STICKY;
            } else if ("SNOOZE_ALARM".equals(action)) {
                Log.d(TAG, "User snoozed alarm");
                stopAlarm();
                // Snooze for 5 minutes - reschedule alarm
                scheduleSnoozeAlarm();
                stopSelf();
                return START_NOT_STICKY;
            }
            
            String medicineName = intent.getStringExtra("medicineName");
            String dosage = intent.getStringExtra("dosage");
            String patientName = intent.getStringExtra("patientName");
            
            // CRITICAL: Save alarm state to SharedPreferences (persists across process restarts)
            setAlarmActive(this, true, medicineName, dosage, patientName);
            
            // CRITICAL: Start foreground service IMMEDIATELY to prevent crash
            // This MUST be the first operation to avoid Android 8+ crash
            try {
                startForeground(NOTIFICATION_ID, createAlarmNotification(medicineName, dosage, patientName));
                Log.d(TAG, "Foreground service started successfully");
            } catch (Exception e) {
                Log.e(TAG, "Failed to start foreground service: " + e.getMessage());
                // Still try to continue with alarm functionality
            }
            
            // Now acquire wake lock (after foreground service)
            try {
                if (wakeLock != null && !wakeLock.isHeld()) {
                    wakeLock.acquire(65000); // Hold for 65 seconds max
                    Log.d(TAG, "Wake lock acquired");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to acquire wake lock: " + e.getMessage());
            }
            
            // Play alarm sound IMMEDIATELY
            playAlarmSound();
            
            // Start vibration IMMEDIATELY
            startVibration();
            
            // CRITICAL: Launch full-screen alarm activity IMMEDIATELY (no delay)
            // Launch directly to ensure it appears on top even when phone is unlocked
            try {
                Intent alarmActivityIntent = new Intent(this, AlarmActivity.class);
                // CRITICAL FLAGS: These ensure AlarmActivity appears ON TOP of everything
                // Use NEW_TASK | CLEAR_TASK to start fresh in isolated task
                alarmActivityIntent.setFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_CLEAR_TASK
                );
                alarmActivityIntent.putExtra("medicineName", medicineName);
                alarmActivityIntent.putExtra("dosage", dosage);
                alarmActivityIntent.putExtra("patientName", patientName);
                startActivity(alarmActivityIntent);
                Log.d(TAG, "✅ Full-screen alarm activity launched IMMEDIATELY with matching flags");
            } catch (Exception e) {
                Log.e(TAG, "❌ CRITICAL: Failed to launch alarm activity: " + e.getMessage());
                e.printStackTrace();
            }
            
            // Stop alarm after 60 seconds
            stopAlarmRunnable = () -> {
                Log.d(TAG, "Auto-stopping alarm after 60 seconds");
                stopAlarm();
            };
            handler.postDelayed(stopAlarmRunnable, 60000);
        } else {
            Log.w(TAG, "onStartCommand called with null intent");
            // Even with null intent, we should start foreground to prevent crash
            try {
                startForeground(NOTIFICATION_ID, createAlarmNotification("Unknown Medicine", "Unknown Dosage", ""));
            } catch (Exception e) {
                Log.e(TAG, "Failed to start foreground service with default notification: " + e.getMessage());
            }
        }
        
        return START_NOT_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Medicine Alarm Channel",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Critical medicine reminder alarms that wake the device");
                channel.enableLights(true);
                channel.enableVibration(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);
                
                // Set alarm sound with fallbacks
                Uri alarmSound = null;
                try {
                    alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    if (alarmSound == null) {
                        alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                    }
                    if (alarmSound == null) {
                        alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to get default alarm URI: " + e.getMessage());
                }
                
                if (alarmSound != null) {
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                    
                    channel.setSound(alarmSound, audioAttributes);
                }
                
                NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                    Log.d(TAG, "Notification channel created successfully");
                } else {
                    Log.e(TAG, "NotificationManager is null - cannot create channel");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to create notification channel: " + e.getMessage());
                // Channel creation failed, but service should continue
            }
        }
    }
    
    private Notification createAlarmNotification(String medicineName, String dosage, String patientName) {
        try {
            // Create intent for full-screen alarm activity with ALL necessary flags
            Intent alarmActivityIntent = new Intent(this, AlarmActivity.class);
            // CRITICAL: These flags ensure AlarmActivity appears ON TOP of main app when unlocking
            // Removed FLAG_ACTIVITY_NO_HISTORY to prevent activity from disappearing on unlock
            alarmActivityIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TASK
            );
            alarmActivityIntent.putExtra("medicineName", medicineName);
            alarmActivityIntent.putExtra("dosage", dosage);
            alarmActivityIntent.putExtra("patientName", patientName);
            
            // CRITICAL: Use FLAG_MUTABLE for clickable notifications on Android 12+
            // FLAG_IMMUTABLE prevents the intent from being triggered!
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ needs FLAG_MUTABLE for notification actions to work
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            
            // Create unique request code using timestamp to avoid conflicts
            int requestCode = (int) System.currentTimeMillis();
            PendingIntent alarmActivityPendingIntent = PendingIntent.getActivity(
                this, 
                requestCode, 
                alarmActivityIntent, 
                flags
            );
            
            // Create dismiss alarm intent with proper flags
            Intent dismissIntent = new Intent(this, AlarmService.class);
            dismissIntent.setAction("DISMISS_ALARM");
            PendingIntent dismissPendingIntent = PendingIntent.getService(
                this, 
                requestCode + 1, 
                dismissIntent, 
                flags
            );
            
            // Create snooze alarm intent with proper flags
            Intent snoozeIntent = new Intent(this, AlarmService.class);
            snoozeIntent.setAction("SNOOZE_ALARM");
            PendingIntent snoozePendingIntent = PendingIntent.getService(
                this, 
                requestCode + 2, 
                snoozeIntent, 
                flags
            );
            
            // Safe string handling with null checks
            String safeMedicineName = (medicineName != null && !medicineName.isEmpty()) ? medicineName : "Medicine";
            String safeDosage = (dosage != null && !dosage.isEmpty()) ? dosage : "Unknown dosage";
            String safePatientName = (patientName != null && !patientName.isEmpty()) ? patientName : "";
            
            String title = "🚨 MEDICINE ALARM: " + safeMedicineName;
            String content = "Time to take " + safeDosage + 
                            (!safePatientName.isEmpty() ? " for " + safePatientName : "");
            
            // Enhanced notification with more detailed medicine information
            String bigText = "💊 MEDICINE: " + safeMedicineName + "\n" +
                           "💊 DOSAGE: " + safeDosage + "\n" +
                           (!safePatientName.isEmpty() ? "👤 PATIENT: " + safePatientName + "\n" : "") +
                           "⏰ TIME: " + java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT).format(new java.util.Date()) + "\n\n" +
                           "🔔 Tap to dismiss alarm or use buttons below";
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText))
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                // CRITICAL: Make notification launch activity when tapped
                .setContentIntent(alarmActivityPendingIntent)
                .setFullScreenIntent(alarmActivityPendingIntent, true)
                // High priority and visibility settings
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                // Make notification persistent and require user action
                .setOngoing(true)
                .setAutoCancel(false)
                // Visual and audio settings
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setColor(0xFFFF0000)
                .setColorized(true) // Make entire notification red
                .setTicker("Medicine Alarm: " + safeMedicineName)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setUsesChronometer(false)
                .setTimeoutAfter(60000) // Auto-dismiss after 60 seconds if not acted upon
                // Add action buttons
                .addAction(android.R.drawable.ic_delete, "✕ DISMISS", dismissPendingIntent)
                .addAction(android.R.drawable.ic_media_pause, "⏰ SNOOZE 5 MIN", snoozePendingIntent);
            
            Notification notification = builder.build();
            
            // Also show a separate informational notification that persists
            showMedicineInfoNotification(safeMedicineName, safeDosage, safePatientName);
            
            Log.d(TAG, "Enhanced alarm notification created successfully");
            return notification;
            
        } catch (Exception e) {
            Log.e(TAG, "Error creating alarm notification: " + e.getMessage());
            
            // Fallback minimal notification to prevent crash
            try {
                return new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("Medicine Alarm")
                    .setContentText("Time to take your medicine")
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .build();
            } catch (Exception fallbackError) {
                Log.e(TAG, "Even fallback notification failed: " + fallbackError.getMessage());
                // Return absolutely minimal notification
                return new Notification();
            }
        }
    }
    
    /**
     * Shows a separate persistent notification with detailed medicine information
     * This notification stays in the notification tray for user reference
     */
    private void showMedicineInfoNotification(String medicineName, String dosage, String patientName) {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) {
                Log.e(TAG, "NotificationManager is null, cannot show medicine info notification");
                return;
            }
            
            // Create a separate notification channel for medicine info (if not exists)
            String infoChannelId = "MEDICINE_INFO_CHANNEL";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel infoChannel = notificationManager.getNotificationChannel(infoChannelId);
                if (infoChannel == null) {
                    infoChannel = new NotificationChannel(
                        infoChannelId,
                        "Medicine Information",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    infoChannel.setDescription("Persistent medicine reminder information");
                    infoChannel.enableLights(true);
                    infoChannel.setLightColor(android.graphics.Color.BLUE);
                    infoChannel.enableVibration(false); // Info notification shouldn't vibrate
                    infoChannel.setShowBadge(true);
                    notificationManager.createNotificationChannel(infoChannel);
                }
            }
            
            // Create intent to open the main app when notification is tapped
            Intent mainAppIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (mainAppIntent == null) {
                mainAppIntent = new Intent();
            }
            mainAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent mainAppPendingIntent = PendingIntent.getActivity(this, 3, mainAppIntent, flags);
            
            // Create the medicine information notification
            String infoTitle = "💊 " + medicineName + " - Medicine Reminder";
            String infoContent = "Dosage: " + dosage + (!patientName.isEmpty() ? " for " + patientName : "");
            
            String detailedInfo = "📋 MEDICINE DETAILS:\n\n" +
                                "💊 Medicine: " + medicineName + "\n" +
                                "💊 Dosage: " + dosage + "\n" +
                                (!patientName.isEmpty() ? "👤 Patient: " + patientName + "\n" : "") +
                                "⏰ Reminder Time: " + java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT).format(new java.util.Date()) + "\n\n" +
                                "ℹ️ This is your medicine reminder. Please take your medication as prescribed.\n" +
                                "📱 Tap to open MyMedAlert app for more details.";
            
            NotificationCompat.Builder infoBuilder = new NotificationCompat.Builder(this, infoChannelId)
                .setContentTitle(infoTitle)
                .setContentText(infoContent)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(detailedInfo))
                .setSmallIcon(android.R.drawable.ic_dialog_info) // Info icon instead of alert
                .setContentIntent(mainAppPendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(false) // This can be dismissed by user
                .setAutoCancel(true) // Dismiss when tapped
                .setColor(0xFF0066CC) // Blue color for information
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setTicker("Medicine Info: " + medicineName);
            
            // Show the information notification with a different ID
            final int INFO_NOTIFICATION_ID = NOTIFICATION_ID + 1000;
            notificationManager.notify(INFO_NOTIFICATION_ID, infoBuilder.build());
            
            Log.d(TAG, "Medicine info notification shown for: " + medicineName);
            
        } catch (Exception e) {
            Log.e(TAG, "Error showing medicine info notification: " + e.getMessage());
        }
    }
    
    private void playAlarmSound() {
        try {
            // Stop any existing ringtone first
            if (ringtone != null && ringtone.isPlaying()) {
                ringtone.stop();
                ringtone = null;
            }
            
            // Get alarm sound URI with multiple fallbacks
            Uri alarmUri = null;
            try {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) {
                    Log.w(TAG, "No alarm URI found, trying notification URI");
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
                if (alarmUri == null) {
                    Log.w(TAG, "No notification URI found, trying ringtone URI");
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting alarm URI: " + e.getMessage());
            }
            
            if (alarmUri != null) {
                ringtone = RingtoneManager.getRingtone(this, alarmUri);
                if (ringtone != null) {
                    // Set audio attributes for alarm (API 28+)
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build();
                            ringtone.setAudioAttributes(audioAttributes);
                        } else {
                            // Fallback for older Android versions
                            ringtone.setStreamType(AudioManager.STREAM_ALARM);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to set audio attributes: " + e.getMessage());
                    }
                    
                    ringtone.play();
                    Log.d(TAG, "Alarm sound started successfully");
                } else {
                    Log.w(TAG, "Failed to create ringtone from URI");
                }
            } else {
                Log.w(TAG, "No alarm URI available - sound will not play");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error playing alarm sound: " + e.getMessage());
            // Don't let audio failure crash the service
        }
    }
    
    private void startVibration() {
        try {
            if (vibrator != null && vibrator.hasVibrator()) {
                // Create strong vibration pattern: wait 0ms, vibrate 1000ms, pause 500ms, repeat
                long[] pattern = {0, 1000, 500, 1000, 500, 1000};
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build();
                        vibrator.vibrate(pattern, 0, audioAttributes);
                    } else {
                        // Fallback for older Android versions
                        vibrator.vibrate(pattern, 0);
                    }
                    Log.d(TAG, "Vibration started successfully");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start vibration: " + e.getMessage());
                }
            } else {
                Log.w(TAG, "Vibrator not available or no vibrator hardware");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in startVibration: " + e.getMessage());
            // Don't let vibration failure crash the service
        }
    }
    
    private void scheduleSnoozeAlarm() {
        try {
            Log.d(TAG, "Scheduling snooze alarm for 5 minutes");
            
            // Get current alarm details from the intent (we'll need to store these globally)
            // For now, we'll create a simple snooze notification
            Intent snoozeIntent = new Intent(this, AlarmService.class);
            snoozeIntent.putExtra("medicineName", "Snoozed Medicine");
            snoozeIntent.putExtra("dosage", "Previous Dose");
            snoozeIntent.putExtra("patientName", "");
            
            // Use AlarmManager to schedule snooze
            android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                long snoozeTime = System.currentTimeMillis() + (5 * 60 * 1000); // 5 minutes
                
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                
                PendingIntent snoozePendingIntent = PendingIntent.getService(this, 999, snoozeIntent, flags);
                
                // Use setExactAndAllowWhileIdle for Android 6+ compatibility
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
                } else {
                    alarmManager.setExact(android.app.AlarmManager.RTC_WAKEUP, snoozeTime, snoozePendingIntent);
                }
                
                Log.d(TAG, "Snooze alarm scheduled successfully for 5 minutes");
            } else {
                Log.e(TAG, "AlarmManager not available for snooze");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling snooze alarm: " + e.getMessage());
        }
    }
    
    private void stopAlarm() {
        Log.d(TAG, "Stopping alarm service");
        
        // CRITICAL: Clear alarm state from SharedPreferences (persists across process restarts)
        clearAlarmState(this);
        
        // Remove any pending stop callback
        try {
            if (stopAlarmRunnable != null && handler != null) {
                handler.removeCallbacks(stopAlarmRunnable);
                stopAlarmRunnable = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error removing stop callback: " + e.getMessage());
        }
        
        // Stop ringtone
        try {
            if (ringtone != null) {
                if (ringtone.isPlaying()) {
                    ringtone.stop();
                }
                ringtone = null;
                Log.d(TAG, "Ringtone stopped");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping ringtone: " + e.getMessage());
        }
        
        // Stop vibration
        try {
            if (vibrator != null) {
                vibrator.cancel();
                Log.d(TAG, "Vibration stopped");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping vibration: " + e.getMessage());
        }
        
        // Release wake lock
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "Wake lock released");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing wake lock: " + e.getMessage());
        }
        
        // Stop foreground service
        try {
            stopForeground(true);
            Log.d(TAG, "Foreground service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping foreground service: " + e.getMessage());
        }
        
        // Stop the service itself
        try {
            stopSelf();
            Log.d(TAG, "Service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping service: " + e.getMessage());
        }
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "AlarmService onDestroy");
        
        // Unregister ScreenOnReceiver
        try {
            if (screenOnReceiver != null) {
                unregisterReceiver(screenOnReceiver);
                screenOnReceiver = null;
                Log.d(TAG, "ScreenOnReceiver unregistered");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering ScreenOnReceiver: " + e.getMessage());
        }
        
        try {
            stopAlarm();
        } catch (Exception e) {
            Log.e(TAG, "Error in onDestroy: " + e.getMessage());
        }
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
