import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Camera, Clock, Pill, Bell, Calendar, TrendingUp, AlertCircle, Check, X, BarChart3, Package, ChevronDown, ChevronRight, Settings, Info, Phone, AlertTriangle, Share2, Mic, MicOff, MessageCircle, MessageSquare, Mail, Copy, Printer } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    patientName: '', // new field
    name: '',
    dosage: 1,
    dosageType: 'tablet',
    time: 'morning',
    color: '#3B82F6',
    image: null,
    notes: '',
    specificTime: '08:00',
    alertTime: '08:00', // new field
    alertType: 'notification', // new field: 'notification' or 'alarm'
    totalPills: 1,
    currentPills: 1,
    refillReminder: 1,
    frequency: 'daily' // daily, weekly, monthly
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
  }, []);

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
          // Listen for notification taps
          await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
            console.log('🔔 Notification tapped:', notification);

            // Handle notification tap
            if (notification.notification && notification.notification.extra) {
              const { medicineId, medicineName, alertType } = notification.notification.extra;
              console.log(`📋 Medicine: ${medicineName} (ID: ${medicineId}) - Alert Type: ${alertType}`);

              // Show confirmation or handle the tap
              alert(`Notification received for ${medicineName}! ✅`);
            }
          });

          // Listen for notification received (when app is in foreground)
          await LocalNotifications.addListener('localNotificationReceived', (notification) => {
            console.log('📨 Notification received in foreground:', notification);
          });

          console.log('✅ Notification listeners set up successfully');
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

  // Helper to schedule a local notification with proper recurring support
  const scheduleLocalNotification = async (medicine) => {
    try {
      if (!medicine.alertTime) {
        console.log('No alert time set for medicine:', medicine.name);
        return;
      }

      console.log('📋 Scheduling notification for:', medicine.name, 'at', medicine.alertTime, 'type:', medicine.alertType);

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
          console.error('❌ Failed to schedule native alarm, falling back to Capacitor alarm:', error);
          // Continue with Capacitor notifications as fallback
          medicine.alertType = 'alarm';
        }
      }

      const notifications = [];

      // Schedule notifications for the next 7 days to ensure persistence
      for (let day = 0; day < 7; day++) {
        const now = new Date();
        const notifTime = new Date(now);
        notifTime.setDate(notifTime.getDate() + day);
        notifTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Skip if time has already passed today (for day 0)
        if (day === 0 && notifTime < now) continue;

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

        // Enhanced configuration for different alert types - native-alarm already handled above

        if (medicine.alertType === 'alarm') {
          // Fallback to regular notifications instead of complex alarm configs
          const notificationConfig = {
            ...baseConfig,
            channelId: 'notification-channel',
            importance: 4, // IMPORTANCE_HIGH for regular notifications
            priority: 1, // PRIORITY_DEFAULT
            ongoing: false,
            autoCancel: true,
            sound: 'default',
            vibrate: [500, 500], // Gentle vibration
            lights: true,
            lightColor: '#3B82F6',
            visibility: 1, // VISIBILITY_PUBLIC
            category: 'reminder',
            showWhen: true,
            when: notifTime.getTime(),
            extra: {
              ...baseConfig.extra,
              alarmType: 'RTC_WAKEUP',
              exactAlarm: true,
              allowWhileIdle: true
            }
          };
          notifications.push(notificationConfig);
        } else {
          const notificationConfig = {
            ...baseConfig,
            channelId: 'notification-channel',
            importance: 4, // IMPORTANCE_HIGH for regular notifications
            priority: 1, // PRIORITY_DEFAULT
            ongoing: false,
            autoCancel: true,
            sound: 'default',
            vibrate: [500, 500], // Gentle vibration
            lights: true,
            lightColor: '#3B82F6',
            visibility: 1, // VISIBILITY_PUBLIC
            category: 'reminder',
            showWhen: true,
            when: notifTime.getTime(),
            extra: {
              ...baseConfig.extra,
              alarmType: 'RTC_WAKEUP',
              exactAlarm: true, // Change to true for all notifications
              allowWhileIdle: true // Enable for all notifications
            }
          };
          notifications.push(notificationConfig);
        }
      }

      if (notifications.length > 0) {
        try {
          console.log(`📋 Scheduling ${notifications.length} notifications for ${medicine.name}:`, notifications);

          await LocalNotifications.schedule({
            notifications: notifications,
          });

          console.log(`✅ Successfully scheduled ${notifications.length} notifications for ${medicine.name}`);

          // For debugging - show when the next notification will fire
          if (notifications.length > 0) {
            const nextNotif = notifications[0];
            console.log(`📅 Next notification for ${medicine.name} scheduled for:`, nextNotif.schedule.at);
            console.log(`🔧 Notification config:`, JSON.stringify(nextNotif, null, 2));
          }

          // Additional verification - check if notifications were actually scheduled
          try {
            const pending = await LocalNotifications.getPending();
            console.log(`📝 Total pending notifications after scheduling:`, pending.notifications?.length || 0);

            const medicineNotifs = pending.notifications?.filter(n =>
              n.extra?.medicineId === medicine.id
            );
            console.log(`📊 Pending notifications for ${medicine.name}:`, medicineNotifs?.length || 0);
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
        console.log(`⚠️ No notifications to schedule for ${medicine.name} (time may have passed)`);
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
      name: '',
      dosage: 1,
      dosageType: 'tablet',
      time: 'morning',
      color: '#3B82F6',
      image: null,
      notes: '',
      specificTime: '08:00',
      alertTime: '08:00',
      alertType: 'notification',
      totalPills: 1,
      currentPills: 1,
      refillReminder: 1,
      frequency: 'daily'
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
    setFormData(medicine);
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

    // Update pill count
    setMedicines(prev =>
      prev.map(med =>
        med.id === medicineId
          ? { ...med, currentPills: Math.max(0, med.currentPills - 1) }
          : med
      )
    );
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
      name: '',
      dosage: 1,
      dosageType: 'tablet',
      time: defaultTimeSlot,
      color: '#3B82F6',
      image: null,
      notes: '',
      specificTime: defaultTime,
      alertTime: defaultTime,
      alertType: 'notification',
      totalPills: 1,
      currentPills: 1,
      refillReminder: 1,
      frequency: 'daily'
    });
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingMedicine(null);
    setShowSuccessDialog(false);
    setFormData({
      patientName: '',
      name: '',
      dosage: 1,
      dosageType: 'tablet',
      time: 'morning',
      color: '#3B82F6',
      image: null,
      notes: '',
      specificTime: '08:00',
      alertTime: '08:00',
      alertType: 'notification',
      totalPills: 1,
      currentPills: 1,
      refillReminder: 1,
      frequency: 'daily'
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

  // Function to update form data and auto-sync time slot
  const updateFormData = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-update time slot when specific time changes
      if (field === 'specificTime') {
        newData.time = getTimeSlotFromTime(value);
        newData.alertTime = value; // Keep alert time in sync
      }

      return newData;
    });
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

        const [hours, minutes] = medicine.alertTime.split(':');
        const results = [];

        // Schedule native alarms for multiple days to ensure persistence  
        for (let day = 0; day < scheduleForDays; day++) {
          const now = new Date();
          const alarmTime = new Date(now);
          alarmTime.setDate(alarmTime.getDate() + day);
          alarmTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          // For day 0, check if time has passed - allow a generous buffer for manually created medicines
          const timeDiffMinutes = (alarmTime.getTime() - now.getTime()) / (1000 * 60);

          // Enhanced logic: For manually created medicines, allow more flexible scheduling
          // If the time is in the past but less than 5 minutes ago, schedule for today
          // If it's further in the past, skip to tomorrow
          const bufferMinutes = timeDiffMinutes < 0 ? -5 : -1; // 5 minute past buffer, 1 minute future buffer

          console.log(`🕒 Time comparison (Day ${day}):`, {
            alarmTime: alarmTime.toLocaleString(),
            currentTime: now.toLocaleString(),
            timeDiffMinutes: Math.round(timeDiffMinutes * 100) / 100,
            bufferMinutes: bufferMinutes,
            willSchedule: !(day === 0 && timeDiffMinutes < bufferMinutes),
            medicineType: medicine.name.includes('Test') ? 'Test Medicine' : 'Manual Medicine'
          });

          if (day === 0 && timeDiffMinutes < bufferMinutes) {
            console.log(`⏰ Time has passed today (${Math.round(timeDiffMinutes)} minutes ago), skipping day 0 - will start from tomorrow`);
            continue;
          }

          const triggerTime = alarmTime.getTime();
          const alarmId = (parseInt(medicine.id) % 10000) + (day * 10000); // Unique ID per day

          console.log(`📋 Native alarm details (Day ${day}):`, {
            medicineName: medicine.name,
            dosage: `${medicine.dosage} ${medicine.dosageType}`,
            patientName: medicine.patientName || '',
            triggerTime: triggerTime,
            triggerDate: new Date(triggerTime).toString(),
            alarmId: alarmId,
            dayOffset: day,
            currentTime: now.toString(),
            timeDiffMinutes: Math.round((alarmTime.getTime() - now.getTime()) / (1000 * 60))
          });

          try {
            // Safety check: Ensure the native plugin is available
            if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.MedicineAlarm) {
              throw new Error('MedicineAlarm plugin not available - native alarms disabled');
            }

            // Call our custom native plugin for each day
            const result = await window.Capacitor.Plugins.MedicineAlarm.scheduleAlarm({
              medicineName: medicine.name,
              dosage: `${medicine.dosage} ${medicine.dosageType}`,
              patientName: medicine.patientName || '',
              triggerTime: triggerTime,
              alarmId: alarmId
            });

            console.log(`✅ Native alarm scheduled successfully for day ${day}:`, result);
            results.push({ day, result, triggerTime: new Date(triggerTime).toLocaleString(), success: true });
          } catch (dayError) {
            console.error(`❌ Failed to schedule native alarm for day ${day}:`, dayError);
            results.push({ day, error: dayError.message, success: false });
          }
        }

        // Show confirmation for debugging
        if (results.length > 0) {
          const successfulSchedules = results.filter(r => r.success);
          const failedSchedules = results.filter(r => !r.success);

          console.log(`🎯 NATIVE ALARMS SUMMARY for ${medicine.name}:`);
          console.log(`   ✅ Successfully scheduled: ${successfulSchedules.length} alarms`);
          console.log(`   ❌ Failed to schedule: ${failedSchedules.length} alarms`);

          if (successfulSchedules.length > 0) {
            console.log('📅 Successful scheduled times:', successfulSchedules.map(r => r.triggerTime).join(', '));
          }

          if (failedSchedules.length > 0) {
            console.log('❌ Failed schedules:', failedSchedules.map(r => `Day ${r.day}: ${r.error}`).join(', '));
          }

          // Alert user if no alarms were successfully scheduled
          if (successfulSchedules.length === 0) {
            console.warn('⚠️ WARNING: No native alarms were successfully scheduled!');
          }
        } else {
          console.warn('⚠️ WARNING: No native alarm scheduling attempts were made!');
        }

        return results;
      } else {
        alert('Native alarms are only available on Android devices.');
      }
    } catch (error) {
      console.error('❌ Error scheduling native alarm:', error);
      throw error; // Re-throw to trigger fallback in scheduleLocalNotification
    }
  }; const cancelNativeAlarm = async (medicineId) => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('🚫 Cancelling native alarms for medicine ID:', medicineId);

        const results = [];
        // Cancel alarms for the next 7 days (matching the scheduling logic)
        for (let day = 0; day < 7; day++) {
          const alarmId = (parseInt(medicineId) % 10000) + (day * 10000);

          try {
            const result = await window.Capacitor.Plugins.MedicineAlarm.cancelAlarm({
              alarmId: alarmId
            });

            console.log(`✅ Native alarm cancelled for day ${day} (ID: ${alarmId}):`, result);
            results.push({ day, alarmId, result });
          } catch (dayError) {
            console.log(`⚠️ Could not cancel alarm for day ${day} (ID: ${alarmId}):`, dayError.message);
            results.push({ day, alarmId, error: dayError.message });
          }
        }

        console.log(`✅ Native alarm cancellation complete: ${results.length} attempts made`);
        return results;
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

  // Test native alarm - creates a real alarm that will wake device and play sound
  /* COMMENTED OUT FOR PRODUCTION
  const testNativeAlarm = async () => {
    try {
      console.log('🚨🔊 Testing NATIVE ALARM with REAL SOUND...');

      if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        alert('Native alarm test is only available on Android devices.');
        return;
      }

      if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.MedicineAlarm) {
        alert('❌ MedicineAlarm plugin not available!\n\nThe native alarm system is not connected.\nPlease rebuild and reinstall the app.');
        return;
      }

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
      alert('🚨🔊 NATIVE ALARM TEST scheduled!\n\nYour device will:\n• Wake up in 10 seconds\n• Play REAL alarm sound\n• Show notification with DISMISS and SNOOZE buttons\n• Vibrate strongly\n\nThis is a TRUE ALARM! 📱🔊⏰');

    } catch (error) {
      console.error('❌ Error testing native alarm:', error);
      console.error('❌ Error details:', error);

      let errorMsg = '❌ NATIVE ALARM TEST FAILED:\n\n';
      errorMsg += `Error: ${error.message}\n\n`;

      if (error.message.includes('not implemented')) {
        errorMsg += 'The native plugin method is not implemented.\nCheck the Java code in MedicineAlarmPlugin.java';
      } else if (error.message.includes('not found')) {
        errorMsg += 'The plugin or method was not found.\nEnsure the plugin is registered in MainActivity.java';
      } else {
        errorMsg += 'This could be caused by:\n• Plugin registration issue\n• Native code error\n• Permission problem\n\nTry rebuilding and reinstalling the app.';
      }

      alert(errorMsg);
    }
  };
  */

  // Simple test to create a native alarm medicine
  /* COMMENTED OUT FOR PRODUCTION
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
        notes: 'This is a test medicine for native alarm',
        specificTime: timeString,
        alertTime: timeString,
        alertType: 'native-alarm',
        totalPills: 10,
        currentPills: 10,
        refillReminder: 2,
        frequency: 'daily'
      };

      // Add to medicines list
      setMedicines(prev => [...prev, testMedicine]);

      // Schedule the native alarm
      await scheduleLocalNotification(testMedicine);

      console.log('✅ Test native medicine created and alarm scheduled');
      alert(`✅ TEST NATIVE ALARM MEDICINE CREATED!\n\n📝 Medicine: ${testMedicine.name}\n⏰ Alarm Time: ${timeString} (2 minutes from now)\n🚨 Type: NATIVE ALARM\n\nThe alarm will:\n• Wake your device\n• Play real alarm sound\n• Show dismissible notification\n• Vibrate strongly\n\nCheck your medicines list!`);

    } catch (error) {
      console.error('❌ Error creating test medicine:', error);
      alert('Error creating test medicine: ' + error.message);
    }
  };
  */

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

  // Immediate alarm test - creates an alarm that fires in 5 seconds
  /* COMMENTED OUT FOR PRODUCTION
  const testImmediateAlarm = async () => {
    try {
      console.log('🚨 Testing IMMEDIATE alarm...');

      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const immediateTime = new Date(Date.now() + 5000); // 5 seconds from now

        const alarmConfig = {
          title: '🚨 IMMEDIATE ALARM TEST',
          body: 'This is an immediate alarm test! Should wake your device!',
          id: 88888, // Use smaller ID within Java int range
          schedule: {
            at: immediateTime,
            allowWhileIdle: true // Essential for waking device
          },
          channelId: 'alarm-channel',
          sound: 'default', // Use default alarm sound
          // Android-specific supported properties
          android: {
            channelId: 'alarm-channel',
            priority: 'max',
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
            showWhen: true,
            when: immediateTime.getTime()
          },
          extra: {
            isTest: true,
            testType: 'immediate_alarm',
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
          notifications: [alarmConfig]
        });

        console.log('✅ IMMEDIATE alarm scheduled for 5 seconds from now');
        alert('🚨 IMMEDIATE ALARM scheduled! Your device should wake up and alert you in 5 seconds with strong vibration! 📱');
      } else {
        alert('This test is only available on Android devices.');
      }
    } catch (error) {
      console.error('❌ Error testing immediate alarm:', error);
      alert('Error testing immediate alarm: ' + error.message);
    }
  };
  */

  // Test native plugin connectivity
  /* COMMENTED OUT FOR PRODUCTION
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
  */  // Complete diagnostic function
  /* COMMENTED OUT FOR PRODUCTION
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
  */

  // Super aggressive alarm test - this should definitely wake the device
  /* COMMENTED OUT FOR PRODUCTION
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
  */

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 4 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 16) return 'afternoon';
    if (hour >= 16 && hour < 19) return 'evening';
    return 'night';
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
            <p className="text-sm text-gray-600">{medicine.dosage} {medicine.dosageType}</p>
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
          </div>
          <button
            onClick={() => addPills(medicine.id, 1)}
            className="text-xs bg-green-500 text-white px-3 py-1 rounded border border-green-700 hover:bg-green-600 hover:text-white transition-colors shadow-md font-bold"
            title="Add 1 pill to refill"
          >
            + Refill
          </button>
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
    const contact = emergencyContacts[contactIndex];
    if (contact && contact.phone && contact.name) {
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
      alert('Emergency contact not configured. Please set up emergency contacts first.');
      setShowEmergencySettings(true);
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

        <div className="relative px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* App Icon with modern styling */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                {getPendingNotifications().length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">{getPendingNotifications().length}</span>
                  </div>
                )}
              </div>

              {/* App Title and Info */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
                  MyMedAlert
                </h1>
                <p className="text-sm font-medium text-gray-500 mt-0.5">
                  Smart Medicine Reminder
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-600 font-medium">{medicines.length} medicines</span>
                  </div>
                  {getPendingNotifications().length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-600 font-medium">{getPendingNotifications().length} pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency and Action Buttons */}
            <div className="flex flex-col space-y-2">
              {/* Emergency Label */}
              <div className="text-center">
                <p className="text-xs text-gray-500 font-medium">Emergency Contacts</p>
              </div>

              {/* First Row - Emergency Calls */}
              <div className="flex items-center justify-center space-x-2">
                {/* Emergency Button 1 - Phone */}
                <button
                  onClick={() => handleEmergencyCall(0, 'phone')}
                  className="group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  title={emergencyContacts[0]?.name && emergencyContacts[0]?.phone
                    ? `Emergency Call: ${emergencyContacts[0].name} (${emergencyContacts[0].phone})`
                    : 'Emergency Contact 1 - Click to configure'}
                >
                  <div className="relative">
                    <Phone className="w-4 h-4" />
                    <span
                      className="absolute -top-1 -right-1 text-white flex items-center justify-center font-bold"
                      style={{
                        fontSize: '8px',
                        width: '12px',
                        height: '12px',
                        lineHeight: '1'
                      }}
                    >
                      1
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>

                {/* Emergency Button 2 - Phone */}
                <button
                  onClick={() => handleEmergencyCall(1, 'phone')}
                  className="group relative bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  title={emergencyContacts[1]?.name && emergencyContacts[1]?.phone
                    ? `Emergency Call: ${emergencyContacts[1].name} (${emergencyContacts[1].phone})`
                    : 'Emergency Contact 2 - Click to configure'}
                >
                  <div className="relative">
                    <Phone className="w-4 h-4" />
                    <span
                      className="absolute -top-1 -right-1 text-white flex items-center justify-center font-bold"
                      style={{
                        fontSize: '8px',
                        width: '12px',
                        height: '12px',
                        lineHeight: '1'
                      }}
                    >
                      2
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>

                {/* WhatsApp Emergency Button */}
                <button
                  onClick={() => handleEmergencyCall(0, 'whatsapp')}
                  className="group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  title={emergencyContacts[0]?.name && emergencyContacts[0]?.phone
                    ? `WhatsApp: ${emergencyContacts[0].name} (${emergencyContacts[0].phone})`
                    : 'WhatsApp Emergency Contact - Click to configure'}
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </div>

              {/* Second Row - Share and Voice */}
              <div className="flex items-center justify-center space-x-2">
                {/* Share Button */}
                <button
                  onClick={() => setShowSharingDialog(true)}
                  className="group relative bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  title="Share Medicine List"
                >
                  <Share2 className="w-4 h-4" />
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>

                {/* Voice Assistant Button */}
                <button
                  onClick={startVoiceListening}
                  className={`group relative bg-gradient-to-r transition-all duration-200 transform hover:scale-105 active:scale-95 text-white p-2 rounded-xl shadow-lg hover:shadow-xl ${voiceListening
                    ? 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    : 'from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                    }`}
                  title="Voice Assistant"
                >
                  {voiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="flex overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentView('medicines')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors ${currentView === 'medicines'
              ? 'border-fuchsia-500 bg-gradient-to-r from-yellow-300 via-fuchsia-400 to-blue-400 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-yellow-50 font-semibold text-gray-800'
              }`}
          >
            <Pill className={`w-5 h-5 mx-auto mb-1 ${currentView === 'medicines' ? '' : 'text-gray-800'}`} />
            <span className={`text-sm font-medium ${currentView === 'medicines' ? '' : 'text-gray-800'}`}>Medicines</span>
          </button>
          <button
            onClick={() => setCurrentView('notifications')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors relative ${currentView === 'notifications'
              ? 'border-fuchsia-500 bg-gradient-to-r from-blue-400 via-fuchsia-400 to-yellow-300 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-blue-50 font-semibold text-gray-800'
              }`}
          >
            <Bell className={`w-5 h-5 mx-auto mb-1 ${currentView === 'notifications' ? '' : 'text-gray-800'}`} />
            <span className={`text-sm font-medium ${currentView === 'notifications' ? '' : 'text-gray-800'}`}>Notifications</span>
            {getPendingNotifications().length > 0 && (
              <span className="absolute top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center z-50">
                {getPendingNotifications().length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('tracking')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors ${currentView === 'tracking'
              ? 'border-fuchsia-500 bg-gradient-to-r from-green-300 via-blue-400 to-fuchsia-400 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-green-50 font-semibold text-gray-800'
              }`}
          >
            <BarChart3 className={`w-5 h-5 mx-auto mb-1 ${currentView === 'tracking' ? '' : 'text-gray-800'}`} />
            <span className={`text-sm font-medium ${currentView === 'tracking' ? '' : 'text-gray-800'}`}>Tracking</span>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors ${currentView === 'settings'
              ? 'border-fuchsia-500 bg-gradient-to-r from-purple-300 via-pink-400 to-fuchsia-400 text-gray-900 font-bold shadow-md'
              : 'border-transparent bg-gray-100 hover:bg-purple-50 font-semibold text-gray-800'
              }`}
          >
            <Settings className={`w-5 h-5 mx-auto mb-1 ${currentView === 'settings' ? '' : 'text-gray-800'}`} />
            <span className={`text-sm font-medium ${currentView === 'settings' ? '' : 'text-gray-800'}`}>Settings</span>
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
                      className={`flex-1 min-w-0 px-4 py-3 text-center border-b-2 transition-colors ${activeTab === key
                        ? `border-fuchsia-500 ${activeGradient} text-gray-900 font-bold shadow-md`
                        : 'border-transparent bg-gray-100 hover:bg-yellow-50 font-semibold text-gray-800'
                        }`}
                    >
                      <div className={`text-lg ${activeTab === key ? '' : 'text-gray-800'}`}>{slot.icon}</div>
                      <div className={`text-sm font-medium ${activeTab === key ? '' : 'text-gray-800'}`}>{slot.label}</div>
                      <div className={`text-xs ${activeTab === key ? 'text-gray-500' : 'text-gray-600'}`}>{slot.time}</div>
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

              {/* Test Notifications - COMMENTED OUT FOR PRODUCTION 
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Notifications</h2>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-red-800 to-red-900 p-4 rounded-lg border-2 border-red-600">
                    <h3 className="text-white font-bold text-center mb-3">🔊 NATIVE ALARMS (REAL SOUND & WAKE DEVICE)</h3>
                    <div className="space-y-2">
                      <button
                        onClick={testNativeAlarm}
                        className="w-full p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold border-2 border-red-400"
                      >
                        🚨🔊 TEST NATIVE ALARM (10 seconds) - REAL SOUND!
                      </button>
                      <button
                        onClick={createTestNativeMedicine}
                        className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold border-2 border-purple-400"
                      >
                        📝 CREATE TEST MEDICINE (2 mins) - NATIVE ALARM
                      </button>
                      <button
                        onClick={testNativePlugin}
                        className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        🔌 Test Native Plugin Connection
                      </button>
                      <button
                        onClick={checkNativeAlarmPermission}
                        className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        🔍 Check Native Alarm Permission
                      </button>
                      <button
                        onClick={requestNativeAlarmPermission}
                        className="w-full p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                      >
                        🚨 Request Native Exact Alarm Permission
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="text-gray-800 font-bold text-center mb-3">📱 Capacitor Notification Tests</h3>
                    <div className="space-y-2">
                      <button
                        onClick={testImmediateAlarm}
                        className="w-full p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        🚨 Test IMMEDIATE Alarm (5 seconds)
                      </button>
                      <button
                        onClick={testSuperAlarm}
                        className="w-full p-3 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors font-medium"
                      >
                        🚨🚨 Test SUPER ALARM (3 seconds) - MAX POWER
                      </button>
                      <button
                        onClick={testAlarmBarrage}
                        className="w-full p-3 bg-red-900 text-white rounded-lg hover:bg-red-950 transition-colors font-medium"
                      >
                        🚨⚡ Test ALARM BARRAGE (5 rapid alarms)
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={runCompleteDiagnostic}
                    className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    🩺 Run Complete Diagnostic
                  </button>
                  <button
                    onClick={checkAndroidAlarmPermissions}
                    className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    🔍 Check Android Alarm Permissions
                  </button>
                  <button
                    onClick={requestExactAlarmPermission}
                    className="w-full p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    🚨 Request EXACT ALARM Permission
                  </button>
                  <button
                    onClick={troubleshootAlarms}
                    className="w-full p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    🔧 ALARM TROUBLESHOOTING GUIDE
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if ('Notification' in window) {
                          const permission = await Notification.requestPermission();
                          if (permission === 'granted') {
                            new Notification('🧪 Test Notification', {
                              body: 'This is a test notification from MyMedAlert!',
                              icon: '/vite.svg',
                              tag: 'test-notification'
                            });
                            alert('Test notification sent! Check your browser notifications.');
                          } else {
                            alert('Notification permission denied. Please enable notifications in your browser settings.');
                          }
                        } else {
                          alert('Your browser does not support notifications.');
                        }
                      } catch (error) {
                        alert('Error: ' + error.message);
                      }
                    }}
                    className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    🧪 Test Browser Notification
                  </button>
                  <button
                    onClick={() => {
                      setTimeout(() => {
                        if ('Notification' in window && Notification.permission === 'granted') {
                          new Notification('💊 Test Medicine Reminder', {
                            body: 'This is how your medicine reminders will look!',
                            icon: '/vite.svg',
                            tag: 'test-medicine',
                            requireInteraction: true
                          });
                        }
                      }, 3000);
                      alert('Medicine reminder notification scheduled in 3 seconds!');
                    }}
                    className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                  >
                    ⏰ Test 3-Second Reminder
                  </button>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> In the web version, notifications work as browser notifications.
                      For mobile apps, use the native notification system.
                    </p>
                  </div>
                </div>
              </div>
              */}

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formData.dosage}
                      onChange={e => setFormData(prev => ({ ...prev, dosage: parseInt(e.target.value) || 1 }))}
                      className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-auto"
                    />
                    <select
                      value={formData.dosageType}
                      onChange={e => setFormData(prev => ({ ...prev, dosageType: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="tablet">Tablet</option>
                      <option value="ml">ml</option>
                      <option value="drop">Drop</option>
                    </select>
                  </div>
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
                      <option value="alarm">🚨 Capacitor Alarm (Strong)</option>
                      <option value="native-alarm">🔊 Native Alarm (Real Sound + Wake Device)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.alertType === 'notification' && '📱 Regular notification with vibration'}
                      {formData.alertType === 'alarm' && '🚨 Enhanced notification with maximum priority'}
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
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
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
                    placeholder="Additional notes or instructions"
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
                  onClick={() => setShowSuccessDialog(false)}
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
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Emergency Contacts</h3>
              <button
                onClick={() => setShowEmergencySettings(false)}
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
                      value={contact.name}
                      onChange={(e) => {
                        const newContacts = [...emergencyContacts];
                        newContacts[index].name = e.target.value;
                        setEmergencyContacts(newContacts);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => {
                        const newContacts = [...emergencyContacts];
                        newContacts[index].phone = e.target.value;
                        setEmergencyContacts(newContacts);
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
                      localStorage.setItem('emergencyContacts', JSON.stringify(emergencyContacts));
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

      {/* Sharing Dialog */}
      {showSharingDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Medicine List</h3>
              <button
                onClick={() => setShowSharingDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Choose how to share your medicine list:</p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const message = generateMedicineList();
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                    setShowSharingDialog(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Share via WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    const message = generateMedicineList();
                    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
                    window.location.href = smsUrl;
                    setShowSharingDialog(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Share via SMS</span>
                </button>

                <button
                  onClick={() => {
                    const message = generateMedicineList();
                    const emailUrl = `mailto:?subject=${encodeURIComponent('My Medicine List')}&body=${encodeURIComponent(message)}`;
                    window.location.href = emailUrl;
                    setShowSharingDialog(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <Mail className="h-5 w-5" />
                  <span>Share via Email</span>
                </button>

                <button
                  onClick={() => {
                    const message = generateMedicineList();
                    navigator.clipboard.writeText(message);
                    setShowSharingDialog(false);
                    // You might want to show a toast notification here
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <Copy className="h-5 w-5" />
                  <span>Copy to Clipboard</span>
                </button>

                <button
                  onClick={() => {
                    const message = generateMedicineList();
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head><title>Medicine List</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                          <pre style="white-space: pre-wrap;">${message}</pre>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                    setShowSharingDialog(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Printer className="h-5 w-5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSharingDialog(false)}
              className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
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
