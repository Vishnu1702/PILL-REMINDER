package com.balivishnu.mymedalert;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class AlarmActivity extends Activity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Make this activity show over lock screen and turn screen on
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
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
    }
    
    private View createAlarmLayout() {
        // Create a simple vertical layout with text and buttons
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(50, 100, 50, 100);
        layout.setBackgroundColor(0xFFFF0000); // Red background for alarm
        
        // Title text
        TextView titleText = new TextView(this);
        titleText.setId(android.R.id.text1);
        titleText.setTextSize(24);
        titleText.setTextColor(0xFFFFFFFF);
        titleText.setGravity(android.view.Gravity.CENTER);
        titleText.setPadding(20, 20, 20, 40);
        layout.addView(titleText);
        
        // Message text (medicine details)
        TextView messageText = new TextView(this);
        messageText.setId(android.R.id.text2);
        messageText.setTextSize(16);
        messageText.setTextColor(0xFFFFFFFF);
        messageText.setGravity(android.view.Gravity.CENTER);
        messageText.setPadding(20, 20, 20, 50);
        messageText.setLineSpacing(5, 1.2f); // Add line spacing for better readability
        layout.addView(messageText);
        
        // Dismiss button
        Button dismissButton = new Button(this);
        dismissButton.setId(android.R.id.button1);
        dismissButton.setText("DISMISS ALARM ✕");
        dismissButton.setTextSize(18);
        dismissButton.setBackgroundColor(0xFF00AA00);
        dismissButton.setTextColor(0xFFFFFFFF);
        dismissButton.setPadding(40, 30, 40, 30);
        android.widget.LinearLayout.LayoutParams dismissParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        dismissParams.setMargins(20, 20, 20, 10);
        layout.addView(dismissButton, dismissParams);
        
        // Snooze button
        Button snoozeButton = new Button(this);
        snoozeButton.setId(android.R.id.button2);
        snoozeButton.setText("SNOOZE 5 MIN ⏰");
        snoozeButton.setTextSize(18);
        snoozeButton.setBackgroundColor(0xFF0077AA);
        snoozeButton.setTextColor(0xFFFFFFFF);
        snoozeButton.setPadding(40, 30, 40, 30);
        android.widget.LinearLayout.LayoutParams snoozeParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        snoozeParams.setMargins(20, 10, 20, 20);
        layout.addView(snoozeButton, snoozeParams);
        
        return layout;
    }
    
    private void dismissAlarm() {
        // Stop the alarm service
        Intent stopIntent = new Intent(this, AlarmService.class);
        stopIntent.setAction("DISMISS_ALARM");
        startService(stopIntent);
        
        // Close this activity
        finish();
    }
    
    private void snoozeAlarm() {
        // Snooze the alarm
        Intent snoozeIntent = new Intent(this, AlarmService.class);
        snoozeIntent.setAction("SNOOZE_ALARM");
        startService(snoozeIntent);
        
        // Close this activity
        finish();
    }
    
    @Override
    public void onBackPressed() {
        // Prevent back button from dismissing alarm - user must use dismiss button
        // Do nothing
    }
}
