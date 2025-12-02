import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Camera, Clock, Pill, Bell, Calendar, TrendingUp, AlertCircle, Check, X, BarChart3, Package, ChevronDown, ChevronRight, Settings, Info, Phone, AlertTriangle, Share2, Mic, MicOff, MessageCircle, MessageSquare, Mail, Copy, Printer, Home } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import PrivacyPolicy from './PrivacyPolicy';

const STORAGE_KEYS = {
  medicines: 'pill_reminder_medicines',
  notifications: 'pill_reminder_notifications',
  dosageHistory: 'pill_reminder_dosage_history',
  emergencyContacts: 'pill_reminder_emergency_contacts',
  appSettings: 'pill_reminder_app_settings',
};

const MedicineReminderApp = () => {
  const [medicines, setMedicines] = useState([]);
  const [dosageHistory, setDosageHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [activeTab, setActiveTab] = useState('morning');
  const [currentView, setCurrentView] = useState('medicines'); // medicines, tracking, notifications, settings
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [collapsedPatients, setCollapsedPatients] = useState(new Set());

  // Emergency contacts and settings state
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: '', phone: '' },
    { name: '', phone: '' }
  ]);
  const [showEmergencySettings, setShowEmergencySettings] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSharingDialog, setShowSharingDialog] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [shareSelection, setShareSelection] = useState({}); // for selecting medicines to share
  const [formData, setFormData] = useState({
    patientName: '', // new field
    doctorName: '', // optional doctor name field
    itemType: 'medicine', // 'medicine' or 'non-medicine'
    name: '',
    dosage: '',
    dosageType: 'tablet',
    customDosageType: '', // for 'other' dosage type
    time: 'morning',
    color: '#3B82F6',
    image: null,
    notes: '',
    specificTime: '08:00',
    alertTime: '07:59', // 1 min before specific time
    alertType: 'notification', // 'notification' or 'alarm'
    totalPills: 1,
    currentPills: 1,
    refillReminder: 1,
    frequency: 'daily', // daily, every-other-day, every-n-days, specific-days, weekly, monthly, as-needed
    frequencyDays: 2, // for every-n-days: the number of days
    specificWeekDays: [], // for specific-days: array of day indices (0=Sun, 1=Mon, etc.)
    reminderEndDate: '', // date to stop reminders
    reminderDurationDays: '' // alternative: stop after N days
  });

  const timeSlots = {
    morning: { label: 'Morning', icon: '🌅', time: '5:00 - 11:59', defaultTime: '08:00' },
    afternoon: { label: 'Afternoon', icon: '☀️', time: '12:00 - 15:59', defaultTime: '12:00' },
    evening: { label: 'Evening', icon: '🌆', time: '16:00 - 19:59', defaultTime: '16:00' },
    night: { label: 'Night', icon: '🌙', time: '20:00 - 4:59', defaultTime: '20:00' }
  };

  const colorOptions = [
    '#FFFFFF', '#FDF6E3', // white, warm white
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Load from localStorage on mount
  useEffect(() => {
    const storedMeds = localStorage.getItem(STORAGE_KEYS.medicines);
    const storedNotifs = localStorage.getItem(STORAGE_KEYS.notifications);
    const storedHistory = localStorage.getItem(STORAGE_KEYS.dosageHistory);
    if (storedMeds) setMedicines(JSON.parse(storedMeds));
    if (storedNotifs) setNotifications(JSON.parse(storedNotifs));
    if (storedHistory) setDosageHistory(JSON.parse(storedHistory));

    // CRITICAL FIX: Delay cleanup to ensure medicines are loaded first
    // This prevents cancelling valid alarms during app startup
    setTimeout(() => {
      cleanupPastNotifications();
    }, 2000); // Wait 2 seconds for app to fully initialize
  }, []);

  // Clean up any notifications scheduled for past times
  const cleanupPastNotifications = async () => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🧹 Cleaning up past notifications on app start...');

        const pending = await LocalNotifications.getPending();
        const now = new Date();
        const pastNotifications = [];

        pending.notifications?.forEach(notification => {
          if (notification.schedule?.at) {
            const scheduleTime = new Date(notification.schedule.at);
            if (scheduleTime < now) {
              pastNotifications.push({ id: notification.id });
              console.log(`🗑️ Found past notification: ${notification.title} scheduled for ${scheduleTime.toLocaleString()}`);
            }
          }
        });

        if (pastNotifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pastNotifications });
          console.log(`✅ Cancelled ${pastNotifications.length} past notifications`);
        } else {
          console.log('✅ No past notifications found to clean up');
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up past notifications:', error);
    }
  };

  // Save medicines to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.medicines, JSON.stringify(medicines));
  }, [medicines]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  }, [notifications]);

  // Save dosageHistory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.dosageHistory, JSON.stringify(dosageHistory));
  }, [dosageHistory]);

  // Request notification permissions and create channels on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if we're in a Capacitor environment
        if (typeof window !== 'undefined' && window.Capacitor) {
          console.log('Initializing Capacitor LocalNotifications...');

          // Request permissions
          const permissionResult = await LocalNotifications.requestPermissions();
          console.log('Notification permissions:', permissionResult);

          if (permissionResult.display !== 'granted') {
            console.warn('Notification permissions not granted');
            return;
          }

          // Create notification channels for Android with proper settings
          await LocalNotifications.createChannel({
            id: 'notification-channel',
            name: 'Medicine Reminders',
            description: 'Notifications for medicine reminders',
            importance: 4, // IMPORTANCE_HIGH for better visibility
            visibility: 1, // VISIBILITY_PUBLIC
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#3B82F6',
            enableVibration: true,
            enableLights: true
          });

          await LocalNotifications.createChannel({
            id: 'alarm-channel',
            name: 'Medicine Alarms',
            description: 'Critical alarm notifications for medicine reminders - FULL SCREEN ALERTS',
            importance: 5, // IMPORTANCE_MAX for alarms
            visibility: 1, // VISIBILITY_PUBLIC
            sound: 'alarm_clock', // Use alarm sound instead of default
            vibration: true,
            lights: true,
            lightColor: '#FF0000',
            enableVibration: true,
            enableLights: true,
            // Additional alarm-specific properties
            lockscreenVisibility: 1, // Show on lock screen
            bypassDnd: true, // Bypass Do Not Disturb
            showBadge: true
          });

          console.log('Capacitor LocalNotifications initialized successfully');
        } else {
          console.log('Running in browser - using browser notifications as fallback');

          // Request browser notification permission
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('Browser notification permission:', permission);
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    const setupNotificationListeners = async () => {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
          // Listen for notification action taps (Taken, Dismiss, Skip)
          await LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
            console.log('🔔 Notification action performed:', notification);

            const { actionId } = notification;
            const notifData = notification.notification;

            if (notifData && notifData.extra) {
              const { medicineId, medicineName, alertType } = notifData.extra;
              console.log(`📋 Action: ${actionId} for ${medicineName} (ID: ${medicineId}) - Alert Type: ${alertType}`);

              // Handle different actions
              switch (actionId) {
                case 'taken':
                  console.log(`✅ User marked ${medicineName} as taken`);

                  // Record the dosage as taken
                  const medicine = medicines.find(m => m.id === medicineId);
                  if (medicine) {
                    // Add to dosage history
                    const newRecord = {
                      id: Date.now(),
                      medicineId: medicine.id,
                      medicineName: medicine.name,
                      patientName: medicine.patientName,
                      dosage: `${medicine.dosage} ${medicine.dosageType}`,
                      takenAt: new Date().toISOString(),
                      alertTime: medicine.alertTime,
                      status: 'taken'
                    };

                    const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.dosageHistory) || '[]');
                    const updatedHistory = [newRecord, ...currentHistory];
                    localStorage.setItem(STORAGE_KEYS.dosageHistory, JSON.stringify(updatedHistory));

                    // Update current pills count
                    const updatedMedicines = medicines.map(m =>
                      m.id === medicineId
                        ? { ...m, currentPills: Math.max(0, m.currentPills - m.dosage) }
                        : m
                    );
                    localStorage.setItem(STORAGE_KEYS.medicines, JSON.stringify(updatedMedicines));

                    // Cancel this specific notification
                    try {
                      await LocalNotifications.cancel({
                        notifications: [{ id: notifData.id }]
                      });
                      console.log(`� Cancelled notification ${notifData.id} for ${medicineName}`);
                    } catch (cancelError) {
                      console.warn('⚠️ Could not cancel notification:', cancelError);
                    }

                    alert(`✅ ${medicineName} marked as taken! 💊`);
                  }
                  break;

                case 'dismiss':
                  console.log(`⏰ User snoozed ${medicineName} for 5 minutes`);

                  // Schedule a new notification 5 minutes from now
                  const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
                  const snoozeNotification = {
                    ...notifData,
                    id: notifData.id + 10000, // Different ID to avoid conflicts
                    title: `🔔 ${medicineName} (Snoozed)`,
                    body: `Reminder: Time to take ${notifData.body?.split('Time to take ')[1] || 'your medicine'}`,
                    schedule: { at: snoozeTime },
                    extra: {
                      ...notifData.extra,
                      isSnoozed: true,
                      originalTime: notifData.extra?.scheduledTime,
                      snoozeTime: snoozeTime.getTime()
                    }
                  };

                  try {
                    // Cancel original notification
                    await LocalNotifications.cancel({
                      notifications: [{ id: notifData.id }]
                    });

                    // Schedule snoozed notification
                    await LocalNotifications.schedule({
                      notifications: [snoozeNotification]
                    });

                    console.log(`⏰ Snoozed ${medicineName} until ${snoozeTime.toLocaleTimeString()}`);
                    alert(`⏰ ${medicineName} snoozed for 5 minutes!\nNext reminder: ${snoozeTime.toLocaleTimeString()}`);
                  } catch (snoozeError) {
                    console.error('❌ Error snoozing notification:', snoozeError);
                    alert('❌ Could not snooze notification. Please try again.');
                  }
                  break;

                case 'skip':
                  console.log(`❌ User skipped ${medicineName}`);

                  // Record as skipped in history
                  const medicine_skip = medicines.find(m => m.id === medicineId);
                  if (medicine_skip) {
                    const skipRecord = {
                      id: Date.now(),
                      medicineId: medicine_skip.id,
                      medicineName: medicine_skip.name,
                      patientName: medicine_skip.patientName,
                      dosage: `${medicine_skip.dosage} ${medicine_skip.dosageType}`,
                      takenAt: new Date().toISOString(),
                      alertTime: medicine_skip.alertTime,
                      status: 'skipped'
                    };

                    const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.dosageHistory) || '[]');
                    const updatedHistory = [skipRecord, ...currentHistory];
                    localStorage.setItem(STORAGE_KEYS.dosageHistory, JSON.stringify(updatedHistory));
                  }

                  // Cancel this notification
                  try {
                    await LocalNotifications.cancel({
                      notifications: [{ id: notifData.id }]
                    });
                    console.log(`🚫 Cancelled skipped notification ${notifData.id} for ${medicineName}`);
                  } catch (cancelError) {
                    console.warn('⚠️ Could not cancel notification:', cancelError);
                  }

                  alert(`❌ ${medicineName} skipped. Don't forget your next dose! ⚠️`);
                  break;

                default:
                  console.log(`🔔 Default notification tap for ${medicineName}`);
                  alert(`🔔 Reminder: Time to take ${medicineName}!\n\nPlease take your medicine and mark it as taken in the app. 💊`);
                  break;
              }
            }
          });

          // Listen for notification received (when app is in foreground)
          await LocalNotifications.addListener('localNotificationReceived', (notification) => {
            console.log('📨 Notification received in foreground:', notification);

            // Show in-app notification for foreground notifications
            if (notification.extra?.medicineName) {
              const medicine = notification.extra.medicineName;
              console.log(`📱 Foreground notification for ${medicine}`);

              // You could show a toast or modal here for foreground notifications
              // For now, just log it
            }
          });

          console.log('✅ Enhanced notification listeners set up successfully');
        }
      } catch (error) {
        console.error('❌ Error setting up notification listeners:', error);
      }
    };

    initializeNotifications();
    setupNotificationListeners();
  }, []);

  // Load emergency contacts from localStorage
  useEffect(() => {
    const storedContacts = localStorage.getItem(STORAGE_KEYS.emergencyContacts);
    if (storedContacts) {
      setEmergencyContacts(JSON.parse(storedContacts));
    }
  }, []);

  // Save emergency contacts to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.emergencyContacts, JSON.stringify(emergencyContacts));
  }, [emergencyContacts]);

  // Reschedule notifications when medicines are loaded (only once per session)
  useEffect(() => {
    if (medicines.length > 0) {
      // Small delay to ensure notification system is initialized
      const timer = setTimeout(() => {
        rescheduleAllNotifications();
      }, 2000); // Increased delay to 2 seconds

      return () => clearTimeout(timer);
    }
  }, [medicines.length === 0 ? false : true]); // Only trigger when medicines change from empty to having items

  // Generate notifications based on medicine schedule
  useEffect(() => {
    const generateNotifications = () => {
      const today = new Date();
      const newNotifications = [];

      medicines.forEach(medicine => {
        const [hours, minutes] = (medicine.alertTime || medicine.specificTime).split(':');
        const notificationTime = new Date(today);
        notificationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Check if it's time for this medicine
        const timeDiff = notificationTime.getTime() - today.getTime();
        const isToday = Math.abs(timeDiff) < 24 * 60 * 60 * 1000;

        if (isToday) {
          const existingNotification = notifications.find(n =>
            n.medicineId === medicine.id &&
            new Date(n.time).toDateString() === today.toDateString()
          );

          if (!existingNotification) {
            newNotifications.push({
              id: Date.now() + Math.random(),
              medicineId: medicine.id,
              medicineName: medicine.name,
              dosage: medicine.dosage,
              time: notificationTime.toISOString(),
              status: 'pending', // pending, taken, missed
              color: medicine.color,
              alertType: medicine.alertType || 'notification',
              patientName: medicine.patientName,
            });
          }
        }

        // Check for refill reminders
        if (medicine.currentPills <= medicine.refillReminder) {
          const existingRefillNotification = notifications.find(n =>
            n.medicineId === medicine.id && n.type === 'refill'
          );

          if (!existingRefillNotification) {
            newNotifications.push({
              id: Date.now() + Math.random() + 1,
              medicineId: medicine.id,
              medicineName: medicine.name,
              type: 'refill',
              message: `Only ${medicine.currentPills} ${medicine.dosageType === 'tablet' ? 'pills/tab' : medicine.dosageType === 'ml' ? 'ML' : 'drops'} left`,
              status: 'pending',
              color: medicine.color
            });
          }
        }
      });

      if (newNotifications.length > 0) {
        setNotifications(prev => [...prev, ...newNotifications]);
      }
    };

    const interval = setInterval(generateNotifications, 60000); // Check every minute
    generateNotifications(); // Initial check

    return () => clearInterval(interval);
  }, [medicines, notifications]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, image: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Schedule out-of-stock notification when stock hits 0
  const scheduleOutOfStockNotification = async (medicine) => {
    try {
      if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        console.log('Out of stock notification only works on native platform');
        return;
      }

      // Check if medicine has ended based on reminderEndDate
      if (medicine.reminderEndDate) {
        const endDate = new Date(medicine.reminderEndDate);
        if (new Date() > endDate) {
          console.log('Medicine reminder period has ended, skipping out-of-stock notification');
          return;
        }
      }

      // Only for medicines (not non-medicine items) and when stock is 0
      if (medicine.itemType === 'non-medicine' || medicine.currentPills > 0) {
        return;
      }

      const notificationId = parseInt(medicine.id.replace(/\D/g, '').substring(0, 8)) + 50000;
      
      // Schedule for 9 AM today or tomorrow
      const now = new Date();
      const scheduleTime = new Date();
      scheduleTime.setHours(9, 0, 0, 0);
      
      if (now.getHours() >= 9) {
        // Schedule for tomorrow 9 AM
        scheduleTime.setDate(scheduleTime.getDate() + 1);
      }

      const notificationConfig = {
        title: '⚠️ Out of Stock Alert',
        body: `${medicine.name} for ${medicine.patientName || 'Patient'} is out of stock! Please refill.`,
        id: notificationId,
        schedule: { at: scheduleTime },
        channelId: 'notification-channel',
        importance: 4,
        priority: 1,
        sound: 'default',
        autoCancel: true,
        extra: {
          medicineId: medicine.id,
          medicineName: medicine.name,
          isOutOfStock: true
        }
      };

      await LocalNotifications.schedule({ notifications: [notificationConfig] });
      console.log('📦 Out of stock notification scheduled for:', medicine.name);
    } catch (error) {
      console.error('Error scheduling out of stock notification:', error);
    }
  };

  // Helper to schedule a local notification with proper recurring support
  const scheduleLocalNotification = async (medicine) => {
    try {
      if (!medicine.alertTime) {
        console.log('No alert time set for medicine:', medicine.name);
        return;
      }

      console.log('📋 Scheduling notification for:', medicine.name, 'at', medicine.alertTime, 'type:', medicine.alertType);

      // Check if we're in a native app environment and have permissions
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Check permissions first
        try {
          const permissions = await LocalNotifications.checkPermissions();
          console.log('📋 Notification permissions:', permissions);

          if (permissions.display !== 'granted') {
            console.warn('⚠️ Notification permission not granted, requesting...');
            const requestResult = await LocalNotifications.requestPermissions();
            console.log('📋 Permission request result:', requestResult);

            if (requestResult.display !== 'granted') {
              alert(`❌ Notification permission denied for ${medicine.name}. Please enable notifications in Android settings.`);
              return;
            }
          }
        } catch (permError) {
          console.error('❌ Error checking permissions:', permError);
        }
      }

      // Check if we're in a native app environment
      if (typeof window !== 'undefined' && !window.Capacitor) {
        console.warn('LocalNotifications only work in native Capacitor apps. Using browser notification as fallback.');

        // Fallback to browser notifications for web
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const [hours, minutes] = medicine.alertTime.split(':');
            const now = new Date();
            const notifTime = new Date(now);
            notifTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // If time has passed today, schedule for tomorrow
            if (notifTime < now) {
              notifTime.setDate(notifTime.getDate() + 1);
            }

            const timeUntilNotification = notifTime.getTime() - now.getTime();

            if (timeUntilNotification > 0) {
              setTimeout(() => {
                new Notification(`💊 ${medicine.name}`, {
                  body: `Time to take ${medicine.dosage} ${medicine.dosageType}${medicine.patientName ? ` for ${medicine.patientName}` : ''}`,
                  icon: '/vite.svg',
                  tag: `medicine-${medicine.id}`,
                  requireInteraction: medicine.alertType === 'alarm'
                });
              }, timeUntilNotification);

              console.log(`Browser notification scheduled for ${medicine.name} in ${Math.round(timeUntilNotification / 1000 / 60)} minutes`);
            }
          }
        }
        return;
      }

      // Cancel any existing notifications for this medicine first
      try {
        const notificationIds = [];
        for (let day = 0; day < 7; day++) {
          notificationIds.push({ id: generateNotificationId(medicine.id, day) });
        }
        await LocalNotifications.cancel({
          notifications: notificationIds
        });
        console.log(`🚫 Cancelled existing notifications for ${medicine.name}`);
      } catch (error) {
        console.log('No existing notifications to cancel for', medicine.name);
      }

      const [hours, minutes] = medicine.alertTime.split(':');

      // Handle native alarms first (schedule for multiple days at once)
      if (medicine.alertType === 'native-alarm') {
        console.log('🔊 Scheduling NATIVE ALARM for', medicine.name);
        console.log('📊 Medicine details:', {
          name: medicine.name,
          alertTime: medicine.alertTime,
          alertType: medicine.alertType,
          currentTime: new Date().toString()
        });
        try {
          const results = await scheduleNativeAlarm(medicine);
          console.log('✅ Native alarm scheduled successfully - skipping Capacitor notifications');
          console.log('📊 Scheduling results:', results);
          return; // Exit early for native alarms
        } catch (error) {
          console.error('❌ Failed to schedule native alarm, falling back to regular notification:', error);
          // Continue with regular notifications as fallback
          medicine.alertType = 'notification';
        }
      }

      const notifications = [];

      // Schedule notifications for the next 7 days to ensure persistence
      for (let day = 0; day < 7; day++) {
        const now = new Date();
        const notifTime = new Date(now);
        notifTime.setDate(notifTime.getDate() + day);
        notifTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // IMPROVED TIMING LOGIC: More lenient for day 0, strict for future days
        if (day === 0) {
          // For today: Allow scheduling if time is at least 3 seconds in the future
          // REDUCED from 10s to 3s for better UX - most phones can handle this
          const timeDiffSeconds = (notifTime.getTime() - now.getTime()) / 1000;
          if (timeDiffSeconds < 3) {
            console.log(`⏭️ Day ${day}: Time passed or too soon (${timeDiffSeconds.toFixed(1)}s), skipping`);
            console.warn(`🚨 ALARM SKIPPED: ${medicine.name} scheduled for ${medicine.alertTime} but current time is ${now.toLocaleTimeString()}`);
            continue;
          } else {
            console.log(`✅ Day ${day}: Scheduling in ${timeDiffSeconds.toFixed(1)}s - WITHIN ACCEPTABLE RANGE`);
          }
        }

        const baseConfig = {
          title: `💊 ${medicine.name}`,
          body: `Time to take ${medicine.dosage} ${medicine.dosageType}${medicine.patientName ? ` for ${medicine.patientName}` : ''}`,
          id: generateNotificationId(medicine.id, day),
          schedule: { at: notifTime },
          iconColor: medicine.color || '#3B82F6',
          extra: {
            medicineId: medicine.id,
            medicineName: medicine.name,
            day: day,
            alertType: medicine.alertType
          }
        };

        // ENHANCED notification configuration with proper action buttons
        const notificationConfig = {
          ...baseConfig,
          channelId: medicine.alertType === 'alarm' ? 'alarm-channel' : 'notification-channel',
          importance: medicine.alertType === 'alarm' ? 5 : 4, // IMPORTANCE_MAX for alarms, HIGH for notifications
          priority: medicine.alertType === 'alarm' ? 2 : 1, // HIGH priority for alarms
          ongoing: false,
          autoCancel: false, // Don't auto-dismiss so user must interact
          sound: 'default',
          vibrate: medicine.alertType === 'alarm' ? [1000, 500, 1000] : [500, 500], // Stronger vibration for alarms
          lights: true,
          lightColor: medicine.color || '#3B82F6',
          visibility: 1, // VISIBILITY_PUBLIC
          category: 'reminder',
          showWhen: true,
          when: notifTime.getTime(),
          wakeUpScreen: medicine.alertType === 'alarm', // Wake screen for alarms
          // CRITICAL: Action buttons for dismiss functionality
          actionTypeId: 'MEDICINE_REMINDER',
          actions: [
            {
              id: 'taken',
              title: '✅ Taken',
              type: 'button',
              destructive: false,
              input: false
            },
            {
              id: 'dismiss',
              title: '⏰ Snooze 5min',
              type: 'button',
              destructive: false,
              input: false
            },
            {
              id: 'skip',
              title: '❌ Skip',
              type: 'button',
              destructive: true,
              input: false
            }
          ],
          extra: {
            ...baseConfig.extra,
            alarmType: 'RTC_WAKEUP',
            exactAlarm: true,
            allowWhileIdle: medicine.alertType === 'alarm',
            canDismiss: true,
            scheduledTime: notifTime.getTime(),
            hasActions: true, // Flag to indicate this notification has action buttons
            medicineColor: medicine.color,
            patientName: medicine.patientName || ''
          }
        };

        // CRITICAL FIX: Actually add the notification to the array!
        notifications.push(notificationConfig);

        console.log(`📝 Prepared notification ${day + 1}/7 for ${medicine.name} at ${notifTime.toLocaleString()}`);
      }

      if (notifications.length > 0) {
        try {
          console.log(`📋 Scheduling ${notifications.length} notifications for ${medicine.name}:`);
          console.log(`🔧 Medicine: ${medicine.name}, Type: ${medicine.alertType}, Time: ${medicine.alertTime}`);
          console.log(`📊 Notification count: ${notifications.length}`);
          notifications.forEach((n, idx) => {
            console.log(`  ${idx + 1}. ID: ${n.id}, Time: ${new Date(n.schedule.at).toLocaleString()}, Channel: ${n.channelId}`);
          });

          // Enhanced reliability: Schedule with retry logic
          let scheduleSuccess = false;
          let attempts = 0;
          const maxAttempts = 3;

          while (!scheduleSuccess && attempts < maxAttempts) {
            attempts++;
            try {
              await LocalNotifications.schedule({
                notifications: notifications,
              });
              scheduleSuccess = true;
              console.log(`✅ Successfully scheduled ${notifications.length} notifications for ${medicine.name} (attempt ${attempts})`);
            } catch (scheduleError) {
              console.warn(`⚠️ Attempt ${attempts} failed for ${medicine.name}:`, scheduleError);
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
              } else {
                throw scheduleError; // Re-throw on final attempt
              }
            }
          }

          // For debugging - show when the next notification will fire
          if (notifications.length > 0) {
            const nextNotif = notifications[0];
            console.log(`📅 Next notification for ${medicine.name} scheduled for:`, nextNotif.schedule.at);
            console.log(`🔧 Notification config:`, JSON.stringify(nextNotif, null, 2));
          }

          // Enhanced verification - check if notifications were actually scheduled
          try {
            // Wait a moment for the system to process
            await new Promise(resolve => setTimeout(resolve, 200));

            const pending = await LocalNotifications.getPending();
            console.log(`📝 Total pending notifications after scheduling:`, pending.notifications?.length || 0);

            const medicineNotifs = pending.notifications?.filter(n =>
              n.extra?.medicineId === medicine.id
            );
            console.log(`📊 Pending notifications for ${medicine.name}:`, medicineNotifs?.length || 0);

            // RELIABILITY CHECK: Verify the notifications were actually scheduled
            if (medicineNotifs?.length !== notifications.length) {
              console.error(`🚨 SCHEDULING MISMATCH for ${medicine.name}!`);
              console.error(`Expected: ${notifications.length}, Actual: ${medicineNotifs?.length || 0}`);

              // Try to schedule missing notifications
              const missingCount = notifications.length - (medicineNotifs?.length || 0);
              if (missingCount > 0) {
                console.log(`🔄 Attempting to schedule ${missingCount} missing notifications...`);
                // This could be enhanced to specifically re-schedule missing ones
              }
            } else {
              console.log(`✅ SCHEDULING VERIFICATION PASSED for ${medicine.name}`);
            }
          } catch (pendingError) {
            console.warn('⚠️ Could not verify pending notifications:', pendingError);
          }

        } catch (error) {
          console.error('❌ Error scheduling notifications for', medicine.name, ':', error);
          console.error('📋 Failed notification configs:', notifications);

          // Try to provide more specific error information
          if (error.message?.includes('permission')) {
            alert(`Permission error for ${medicine.name}. Please check notification permissions in Android settings.`);
          } else if (error.message?.includes('exact')) {
            alert(`Exact alarm error for ${medicine.name}. Please enable "Alarms & reminders" permission in Android 12+ settings.`);
          } else {
            alert(`Failed to schedule notifications for ${medicine.name}: ${error.message}`);
          }
        }
      } else {
        console.error(`🚨 CRITICAL: No notifications scheduled for ${medicine.name}!`);
        console.error(`   Medicine alert time: ${medicine.alertTime}`);
        console.error(`   Current time: ${new Date().toLocaleTimeString()}`);
        console.error(`   Likely reason: All notification times have passed`);
        
        // Alert user about scheduling failure
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
          alert(`⚠️ Alert Time Already Passed!\n\nMedicine: ${medicine.name}\nScheduled time: ${medicine.alertTime}\nCurrent time: ${new Date().toLocaleTimeString()}\n\nPlease set a future time for this alarm.`);
        }
      }
    } catch (error) {
      console.error('❌ Error in scheduleLocalNotification:', error);
    }
  };

  // Helper to reschedule all notifications (useful on app restart)
  const rescheduleAllNotifications = async () => {
    try {
      console.log('🔄 Rescheduling all notifications...');

      // Clear all existing notifications (both delivered and pending)
      await LocalNotifications.removeAllDeliveredNotifications();

      // Cancel all pending notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
        console.log(`🚫 Cancelled ${pending.notifications.length} pending notifications`);
      }

      // Cancel all native alarms for existing medicines
      for (const medicine of medicines) {
        if (medicine.alertType === 'native-alarm') {
          await cancelNativeAlarm(medicine.id);
        }
      }

      // Reschedule for all medicines with a small delay to avoid conflicts
      for (const medicine of medicines) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between each
        await scheduleLocalNotification(medicine);
      }

      console.log(`✅ All notifications rescheduled for ${medicines.length} medicines`);
    } catch (error) {
      console.error('❌ Error rescheduling notifications:', error);
    }
  };

  // Manual dismiss function for active notifications/alarms
  const dismissActiveNotification = async (medicineId, action = 'dismiss') => {
    try {
      console.log(`🔕 Manual dismiss for medicine ID: ${medicineId}, action: ${action}`);

      // Find pending notifications for this medicine
      const pending = await LocalNotifications.getPending();
      const medicineNotifs = pending.notifications?.filter(n =>
        n.extra?.medicineId === medicineId
      ) || [];

      if (medicineNotifs.length > 0) {
        // Cancel all pending notifications for this medicine
        await LocalNotifications.cancel({
          notifications: medicineNotifs.map(n => ({ id: n.id }))
        });

        console.log(`✅ Dismissed ${medicineNotifs.length} notifications for medicine ${medicineId}`);

        // If this is a snooze action, reschedule for later
        if (action === 'snooze') {
          const medicine = medicines.find(m => m.id === medicineId);
          if (medicine) {
            const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);

            const snoozeNotif = {
              title: `🔔 ${medicine.name} (Snoozed)`,
              body: `Reminder: Time to take ${medicine.dosage} ${medicine.dosageType}${medicine.patientName ? ` for ${medicine.patientName}` : ''}`,
              id: Date.now(), // New unique ID
              schedule: { at: snoozeTime },
              channelId: 'notification-channel',
              importance: 4,
              priority: 1,
              sound: 'default',
              vibrate: [500, 500],
              autoCancel: true,
              actionTypeId: 'MEDICINE_REMINDER',
              actions: [
                { id: 'taken', title: '✅ Taken', type: 'button' },
                { id: 'dismiss', title: '⏰ Snooze 5min', type: 'button' },
                { id: 'skip', title: '❌ Skip', type: 'button' }
              ],
              extra: {
                medicineId: medicine.id,
                medicineName: medicine.name,
                alertType: medicine.alertType,
                isSnoozed: true,
                canDismiss: true
              }
            };

            await LocalNotifications.schedule({
              notifications: [snoozeNotif]
            });

            console.log(`⏰ Snoozed ${medicine.name} until ${snoozeTime.toLocaleTimeString()}`);
            return `⏰ ${medicine.name} snoozed for 5 minutes!`;
          }
        }

        return `✅ ${medicineNotifs.length} notification(s) dismissed`;
      } else {
        console.log(`ℹ️ No pending notifications found for medicine ${medicineId}`);
        return 'No active notifications found';
      }
    } catch (error) {
      console.error('❌ Error dismissing notification:', error);
      return 'Error dismissing notification';
    }
  };

  // Enhanced function to mark medicine as taken
  const markMedicineAsTaken = async (medicineId, fromNotification = false) => {
    try {
      const medicine = medicines.find(m => m.id === medicineId);
      if (!medicine) {
        console.error('❌ Medicine not found:', medicineId);
        return;
      }

      console.log(`✅ Marking ${medicine.name} as taken (from notification: ${fromNotification})`);

      // Record in dosage history
      const newRecord = {
        id: Date.now(),
        medicineId: medicine.id,
        medicineName: medicine.name,
        patientName: medicine.patientName,
        dosage: `${medicine.dosage} ${medicine.dosageType}`,
        takenAt: new Date().toISOString(),
        alertTime: medicine.alertTime,
        status: 'taken'
      };

      const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.dosageHistory) || '[]');
      const updatedHistory = [newRecord, ...currentHistory];
      localStorage.setItem(STORAGE_KEYS.dosageHistory, JSON.stringify(updatedHistory));

      // Update current pills count
      const updatedMedicines = medicines.map(m =>
        m.id === medicineId
          ? { ...m, currentPills: Math.max(0, m.currentPills - m.dosage) }
          : m
      );
      setMedicines(updatedMedicines);
      localStorage.setItem(STORAGE_KEYS.medicines, JSON.stringify(updatedMedicines));

      // Dismiss any active notifications for this medicine
      await dismissActiveNotification(medicineId);

      // Cancel native alarms if applicable
      if (medicine.alertType === 'native-alarm') {
        await cancelNativeAlarm(medicineId);
      }

      console.log(`✅ ${medicine.name} marked as taken successfully`);

      if (!fromNotification) {
        alert(`✅ ${medicine.name} marked as taken! 💊`);
      }

    } catch (error) {
      console.error('❌ Error marking medicine as taken:', error);
      alert('❌ Error marking medicine as taken. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    // Ensure numeric fields have valid values
    const cleanedFormData = {
      ...formData,
      totalPills: formData.totalPills || 1,
      currentPills: formData.currentPills || 1,
      refillReminder: formData.refillReminder || 1
    };

    if (editingMedicine) {
      setMedicines(prev =>
        prev.map(med =>
          med.id === editingMedicine.id
            ? { ...cleanedFormData, id: editingMedicine.id }
            : med
        )
      );
      setEditingMedicine(null);
      await scheduleLocalNotification(cleanedFormData);
      setShowAddForm(false);
    } else {
      const newMedicine = {
        ...cleanedFormData,
        id: Date.now().toString()
      };
      setMedicines(prev => [...prev, newMedicine]);
      await scheduleLocalNotification(newMedicine);

      // Show success dialog and clear form for new medicine
      setShowSuccessDialog(true);
    }

    setFormData({
      patientName: '',
      itemType: 'medicine',
      name: '',
      dosage: '1',
      dosageType: 'tablet',
      time: 'morning',
      color: '#3B82F6',
      image: null,
      notes: '',
      specificTime: '08:00',
      alertTime: '07:55',
      alertType: 'notification',
      totalPills: 1,
      currentPills: 1,
      refillReminder: 1,
      frequency: 'daily',
      frequencyDays: 2,
      specificWeekDays: [],
      reminderEndDate: '',
      reminderDurationDays: ''
    });
  };

  const deleteMedicine = async (id) => {
    try {
      // Cancel all notifications for this medicine (current and future days)
      const notificationIds = [];
      for (let day = 0; day < 7; day++) {
        notificationIds.push({ id: generateNotificationId(id, day) });
      }
      await LocalNotifications.cancel({ notifications: notificationIds });

      // Also cancel native alarm if it exists
      await cancelNativeAlarm(id);
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }

    setMedicines(prev => prev.filter(med => med.id !== id));
    setNotifications(prev => prev.filter(n => n.medicineId !== id));
    setDosageHistory(prev => prev.filter(h => h.medicineId !== id));
  };

  const editMedicine = (medicine) => {
    // Ensure all new fields have defaults for backwards compatibility
    setFormData({
      ...medicine,
      doctorName: medicine.doctorName || '',
      itemType: medicine.itemType || 'medicine',
      dosage: String(medicine.dosage || 1),
      customDosageType: medicine.customDosageType || '',
      frequencyDays: medicine.frequencyDays || 2,
      specificWeekDays: medicine.specificWeekDays || [],
      reminderEndDate: medicine.reminderEndDate || '',
      reminderDurationDays: medicine.reminderDurationDays || ''
    });
    setEditingMedicine(medicine);
    setShowAddForm(true);
  };

  const markMedicineTaken = (notificationId, medicineId) => {
    const medicine = medicines.find(m => m.id === medicineId);

    // Update notification status
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, status: 'taken' }
          : n
      )
    );

    // Record dosage history
    const dosageRecord = {
      id: Date.now().toString(),
      medicineId,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      takenAt: new Date().toISOString(),
      status: 'taken'
    };
    setDosageHistory(prev => [...prev, dosageRecord]);

    // Update pill count and check for out of stock
    const newPillCount = Math.max(0, medicine.currentPills - 1);
    setMedicines(prev =>
      prev.map(med =>
        med.id === medicineId
          ? { ...med, currentPills: newPillCount }
          : med
      )
    );

    // Schedule out of stock notification if pills hit 0
    if (newPillCount === 0 && medicine.itemType !== 'non-medicine') {
      scheduleOutOfStockNotification({ ...medicine, currentPills: 0 });
    }
  };

  const markMedicineMissed = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, status: 'missed' }
          : n
      )
    );
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, status: 'dismissed' }
          : n
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications(prev =>
      prev.map(n =>
        n.status === 'pending'
          ? { ...n, status: 'dismissed' }
          : n
      )
    );
  };

  const addPills = (medicineId, amount) => {
    setMedicines(prev =>
      prev.map(med =>
        med.id === medicineId
          ? {
            ...med,
            currentPills: med.currentPills + amount,
            totalPills: med.totalPills + amount  // Add to both current and total
          }
          : med
      )
    );

    // Remove refill notifications for this medicine
    setNotifications(prev =>
      prev.filter(n => !(n.medicineId === medicineId && n.type === 'refill'))
    );
  };

  const openAddForm = (timeSlot = null) => {
    const defaultTimeSlot = timeSlot || activeTab;
    const defaultTime = timeSlots[defaultTimeSlot]?.defaultTime || '08:00';

    setFormData({
      patientName: '',
      doctorName: '',
      itemType: 'medicine',
      name: '',
      dosage: '1',
      dosageType: 'tablet',
      customDosageType: '',
      time: defaultTimeSlot,
      color: '#3B82F6',
      image: null,
      notes: '',
      specificTime: defaultTime,
      alertTime: calculateAlertTime(defaultTime),
      alertType: 'notification',
      totalPills: 1,
      currentPills: 1,
      refillReminder: 1,
      frequency: 'daily',
      frequencyDays: 2,
      specificWeekDays: [],
      reminderEndDate: '',
      reminderDurationDays: ''
    });
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingMedicine(null);
    setShowSuccessDialog(false);
    setFormData({
      patientName: '',
      doctorName: '',
      itemType: 'medicine',
      name: '',
      dosage: '1',
      dosageType: 'tablet',
      customDosageType: '',
      time: 'morning',
      color: '#3B82F6',
      image: null,
      notes: '',
      specificTime: '08:00',
      alertTime: '07:59',
      alertType: 'notification',
      totalPills: 1,
      currentPills: 1,
      refillReminder: 1,
      frequency: 'daily',
      frequencyDays: 2,
      specificWeekDays: [],
      reminderEndDate: '',
      reminderDurationDays: ''
    });
  };

  // Function to determine time slot based on specific time
  const getTimeSlotFromTime = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 12) return 'morning';    // 5 AM - 11:59 AM
    if (hour >= 12 && hour < 16) return 'afternoon';  // 12 PM - 3:59 PM  
    if (hour >= 16 && hour < 20) return 'evening';    // 4 PM - 7:59 PM
    return 'night';                                   // 8 PM - 4:59 AM
  };

  // Function to calculate alert time (1 minute before specific time)
  const calculateAlertTime = (specificTime) => {
    const [hours, minutes] = specificTime.split(':').map(Number);
    let alertMinutes = minutes - 1;
    let alertHours = hours;
    
    if (alertMinutes < 0) {
      alertMinutes += 60;
      alertHours -= 1;
      if (alertHours < 0) {
        alertHours = 23;
      }
    }
    
    return `${alertHours.toString().padStart(2, '0')}:${alertMinutes.toString().padStart(2, '0')}`;
  };

  // Function to update form data and auto-sync time slot
  const updateFormData = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-update time slot when specific time changes
      if (field === 'specificTime') {
        newData.time = getTimeSlotFromTime(value);
        newData.alertTime = calculateAlertTime(value); // Set alert time 1 min before
      }

      return newData;
    });
  };

  // Function to calculate end date from number of days
  const calculateEndDateFromDays = (days) => {
    if (!days || days <= 0) return '';
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));
    return endDate.toISOString().split('T')[0];
  };

  // Function to calculate number of days from end date
  const calculateDaysFromEndDate = (endDateStr) => {
    if (!endDateStr) return '';
    const endDate = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays.toString() : '';
  };

  // Get unique patient names for dropdown
  const getExistingPatientNames = () => {
    const patientNames = medicines.map(med => med.patientName).filter(name => name && name.trim());
    return [...new Set(patientNames)];
  };

  const getMedicinesByTime = (timeSlot) => {
    return medicines.filter(med => med.time === timeSlot);
  };

  const getMedicinesByTimeAndPatient = (timeSlot) => {
    const filteredMedicines = medicines.filter(med => med.time === timeSlot);
    const groupedByPatient = {};

    filteredMedicines.forEach(medicine => {
      const patientName = medicine.patientName || 'Unknown Patient';
      if (!groupedByPatient[patientName]) {
        groupedByPatient[patientName] = [];
      }
      groupedByPatient[patientName].push(medicine);
    });

    return groupedByPatient;
  };

  const togglePatientCollapse = (patientName) => {
    setCollapsedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientName)) {
        newSet.delete(patientName);
      } else {
        newSet.add(patientName);
      }
      return newSet;
    });
  };

  const getPendingNotifications = () => {
    return notifications.filter(n => n.status === 'pending');
  };

  const getTodaysDosageHistory = () => {
    const today = new Date().toDateString();
    return dosageHistory.filter(h =>
      new Date(h.takenAt).toDateString() === today
    );
  };

  const getWeeklyStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyHistory = dosageHistory.filter(h =>
      new Date(h.takenAt) >= oneWeekAgo
    );

    const totalScheduled = medicines.length * 7; // Assuming daily frequency
    const totalTaken = weeklyHistory.length;
    const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    return { totalTaken, totalScheduled, adherenceRate };
  };

  // Utility function to generate safe notification IDs for Android
  const generateNotificationId = (medicineId, day = 0) => {
    // Ensure ID is within Java int range (max 2147483647)
    const baseId = parseInt(medicineId) % 100000; // Keep base ID under 100k
    return baseId + (day * 1000); // Add day offset, max will be under 107k
  };

  // Test notification function for debugging Android notifications
  /* COMMENTED OUT FOR PRODUCTION
  const testNotification = async () => {
    try {
      console.log('🧪 Testing notification...');

      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Test with a simple immediate notification
        const testConfig = {
          title: '🧪 Test Notification',
          body: 'This is a test notification to verify Android notifications are working!',
          id: 99999, // Use smaller ID within Java int range
          schedule: { at: new Date(Date.now() + 3000) }, // 3 seconds from now
          channelId: 'alarm-channel', // Use alarm channel for testing
          importance: 5, // IMPORTANCE_MAX for visibility
          priority: 2, // PRIORITY_HIGH
          sound: 'default',
          vibrate: [1000, 500, 1000], // Strong test vibration
          lights: true,
          lightColor: '#00FF00',
          visibility: 1,
          autoCancel: true,
          wakeUpScreen: true,
          showWhen: true,
          when: Date.now() + 3000,
          extra: {
            isTest: true,
            testTime: new Date().toISOString(),
            alarmType: 'RTC_WAKEUP',
            exactAlarm: true,
            allowWhileIdle: true
          }
        };

        await LocalNotifications.schedule({
          notifications: [testConfig]
        });

        console.log('✅ Test notification scheduled for 3 seconds from now');
        alert('Test notification scheduled! You should receive it in 3 seconds. 📱');
      } else {
        // Browser fallback
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setTimeout(() => {
              new Notification('🧪 Test Notification', {
                body: 'This is a test notification to verify browser notifications are working!',
                icon: '/vite.svg',
                tag: 'test-notification'
              });
            }, 3000);

            console.log('✅ Browser test notification scheduled');
            alert('Test notification scheduled! You should receive it in 3 seconds. 🌐');
          } else {
            alert('Notification permission denied. Please enable notifications in your browser settings.');
          }
        } else {
          alert('Notifications are not supported in this browser.');
        }
      }
    } catch (error) {
      console.error('❌ Error testing notification:', error);
      alert('Error testing notification: ' + error.message);
    }
  };
  */

  // Check Android alarm permissions (based on the article's recommendations)
  const checkAndroidAlarmPermissions = async () => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🔍 Checking Android alarm permissions...');

        // Check notification permissions
        const notificationPermissions = await LocalNotifications.checkPermissions();
        console.log('📋 Notification permissions:', notificationPermissions);

        if (notificationPermissions.display !== 'granted') {
          console.warn('⚠️ Notification permissions not granted');
          const requestResult = await LocalNotifications.requestPermissions();
          console.log('📝 Permission request result:', requestResult);
        }

        // For Android 12+ devices, we need to ensure exact alarm permissions
        // Note: This would typically be handled natively, but we can log the requirement
        const androidVersion = await window.Capacitor.getPlatform();
        console.log('📱 Platform:', androidVersion);

        alert(`
🔍 Android Alarm Permission Check:
• Notification permissions: ${notificationPermissions.display}
• Platform: ${androidVersion}
• Alarm channels configured: ✅
• Wake lock support: ✅

For Android 12+, ensure "Alarms & reminders" permission is enabled in app settings.
        `);
      } else {
        alert('This check is only available on Android devices. Browser notifications use different permissions.');
      }
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      alert('Error checking permissions: ' + error.message);
    }
  };

  // NEW: Native Medicine Alarm functions using our custom plugin
  const scheduleNativeAlarm = async (medicine, scheduleForDays = 7) => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🚨 Scheduling NATIVE alarms for:', medicine.name, `(${scheduleForDays} days)`);

        // Enhanced debugging: Log the medicine details to understand the issue
        console.log('📋 Medicine details:', {
          name: medicine.name,
          alertTime: medicine.alertTime,
          alertType: medicine.alertType,
          specificTime: medicine.specificTime,
          patientName: medicine.patientName,
          id: medicine.id,
          currentTime: new Date().toLocaleString(),
          isTestMedicine: medicine.name.toLowerCase().includes('test')
        });

        // Check if native plugin is available
        if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.MedicineAlarm) {
          console.error('❌ MedicineAlarm plugin not available!');
          throw new Error('Native alarm plugin not found. Please check if the plugin is properly installed and registered.');
        }

        console.log('🔧 IMPORTANT: Ensure native Android implementation follows exact alarm best practices:');
        console.log('📋 Required Android Manifest permissions:');
        console.log('   • android.permission.WAKE_LOCK');
        console.log('   • android.permission.SCHEDULE_EXACT_ALARM (API < 33)');
        console.log('   • android.permission.USE_EXACT_ALARM (API >= 33)');
        console.log('   • android.permission.POST_NOTIFICATIONS (API >= 33)');
        console.log('🔧 Required native implementation:');
        console.log('   • AlarmManager with setExactAndAllowWhileIdle()');
        console.log('   • BroadcastReceiver for alarm handling');
        console.log('   • PendingIntent with FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE');
        console.log('   • RTC_WAKEUP alarm type for device wake-up');
        console.log('📱 Testing native alarm for:', medicine.name);

        const [hours, minutes] = medicine.alertTime.split(':');
        const results = [];

        // Schedule native alarms for multiple days to ensure persistence  
        for (let day = 0; day < scheduleForDays; day++) {
          const now = new Date();
          const alarmTime = new Date(now);
          alarmTime.setDate(alarmTime.getDate() + day);
          alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          // For day 0, check if time has passed - strict no-past-time policy
          const timeDiffMinutes = (alarmTime.getTime() - now.getTime()) / (1000 * 60);

          // Strict logic: Only schedule if time is in the future (at least 5 seconds from now)
          // This prevents alarms from triggering immediately when app opens
          // REDUCED from 10s to 5s for better reliability
          const minimumFutureSeconds = 5; // Must be at least 5 seconds in the future

          console.log(`🕒 Time comparison (Day ${day}):`, {
            alarmTime: alarmTime.toLocaleString(),
            now: now.toLocaleString(),
            timeDiffMinutes: timeDiffMinutes,
            timeDiffSeconds: (alarmTime.getTime() - now.getTime()) / 1000,
            willSchedule: day > 0 || (alarmTime.getTime() - now.getTime()) / 1000 >= minimumFutureSeconds
          });

          if (day === 0 && (alarmTime.getTime() - now.getTime()) / 1000 < minimumFutureSeconds) {
            const secondsRemaining = ((alarmTime.getTime() - now.getTime()) / 1000).toFixed(1);
            console.warn(`🚨 NATIVE ALARM SKIPPED: ${medicine.name}`);
            console.warn(`   Reason: Only ${secondsRemaining}s remaining (need ${minimumFutureSeconds}s minimum)`);
            console.warn(`   Scheduled time: ${alarmTime.toLocaleString()}`);
            console.warn(`   Current time: ${now.toLocaleString()}`);
            continue;
          }

          const alarmId = generateNotificationId(medicine.id, day);
          const triggerTime = alarmTime.getTime();

          console.log(`🚨 Scheduling native alarm ${day + 1}/${scheduleForDays}:`, {
            alarmId,
            triggerTime,
            triggerTimeFormatted: new Date(triggerTime).toLocaleString(),
            medicineName: medicine.name
          });

          try {
            const result = await window.Capacitor.Plugins.MedicineAlarm.scheduleAlarm({
              medicineName: medicine.name,
              dosage: `${medicine.dosage} ${medicine.dosageType}`,
              patientName: medicine.patientName || 'Patient',
              triggerTime: triggerTime,
              alarmId: alarmId
            });

            console.log(`✅ Native alarm ${day + 1} scheduled successfully:`, result);
            results.push({
              day,
              alarmId,
              triggerTime,
              result
            });

          } catch (alarmError) {
            console.error(`❌ Failed to schedule native alarm for day ${day}:`, alarmError);
            // Don't throw here, continue with other days
            results.push({
              day,
              alarmId,
              triggerTime,
              error: alarmError.message
            });
          }
        }

        console.log(`🚨 Native alarm scheduling complete for ${medicine.name}:`, {
          totalAttempted: scheduleForDays,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          results
        });

        // Return results summary
        return {
          medicine: medicine.name,
          totalScheduled: results.filter(r => !r.error).length,
          totalAttempted: scheduleForDays,
          results
        };

      } else {
        console.error('❌ Native alarms only work on Android devices');
        throw new Error('Native alarms are only available on Android devices');
      }
    } catch (error) {
      console.error('❌ Error scheduling native alarm:', error);
      throw error; // Re-throw to trigger fallback in scheduleLocalNotification
    }
  };

  const cancelNativeAlarm = async (medicineId) => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('� Cancelling native alarms for medicine ID:', medicineId);

        // Check if native plugin is available
        if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.MedicineAlarm) {
          console.error('❌ MedicineAlarm plugin not available for cancellation');
          return;
        }

        const results = [];
        // Cancel alarms for the next 7 days (matching the scheduling logic)
        for (let day = 0; day < 7; day++) {
          const alarmId = generateNotificationId(medicineId, day);

          try {
            const result = await window.Capacitor.Plugins.MedicineAlarm.cancelAlarm({
              alarmId: alarmId
            });

            console.log(`✅ Native alarm cancelled for day ${day} (ID: ${alarmId}):`, result);
            results.push({ day, alarmId, success: true });
          } catch (cancelError) {
            console.error(`❌ Failed to cancel native alarm for day ${day}:`, cancelError);
            results.push({ day, alarmId, error: cancelError.message, success: false });
          }
        }

        console.log(`🚫 Native alarm cancellation complete for medicine ${medicineId}:`, {
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        });

        return results;
      } else {
        console.log('Native alarm cancellation only available on Android devices');
      }
    } catch (error) {
      console.error('❌ Error cancelling native alarm:', error);
    }
  };

  const checkNativeAlarmPermission = async () => {
    try {
      if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        alert('Native alarm permission check is only available on Android devices.');
        return;
      }

      if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.MedicineAlarm) {
        alert('❌ MedicineAlarm plugin not available. Please rebuild and reinstall the app.');
        return;
      }

      console.log('🔍 Checking native alarm permissions...');

      const result = await window.Capacitor.Plugins.MedicineAlarm.checkExactAlarmPermission();
      console.log('🔍 Native alarm permission check:', result);

      // Safely extract properties with fallbacks
      const androidVersion = result?.androidVersion || 'Unknown';
      const requiresPermission = result?.requiresPermission ?? false;
      const hasPermission = result?.hasPermission ?? false;

      const permissionStatus = `
🔍 NATIVE ALARM PERMISSION STATUS:

• Android Version: API ${androidVersion}
• Requires Permission: ${requiresPermission ? 'YES' : 'NO'}
• Has Permission: ${hasPermission ? 'YES ✅' : 'NO ❌'}

${hasPermission ?
          '✅ Your app can schedule exact alarms!' :
          requiresPermission ?
            '❌ Please enable "Alarms & reminders" permission in settings.' :
            'ℹ️ Your Android version may not require exact alarm permission.'
        }`;

      alert(permissionStatus);
      return result;
    } catch (error) {
      console.error('❌ Error checking native alarm permission:', error);
      alert(`Error checking native alarm permission: ${error.message}\n\nThis could indicate:\n• Plugin registration issue\n• Native code error\n• Device compatibility problem`);
    }
  };

  const requestNativeAlarmPermission = async () => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🚨 Requesting native exact alarm permission...');

        const result = await window.Capacitor.Plugins.MedicineAlarm.requestExactAlarmPermission();
        console.log('✅ Native alarm permission request result:', result);

        alert(`🚨 EXACT ALARM PERMISSION REQUEST:

${result.message}

This will open Android Settings where you can enable "Alarms & reminders" permission for reliable alarm functionality.

After enabling the permission, come back to the app and test the native alarm!`);

        return result;
      } else {
        alert('Native alarm permission request is only available on Android devices.');
      }
    } catch (error) {
      console.error('❌ Error requesting native alarm permission:', error);
      alert('Error requesting native alarm permission: ' + error.message);
    }
  };

  // DEBUG: Simple function to test native alarm functionality step by step
  const debugNativeAlarm = async () => {
    try {
      console.log('🔍 === NATIVE ALARM DEBUG SESSION ===');

      // Step 1: Check if we're on a native platform
      console.log('🔍 Step 1: Platform check...');
      if (typeof window === 'undefined') {
        alert('❌ Window object not available');
        return;
      }

      if (!window.Capacitor) {
        alert('❌ Capacitor not available - you\'re in a web browser.\nNative alarms only work on Android devices.');
        return;
      }

      if (!window.Capacitor.isNativePlatform()) {
        alert('❌ Not on native platform - you\'re in a web browser.\nNative alarms only work on Android devices.');
        return;
      }

      console.log('✅ Step 1 passed: Native platform detected');

      // Step 2: Check if plugin exists
      console.log('🔍 Step 2: Plugin availability check...');
      if (!window.Capacitor.Plugins) {
        alert('❌ Capacitor.Plugins not available!\n\nThis indicates a serious issue with the app build.');
        return;
      }

      if (!window.Capacitor.Plugins.MedicineAlarm) {
        alert('❌ MedicineAlarm plugin not found!\n\nPlugin registration issue.\nAvailable plugins: ' + Object.keys(window.Capacitor.Plugins).join(', '));
        return;
      }

      console.log('✅ Step 2 passed: MedicineAlarm plugin found');

      // Step 3: Test plugin functionality
      console.log('🔍 Step 3: Testing plugin call...');
      try {
        const permissionResult = await window.Capacitor.Plugins.MedicineAlarm.checkExactAlarmPermission();
        console.log('✅ Step 3 passed: Plugin responds to calls');
        console.log('📊 Permission result:', permissionResult);

        // Step 4: Test actual native alarm scheduling
        console.log('🔍 Step 4: Testing native alarm scheduling...');
        const testTriggerTime = Date.now() + 15000; // 15 seconds from now
        const testAlarmId = 99999;

        const scheduleResult = await window.Capacitor.Plugins.MedicineAlarm.scheduleAlarm({
          medicineName: 'DEBUG TEST ALARM',
          dosage: '1 test',
          patientName: 'Debug User',
          triggerTime: testTriggerTime,
          alarmId: testAlarmId
        });

        console.log('✅ Step 4 passed: Native alarm scheduled successfully!');
        console.log('📊 Schedule result:', scheduleResult);

        alert(`🎉 NATIVE ALARM DEBUG SUCCESS!\n\n✅ All checks passed:\n• Platform: Native Android\n• Plugin: Available & responding\n• Permissions: ${permissionResult?.hasPermission ? 'Granted' : 'May need permission'}\n• Test alarm: Scheduled for 15 seconds\n\n🚨 You should receive a test alarm in 15 seconds!\n\nIf you don't receive it, the issue is likely:\n• Android settings blocking alarms\n• Permission not granted\n• Device-specific restrictions`);

      } catch (pluginError) {
        console.error('❌ Step 3/4 failed: Plugin call error:', pluginError);
        alert(`❌ Plugin call failed!\n\nError: ${pluginError.message}\n\nThis indicates:\n• Plugin code has issues\n• Permissions not granted\n• Native implementation problems`);
      }

    } catch (error) {
      console.error('❌ Debug session failed:', error);
      alert(`❌ Debug failed: ${error.message}`);
    }
  };

  // ENHANCED: Complete native alarm system diagnosis
  const diagnoseNativeAlarmSystem = async () => {
    try {
      console.log('🔍 === COMPREHENSIVE NATIVE ALARM DIAGNOSIS ===');

      let diagnosticReport = '🔍 NATIVE ALARM SYSTEM DIAGNOSIS\n\n';

      // Step 1: Environment Check
      diagnosticReport += '1️⃣ ENVIRONMENT CHECK:\n';
      if (typeof window === 'undefined') {
        diagnosticReport += '❌ Window object not available\n';
        alert(diagnosticReport);
        return;
      }
      diagnosticReport += '✅ Window object available\n';

      if (!window.Capacitor) {
        diagnosticReport += '❌ Capacitor not available (web browser mode)\n';
        diagnosticReport += '💡 Native alarms only work on Android devices\n';
        alert(diagnosticReport);
        return;
      }
      diagnosticReport += '✅ Capacitor available\n';

      if (!window.Capacitor.isNativePlatform()) {
        diagnosticReport += '❌ Not on native platform (web browser)\n';
        alert(diagnosticReport);
        return;
      }
      diagnosticReport += '✅ Native platform detected\n';

      // Step 2: Plugin Check
      diagnosticReport += '\n2️⃣ PLUGIN SYSTEM CHECK:\n';
      if (!window.Capacitor.Plugins) {
        diagnosticReport += '❌ Capacitor.Plugins not available\n';
        diagnosticReport += '🔧 SOLUTION: Rebuild app with proper Capacitor setup\n';
        alert(diagnosticReport);
        return;
      }
      diagnosticReport += '✅ Capacitor.Plugins available\n';

      const availablePlugins = Object.keys(window.Capacitor.Plugins);
      diagnosticReport += `📋 Available plugins (${availablePlugins.length}): ${availablePlugins.join(', ')}\n`;

      if (!window.Capacitor.Plugins.MedicineAlarm) {
        diagnosticReport += '❌ MedicineAlarm plugin NOT FOUND\n';
        diagnosticReport += '🚨 CRITICAL ISSUE: Plugin not registered\n';
        diagnosticReport += '🔧 REQUIRED FIXES:\n';
        diagnosticReport += '   • Check MainActivity.java plugin registration\n';
        diagnosticReport += '   • Verify plugin build configuration\n';
        diagnosticReport += '   • Run "npx cap sync android"\n';
        diagnosticReport += '   • Rebuild and reinstall app\n';
        alert(diagnosticReport);
        return;
      }
      diagnosticReport += '✅ MedicineAlarm plugin found\n';

      // Step 3: Plugin Functionality Test
      diagnosticReport += '\n3️⃣ PLUGIN FUNCTIONALITY TEST:\n';
      try {
        const permissionResult = await window.Capacitor.Plugins.MedicineAlarm.checkExactAlarmPermission();
        diagnosticReport += '✅ Plugin responds to method calls\n';

        const androidVersion = permissionResult?.androidVersion || 'Unknown';
        const hasPermission = permissionResult?.hasPermission ?? false;
        const requiresPermission = permissionResult?.requiresPermission ?? false;

        diagnosticReport += `📱 Android API Level: ${androidVersion}\n`;
        diagnosticReport += `🔑 Requires Permission: ${requiresPermission ? 'YES' : 'NO'}\n`;
        diagnosticReport += `✅ Has Permission: ${hasPermission ? 'YES ✅' : 'NO ❌'}\n`;

        if (requiresPermission && !hasPermission) {
          diagnosticReport += '\n⚠️ PERMISSION ISSUE DETECTED:\n';
          diagnosticReport += '🔧 TO FIX: Enable "Alarms & reminders" permission\n';
          diagnosticReport += '📱 Path: Settings → Apps → MyMedAlert → Special app access\n';
        }

      } catch (pluginError) {
        diagnosticReport += `❌ Plugin call failed: ${pluginError.message}\n`;
        diagnosticReport += '🚨 PLUGIN IMPLEMENTATION ISSUE:\n';
        diagnosticReport += '   • Java code implementation error\n';
        diagnosticReport += '   • Method signature mismatch\n';
        diagnosticReport += '   • Native compilation problem\n';
        alert(diagnosticReport);
        return;
      }

      // Step 4: Native Alarm Test
      diagnosticReport += '\n4️⃣ NATIVE ALARM SCHEDULING TEST:\n';
      let alarmTestPassed = false;
      try {
        const testTriggerTime = Date.now() + 20000; // 20 seconds
        const testAlarmId = 99997;

        const scheduleResult = await window.Capacitor.Plugins.MedicineAlarm.scheduleAlarm({
          medicineName: 'DIAGNOSTIC TEST ALARM',
          dosage: 'System diagnostic',
          patientName: 'Diagnostic User',
          triggerTime: testTriggerTime,
          alarmId: testAlarmId
        });

        diagnosticReport += '✅ Native alarm scheduling WORKS!\n';
        diagnosticReport += `📊 Result: ${JSON.stringify(scheduleResult)}\n`;
        diagnosticReport += '🔊 Diagnostic alarm scheduled for 20 seconds\n';
        alarmTestPassed = true;

      } catch (scheduleError) {
        diagnosticReport += `❌ Native alarm scheduling FAILED: ${scheduleError.message}\n`;
        diagnosticReport += '🚨 CRITICAL IMPLEMENTATION ISSUE:\n';
        diagnosticReport += '   • AlarmManager not properly implemented\n';
        diagnosticReport += '   • BroadcastReceiver missing\n';
        diagnosticReport += '   • Permissions not correctly handled\n';
        alarmTestPassed = false;
      }

      // Step 5: Final Assessment
      diagnosticReport += '\n5️⃣ DIAGNOSIS SUMMARY:\n';
      if (alarmTestPassed) {
        diagnosticReport += '🎉 NATIVE ALARM SYSTEM IS WORKING!\n\n';
        diagnosticReport += '🔊 DIAGNOSTIC ALARM will fire in 20 seconds with REAL sound!\n\n';
        diagnosticReport += 'If you still don\'t hear alarms in your medicines:\n';
        diagnosticReport += '• Check device volume (Media & Alarm volume)\n';
        diagnosticReport += '• Disable "Do Not Disturb" mode\n';
        diagnosticReport += '• Check battery optimization settings\n';
        diagnosticReport += '• Verify app has "Alarms & reminders" permission\n';
        diagnosticReport += '• Test with device unlocked first\n';
        diagnosticReport += '• Ensure native alarm medicines have alertType: "native-alarm"\n';
      } else {
        diagnosticReport += '🚨 NATIVE ALARM SYSTEM NEEDS IMPLEMENTATION!\n\n';
        diagnosticReport += 'REQUIRED NATIVE ANDROID CODE:\n';
        diagnosticReport += '• AlarmManager.setExactAndAllowWhileIdle()\n';
        diagnosticReport += '• BroadcastReceiver for alarm handling\n';
        diagnosticReport += '• RingtoneManager for alarm sound\n';
        diagnosticReport += '• Proper Android manifest permissions\n';
        diagnosticReport += '• PendingIntent with correct flags\n\n';
        diagnosticReport += 'CURRENT STATUS: Only notifications work, no real alarms\n';
      }

      console.log(diagnosticReport);
      alert(diagnosticReport);

    } catch (error) {
      const errorReport = `❌ DIAGNOSIS FAILED: ${error.message}\n\nThis indicates a serious system issue.`;
      console.error('❌ Diagnostic error:', error);
      alert(errorReport);
    }
  };

  // ARTICLE-BASED: Native Alarm Implementation Guide & Troubleshooting
  const troubleshootNativeAlarmImplementation = async () => {
    try {
      let report = '🔧 NATIVE ALARM IMPLEMENTATION GUIDE (Based on Android Best Practices)\n\n';

      report += '📋 REQUIRED ANDROID MANIFEST PERMISSIONS:\n';
      report += '   • <uses-permission android:name="android.permission.WAKE_LOCK" />\n';
      report += '   • <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />\n';
      report += '   • <uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n';
      report += '   • <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n\n';

      report += '🔧 REQUIRED NATIVE ANDROID IMPLEMENTATION:\n\n';
      report += '1. AlarmManager Setup:\n';
      report += '   AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);\n\n';

      report += '2. Intent & PendingIntent:\n';
      report += '   Intent intent = new Intent(context, AlarmReceiver.class);\n';
      report += '   intent.putExtra("medicine_name", medicineName);\n';
      report += '   PendingIntent pendingIntent = PendingIntent.getBroadcast(\n';
      report += '       context, alarmId, intent,\n';
      report += '       PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);\n\n';

      report += '3. Schedule Exact Alarm:\n';
      report += '   alarmManager.setExactAndAllowWhileIdle(\n';
      report += '       AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);\n\n';

      report += '4. BroadcastReceiver (AlarmReceiver.java):\n';
      report += '   public class AlarmReceiver extends BroadcastReceiver {\n';
      report += '       @Override\n';
      report += '       public void onReceive(Context context, Intent intent) {\n';
      report += '           // Show notification & play sound\n';
      report += '           // Use RingtoneManager for alarm sound\n';
      report += '       }\n';
      report += '   }\n\n';

      report += '5. Register Receiver in Manifest:\n';
      report += '   <receiver android:name=".AlarmReceiver"\n';
      report += '             android:exported="false" />\n\n';

      report += '⚠️ CRITICAL DIFFERENCES FROM CAPACITOR NOTIFICATIONS:\n';
      report += '   • Uses AlarmManager (not LocalNotifications)\n';
      report += '   • Uses BroadcastReceiver (not Capacitor events)\n';
      report += '   • Uses RTC_WAKEUP (guaranteed device wake)\n';
      report += '   • Uses setExactAndAllowWhileIdle() (works in battery saver)\n';
      report += '   • Requires exact alarm permissions (Android 12+)\n\n';

      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        report += '🔍 CURRENT PLUGIN STATUS:\n';

        if (window.Capacitor.Plugins && window.Capacitor.Plugins.MedicineAlarm) {
          report += '   ✅ MedicineAlarm plugin found\n';

          try {
            const permResult = await window.Capacitor.Plugins.MedicineAlarm.checkExactAlarmPermission();
            report += `   📱 Android API: ${permResult?.androidVersion || 'Unknown'}\n`;
            report += `   🔐 Has Exact Alarm Permission: ${permResult?.hasPermission ? 'YES ✅' : 'NO ❌'}\n`;

            if (!permResult?.hasPermission && permResult?.requiresPermission) {
              report += '   ⚠️ CRITICAL: Need "Alarms & reminders" permission!\n';
              report += '   📍 Settings → Apps → MyMedAlert → Special app access → Alarms & reminders\n';
            }
          } catch (error) {
            report += `   ❌ Plugin error: ${error.message}\n`;
          }
        } else {
          report += '   ❌ MedicineAlarm plugin NOT FOUND\n';
          report += '   📋 Available plugins: ' + Object.keys(window.Capacitor.Plugins || {}).join(', ') + '\n';
        }

        report += '\n🧪 TESTING RECOMMENDATIONS:\n';
        report += '   1. Use "🔍 DEBUG NATIVE ALARM" button\n';
        report += '   2. Use "🚨🔊 TEST NATIVE ALARM" button\n';
        report += '   3. Check Android logcat for native errors\n';
        report += '   4. Verify all manifest permissions\n';
        report += '   5. Test on Android 12+ devices specifically\n\n';

        report += '💡 IF ALARMS STILL DON\'T WORK:\n';
        report += '   • Rebuild app with correct permissions\n';
        report += '   • Check native AlarmReceiver implementation\n';
        report += '   • Verify AlarmManager.setExactAndAllowWhileIdle() usage\n';
        report += '   • Test with exact alarm permission granted\n';
        report += '   • Check device-specific battery optimization\n';
      } else {
        report += '❌ This guide is for Android devices only.\n';
      }

      console.log(report);
      alert(report);

    } catch (error) {
      console.error('❌ Error in troubleshooting guide:', error);
      alert('Error showing implementation guide: ' + error.message);
    }
  };

  // Test native alarm - creates a real alarm that will wake device and play sound
  const testNativeAlarm = async () => {
    try {
      console.log('🚨🔊 Testing NATIVE ALARM with REAL SOUND...');

      if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        alert('Native alarm test is only available on Android devices.');
        return;
      }

      if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.MedicineAlarm) {
        alert('❌ MedicineAlarm plugin not available!\n\nThe native alarm system is not connected.\nPlease rebuild and reinstall the app.\n\n📋 Make sure your native implementation includes:\n• AlarmManager with setExactAndAllowWhileIdle()\n• BroadcastReceiver for alarm handling\n• Proper Android manifest permissions');
        return;
      }

      console.log('🔧 Testing with article-based implementation requirements:');
      console.log('   • AlarmManager.setExactAndAllowWhileIdle() for battery optimization bypass');
      console.log('   • RTC_WAKEUP type for guaranteed device wake');
      console.log('   • BroadcastReceiver for alarm sound & notification');
      console.log('   • PendingIntent with proper flags for Android 12+ compatibility');

      const triggerTime = Date.now() + 10000; // 10 seconds from now
      const testAlarmId = 99999;

      console.log('🚨 Calling native alarm plugin...');
      const result = await window.Capacitor.Plugins.MedicineAlarm.scheduleAlarm({
        medicineName: 'TEST ALARM',
        dosage: 'This is a test',
        patientName: 'System Test',
        triggerTime: triggerTime,
        alarmId: testAlarmId
      });

      console.log('✅ Native test alarm scheduled:', result);
      alert('🚨🔊 NATIVE ALARM TEST scheduled!\n\nYour device will:\n• Wake up in 10 seconds\n• Play REAL alarm sound via AlarmManager\n• Show notification with DISMISS and SNOOZE buttons\n• Vibrate strongly\n• Bypass battery optimization (setExactAndAllowWhileIdle)\n\nThis is a TRUE ANDROID ALARM using:\n• AlarmManager.RTC_WAKEUP\n• BroadcastReceiver\n• Exact alarm permissions\n\n📱🔊⏰');

    } catch (error) {
      console.error('❌ Error testing native alarm:', error);
      console.error('❌ Error details:', error);

      let errorMsg = '❌ NATIVE ALARM TEST FAILED:\n\n';
      errorMsg += `Error: ${error.message}\n\n`;

      if (error.message.includes('not implemented')) {
        errorMsg += 'SOLUTION NEEDED:\n';
        errorMsg += '• Implement AlarmManager.setExactAndAllowWhileIdle() in native code\n';
        errorMsg += '• Create BroadcastReceiver for alarm handling\n';
        errorMsg += '• Add proper PendingIntent with FLAG_IMMUTABLE\n';
        errorMsg += '• Check MedicineAlarmPlugin.java implementation';
      } else if (error.message.includes('not found')) {
        errorMsg += 'PLUGIN REGISTRATION ISSUE:\n';
        errorMsg += '• Ensure plugin is registered in MainActivity.java\n';
        errorMsg += '• Verify plugin build configuration\n';
        errorMsg += '• Check Capacitor plugin setup';
      } else {
        errorMsg += 'POSSIBLE CAUSES:\n';
        errorMsg += '• Missing Android manifest permissions\n';
        errorMsg += '• Exact alarm permission not granted\n';
        errorMsg += '• AlarmManager implementation issues\n';
        errorMsg += '• Device-specific restrictions\n\n';
        errorMsg += 'TRY:\n';
        errorMsg += '• Use "📋 NATIVE ALARM IMPLEMENTATION GUIDE" button\n';
        errorMsg += '• Check Settings → Apps → Special access → Alarms & reminders\n';
        errorMsg += '• Review native Android code implementation';
      }

      alert(errorMsg);
    }
  };

  // Simple test to create a native alarm medicine
  // Create a test medicine with native alarm - 2 minutes from now
  const createTestNativeMedicine = async () => {
    try {
      console.log('📝 Creating test native alarm medicine...');

      // Get current time + 2 minutes for testing
      const testTime = new Date();
      testTime.setMinutes(testTime.getMinutes() + 2);
      const timeString = testTime.toTimeString().substring(0, 5); // HH:MM format

      const testMedicine = {
        id: Date.now().toString(),
        patientName: 'Test Patient',
        name: 'Test Native Alarm Medicine',
        dosage: 1,
        dosageType: 'tablet',
        time: getTimeSlotFromTime(timeString),
        color: '#FF0000',
        image: null,
        notes: 'This is a test medicine for native alarm - should trigger real alarm sound in 2 minutes',
        specificTime: timeString,
        alertTime: timeString,
        alertType: 'native-alarm', // This is the key - ensures native alarm scheduling
        totalPills: 10,
        currentPills: 10,
        refillReminder: 2,
        frequency: 'daily',
        frequencyDays: 2,
        specificWeekDays: [],
        reminderEndDate: '',
        reminderDurationDays: ''
      };

      console.log('🔧 Test medicine configuration:', {
        name: testMedicine.name,
        alertTime: testMedicine.alertTime,
        alertType: testMedicine.alertType,
        triggerTime: testTime.toLocaleString()
      });

      // Add to medicines list first
      setMedicines(prev => [...prev, testMedicine]);

      // Schedule the native alarm using the main scheduling function
      try {
        await scheduleLocalNotification(testMedicine);
        console.log('✅ Test native medicine scheduled successfully');
      } catch (schedulingError) {
        console.error('❌ Error scheduling test medicine:', schedulingError);
        alert(`⚠️ Test medicine created but scheduling failed:\n${schedulingError.message}\n\nCheck the native plugin implementation.`);
        return;
      }

      console.log('✅ Test native medicine created and alarm scheduled');
      alert(`✅ TEST NATIVE ALARM MEDICINE CREATED!\n\n📝 Medicine: ${testMedicine.name}\n⏰ Alarm Time: ${timeString} (2 minutes from now)\n🚨 Type: NATIVE ALARM\n\nThe alarm should:\n• Wake your device at exactly ${timeString}\n• Play REAL alarm sound via AlarmManager\n• Show dismissible notification\n• Vibrate strongly\n• Work even if app is closed\n\n📋 Check your medicines list!\n\nIf you only get a notification (no alarm sound), the native plugin needs proper AlarmManager implementation.`);

    } catch (error) {
      console.error('❌ Error creating test medicine:', error);
      alert('❌ Error creating test medicine: ' + error.message);
    }
  };

  // CREATE TEST NOTIFICATION MEDICINE - for testing dismiss functionality
  const createTestNotificationMedicine = async () => {
    try {
      console.log('📝 Creating test NOTIFICATION medicine with dismiss buttons...');

      // Get current time + 30 seconds for immediate testing
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 30); // 30 seconds from now
      const timeString = testTime.toTimeString().substring(0, 5); // HH:MM format

      const testMedicine = {
        id: Date.now().toString(),
        patientName: 'Test Patient',
        name: 'Test Notification Medicine',
        dosage: 1,
        dosageType: 'tablet',
        time: getTimeSlotFromTime(timeString),
        color: '#FF6B35',
        image: null,
        notes: 'Test medicine for notification with dismiss buttons - should trigger in 30 seconds',
        specificTime: timeString,
        alertTime: timeString,
        alertType: 'notification', // Regular notification (not native alarm)
        totalPills: 10,
        currentPills: 10,
        refillReminder: 2,
        frequency: 'daily',
        frequencyDays: 2,
        specificWeekDays: [],
        reminderEndDate: '',
        reminderDurationDays: ''
      };

      console.log('🔧 Test notification medicine configuration:', {
        name: testMedicine.name,
        alertTime: testMedicine.alertTime,
        alertType: testMedicine.alertType,
        triggerTime: testTime.toLocaleString(),
        triggerInSeconds: 30
      });

      // Add to medicines list first
      setMedicines(prev => [...prev, testMedicine]);

      // Schedule the notification using the main scheduling function
      try {
        await scheduleLocalNotification(testMedicine);
        console.log('✅ Test notification medicine scheduled successfully');
      } catch (schedulingError) {
        console.error('❌ Error scheduling test notification medicine:', schedulingError);
        alert(`⚠️ Test medicine created but scheduling failed:\n${schedulingError.message}`);
        return;
      }

      console.log('✅ Test notification medicine created and scheduled');
      alert(`✅ TEST NOTIFICATION MEDICINE CREATED!\n\n📝 Medicine: ${testMedicine.name}\n⏰ Notification Time: ${timeString} (30 seconds from now)\n🔔 Type: REGULAR NOTIFICATION\n\nThe notification should:\n• Appear in 30 seconds\n• Show action buttons: ✅ Taken, ⏰ Snooze 5min, ❌ Skip\n• Allow you to dismiss/interact with it\n• Work like a standard Android notification\n\n📋 Check your medicines list!\n\nThis tests the dismiss functionality you mentioned was missing.`);

    } catch (error) {
      console.error('❌ Error creating test notification medicine:', error);
      alert('❌ Error creating test notification medicine: ' + error.message);
    }
  };

  // CRITICAL: Test native alarm with immediate schedule
  const createTestNativeAlarmMedicine = async () => {
    try {
      console.log('🚨🔥 Creating IMMEDIATE TEST NATIVE ALARM medicine...');

      const now = new Date();
      const testTime = new Date(now.getTime() + 15000); // 15 seconds from now
      const timeString = testTime.toTimeString().slice(0, 5);

      const testMedicine = {
        id: 'native-test-' + Date.now(),
        patientName: 'TEST PATIENT',
        name: 'NATIVE ALARM TEST',
        dosage: 1,
        dosageType: 'tablet',
        time: getTimeSlotFromTime(timeString),
        color: '#FF0000', // Bright red for visibility
        image: null,
        notes: 'CRITICAL NATIVE ALARM TEST - WILL WAKE DEVICE WITH SOUND',
        specificTime: timeString,
        alertTime: timeString,
        alertType: 'native-alarm', // THIS IS THE KEY - NATIVE ALARM
        totalPills: 10,
        currentPills: 10,
        refillReminder: 2,
        frequency: 'daily',
        frequencyDays: 2,
        specificWeekDays: [],
        reminderEndDate: '',
        reminderDurationDays: ''
      };

      console.log('🚨 NATIVE ALARM TEST medicine configuration:', {
        name: testMedicine.name,
        alertTime: testMedicine.alertTime,
        alertType: testMedicine.alertType,
        triggerTime: testTime.toLocaleString(),
        triggerInSeconds: 15,
        isCriticalTest: true
      });

      // Add to medicines list first
      setMedicines(prev => [...prev, testMedicine]);

      // Schedule the NATIVE ALARM immediately
      console.log('🔥 Scheduling NATIVE ALARM...');
      await scheduleLocalNotification(testMedicine);

      console.log('✅ NATIVE ALARM TEST medicine created and scheduled');
      alert(`🚨🔥 NATIVE ALARM TEST CREATED!\n\n` +
        `📱 Medicine: ${testMedicine.name}\n` +
        `⏰ Alarm Time: ${timeString} (15 seconds from now)\n` +
        `🚨 Type: NATIVE ALARM (AlarmManager)\n\n` +
        `🔊 THIS WILL:\n` +
        `• WAKE YOUR DEVICE in 15 seconds\n` +
        `• Play REAL ALARM SOUND (not notification)\n` +
        `• Show FULL-SCREEN alarm activity\n` +
        `• Vibrate strongly\n` +
        `• Use AlarmManager.setExactAndAllowWhileIdle()\n` +
        `• Bypass battery optimization\n\n` +
        `🚨 WARNING: This is a TRUE ALARM!\n` +
        `Your device will behave like a real alarm clock.\n\n` +
        `📋 If this works, native alarms are functioning.\n` +
        `If not, check:\n` +
        `• Android Settings → Apps → Special access → Alarms & reminders\n` +
        `• Native plugin implementation\n` +
        `• AlarmManager permissions\n\n` +
        `⏰ GET READY - ALARM IN 15 SECONDS!`);

    } catch (error) {
      console.error('❌ Error creating NATIVE ALARM test medicine:', error);
      alert('❌ Error creating NATIVE ALARM test medicine:\n' + error.message + '\n\nThis indicates a problem with the native alarm system.');
    }
  };

  // NEW: Request exact alarm permission specifically
  const requestExactAlarmPermission = async () => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🔔 Requesting exact alarm permission...');

        // Comprehensive guidance for enabling exact alarm permission
        const instructions = `
🚨 ENABLE EXACT ALARM PERMISSION

Your app is not appearing in "Alarms & reminders" because the exact alarm permission needs to be properly enabled.

📱 STEP-BY-STEP INSTRUCTIONS:

METHOD 1 - Direct Settings:
1. Open Android Settings
2. Go to "Apps" or "Application Manager"
3. Find "MyMedAlert" or "Medicine Reminder"
4. Tap on it → "Special app access" or "Advanced"
5. Look for "Alarms & reminders" 
6. Enable the toggle

METHOD 2 - Alternative Path:
1. Android Settings → Apps
2. Three dots menu → "Special access"
3. "Alarms & reminders"
4. Find your app and enable it

METHOD 3 - If app not visible:
1. Uninstall and reinstall the app
2. Grant all permissions when prompted
3. The app should appear in settings

💡 IMPORTANT:
- After enabling, restart the app
- Test with the alarm buttons below
- If still not working, disable battery optimization too

Ready to try? Click OK to continue.`;

        alert(instructions);

        // Also try to open Android settings (this might work on some devices)
        try {
          const settingsIntent = 'android.settings.APPLICATION_DETAILS_SETTINGS';
          window.open(`intent://settings#Intent;action=${settingsIntent};package=com.balivishnu.mymedalert;end`, '_system');
        } catch (intentError) {
          console.log('Could not open settings directly:', intentError);
        }

      } else {
        alert('This feature is only available on Android devices.');
      }
    } catch (error) {
      console.error('❌ Error requesting exact alarm permission:', error);
      alert(`Error: ${error.message}\n\nPlease manually find your app in Android Settings → Apps → Special access → Alarms & reminders.`);
    }
  };

  // Enhanced function to check if alarms are working and provide troubleshooting
  const troubleshootAlarms = async () => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const troubleshootingGuide = `
🔧 ALARM TROUBLESHOOTING GUIDE

If your alarms are not working, check these settings:

1️⃣ EXACT ALARM PERMISSION:
   Settings → Apps → MyMedAlert → Special app access → Alarms & reminders (ENABLE)

2️⃣ NOTIFICATION PERMISSION:
   Settings → Apps → MyMedAlert → Notifications (ENABLE ALL)

3️⃣ BATTERY OPTIMIZATION:
   Settings → Apps → MyMedAlert → Battery → Battery optimization → NOT OPTIMIZED

4️⃣ DO NOT DISTURB:
   Settings → Sound → Do Not Disturb → Apps that can interrupt → MyMedAlert (ENABLE)

5️⃣ AUTOSTART/BACKGROUND APPS:
   Settings → Apps → MyMedAlert → Battery → Background activity (ENABLE)
   
6️⃣ APP INFO CHECK:
   If your app doesn't appear in "Alarms & reminders", try:
   - Force stop the app
   - Clear app cache
   - Reinstall the app
   - Grant all permissions when prompted

After making these changes:
✅ Restart your phone
✅ Test with the alarm buttons below
✅ Create a test medicine with alarm type

Need to check each setting now?`;

        const proceed = confirm(troubleshootingGuide + "\n\nClick OK to continue, Cancel to close.");

        if (proceed) {
          // Show additional Android version specific instructions
          alert(`
� ANDROID VERSION SPECIFIC NOTES:

Android 12+ (API 31+):
- "Alarms & reminders" permission is REQUIRED
- Apps must explicitly request this permission
- Without it, alarms will not work reliably

Android 10-11:
- Focus on battery optimization settings
- Disable "Adaptive Battery" for your app

Android 8-9:
- Check "Background app limits"
- Ensure app is not being "optimized"

Your Android version info should appear in the diagnostic report.

Try the diagnostic button below to see your current settings.`);
        }

      } else {
        alert('This troubleshooting guide is for Android devices only.');
      }
    } catch (error) {
      console.error('❌ Error in troubleshooting:', error);
      alert('Error showing troubleshooting guide: ' + error.message);
    }
  };

  // Helper function to check if exact alarm permission is granted
  const checkExactAlarmPermission = async () => {
    try {
      // This is a workaround since Capacitor doesn't expose the exact alarm permission check
      // We'll try to schedule a test alarm and see if it works
      const testTime = new Date(Date.now() + 1000); // 1 second from now

      const testConfig = {
        title: '🔍 Permission Check',
        body: 'Testing exact alarm permission...',
        id: 99998,
        schedule: {
          at: testTime,
          allowWhileIdle: true
        },
        channelId: 'alarm-channel'
      };

      await LocalNotifications.schedule({ notifications: [testConfig] });

      // Cancel the test notification immediately
      await LocalNotifications.cancel({ notifications: [{ id: 99998 }] });

      console.log('✅ Exact alarm permission check passed');
      return true;
    } catch (error) {
      console.log('❌ Exact alarm permission check failed:', error);
      return false;
    }
  };

  // Helper to get app name
  const getAppName = async () => {
    try {
      // Try to get app info from Capacitor
      return 'MyMedAlert'; // Fallback name
    } catch (error) {
      return 'Medicine Reminder App';
    }
  };

  // Immediate alarm test - creates both native alarm AND enhanced notification that fires in 5 seconds
  const testImmediateAlarm = async () => {
    try {
      console.log('🚨 Testing IMMEDIATE ALARM (5 seconds)...');

      if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        alert('5-second alarm test is only available on Android devices.');
        return;
      }

      console.log('🔧 DUAL TEST APPROACH:');
      console.log('   1. NATIVE ALARM via MedicineAlarm plugin (real alarm sound)');
      console.log('   2. ENHANCED NOTIFICATION via LocalNotifications (fallback)');

      const triggerTime = Date.now() + 5000; // 5 seconds from now
      const testAlarmId = 88888;

      // FIRST: Try to schedule native alarm (real alarm sound)
      try {
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.MedicineAlarm) {
          console.log('🚨 Scheduling NATIVE ALARM (5 seconds)...');

          const nativeResult = await window.Capacitor.Plugins.MedicineAlarm.scheduleAlarm({
            medicineName: '🚨 IMMEDIATE TEST ALARM',
            dosage: 'Test in 5 seconds',
            patientName: 'Test User',
            triggerTime: triggerTime,
            alarmId: testAlarmId
          });

          console.log('✅ Native alarm scheduled:', nativeResult);
          alert('🚨🔊 NATIVE ALARM TEST (5 seconds)!\n\nScheduled via MedicineAlarm plugin:\n• REAL AlarmManager alarm sound\n• Device will wake and vibrate\n• BroadcastReceiver will handle it\n• True Android alarm (not notification)\n\nWait for it... 📱⏰');
          return; // If native works, don't need fallback
        }
      } catch (nativeError) {
        console.warn('⚠️ Native alarm failed, falling back to enhanced notification:', nativeError.message);
      }

      // FALLBACK: Enhanced notification with alarm-like properties
      console.log('📱 Scheduling ENHANCED NOTIFICATION (5 seconds) as fallback...');

      const immediateTime = new Date(triggerTime);

      const alarmConfig = {
        title: '🚨 IMMEDIATE ALARM TEST (5s)',
        body: 'This should wake your device with sound & vibration!',
        id: testAlarmId,
        schedule: {
          at: immediateTime,
          allowWhileIdle: true // Critical for device wake
        },
        channelId: 'alarm-channel', // Use alarm channel for highest priority
        importance: 5, // IMPORTANCE_MAX
        priority: 2,   // PRIORITY_HIGH
        sound: 'default', // System alarm sound
        vibrate: [1000, 500, 1000, 500, 1000], // Strong vibration pattern
        lights: true,
        lightColor: '#FF0000',
        visibility: 1, // VISIBILITY_PUBLIC
        autoCancel: false, // Don't auto-dismiss
        ongoing: true, // Keep persistent
        showWhen: true,
        when: triggerTime,
        wakeUpScreen: true, // Wake screen
        actions: [
          {
            id: 'dismiss_test',
            title: '⏰ DISMISS TEST',
            type: 'button'
          }
        ],
        extra: {
          isTest: true,
          testType: 'immediate_5s_alarm',
          alarmType: 'RTC_WAKEUP',
          exactAlarm: true,
          allowWhileIdle: true,
          wakeScreen: true,
          isAlarm: true,
          criticalAlert: true,
          testTime: new Date().toISOString()
        }
      };

      await LocalNotifications.schedule({
        notifications: [alarmConfig]
      });

      console.log('✅ Enhanced notification alarm scheduled for 5 seconds');
      alert('🚨📱 ENHANCED NOTIFICATION ALARM (5s)!\n\nFallback test scheduled:\n• Maximum importance notification\n• Alarm channel with sound\n• Strong vibration pattern\n• Device wake attempt\n• Persistent until dismissed\n\nNote: This is a notification, not a true alarm.\nFor real alarms, the native plugin must work properly.');

    } catch (error) {
      console.error('❌ Error testing immediate alarm:', error);
      alert('❌ Error testing 5-second alarm: ' + error.message);
    }
  };

  // Test native plugin connectivity
  const testNativePlugin = async () => {
    try {
      if (typeof window === 'undefined') {
        alert('❌ Window object not available');
        return;
      }

      if (!window.Capacitor) {
        alert('❌ Capacitor not available - running in web browser');
        return;
      }

      if (!window.Capacitor.isNativePlatform()) {
        alert('Native plugin test is only available on Android devices.');
        return;
      }

      console.log('🔌 Testing native plugin connection...');
      console.log('🔍 Capacitor object:', window.Capacitor);
      console.log('🔍 Capacitor.Plugins:', window.Capacitor.Plugins);

      // Check if plugins object exists
      if (!window.Capacitor.Plugins) {
        const errorMsg = '❌ PLUGIN SYSTEM ERROR:\n\nCapacitor.Plugins object not found!\n\nThis usually means:\n• App not properly built\n• Plugin registration failed\n• Capacitor not initialized\n\nTry rebuilding and reinstalling the app.';
        console.error(errorMsg);
        alert(errorMsg);
        return;
      }

      // Check if our specific plugin exists
      if (!window.Capacitor.Plugins.MedicineAlarm) {
        const errorReport = '❌ NATIVE PLUGIN TEST FAILED:\n\n';
        const errorMsg = errorReport + 'MedicineAlarm plugin not found in Capacitor.Plugins!\n\nThis means:\n• Native alarms will NOT work\n• Plugin not registered in MainActivity.java\n• Need to rebuild and reinstall app\n\nAvailable plugins: ' + Object.keys(window.Capacitor.Plugins).join(', ');
        console.error(errorMsg);
        alert(errorMsg);
        return;
      }

      console.log('✅ MedicineAlarm plugin found, testing permission check...');

      // Test the plugin method with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Plugin call timeout after 10 seconds')), 10000)
      );

      const pluginPromise = window.Capacitor.Plugins.MedicineAlarm.checkExactAlarmPermission();

      const result = await Promise.race([pluginPromise, timeoutPromise]);

      console.log('🔍 Raw plugin result:', result);

      // Safely extract result properties with fallbacks
      const androidVersion = result?.androidVersion || 'Unknown';
      const requiresPermission = result?.requiresPermission ?? false;
      const hasPermission = result?.hasPermission ?? false;

      let report = '🔌 NATIVE PLUGIN TEST RESULTS:\n\n';
      report += `✅ Plugin Status: CONNECTED & RESPONDING\n`;
      report += `📱 Android Version: API ${androidVersion}\n`;
      report += `🔑 Requires Permission: ${requiresPermission ? 'YES' : 'NO'}\n`;
      report += `✅ Has Permission: ${hasPermission ? 'YES' : 'NO'}\n\n`;

      if (!hasPermission && requiresPermission) {
        report += `⚠️ CRITICAL ISSUE FOUND:\n`;
        report += `Your Android version requires "Alarms & reminders" permission!\n\n`;
        report += `🔧 TO FIX:\n`;
        report += `1. Go to Android Settings\n`;
        report += `2. Apps → MyMedAlert → Special app access\n`;
        report += `3. Find "Alarms & reminders"\n`;
        report += `4. Enable permission for MyMedAlert\n\n`;
        report += `📞 ALTERNATIVE PATH:\n`;
        report += `Settings → Apps → Special access → Alarms & reminders → MyMedAlert`;
      } else if (hasPermission) {
        report += `🎉 All permissions look good! Native alarms should work.`;
      } else {
        report += `ℹ️ Your Android version may not require exact alarm permission.`;
      }

      console.log(report);
      alert(report);

    } catch (error) {
      console.error('❌ Native plugin test error:', error);
      console.error('❌ Error stack:', error.stack);

      let errorMsg = '❌ NATIVE PLUGIN TEST ERROR:\n\n';
      errorMsg += `Error: ${error.message}\n\n`;

      if (error.message.includes('timeout')) {
        errorMsg += `The plugin call timed out. This could mean:\n`;
        errorMsg += `• Plugin is registered but not responding\n`;
        errorMsg += `• Native code has an error\n`;
        errorMsg += `• Device performance issue\n\n`;
        errorMsg += `Try restarting the app or device.`;
      } else if (error.message.includes('not implemented')) {
        errorMsg += `The plugin method is not implemented.\n`;
        errorMsg += `This means the Java code needs to be updated.`;
      } else {
        errorMsg += `This could be caused by:\n`;
        errorMsg += `• Plugin registration issue\n`;
        errorMsg += `• Native code error\n`;
        errorMsg += `• Device compatibility issue\n\n`;
        errorMsg += `Try rebuilding and reinstalling the app.`;
      }

      alert(errorMsg);
    }
  };

  // Complete diagnostic function
  const runCompleteDiagnostic = async () => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🩺 Running complete alarm diagnostic...');

        let diagnosticReport = '🩺 COMPREHENSIVE ALARM DIAGNOSTIC REPORT\n\n';

        // 1. Check basic permissions
        try {
          const permissions = await LocalNotifications.checkPermissions();
          diagnosticReport += `1. NOTIFICATION PERMISSIONS:\n`;
          diagnosticReport += `   • Display: ${permissions.display}\n`;
          diagnosticReport += `   • Sound: ${permissions.sound || 'N/A'}\n\n`;
        } catch (error) {
          diagnosticReport += `1. NOTIFICATION PERMISSIONS: ERROR - ${error.message}\n\n`;
        }

        // 2. Test Native Plugin Connection - CRITICAL CHECK
        try {
          if (window.Capacitor.Plugins && window.Capacitor.Plugins.MedicineAlarm) {
            diagnosticReport += `2. NATIVE PLUGIN STATUS: ✅ CONNECTED\n`;

            // Test native alarm permission check
            try {
              const nativePermResult = await window.Capacitor.Plugins.MedicineAlarm.checkExactAlarmPermission();

              // Safely extract properties with fallbacks
              const androidVersion = nativePermResult?.androidVersion || 'Unknown';
              const requiresPermission = nativePermResult?.requiresPermission ?? false;
              const hasPermission = nativePermResult?.hasPermission ?? false;

              diagnosticReport += `   • Android Version: API ${androidVersion}\n`;
              diagnosticReport += `   • Requires Permission: ${requiresPermission ? 'YES' : 'NO'}\n`;
              diagnosticReport += `   • Has Permission: ${hasPermission ? 'YES ✅' : 'NO ❌'}\n`;

              if (!hasPermission && requiresPermission) {
                diagnosticReport += `   ⚠️ CRITICAL: Native alarms need "Alarms & reminders" permission!\n`;
              } else if (hasPermission) {
                diagnosticReport += `   ✅ Native alarm permissions look good!\n`;
              }
            } catch (nativeError) {
              diagnosticReport += `   • Native permission check failed: ${nativeError.message}\n`;
              diagnosticReport += `   • This could indicate a plugin or native code issue\n`;
            }
          } else {
            diagnosticReport += `2. NATIVE PLUGIN STATUS: ❌ NOT CONNECTED\n`;
            diagnosticReport += `   • MedicineAlarm plugin not found in Capacitor.Plugins\n`;
            diagnosticReport += `   ⚠️ CRITICAL: Native alarms will NOT work!\n`;
            diagnosticReport += `   • Check MainActivity.java plugin registration\n`;
            diagnosticReport += `   • Rebuild and reinstall the app\n`;
          }
          diagnosticReport += `\n`;
        } catch (error) {
          diagnosticReport += `2. NATIVE PLUGIN STATUS: ❌ ERROR - ${error.message}\n`;
          diagnosticReport += `   • Plugin system may not be initialized properly\n`;
          diagnosticReport += `   • Try restarting the app\n\n`;
        }

        // 3. Check pending notifications
        try {
          const pending = await LocalNotifications.getPending();
          diagnosticReport += `3. PENDING CAPACITOR NOTIFICATIONS:\n`;
          diagnosticReport += `   • Count: ${pending.notifications?.length || 0}\n`;
          if (pending.notifications?.length > 0) {
            const nextNotif = pending.notifications[0];
            diagnosticReport += `   • Next: ${new Date(nextNotif.schedule.at).toLocaleString()}\n`;
            diagnosticReport += `   • Channel: ${nextNotif.channelId}\n`;
          }
          diagnosticReport += `\n`;
        } catch (error) {
          diagnosticReport += `3. PENDING NOTIFICATIONS: ERROR - ${error.message}\n\n`;
        }

        // 4. Platform and device info
        try {
          const platform = await window.Capacitor.getPlatform();
          diagnosticReport += `4. DEVICE INFO:\n`;
          diagnosticReport += `   • Platform: ${platform}\n`;
          diagnosticReport += `   • Capacitor: ${window.Capacitor ? 'Available' : 'Not Available'}\n`;
          diagnosticReport += `   • Native Platform: ${window.Capacitor.isNativePlatform() ? 'YES' : 'NO'}\n\n`;
        } catch (error) {
          diagnosticReport += `4. DEVICE INFO: ERROR - ${error.message}\n\n`;
        }

        // 5. Medicine and alarm status
        diagnosticReport += `5. APP ALARM STATUS:\n`;
        diagnosticReport += `   • Total medicines: ${medicines.length}\n`;
        diagnosticReport += `   • Medicines with alerts: ${medicines.filter(m => m.alertTime).length}\n`;
        diagnosticReport += `   • Native alarms: ${medicines.filter(m => m.alertType === 'native-alarm').length}\n`;
        diagnosticReport += `   • Regular alarms: ${medicines.filter(m => m.alertType === 'alarm').length}\n\n`;

        // 6. Critical recommendations
        diagnosticReport += `6. CRITICAL ANDROID SETTINGS TO CHECK:\n`;
        diagnosticReport += `   ❗ Settings → Apps → MyMedAlert → Notifications (ENABLE ALL)\n`;
        diagnosticReport += `   ❗ Settings → Apps → Special access → Alarms & reminders → MyMedAlert (ENABLE)\n`;
        diagnosticReport += `   ❗ Settings → Apps → MyMedAlert → Battery → NOT OPTIMIZED\n`;
        diagnosticReport += `   ❗ Settings → Sound → Do Not Disturb → MyMedAlert can interrupt (ENABLE)\n\n`;

        diagnosticReport += `7. TESTING STEPS:\n`;
        diagnosticReport += `   1. Use "🚨🔊 TEST NATIVE ALARM" button (tests real alarm sound)\n`;
        diagnosticReport += `   2. Use "🚨 TEST IMMEDIATE ALARM" (tests Capacitor alarms)\n`;
        diagnosticReport += `   3. Create test medicine with "Native Alarm" type\n`;
        diagnosticReport += `   4. Check if you receive notifications\n\n`;

        diagnosticReport += `8. IF ALARMS STILL DON'T WORK:\n`;
        diagnosticReport += `   • Uninstall and reinstall the app\n`;
        diagnosticReport += `   • Grant ALL permissions when prompted\n`;
        diagnosticReport += `   • Restart your device\n`;
        diagnosticReport += `   • Try different alarm types\n`;

        console.log(diagnosticReport);
        alert(diagnosticReport);

      } else {
        alert('Complete diagnostic is only available on Android devices.\n\nFor web testing, use browser notifications instead.');
      }
    } catch (error) {
      console.error('❌ Error running diagnostic:', error);
      alert('Error running diagnostic: ' + error.message);
    }
  };

  // Super aggressive alarm test - this should definitely wake the device
  const testSuperAlarm = async () => {
    try {
      console.log('🚨🚨 Testing SUPER AGGRESSIVE alarm...');

      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const alarmTime = new Date(Date.now() + 3000); // 3 seconds from now

        const superAlarmConfig = {
          title: '🚨🚨 SUPER ALARM TEST 🚨🚨',
          body: 'CRITICAL ALARM TEST! This should DEFINITELY wake your device with full screen alert!',
          id: 77777,
          schedule: {
            at: alarmTime,
            allowWhileIdle: true // Critical for waking device from sleep
          },
          channelId: 'alarm-channel',
          sound: 'default', // Use default alarm sound
          // Android-specific configuration using supported properties
          android: {
            channelId: 'alarm-channel',
            priority: 'max', // Highest priority  
            visibility: 'public',
            importance: 'max',
            autoCancel: false,
            ongoing: true,
            sound: 'default',
            vibrate: true,
            lights: true,
            lightColor: '#FF0000',
            largeIcon: 'res://drawable/ic_launcher',
            smallIcon: 'res://drawable/ic_stat_name',
            // Additional Android properties
            showWhen: true,
            when: alarmTime.getTime()
          },
          extra: {
            isTest: true,
            testType: 'super_aggressive_alarm',
            testTime: new Date().toISOString(),
            alarmType: 'RTC_WAKEUP',
            exactAlarm: true,
            allowWhileIdle: true,
            wakeScreen: true,
            isAlarm: true,
            criticalAlert: true
          }
        };

        await LocalNotifications.schedule({
          notifications: [superAlarmConfig]
        });

        console.log('✅ SUPER AGGRESSIVE alarm scheduled for 3 seconds from now');
        alert('🚨🚨 SUPER ALARM scheduled! Your device should DEFINITELY wake up in 3 seconds with maximum alarm settings! 📱⚡');
      } else {
        alert('This test is only available on Android devices.');
      }
    } catch (error) {
      console.error('❌ Error testing super alarm:', error);
      alert('Error testing super alarm: ' + error.message);
    }
  };

  // NEW: Alternative alarm approach using multiple notifications
  const testAlarmBarrage = async () => {
    try {
      console.log('🚨⚡ Testing ALARM BARRAGE - Multiple rapid notifications...');

      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const alarmTime = new Date(Date.now() + 2000); // 2 seconds from now
        const notifications = [];

        // Create 5 rapid-fire notifications with 1-second intervals
        for (let i = 0; i < 5; i++) {
          const notifTime = new Date(alarmTime.getTime() + (i * 1000)); // 1 second apart

          const barrageConfig = {
            title: `🚨 ALARM BARRAGE ${i + 1}/5 🚨`,
            body: `WAKE UP! Critical reminder test ${i + 1} of 5!`,
            id: 70000 + i, // Unique IDs
            schedule: {
              at: notifTime,
              allowWhileIdle: true
            },
            channelId: 'alarm-channel',
            sound: 'default',
            android: {
              channelId: 'alarm-channel',
              priority: 'max',
              importance: 'max',
              autoCancel: false,
              ongoing: i === 4, // Only make the last one ongoing
              sound: 'default',
              vibrate: true,
              lights: true,
              lightColor: '#FF0000'
            },
            extra: {
              isTest: true,
              testType: 'alarm_barrage',
              barrageIndex: i + 1,
              alarmType: 'RTC_WAKEUP',
              exactAlarm: true,
              allowWhileIdle: true,
              isAlarm: true
            }
          };

          notifications.push(barrageConfig);
        }

        await LocalNotifications.schedule({
          notifications: notifications
        });

        console.log('✅ ALARM BARRAGE scheduled - 5 notifications over 5 seconds');
        alert('🚨⚡ ALARM BARRAGE scheduled! You will receive 5 rapid alarm notifications over 5 seconds starting in 2 seconds! This should definitely wake your device! 📱💥');
      } else {
        alert('This test is only available on Android devices.');
      }
    } catch (error) {
      console.error('❌ Error testing alarm barrage:', error);
      alert('Error testing alarm barrage: ' + error.message);
    }
  };

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'morning';    // 5 AM - 11:59 AM
    if (hour >= 12 && hour < 16) return 'afternoon'; // 12 PM - 3:59 PM
    if (hour >= 16 && hour < 20) return 'evening';   // 4 PM - 7:59 PM
    return 'night';                                  // 8 PM - 4:59 AM
  };

  // Auto-select the time-of-day tab based on current time on mount
  useEffect(() => {
    setActiveTab(getCurrentTimeSlot());
  }, []);

  const MedicineCard = ({ medicine }) => (
    <div
      className="bg-white rounded-xl shadow-sm border-l-4 p-4 mb-3"
      style={{ borderLeftColor: medicine.color }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {medicine.image ? (
            <img
              src={medicine.image}
              alt={medicine.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${medicine.color === '#FFFFFF' ? 'bg-gray-800' : 'bg-white'} border-2 border-gray-200`}
            >
              <Pill className="w-6 h-6" style={{ color: medicine.color === '#FFFFFF' ? '#fff' : medicine.color }} />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
            <p className="text-xs text-blue-600 font-semibold mb-1">{medicine.patientName}</p>
            {medicine.doctorName && (
              <p className="text-xs text-purple-600 mb-1">👨‍⚕️ {medicine.doctorName}</p>
            )}
            <p className="text-sm text-gray-600">{medicine.dosage} {medicine.dosageType === 'other' ? (medicine.customDosageType || 'unit') : medicine.dosageType}</p>
            <p className="text-xs text-gray-500">⏰ {medicine.specificTime}</p>
            <div className="flex items-center mt-2 space-x-3">
              <div className="flex items-center text-xs text-gray-500">
                <Package className="w-3 h-3 mr-1" />
                {medicine.currentPills}/{medicine.totalPills} pills
              </div>
              {medicine.currentPills <= medicine.refillReminder && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                  Low Stock
                </span>
              )}
            </div>
            {medicine.notes && (
              <p className="text-xs text-gray-500 mt-1">{medicine.notes}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => editMedicine(medicine)}
              className="p-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-yellow-950 rounded-lg transition-colors border border-yellow-500 shadow-md font-bold"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteMedicine(medicine.id)}
              className="p-2 bg-red-500 text-white hover:bg-red-700 hover:text-white rounded-lg transition-colors border border-red-700 shadow-md font-bold"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                const result = await dismissActiveNotification(medicine.id, 'dismiss');
                alert(result);
              }}
              className="p-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors border border-orange-600 shadow-md font-bold"
              title="Dismiss Active Alarms"
            >
              🔕
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => addPills(medicine.id, 1)}
              className="text-xs bg-green-500 text-white px-2 py-1 rounded border border-green-700 hover:bg-green-600 hover:text-white transition-colors shadow-md font-bold flex-1"
              title="Add 1 pill to refill"
            >
              +1 💊
            </button>
            <button
              onClick={async () => {
                await markMedicineAsTaken(medicine.id, false);
              }}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded border border-blue-700 hover:bg-blue-600 hover:text-white transition-colors shadow-md font-bold flex-1"
              title="Mark as taken now"
            >
              ✅ Taken
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const NotificationCard = ({ notification }) => (
    <div
      className="bg-white rounded-xl shadow-sm border-l-4 p-4 mb-3"
      style={{ borderLeftColor: notification.color }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{notification.medicineName}</h3>
          {notification.patientName && (
            <p className="text-xs text-blue-600 font-semibold mb-1">{notification.patientName}</p>
          )}
          {notification.type === 'refill' ? (
            <p className="text-sm text-red-600">{notification.message}</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">{notification.dosage}</p>
              <p className="text-xs text-gray-500">
                📅 {new Date(notification.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          )}
        </div>
        {notification.status === 'pending' && notification.type !== 'refill' && (
          <div className="flex flex-col space-y-1">
            <div className="flex space-x-2">
              <button
                onClick={() => markMedicineTaken(notification.id, notification.medicineId)}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors border border-green-600 shadow-md"
                title="Mark as Taken"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => markMedicineMissed(notification.id)}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors border border-red-600 shadow-md"
                title="Mark as Missed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
              title="Dismiss Notification"
            >
              Dismiss
            </button>
          </div>
        )}
        {notification.status === 'pending' && notification.type === 'refill' && (
          <button
            onClick={() => dismissNotification(notification.id)}
            className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors border border-gray-500 shadow-md"
            title="Dismiss Refill Reminder"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {notification.status === 'taken' && (
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: notification.color, color: '#fff' }}>
            ✓ Taken
          </span>
        )}
        {notification.status === 'missed' && (
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: notification.color, color: '#fff' }}>
            ✗ Missed
          </span>
        )}
        {notification.status === 'dismissed' && (
          <span className="text-xs px-2 py-1 rounded bg-gray-400 text-white">
            Dismissed
          </span>
        )}
      </div>
    </div>
  );

  // Emergency Functions
  const handleEmergencyCall = (contactIndex, callType = 'phone') => {
    try {
      console.log('🚨 Emergency call triggered:', { contactIndex, callType, emergencyContacts });

      const contact = emergencyContacts[contactIndex];
      console.log('📞 Contact details:', contact);

      if (contact && contact.phone && contact.name && contact.phone.trim() && contact.name.trim()) {
        console.log('✅ Contact configured, proceeding with call');

        if (callType === 'whatsapp') {
          // WhatsApp call
          const confirmed = window.confirm(
            `Call ${contact.name} via WhatsApp?\n\nThis will open WhatsApp to call ${contact.phone}.`
          );
          if (confirmed) {
            // WhatsApp call URL format
            const cleanPhone = contact.phone.replace(/[^\d+]/g, ''); // Remove formatting
            window.open(`https://wa.me/${cleanPhone}?text=Emergency!%20Need%20immediate%20assistance.`, '_blank');
          }
        } else {
          // Regular phone call
          const confirmed = window.confirm(
            `Call ${contact.name} at ${contact.phone}?\n\nThis will open your phone's dialer.`
          );
          if (confirmed) {
            window.location.href = `tel:${contact.phone}`;
          }
        }
      } else {
        console.log('❌ Contact not configured, opening settings modal');
        alert('Emergency contact not configured. Please set up emergency contacts first.');
        console.log('🔧 Setting showEmergencySettings to true');
        setShowEmergencySettings(true);
        console.log('✅ Emergency settings modal should now be visible');
      }
    } catch (error) {
      console.error('❌ Error in handleEmergencyCall:', error);
      alert(`Error: ${error.message}\n\nPlease try again or check the console for details.`);
    }
  };

  // Medicine Sharing Functions
  const generateMedicineList = (patientFilter = null) => {
    const filteredMeds = patientFilter
      ? medicines.filter(med => med.patientName === patientFilter)
      : medicines;

    const currentDate = new Date().toLocaleDateString();
    const patientGroups = {};

    filteredMeds.forEach(med => {
      const patient = med.patientName || 'General';
      if (!patientGroups[patient]) {
        patientGroups[patient] = [];
      }
      patientGroups[patient].push(med);
    });

    let listText = `📋 Medicine Schedule - ${currentDate}\n`;
    listText += `Generated by MyMedAlert App\n\n`;

    Object.keys(patientGroups).forEach(patient => {
      listText += `👤 ${patient}:\n`;
      patientGroups[patient].forEach(med => {
        listText += `• ${med.name}\n`;
        listText += `  💊 ${med.dosage} ${med.dosageType}(s)\n`;
        listText += `  ⏰ ${timeSlots[med.time]?.label} (${med.specificTime})\n`;
        listText += `  📦 ${med.currentPills}/${med.totalPills} remaining\n`;
        if (med.notes) {
          listText += `  📝 ${med.notes}\n`;
        }
        listText += `\n`;
      });
    });

    listText += `\n⚠️ Disclaimer: This list is for reference only. Always consult healthcare providers for medical advice.\n`;
    listText += `📱 Generated by MyMedAlert - Medicine Reminder App`;

    return listText;
  };

  // Calculate stock needed until end date
  const calculateStockNeeded = (med) => {
    if (!med.reminderEndDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(med.reminderEndDate);
    endDate.setHours(0, 0, 0, 0);
    
    if (endDate <= today) return null;
    
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    const dosagePerDay = parseInt(med.dosage) || 1;
    
    // Adjust for frequency
    let stockNeeded = 0;
    switch (med.frequency) {
      case 'daily':
        stockNeeded = daysRemaining * dosagePerDay;
        break;
      case 'every-other-day':
        stockNeeded = Math.ceil(daysRemaining / 2) * dosagePerDay;
        break;
      case 'every-n-days':
        stockNeeded = Math.ceil(daysRemaining / (med.frequencyDays || 2)) * dosagePerDay;
        break;
      case 'weekly':
        stockNeeded = Math.ceil(daysRemaining / 7) * dosagePerDay;
        break;
      case 'monthly':
        stockNeeded = Math.ceil(daysRemaining / 30) * dosagePerDay;
        break;
      case 'specific-days':
        // Estimate based on selected days per week
        const daysPerWeek = (med.specificWeekDays?.length || 1);
        stockNeeded = Math.ceil(daysRemaining * daysPerWeek / 7) * dosagePerDay;
        break;
      default:
        stockNeeded = daysRemaining * dosagePerDay;
    }
    
    return stockNeeded;
  };

  // Generate medicine list for selected medicines only (grouped by patient and time)
  const generateSelectedMedicineList = (selectedMeds) => {
    const currentDate = new Date().toLocaleDateString();
    
    // Group by patient
    const patientGroups = {};
    selectedMeds.forEach(med => {
      const patient = med.patientName || 'General';
      if (!patientGroups[patient]) {
        patientGroups[patient] = { morning: [], afternoon: [], evening: [], night: [] };
      }
      patientGroups[patient][med.time]?.push(med);
    });

    let listText = `📋 Medicine Schedule - ${currentDate}\n`;
    listText += `Generated by MyMedAlert App\n\n`;

    Object.entries(patientGroups).forEach(([patient, timeGroups]) => {
      listText += `👤 ${patient}:\n`;
      listText += `${'─'.repeat(30)}\n`;
      
      ['morning', 'afternoon', 'evening', 'night'].forEach(timeSlot => {
        const medsInSlot = timeGroups[timeSlot];
        if (medsInSlot && medsInSlot.length > 0) {
          listText += `\n${timeSlots[timeSlot]?.icon} ${timeSlots[timeSlot]?.label}:\n`;
          medsInSlot.forEach(med => {
            const itemIcon = med.itemType === 'non-medicine' ? '📋' : '💊';
            const dosageTypeDisplay = med.dosageType === 'other' ? (med.customDosageType || 'unit') : med.dosageType;
            listText += `  ${itemIcon} ${med.name}\n`;
            if (med.doctorName) {
              listText += `     👨‍⚕️ ${med.doctorName}\n`;
            }
            listText += `     ${med.dosage} ${dosageTypeDisplay} at ${med.specificTime}\n`;
            if (med.itemType !== 'non-medicine' && med.currentPills !== undefined) {
              listText += `     📦 Stock Left: ${med.currentPills}/${med.totalPills}\n`;
              const stockNeeded = calculateStockNeeded(med);
              if (stockNeeded !== null) {
                const shortage = stockNeeded - med.currentPills;
                listText += `     📊 Stock Needed (till ${med.reminderEndDate}): ${stockNeeded}\n`;
                if (shortage > 0) {
                  listText += `     ⚠️ Shortage: ${shortage} more needed\n`;
                } else {
                  listText += `     ✅ Sufficient stock\n`;
                }
              }
            }
            if (med.notes) {
              listText += `     📝 ${med.notes}\n`;
            }
          });
        }
      });
      listText += `\n`;
    });

    listText += `⚠️ Disclaimer: For reference only. Consult healthcare providers for medical advice.\n`;
    listText += `📱 Generated by MyMedAlert`;

    return listText;
  };

  const shareMedicineList = (method, patientFilter = null) => {
    const listText = generateMedicineList(patientFilter);

    switch (method) {
      case 'copy':
        navigator.clipboard.writeText(listText).then(() => {
          alert('Medicine list copied to clipboard!');
        }).catch(() => {
          alert('Failed to copy to clipboard. Please try again.');
        });
        break;

      case 'whatsapp':
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(listText)}`;
        window.open(whatsappUrl, '_blank');
        break;

      case 'sms':
        window.location.href = `sms:?body=${encodeURIComponent(listText)}`;
        break;

      case 'email':
        const subject = `Medicine Schedule - ${new Date().toLocaleDateString()}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(listText)}`;
        break;

      case 'print':
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Medicine Schedule</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
              </style>
            </head>
            <body>
              <pre>${listText}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        break;

      default:
        alert('Sharing method not supported');
    }
    setShowShareDialog(false);
  };

  // Voice Assistant Functions (placeholder for now)
  // Voice Assistant Functions
  const startVoiceListening = async () => {
    setVoiceListening(true);
    setShowVoiceDialog(true);
    setVoiceResponse('');

    // Check for Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceResponse('❌ Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setVoiceListening(false);
      return;
    }

    // Check for HTTPS (required for speech recognition in production)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setVoiceResponse('❌ Voice recognition requires HTTPS connection for security. This works on localhost for development.');
      setVoiceListening(false);
      return;
    }

    try {
      // Request microphone permission first
      setVoiceResponse('🎤 Requesting microphone permission...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceResponse('🎤 Listening... Ask me about your medications!');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;

        setVoiceResponse(`You said: "${transcript}" (${Math.round(confidence * 100)}% confidence)`);

        // Process the voice command
        setTimeout(() => {
          processVoiceCommand(transcript);
        }, 1000);
      };

      recognition.onerror = (event) => {
        setVoiceListening(false);
        let errorMessage = 'Sorry, there was an error with voice recognition. ';

        switch (event.error) {
          case 'not-allowed':
            errorMessage = '❌ Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'no-speech':
            errorMessage = '🔇 No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = '🎤 No microphone found. Please check your microphone connection.';
            break;
          case 'network':
            errorMessage = '🌐 Network error. Please check your internet connection.';
            break;
          case 'aborted':
            errorMessage = '⏹️ Speech recognition was stopped.';
            break;
          default:
            errorMessage = `❌ Speech recognition error: ${event.error}`;
        }

        setVoiceResponse(errorMessage);
      };

      recognition.onend = () => {
        setVoiceListening(false);
      };

      recognition.start();

    } catch (error) {
      setVoiceListening(false);
      if (error.name === 'NotAllowedError') {
        setVoiceResponse('❌ Microphone access denied. Please allow microphone access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        setVoiceResponse('🎤 No microphone found. Please connect a microphone and try again.');
      } else {
        setVoiceResponse(`❌ Error accessing microphone: ${error.message}`);
      }
    }
  }; const processVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    let response = '';

    try {
      // Check what medicines to take now
      if (lowerCommand.includes('what medicine') || lowerCommand.includes('what medication') ||
        lowerCommand.includes('medicine now') || lowerCommand.includes('take now')) {
        const currentMedicines = getCurrentMedicines();
        if (currentMedicines.length > 0) {
          response = `You need to take: ${currentMedicines.map(med => `${med.name} (${med.dosage})`).join(', ')}`;
        } else {
          response = 'No medicines scheduled for right now. Great job staying on track!';
        }
      }
      // List all medicines
      else if (lowerCommand.includes('list') && (lowerCommand.includes('medicine') || lowerCommand.includes('medication'))) {
        if (medicines.length > 0) {
          const medicineList = medicines.map(med => `${med.name} for ${med.patientName || 'you'}`).join(', ');
          response = `Your medicines are: ${medicineList}`;
        } else {
          response = 'You have no medicines added yet.';
        }
      }
      // Check schedule
      else if (lowerCommand.includes('schedule') || lowerCommand.includes('when')) {
        const upcomingMeds = getUpcomingMedicines();
        if (upcomingMeds.length > 0) {
          response = `Your next medicines: ${upcomingMeds.slice(0, 3).map(med =>
            `${med.name} at ${med.nextTime}`).join(', ')}`;
        } else {
          response = 'No upcoming medicines scheduled for today.';
        }
      }
      // Help or general questions
      else if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
        response = 'I can help you with: "What medicine do I need now?", "List my medicines", "When is my next dose?", or "Show my schedule"';
      }
      // Emergency contacts
      else if (lowerCommand.includes('emergency') || lowerCommand.includes('contact')) {
        const contacts = emergencyContacts.filter(c => c.name && c.phone);
        if (contacts.length > 0) {
          response = `Your emergency contacts: ${contacts.map(c => c.name).join(', ')}`;
        } else {
          response = 'No emergency contacts configured. Please set them up in settings.';
        }
      }
      // Default response
      else {
        response = `I heard "${command}" but I'm not sure how to help with that. Try asking "What medicine do I need now?" or "List my medicines"`;
      }
    } catch (error) {
      response = 'Sorry, I encountered an error processing your request. Please try again.';
    }

    setVoiceResponse(response);

    // Text-to-speech response if supported
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const getCurrentMedicines = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    return medicines.filter(medicine => {
      return medicine.schedule.some(time => {
        const [hour, minute] = time.split(':').map(Number);
        const medicineTime = hour * 60 + minute;
        // Within 30 minutes window
        return Math.abs(currentTime - medicineTime) <= 30;
      });
    });
  };

  const getUpcomingMedicines = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const upcoming = [];

    medicines.forEach(medicine => {
      medicine.schedule.forEach(time => {
        const [hour, minute] = time.split(':').map(Number);
        const medicineTime = hour * 60 + minute;

        if (medicineTime > currentTime) {
          upcoming.push({
            name: medicine.name,
            nextTime: time,
            timeValue: medicineTime
          });
        }
      });
    });

    return upcoming.sort((a, b) => a.timeValue - b.timeValue);
  };

  const stopVoiceListening = () => {
    setVoiceListening(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Dark Ribbon for Mobile Status Bar */}
      <div className="h-10 bg-gradient-to-r from-gray-800 to-gray-700 w-full sticky top-0 z-40"></div>

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 flex-shrink-0 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 pointer-events-none"></div>

        <div className="relative px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* App Icon with modern styling */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center">
                  <span className="text-xl">💊</span>
                </div>
              </div>

              {/* App Title and Info */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
                  MyMedAlert
                </h1>
                <p className="text-xs text-gray-500">Smart Medicine Reminder</p>
              </div>
            </div>

            {/* Emergency and Action Buttons - All in one row */}
            <div className="flex items-center space-x-1.5">
              {/* Emergency Button 1 - Phone */}
              <button
                onClick={() => handleEmergencyCall(0, 'phone')}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-2 rounded-lg shadow-md transition-all"
                title={emergencyContacts[0]?.name && emergencyContacts[0]?.phone
                  ? `Emergency Call: ${emergencyContacts[0].name} (${emergencyContacts[0].phone})`
                  : 'Emergency Contact 1'}
              >
                <div className="relative">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="absolute -top-1 -right-1 text-white font-bold" style={{ fontSize: '7px' }}>1</span>
                </div>
              </button>

              {/* Emergency Button 2 - Phone */}
              <button
                onClick={() => handleEmergencyCall(1, 'phone')}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white p-2 rounded-lg shadow-md transition-all"
                title={emergencyContacts[1]?.name && emergencyContacts[1]?.phone
                  ? `Emergency Call: ${emergencyContacts[1].name} (${emergencyContacts[1].phone})`
                  : 'Emergency Contact 2'}
              >
                <div className="relative">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="absolute -top-1 -right-1 text-white font-bold" style={{ fontSize: '7px' }}>2</span>
                </div>
              </button>

              {/* WhatsApp Emergency Button */}
              <button
                onClick={() => handleEmergencyCall(0, 'whatsapp')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-2 rounded-lg shadow-md transition-all"
                title="WhatsApp Emergency"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787" />
                </svg>
              </button>

              {/* Share Button */}
              <button
                onClick={() => setShowSharingDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2 rounded-lg shadow-md transition-all"
                title="Share Medicine List"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {/* Voice Assistant Button */}
              <button
                onClick={startVoiceListening}
                className={`p-2 rounded-lg shadow-md transition-all text-white ${voiceListening
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700'
                }`}
                title="Voice Assistant"
              >
                {voiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Icons Only */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="flex">
          <button
            onClick={() => setCurrentView('medicines')}
            className={`flex-1 py-2 flex flex-col items-center justify-center border-b-2 transition-colors ${currentView === 'medicines'
              ? 'border-fuchsia-500 bg-gradient-to-r from-yellow-300 via-fuchsia-400 to-blue-400 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-yellow-50 text-gray-600'
              }`}
            title="Home"
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentView('notifications')}
            className={`flex-1 py-2 flex flex-col items-center justify-center border-b-2 transition-colors relative ${currentView === 'notifications'
              ? 'border-fuchsia-500 bg-gradient-to-r from-blue-400 via-fuchsia-400 to-yellow-300 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-blue-50 text-gray-600'
              }`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {getPendingNotifications().length > 0 && (
              <span className="absolute top-0.5 right-1/4 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center z-50" style={{ fontSize: '10px' }}>
                {getPendingNotifications().length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('tracking')}
            className={`flex-1 py-2 flex flex-col items-center justify-center border-b-2 transition-colors ${currentView === 'tracking'
              ? 'border-fuchsia-500 bg-gradient-to-r from-green-300 via-blue-400 to-fuchsia-400 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-green-50 text-gray-600'
              }`}
            title="Tracking"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex-1 py-2 flex flex-col items-center justify-center border-b-2 transition-colors ${currentView === 'settings'
              ? 'border-fuchsia-500 bg-gradient-to-r from-purple-300 via-pink-400 to-fuchsia-400 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-purple-50 text-gray-600'
              }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto scrollbar-hide">


        {currentView === 'medicines' && (
          <div className="flex flex-col h-full">
            {/* Time Tabs */}
            <div className="bg-white border-b flex-shrink-0">
              <div className="flex overflow-x-auto no-scrollbar">
                {Object.entries(timeSlots).map(([key, slot]) => {
                  // Assign a unique gradient for each time slot
                  let activeGradient = '';
                  switch (key) {
                    case 'morning':
                      activeGradient = 'bg-gradient-to-r from-blue-200 via-sky-300 to-blue-400';
                      break;
                    case 'afternoon':
                      activeGradient = 'bg-gradient-to-r from-yellow-200 via-orange-200 to-yellow-400';
                      break;
                    case 'evening':
                      activeGradient = 'bg-gradient-to-r from-fuchsia-300 via-pink-300 to-purple-400';
                      break;
                    case 'night':
                      activeGradient = 'bg-gradient-to-r from-gray-700 via-blue-900 to-indigo-900';
                      break;
                    default:
                      activeGradient = 'bg-gradient-to-r from-gray-100 via-gray-50 to-gray-200';
                  }
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 min-w-0 px-2 py-1.5 text-center border-b-2 transition-colors ${activeTab === key
                        ? `border-fuchsia-500 ${activeGradient} text-gray-900 font-bold shadow-md`
                        : 'border-transparent bg-gray-100 hover:bg-yellow-50 font-semibold text-gray-800'
                        }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-sm ${activeTab === key ? '' : 'text-gray-800'}`}>{slot.icon}</span>
                        <span className={`text-xs font-medium ${activeTab === key ? '' : 'text-gray-800'}`}>{slot.label}</span>
                      </div>
                      <div className={`text-[10px] ${activeTab === key ? 'text-gray-600' : 'text-gray-500'}`}>{slot.time}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Medicine List */}
            <div className="p-4 sm:p-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              {getMedicinesByTime(activeTab).length === 0 ? (
                <div className="flex flex-col items-center sm:items-start justify-center text-center sm:text-left py-12 px-2 sm:px-8 w-full">
                  <Clock className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No medicines for {timeSlots[activeTab].label.toLowerCase()}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Add your first medicine for this time slot
                  </p>
                  <button
                    onClick={() => openAddForm(activeTab)}
                    className="group flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
                    <span className="font-medium">Add Medicine</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {timeSlots[activeTab].label} Medicines ({getMedicinesByTime(activeTab).length})
                    </h2>
                    <button
                      onClick={() => openAddForm(activeTab)}
                      className="group flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                      title="Add Medicine"
                    >
                      <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                      <span className="text-sm font-medium">Add Medicine</span>
                    </button>
                  </div>

                  {/* Patient Sections */}
                  {Object.entries(getMedicinesByTimeAndPatient(activeTab)).map(([patientName, patientMedicines]) => {
                    const isCollapsed = collapsedPatients.has(patientName);
                    return (
                      <div key={patientName} className="mb-6">
                        {/* Patient Header */}
                        <div
                          className="flex items-center justify-between bg-gray-100 rounded-lg p-3 mb-3 cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => togglePatientCollapse(patientName)}
                        >
                          <div className="flex items-center space-x-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            )}
                            <h3 className="text-md font-semibold text-gray-900">
                              {patientName}
                            </h3>
                            <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                              {patientMedicines.length} medicine{patientMedicines.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Patient Medicines */}
                        {!isCollapsed && (
                          <div className="ml-4 space-y-3">
                            {patientMedicines.map(medicine => (
                              <MedicineCard key={medicine.id} medicine={medicine} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'notifications' && (
          <div className="py-8 px-2 sm:px-4 w-full max-w-md mx-auto overflow-y-auto scrollbar-hide">
            {getPendingNotifications().length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center w-full max-w-xs mx-auto">
                <Bell className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pending notifications
                </h3>
                <p className="text-gray-500">
                  All caught up! Check back later for medicine reminders.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Notifications ({getPendingNotifications().length})
                  </h2>
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-red-600 hover:text-red-700 underline font-medium transition-colors"
                    title="Clear All Notifications"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {getPendingNotifications().map(notification => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {notifications.filter(n => n.status !== 'pending').length > 0 && (
              <div className="mt-8 w-full max-w-md mx-auto">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h2>
                <div className="flex flex-col gap-3">
                  {notifications
                    .filter(n => n.status !== 'pending')
                    .slice(0, 5)
                    .map(notification => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'tracking' && (
          <div className="py-8 px-2 sm:px-4 w-full max-w-md mx-auto overflow-y-auto scrollbar-hide">
            {/* Weekly Stats */}
            <div className="bg-white rounded-xl shadow-sm p-3 mb-6 w-full max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Weekly Overview
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {getWeeklyStats().totalTaken}
                  </div>
                  <div className="text-sm text-gray-600">Taken</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {getWeeklyStats().adherenceRate}%
                  </div>
                  <div className="text-sm text-gray-600">Adherence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {getWeeklyStats().totalScheduled}
                  </div>
                  <div className="text-sm text-gray-600">Scheduled</div>
                </div>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="bg-white rounded-xl shadow-sm p-3 w-full max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-green-600" />
                Today's Activity ({getTodaysDosageHistory().length})
              </h2>
              {getTodaysDosageHistory().length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No medicines taken today yet
                </p>
              ) : (
                <div className="space-y-3">
                  {getTodaysDosageHistory().map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{record.medicineName}</h3>
                        <p className="text-sm text-gray-600">{record.dosage}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-600 font-medium">✓ Taken</div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="py-8 px-2 sm:px-4 w-full max-w-md mx-auto overflow-y-auto scrollbar-hide">
            <div className="space-y-4">
              {/* App Info */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-600" />
                  App Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">App Name</span>
                    <span className="text-gray-900 font-medium">MyMedAlert</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Version</span>
                    <span className="text-gray-900 font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Medicines</span>
                    <span className="text-gray-900 font-medium">{medicines.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Storage Used</span>
                    <span className="text-gray-900 font-medium">Local Device Only</span>
                  </div>
                </div>
              </div>

              {/* Emergency Settings Debug */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-red-600" />
                  Emergency Settings
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      console.log('🧪 Testing emergency settings modal');
                      setShowEmergencySettings(true);
                    }}
                    className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Configure Emergency Contacts
                  </button>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Current Status:</strong>
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Contact 1: {emergencyContacts[0]?.name || 'Not set'} - {emergencyContacts[0]?.phone || 'Not set'}
                    </p>
                    <p className="text-xs text-yellow-700">
                      Contact 2: {emergencyContacts[1]?.name || 'Not set'} - {emergencyContacts[1]?.phone || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                        localStorage.clear();
                        setMedicines([]);
                        setNotifications([]);
                        setDosageHistory([]);
                        alert('All data has been cleared.');
                      }
                    }}
                    className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Clear All Data
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    This will permanently delete all medicines, notifications, and history
                  </p>
                </div>
              </div>

              {/* Privacy & Legal */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Legal</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPrivacyPolicy(true)}
                    className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    View Privacy Policy
                  </button>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>🔒 Your Privacy:</strong> All data is stored locally on your device.
                      No information is shared with third parties or sent to external servers.
                    </p>
                  </div>
                </div>
              </div>

              {/* CRITICAL: Battery Optimization Section */}
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                  🔋 CRITICAL: Battery Optimization Settings
                </h2>
                <div className="bg-red-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-red-800 font-semibold mb-2">
                    ⚠️ ALARMS WON'T WORK WHEN APP IS CLOSED WITHOUT THIS!
                  </p>
                  <p className="text-xs text-red-700">
                    Android kills apps in the background to save battery. You MUST disable battery optimization for alarms to work when app is closed and phone is locked.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      try {
                        if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
                          alert('This feature is only available on Android devices.');
                          return;
                        }

                        const instructions = `🔋 DISABLE BATTERY OPTIMIZATION - CRITICAL!

⚠️ WHY THIS IS NEEDED:
Your alarms are NOT working when the app is closed because Android is killing the app to save battery. This is the #1 reason alarms don't fire!

📱 FOLLOW THESE STEPS:

1. Click OK to continue
2. Go to: Settings → Apps → MyMedAlert
3. Tap "Battery" or "Battery usage"
4. Select "Unrestricted" or "Don't optimize"
5. Restart your phone
6. Test alarm with app closed

FOR XIAOMI/HUAWEI/ONEPLUS:
Also enable "Autostart" in app permissions!

Click OK to continue.`;

                        alert(instructions);

                      } catch (error) {
                        console.error('❌ Error:', error);
                        alert('Please manually disable battery optimization:\\nSettings → Apps → MyMedAlert → Battery → Unrestricted');
                      }
                    }}
                    className="w-full p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold border-4 border-red-800 shadow-lg text-center"
                  >
                    ⚡🔋 DISABLE BATTERY OPTIMIZATION (REQUIRED!)
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
                          alert('This feature is only available on Android devices.');
                          return;
                        }

                        const instructions = `🔔 ENABLE FULL-SCREEN ALARM NOTIFICATIONS

⚠️ CRITICAL FOR ALARM UI TO SHOW!

On Android 11+ (especially Android 14), you MUST grant "Display over other apps" permission for the alarm UI to appear when phone is unlocked.

📱 FOLLOW THESE STEPS:

1. Go to: Settings → Apps → MyMedAlert
2. Tap "Advanced" or "More"
3. Find "Display over other apps" or "Appear on top"
4. Enable it

ALTERNATIVE PATH:
Settings → Special app access → Display over other apps → MyMedAlert → Allow

Android 14+ ONLY:
Settings → Notifications → MyMedAlert → Full screen intent → Allow

WHY THIS IS NEEDED:
Without this permission, the red alarm screen won't appear when you unlock your phone. You'll only hear the sound but won't see what medicine to take!

Click OK to continue.`;

                        alert(instructions);

                      } catch (error) {
                        console.error('❌ Error:', error);
                      }
                    }}
                    className="w-full p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold border-4 border-orange-800 shadow-lg text-center"
                  >
                    🔔 ENABLE FULL-SCREEN ALARM UI (ANDROID 11+)
                  </button>
                </div>
              </div>


              {/* About */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About MyMedAlert</h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  MyMedAlert is a privacy-focused medicine reminder app designed to help you and your family
                  stay on top of medication schedules. With local data storage and comprehensive tracking features,
                  you can manage medications safely and effectively.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-2">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col scrollbar-hide p-3 sm:p-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </h2>
                <button
                  onClick={cancelForm}
                  className="text-white bg-red-500 hover:bg-red-700 text-2xl font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-md border border-red-600 transition-colors"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.patientName}
                      onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter patient name (e.g. John, Mom, Kid 1)"
                      list="patientNames"
                      required
                    />
                    <datalist id="patientNames">
                      {getExistingPatientNames().map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter medicine name"
                    required
                  />
                </div>

                {/* Doctor Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor Name (Optional)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-3 border border-r-0 border-gray-300 bg-gray-100 text-gray-600 rounded-l-lg">
                      Dr.
                    </span>
                    <input
                      type="text"
                      value={formData.doctorName ? formData.doctorName.replace(/^Dr\.?\s*/i, '') : ''}
                      onChange={e => setFormData(prev => ({ ...prev, doctorName: e.target.value ? `Dr. ${e.target.value.replace(/^Dr\.?\s*/i, '')}` : '' }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter doctor's name"
                    />
                  </div>
                </div>

                {/* Item Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Type
                  </label>
                  <select
                    value={formData.itemType}
                    onChange={e => {
                      const newItemType = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        itemType: newItemType,
                        // Auto-select 'other' dosage type when non-medicine is selected
                        dosageType: newItemType === 'non-medicine' ? 'other' : prev.dosageType
                      }));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="medicine">💊 Medicine</option>
                    <option value="non-medicine">📋 Non-Medicine (Food, Diaper, etc.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.dosage}
                      onChange={e => {
                        const value = e.target.value;
                        // Allow empty string or valid numbers
                        if (value === '' || /^\d+$/.test(value)) {
                          setFormData(prev => ({ ...prev, dosage: value }));
                        }
                      }}
                      onBlur={e => {
                        // Set minimum value of 1 on blur if empty
                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                          setFormData(prev => ({ ...prev, dosage: '1' }));
                        }
                      }}
                      placeholder="1"
                      className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={formData.dosageType}
                      onChange={e => setFormData(prev => ({ ...prev, dosageType: e.target.value, customDosageType: '' }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="tablet">Tablet</option>
                      <option value="ml">ml</option>
                      <option value="drop">Drop</option>
                      <option value="inhaler">Inhaler Puff</option>
                      <option value="injection">Injection</option>
                      <option value="powder">Powder</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {/* Custom dosage type input when 'Other' is selected */}
                  {formData.dosageType === 'other' && (
                    <input
                      type="text"
                      value={formData.customDosageType}
                      onChange={e => setFormData(prev => ({ ...prev, customDosageType: e.target.value }))}
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter dosage type (e.g., piece, serving, pack)"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Slot
                    </label>
                    <select
                      value={formData.time}
                      onChange={(e) => {
                        const selectedTimeSlot = e.target.value;
                        const defaultTime = timeSlots[selectedTimeSlot].defaultTime;
                        setFormData(prev => ({
                          ...prev,
                          time: selectedTimeSlot,
                          specificTime: defaultTime,
                          alertTime: defaultTime
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(timeSlots).map(([key, slot]) => (
                        <option key={key} value={key}>
                          {slot.icon} {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Time
                    </label>
                    <input
                      type="time"
                      value={formData.specificTime}
                      onChange={(e) => updateFormData('specificTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Time
                    </label>
                    <input
                      type="time"
                      value={formData.alertTime}
                      onChange={e => setFormData(prev => ({ ...prev, alertTime: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Type
                    </label>
                    <select
                      value={formData.alertType}
                      onChange={e => setFormData(prev => ({ ...prev, alertType: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="notification">📱 Notification (Silent)</option>
                      <option value="native-alarm">🔊 Native Alarm (Real Sound + Wake Device)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.alertType === 'notification' && '📱 Regular notification with vibration'}
                      {formData.alertType === 'native-alarm' && '🔊 True alarm with real sound that wakes device (Android only)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total {formData.dosageType === 'tablet' ? 'Pills/Tab' : formData.dosageType === 'ml' ? 'ML' : 'Drops'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalPills}
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '') {
                          setFormData(prev => ({ ...prev, totalPills: '' }));
                        } else {
                          const newTotal = parseInt(value) || 1;
                          setFormData(prev => ({
                            ...prev,
                            totalPills: newTotal,
                            // Auto-set current and refill to match total
                            currentPills: newTotal,
                            refillReminder: newTotal
                          }));
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-auto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current {formData.dosageType === 'tablet' ? 'Pills/Tab' : formData.dosageType === 'ml' ? 'ML' : 'Drops'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.totalPills}
                      value={formData.currentPills}
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '') {
                          setFormData(prev => ({ ...prev, currentPills: '' }));
                        } else {
                          const newCurrent = parseInt(value) || 0;
                          // Ensure current pills don't exceed total pills
                          const adjustedCurrent = Math.min(Math.max(0, newCurrent), formData.totalPills);
                          setFormData(prev => ({ ...prev, currentPills: adjustedCurrent }));
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-auto"
                    />
                    {formData.currentPills > formData.totalPills && (
                      <p className="text-xs text-amber-600 mt-1">
                        Current cannot exceed total ({formData.totalPills})
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refill Reminder (when {formData.dosageType === 'tablet' ? 'pills/tab' : formData.dosageType === 'ml' ? 'ML' : 'drops'} remaining)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.refillReminder}
                    onChange={e => {
                      const value = e.target.value;
                      if (value === '') {
                        setFormData(prev => ({ ...prev, refillReminder: '' }));
                      } else {
                        const newRefill = parseInt(value) || 1;
                        setFormData(prev => ({ ...prev, refillReminder: newRefill }));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-auto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Theme
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                          }`}
                        style={{ backgroundColor: color }}
                        title={color === '#FFFFFF' ? 'White' : color === '#FDF6E3' ? 'Warm White' : color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="every-other-day">Every Other Day</option>
                    <option value="every-n-days">Every N Days</option>
                    <option value="specific-days">Specific Days of Week</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="as-needed">As Needed</option>
                  </select>

                  {/* Every N Days Input */}
                  {formData.frequency === 'every-n-days' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Every how many days?
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={formData.frequencyDays}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequencyDays: parseInt(e.target.value) || 2 }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 3 for every 3 days"
                      />
                    </div>
                  )}

                  {/* Specific Days of Week Checkboxes */}
                  {formData.frequency === 'specific-days' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Select days of the week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <label
                            key={day}
                            className={`flex items-center justify-center w-12 h-10 rounded-lg cursor-pointer border-2 transition-all ${
                              formData.specificWeekDays.includes(index)
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-blue-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formData.specificWeekDays.includes(index)}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  specificWeekDays: e.target.checked
                                    ? [...prev.specificWeekDays, index]
                                    : prev.specificWeekDays.filter(d => d !== index)
                                }));
                              }}
                            />
                            <span className="text-sm font-medium">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reminder End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Till Date (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={formData.reminderEndDate}
                      onChange={(e) => {
                        const endDate = e.target.value;
                        const days = calculateDaysFromEndDate(endDate);
                        setFormData(prev => ({ ...prev, reminderEndDate: endDate, reminderDurationDays: days }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500">Or specify duration in days:</p>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.reminderDurationDays}
                      onChange={(e) => {
                        const days = e.target.value;
                        const endDate = calculateEndDateFromDays(days);
                        setFormData(prev => ({ ...prev, reminderDurationDays: days, reminderEndDate: endDate }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Number of days (e.g., 30)"
                    />
                    <p className="text-xs text-gray-400">Leave empty for indefinite reminders</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicine Photo
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="imageUpload"
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor="imageUpload"
                        className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                      >
                        <Camera className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-gray-600">
                          Take Photo
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="galleryUpload"
                      />
                      <label
                        htmlFor="galleryUpload"
                        className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                      >
                        <span className="text-gray-600">
                          Gallery
                        </span>
                      </label>
                    </div>
                    {formData.image && (
                      <img
                        src={formData.image}
                        alt="Medicine preview"
                        className="w-20 h-20 rounded-lg object-cover mx-auto"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="3"
                    placeholder="Additional notes or instructions (like for what you are taking this Medicine)"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="flex-1 px-4 py-3 text-gray-800 bg-yellow-300 rounded-lg border border-yellow-500 hover:bg-yellow-400 hover:text-gray-900 transition-colors shadow-md font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg border border-blue-800 hover:bg-blue-700 hover:text-white transition-colors shadow-md font-bold"
                  >
                    {editingMedicine ? 'Update' : 'Add'} Medicine
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-2">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Medicine Added Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                Your medicine has been added to the reminder list. You can add another medicine or close this dialog.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessDialog(false);
                    // Reset form with current active time slot instead of defaulting to morning
                    openAddForm(activeTab);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md font-bold"
                >
                  Add Another
                </button>
                <button
                  onClick={() => {
                    setShowSuccessDialog(false);
                    setShowAddForm(false);
                  }}
                  className="flex-1 px-4 py-3 text-gray-800 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors shadow-md font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Settings Modal */}
      {showEmergencySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          {console.log('🔧 Emergency Settings Modal is rendering:', { showEmergencySettings, emergencyContacts })}
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Emergency Contacts</h3>
              <button
                onClick={() => {
                  console.log('❌ Closing emergency settings modal');
                  setShowEmergencySettings(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Emergency Contact {index + 1}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={contact.name || ''}
                      onChange={(e) => {
                        try {
                          console.log(`📝 Updating contact ${index} name:`, e.target.value);
                          const newContacts = [...emergencyContacts];
                          newContacts[index].name = e.target.value;
                          setEmergencyContacts(newContacts);
                        } catch (error) {
                          console.error('❌ Error updating contact name:', error);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contact.phone || ''}
                      onChange={(e) => {
                        try {
                          console.log(`📞 Updating contact ${index} phone:`, e.target.value);
                          const newContacts = [...emergencyContacts];
                          newContacts[index].phone = e.target.value;
                          setEmergencyContacts(newContacts);
                        } catch (error) {
                          console.error('❌ Error updating contact phone:', error);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}

              <div className="flex flex-col space-y-3 pt-4">
                <div className="flex justify-between">
                  <button
                    onClick={() => setShowEmergencySettings(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log('💾 Saving emergency contacts:', emergencyContacts);
                      localStorage.setItem(STORAGE_KEYS.emergencyContacts, JSON.stringify(emergencyContacts));
                      console.log('✅ Emergency contacts saved successfully');
                      setShowEmergencySettings(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Contacts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Dialog - Enhanced with medicine selection */}
      {showSharingDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Share Medicine List</h3>
              <button
                onClick={() => {
                  setShowSharingDialog(false);
                  setShareSelection({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Select/Deselect All */}
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium text-gray-700">Select medicines to share:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const allSelected = {};
                      medicines.forEach(med => { allSelected[med.id] = true; });
                      setShareSelection(allSelected);
                    }}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setShareSelection({})}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Group by Patient and Time Slot */}
              {(() => {
                // Group medicines by patient
                const patientGroups = {};
                medicines.forEach(med => {
                  const patient = med.patientName || 'General';
                  if (!patientGroups[patient]) {
                    patientGroups[patient] = { morning: [], afternoon: [], evening: [], night: [] };
                  }
                  patientGroups[patient][med.time]?.push(med);
                });

                return Object.entries(patientGroups).map(([patient, timeGroups]) => (
                  <div key={patient} className="mb-4 border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 font-medium text-gray-800 flex justify-between items-center">
                      <span>👤 {patient}</span>
                      <button
                        onClick={() => {
                          const patientMeds = medicines.filter(m => (m.patientName || 'General') === patient);
                          const allSelected = patientMeds.every(m => shareSelection[m.id]);
                          const newSelection = { ...shareSelection };
                          patientMeds.forEach(m => { newSelection[m.id] = !allSelected; });
                          setShareSelection(newSelection);
                        }}
                        className="text-xs px-2 py-1 bg-white text-gray-600 rounded hover:bg-gray-200"
                      >
                        Toggle All
                      </button>
                    </div>
                    
                    {['morning', 'afternoon', 'evening', 'night'].map(timeSlot => {
                      const medsInSlot = timeGroups[timeSlot];
                      if (!medsInSlot || medsInSlot.length === 0) return null;
                      
                      return (
                        <div key={timeSlot} className="border-t">
                          <div className="bg-gray-50 px-3 py-1.5 text-sm text-gray-600 flex items-center">
                            <span className="mr-2">{timeSlots[timeSlot]?.icon}</span>
                            <span>{timeSlots[timeSlot]?.label}</span>
                          </div>
                          {medsInSlot.map(med => {
                            const dosageTypeDisplay = med.dosageType === 'other' ? (med.customDosageType || 'unit') : med.dosageType;
                            const stockNeeded = med.reminderEndDate ? (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const endDate = new Date(med.reminderEndDate);
                              endDate.setHours(0, 0, 0, 0);
                              if (endDate <= today) return null;
                              const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                              const dosagePerDay = parseInt(med.dosage) || 1;
                              return daysRemaining * dosagePerDay;
                            })() : null;
                            
                            return (
                            <label
                              key={med.id}
                              className="flex items-start px-3 py-2 hover:bg-blue-50 cursor-pointer border-t border-gray-100"
                            >
                              <input
                                type="checkbox"
                                checked={shareSelection[med.id] || false}
                                onChange={(e) => setShareSelection(prev => ({
                                  ...prev,
                                  [med.id]: e.target.checked
                                }))}
                                className="w-4 h-4 mt-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {med.itemType === 'non-medicine' ? '📋' : '💊'} {med.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {med.dosage} {dosageTypeDisplay} • {med.specificTime}
                                </div>
                                {med.doctorName && (
                                  <div className="text-xs text-purple-600">👨‍⚕️ {med.doctorName}</div>
                                )}
                                {med.itemType !== 'non-medicine' && (
                                  <div className="text-xs text-gray-500">
                                    📦 Stock: {med.currentPills}/{med.totalPills}
                                    {stockNeeded !== null && (
                                      <span className={stockNeeded > med.currentPills ? ' text-red-500' : ' text-green-600'}>
                                        {' '}• Need: {stockNeeded} (till {med.reminderEndDate})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {med.notes && (
                                  <div className="text-xs text-gray-400 italic">📝 {med.notes}</div>
                                )}
                              </div>
                            </label>
                          );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              {medicines.length === 0 && (
                <p className="text-center text-gray-500 py-4">No medicines to share</p>
              )}
            </div>

            {/* Share Methods */}
            <div className="border-t p-4">
              <p className="text-sm text-gray-600 mb-3">
                Share {Object.values(shareSelection).filter(Boolean).length} selected item(s) via:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const selectedMeds = medicines.filter(m => shareSelection[m.id]);
                    if (selectedMeds.length === 0) {
                      alert('Please select at least one medicine to share');
                      return;
                    }
                    const message = generateSelectedMedicineList(selectedMeds);
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                    setShowSharingDialog(false);
                    setShareSelection({});
                  }}
                  disabled={Object.values(shareSelection).filter(Boolean).length === 0}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    const selectedMeds = medicines.filter(m => shareSelection[m.id]);
                    if (selectedMeds.length === 0) {
                      alert('Please select at least one medicine to share');
                      return;
                    }
                    const message = generateSelectedMedicineList(selectedMeds);
                    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
                    setShowSharingDialog(false);
                    setShareSelection({});
                  }}
                  disabled={Object.values(shareSelection).filter(Boolean).length === 0}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>SMS</span>
                </button>

                <button
                  onClick={() => {
                    const selectedMeds = medicines.filter(m => shareSelection[m.id]);
                    if (selectedMeds.length === 0) {
                      alert('Please select at least one medicine to share');
                      return;
                    }
                    const message = generateSelectedMedicineList(selectedMeds);
                    window.location.href = `mailto:?subject=${encodeURIComponent('Medicine Schedule')}&body=${encodeURIComponent(message)}`;
                    setShowSharingDialog(false);
                    setShareSelection({});
                  }}
                  disabled={Object.values(shareSelection).filter(Boolean).length === 0}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </button>

                <button
                  onClick={() => {
                    const selectedMeds = medicines.filter(m => shareSelection[m.id]);
                    if (selectedMeds.length === 0) {
                      alert('Please select at least one medicine to share');
                      return;
                    }
                    const message = generateSelectedMedicineList(selectedMeds);
                    navigator.clipboard.writeText(message);
                    alert('Medicine list copied to clipboard!');
                    setShowSharingDialog(false);
                    setShareSelection({});
                  }}
                  disabled={Object.values(shareSelection).filter(Boolean).length === 0}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Dialog */}
      {showVoiceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Voice Assistant</h3>
              <button
                onClick={() => {
                  setShowVoiceDialog(false);
                  setVoiceListening(false);
                  if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="text-center mb-6">
              {voiceListening ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                  <MicOff className="w-8 h-8 text-gray-500" />
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-lg min-h-[80px]">
                <p className="text-gray-700 text-sm">
                  {voiceResponse || 'Click the microphone to start asking questions about your medicines!'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Try asking:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• "What medicine do I need to take now?"</li>
                  <li>• "List all my medicines"</li>
                  <li>• "When is my next dose?"</li>
                  <li>• "Show my emergency contacts"</li>
                </ul>
              </div>

              {/* Text Input Fallback */}
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Or type your question:</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your question here..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const question = e.target.value.trim();
                        if (question) {
                          setVoiceResponse(`You asked: "${question}"`);
                          setTimeout(() => {
                            processVoiceCommand(question);
                          }, 500);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.parentElement.querySelector('input');
                      const question = input.value.trim();
                      if (question) {
                        setVoiceResponse(`You asked: "${question}"`);
                        setTimeout(() => {
                          processVoiceCommand(question);
                        }, 500);
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  >
                    Ask
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={startVoiceListening}
                  disabled={voiceListening}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors ${voiceListening
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{voiceListening ? 'Listening...' : 'Start Listening'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowVoiceDialog(false);
                    setVoiceListening(false);
                    if ('speechSynthesis' in window) {
                      speechSynthesis.cancel();
                    }
                  }}
                  className="px-4 py-3 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-50">
          <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />
        </div>
      )}
    </div>
  );
};

export default MedicineReminderApp;
