package com.balivishnu.mymedalert;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class AlarmActivity extends Activity {
    private static final String TAG = "AlarmActivity";
    private Handler handler;
    private Runnable bringToFrontRunnable;
    private boolean isActive = true;
    private BroadcastReceiver userPresentReceiver;
    private BroadcastReceiver screenOnReceiver;
    private PowerManager.WakeLock screenWakeLock;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "🚨🚨🚨 AlarmActivity.onCreate() - ACTIVITY STARTED!");
        Log.d(TAG, "Intent extras: " + getIntent().getExtras());
        
        // CRITICAL: Acquire a FULL wake lock to turn on screen and keep it on
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            screenWakeLock = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "MyMedAlert:AlarmScreenWakeLock"
            );
            screenWakeLock.acquire(120000); // Hold for 2 minutes max
            Log.d(TAG, "✅ Screen wake lock acquired - screen should turn on");
        } catch (Exception e) {
            Log.e(TAG, "Failed to acquire screen wake lock: " + e.getMessage());
        }
        
        // CRITICAL: Set ALL window flags BEFORE setContentView
        // This ensures the activity appears OVER the lock screen like native alarm
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );
        
        // CRITICAL: For Android O and above, use the new API methods
        // These are REQUIRED for showing over lock screen on modern Android
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            Log.d(TAG, "✅ setShowWhenLocked(true) and setTurnScreenOn(true) called");
        }
        
        // Request to dismiss keyguard for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                    @Override
                    public void onDismissSucceeded() {
                        Log.d(TAG, "✅ Keyguard dismissed successfully");
                    }
                    
                    @Override
                    public void onDismissError() {
                        Log.e(TAG, "❌ Keyguard dismiss error");
                    }
                    
                    @Override
                    public void onDismissCancelled() {
                        Log.w(TAG, "⚠️ Keyguard dismiss cancelled");
                    }
                });
            }
        }
        
        // Register receiver for user unlock event to bring alarm to front
        userPresentReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
                    Log.d(TAG, "🔓 User unlocked device - forcing AlarmActivity to front");
                    bringActivityToFront();
                }
            }
        };
        registerReceiver(userPresentReceiver, new IntentFilter(Intent.ACTION_USER_PRESENT));
        
        // Register receiver for screen on event (even while locked)
        screenOnReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_SCREEN_ON.equals(intent.getAction())) {
                    Log.d(TAG, "📱 Screen turned on - bringing AlarmActivity to front");
                    bringActivityToFront();
                }
            }
        };
        registerReceiver(screenOnReceiver, new IntentFilter(Intent.ACTION_SCREEN_ON));
        
        // Hide system UI for true full-screen experience
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
        
        // Create a simple layout programmatically
        setContentView(createAlarmLayout());
        
        // Get alarm details from intent
        Intent intent = getIntent();
        String medicineName = intent.getStringExtra("medicineName");
        String dosage = intent.getStringExtra("dosage");
        String patientName = intent.getStringExtra("patientName");
        
        // Safe string handling with defaults
        String safeMedicineName = (medicineName != null && !medicineName.isEmpty()) ? medicineName : "Medicine";
        String safeDosage = (dosage != null && !dosage.isEmpty()) ? dosage : "Unknown dosage";
        String safePatientName = (patientName != null && !patientName.isEmpty()) ? patientName : "";
        
        // Update the display with enhanced medicine information
        TextView titleText = findViewById(android.R.id.text1);
        TextView messageText = findViewById(android.R.id.text2);
        
        if (titleText != null) {
            titleText.setText("🚨 MEDICINE ALARM 🚨\n💊 " + safeMedicineName);
        }
        
        if (messageText != null) {
            String message = "💊 DOSAGE: " + safeDosage + "\n";
            if (!safePatientName.isEmpty()) {
                message += "👤 PATIENT: " + safePatientName + "\n";
            }
            message += "⏰ TIME: " + java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT).format(new java.util.Date()) + "\n\n";
            message += "🔔 Please take your medicine now!";
            messageText.setText(message);
        }
        
        // Set up dismiss button
        Button dismissButton = findViewById(android.R.id.button1);
        if (dismissButton != null) {
            dismissButton.setOnClickListener(v -> dismissAlarm());
        }
        
        // Set up snooze button
        Button snoozeButton = findViewById(android.R.id.button2);
        if (snoozeButton != null) {
            snoozeButton.setOnClickListener(v -> snoozeAlarm());
        }
        
        // CRITICAL: Set up handler to periodically bring this activity to front
        // This ensures we stay visible even after phone unlock
        handler = new Handler(Looper.getMainLooper());
        bringToFrontRunnable = new Runnable() {
            @Override
            public void run() {
                // Check SharedPreferences for alarm state (more reliable than static variable)
                if (isActive && AlarmService.isAlarmActiveFromPrefs(AlarmActivity.this)) {
                    Log.d(TAG, "📱 Checking if AlarmActivity needs to come to front");
                    
                    // Re-apply window flags
                    getWindow().addFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    );
                    
                    // Bring the window's decor view to front
                    getWindow().getDecorView().bringToFront();
                    
                    // Schedule next check
                    handler.postDelayed(this, 500); // Check every 500ms
                }
            }
        };
        // Start periodic checking
        handler.postDelayed(bringToFrontRunnable, 500);
    }
    
    /**
     * CRITICAL: Helper method to bring this activity to the front
     * This is called when screen turns on or user unlocks device
     */
    private void bringActivityToFront() {
        if (!isActive) return;
        
        try {
            // Re-apply all window flags
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
            
            // Bring window to front
            getWindow().getDecorView().bringToFront();
            
            // Also try to reorder activity to front
            Intent bringToFrontIntent = new Intent(this, AlarmActivity.class);
            bringToFrontIntent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(bringToFrontIntent);
            
            Log.d(TAG, "✅ Activity brought to front");
        } catch (Exception e) {
            Log.e(TAG, "Error bringing activity to front: " + e.getMessage());
        }
    }
    
    private View createAlarmLayout() {
        // Create a simple vertical layout with text and buttons
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(50, 100, 50, 100);
        layout.setBackgroundColor(0xFFFF0000); // Bright red background for alarm
        layout.setGravity(android.view.Gravity.CENTER);
        
        // Ensure layout fills entire screen
        layout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT
        ));
        
        // Title text - LARGE and BOLD
        TextView titleText = new TextView(this);
        titleText.setId(android.R.id.text1);
        titleText.setTextSize(32); // Larger text
        titleText.setTextColor(0xFFFFFFFF);
        titleText.setGravity(android.view.Gravity.CENTER);
        titleText.setPadding(20, 40, 20, 40);
        titleText.setTypeface(null, android.graphics.Typeface.BOLD); // Make it bold
        layout.addView(titleText);
        
        // Message text (medicine details) - LARGER and MORE READABLE
        TextView messageText = new TextView(this);
        messageText.setId(android.R.id.text2);
        messageText.setTextSize(20); // Larger text
        messageText.setTextColor(0xFFFFFFFF);
        messageText.setGravity(android.view.Gravity.CENTER);
        messageText.setPadding(30, 30, 30, 60);
        messageText.setLineSpacing(10, 1.3f); // More line spacing for better readability
        messageText.setTypeface(null, android.graphics.Typeface.BOLD); // Make it bold
        layout.addView(messageText);
        
        // Dismiss button - LARGE and PROMINENT
        Button dismissButton = new Button(this);
        dismissButton.setId(android.R.id.button1);
        dismissButton.setText("✅ DISMISS ALARM");
        dismissButton.setTextSize(24); // Much larger text
        dismissButton.setBackgroundColor(0xFF00CC00); // Brighter green
        dismissButton.setTextColor(0xFFFFFFFF);
        dismissButton.setPadding(50, 50, 50, 50); // Larger padding
        dismissButton.setTypeface(null, android.graphics.Typeface.BOLD); // Bold text
        dismissButton.setAllCaps(true);
        android.widget.LinearLayout.LayoutParams dismissParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            250 // Fixed height of 250dp for bigger button
        );
        dismissParams.setMargins(40, 30, 40, 20);
        layout.addView(dismissButton, dismissParams);
        
        // Snooze button - LARGE and PROMINENT
        Button snoozeButton = new Button(this);
        snoozeButton.setId(android.R.id.button2);
        snoozeButton.setText("⏰ SNOOZE 5 MINUTES");
        snoozeButton.setTextSize(24); // Much larger text
        snoozeButton.setBackgroundColor(0xFF0099FF); // Brighter blue
        snoozeButton.setTextColor(0xFFFFFFFF);
        snoozeButton.setPadding(50, 50, 50, 50); // Larger padding
        snoozeButton.setTypeface(null, android.graphics.Typeface.BOLD); // Bold text
        snoozeButton.setAllCaps(true);
        android.widget.LinearLayout.LayoutParams snoozeParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            250 // Fixed height of 250dp for bigger button
        );
        snoozeParams.setMargins(40, 20, 40, 30);
        layout.addView(snoozeButton, snoozeParams);
        
        return layout;
    }
    
    private void dismissAlarm() {
        Log.d(TAG, "👆 User clicked DISMISS button");
        
        // Stop the periodic handler
        isActive = false;
        if (handler != null && bringToFrontRunnable != null) {
            handler.removeCallbacks(bringToFrontRunnable);
        }
        
        // Stop the alarm service
        Intent stopIntent = new Intent(this, AlarmService.class);
        stopIntent.setAction("DISMISS_ALARM");
        startService(stopIntent);
        
        Log.d(TAG, "✅ Alarm dismissed, closing activity");
        // Close this activity
        finish();
    }
    
    private void snoozeAlarm() {
        Log.d(TAG, "👆 User clicked SNOOZE button");
        
        // Stop the periodic handler
        isActive = false;
        if (handler != null && bringToFrontRunnable != null) {
            handler.removeCallbacks(bringToFrontRunnable);
        }
        
        // Snooze the alarm
        Intent snoozeIntent = new Intent(this, AlarmService.class);
        snoozeIntent.setAction("SNOOZE_ALARM");
        startService(snoozeIntent);
        
        Log.d(TAG, "⏰ Alarm snoozed for 5 minutes, closing activity");
        // Close this activity
        finish();
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button from dismissing alarm - user must use dismiss button
        // Do nothing
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "📱 AlarmActivity.onResume() - Activity resumed (phone unlocked?)");
        
        // CRITICAL: Re-apply all window flags when activity resumes
        // This is essential when phone is unlocked and main app tries to take over
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );
        
        // Ensure full-screen immersive mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
        
        Log.d(TAG, "✅ All window flags re-applied in onResume");
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle new intent if activity is already running
        setIntent(intent);
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            Log.d(TAG, "🔍 AlarmActivity gained window focus");
            // Re-apply immersive mode when we gain focus
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                );
            }
        } else {
            Log.d(TAG, "⚠️ AlarmActivity LOST window focus - will try to regain it");
            // When we lose focus (e.g., another activity comes to front), try to bring back
            // Check SharedPreferences for alarm state (more reliable)
            if (isActive && AlarmService.isAlarmActiveFromPrefs(this)) {
                // Schedule bringing to front after a short delay
                if (handler != null) {
                    handler.postDelayed(() -> {
                        if (isActive && AlarmService.isAlarmActiveFromPrefs(AlarmActivity.this)) {
                            Log.d(TAG, "🔄 Attempting to bring AlarmActivity back to front");
                            Intent intent = new Intent(AlarmActivity.this, AlarmActivity.class);
                            intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                            startActivity(intent);
                        }
                    }, 300);
                }
            }
        }
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        
        // Clean up - set inactive first
        isActive = false;
        
        // Unregister userPresentReceiver
        if (userPresentReceiver != null) {
            try {
                unregisterReceiver(userPresentReceiver);
                userPresentReceiver = null;
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering userPresentReceiver: " + e.getMessage());
            }
        }
        
        // Unregister screenOnReceiver
        if (screenOnReceiver != null) {
            try {
                unregisterReceiver(screenOnReceiver);
                screenOnReceiver = null;
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering screenOnReceiver: " + e.getMessage());
            }
        }
        
        // Release screen wake lock
        if (screenWakeLock != null && screenWakeLock.isHeld()) {
            try {
                screenWakeLock.release();
                screenWakeLock = null;
                Log.d(TAG, "Screen wake lock released");
            } catch (Exception e) {
                Log.e(TAG, "Error releasing screen wake lock: " + e.getMessage());
            }
        }
        
        // Clean up handler
        if (handler != null && bringToFrontRunnable != null) {
            handler.removeCallbacks(bringToFrontRunnable);
        }
        
        Log.d(TAG, "🔴 AlarmActivity destroyed");
    }
}
