package com.balivishnu.mymedalert;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * IMPORTANT: Receives BOOT_COMPLETED broadcast to reschedule alarms after device restart
 * Without this, all alarms are lost when phone restarts
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "🔄 Device boot completed - alarms need to be rescheduled");
            Log.d(TAG, "⚠️ Note: App must be opened at least once to reschedule alarms");
            
            // Send broadcast to notify app that boot completed
            // The JavaScript side should listen for this and reschedule alarms
            Intent broadcastIntent = new Intent("com.balivishnu.mymedalert.BOOT_COMPLETED");
            context.sendBroadcast(broadcastIntent);
            
            Log.d(TAG, "✅ Boot broadcast sent to app");
        }
    }
}
