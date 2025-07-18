import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Camera, Clock, Pill, Bell, Calendar, TrendingUp, AlertCircle, Check, X, BarChart3, Package, ChevronDown, ChevronRight, Settings, Info } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import PrivacyPolicy from './PrivacyPolicy';

const STORAGE_KEYS = {
  medicines: 'pill_reminder_medicines',
  notifications: 'pill_reminder_notifications',
  dosageHistory: 'pill_reminder_dosage_history',
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
    morning: { label: 'Morning', icon: '🌅', time: '4:00 - 12:00', defaultTime: '08:00' },
    afternoon: { label: 'Afternoon', icon: '☀️', time: '12:00 - 16:00', defaultTime: '12:00' },
    evening: { label: 'Evening', icon: '🌆', time: '16:00 - 19:00', defaultTime: '16:00' },
    night: { label: 'Night', icon: '🌙', time: '19:00 - 4:00', defaultTime: '20:00' }
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

  // Request notification permissions on mount
  useEffect(() => {
    LocalNotifications.requestPermissions();
  }, []);

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

  // Helper to schedule a local notification
  const scheduleLocalNotification = async (medicine) => {
    try {
      if (!medicine.alertTime) return;
      const [hours, minutes] = medicine.alertTime.split(':');
      const now = new Date();
      const notifTime = new Date(now);
      notifTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (notifTime < now) notifTime.setDate(notifTime.getDate() + 1); // schedule for next day if time passed

      const notificationConfig = {
        title: `Pill Reminder: ${medicine.name}`,
        body: `Time to take ${medicine.dosage} ${medicine.dosageType}${medicine.patientName ? ` for ${medicine.patientName}` : ''}`,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: notifTime },
        smallIcon: 'ic_stat_icon_config_sample',
        largeIcon: 'ic_stat_icon_config_sample',
        iconColor: '#3B82F6',
        ongoing: medicine.alertType === 'alarm', // Makes it persistent for alarms
        autoCancel: medicine.alertType !== 'alarm', // Don't auto-cancel alarms
        priority: medicine.alertType === 'alarm' ? 2 : 1, // High priority for alarms
        visibility: 1, // Public visibility
      };

      // Enhanced alarm configuration
      if (medicine.alertType === 'alarm') {
        notificationConfig.sound = 'default';
        notificationConfig.vibrate = [1000, 1000, 1000]; // Vibration pattern
        notificationConfig.lights = '#FF0000'; // Red light
        notificationConfig.ledColor = [255, 0, 0, 255]; // ARGB format
        notificationConfig.ledOn = 1000;
        notificationConfig.ledOff = 1000;
        notificationConfig.channelId = 'alarm-channel';
        notificationConfig.importance = 4; // IMPORTANCE_HIGH
        notificationConfig.extra = { 
          alertType: 'alarm',
          isAlarm: true,
          fullScreenIntent: true
        };
      } else {
        notificationConfig.channelId = 'notification-channel';
        notificationConfig.importance = 3; // IMPORTANCE_DEFAULT
      }

      await LocalNotifications.schedule({
        notifications: [notificationConfig],
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
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

  const deleteMedicine = (id) => {
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
                📅 {new Date(notification.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
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
            
            {/* Add Button with modern design */}
            <button
              onClick={() => setShowAddForm(true)}
              className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
              <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="flex overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentView('medicines')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors ${
              currentView === 'medicines'
                ? 'border-fuchsia-500 bg-gradient-to-r from-yellow-300 via-fuchsia-400 to-blue-400 text-gray-900 font-bold shadow-md'
                : 'border-transparent bg-gray-100 hover:bg-yellow-50 font-semibold text-gray-800'
            }`}
          >
            <Pill className={`w-5 h-5 mx-auto mb-1 ${currentView === 'medicines' ? '' : 'text-gray-800'}`} />
            <span className={`text-sm font-medium ${currentView === 'medicines' ? '' : 'text-gray-800'}`}>Medicines</span>
          </button>
          <button
            onClick={() => setCurrentView('notifications')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors relative ${
              currentView === 'notifications'
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
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors ${
              currentView === 'tracking'
                ? 'border-fuchsia-500 bg-gradient-to-r from-green-300 via-blue-400 to-fuchsia-400 text-gray-900 font-bold shadow-md'
                : 'border-transparent bg-gray-100 hover:bg-green-50 font-semibold text-gray-800'
            }`}
          >
            <BarChart3 className={`w-5 h-5 mx-auto mb-1 ${currentView === 'tracking' ? '' : 'text-gray-800'}`} />
            <span className={`text-sm font-medium ${currentView === 'tracking' ? '' : 'text-gray-800'}`}>Tracking</span>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition-colors ${
              currentView === 'settings'
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
                      className={`flex-1 min-w-0 px-4 py-3 text-center border-b-2 transition-colors ${
                        activeTab === key
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
                  <p className="text-gray-500 mb-4">
                    Add your first medicine for this time slot
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Medicine
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 text-left">
                    {timeSlots[activeTab].label} Medicines ({getMedicinesByTime(activeTab).length})
                  </h2>
                  
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
                          {new Date(record.takenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, specificTime: e.target.value }))}
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
                      <option value="notification">Notification</option>
                      <option value="alarm">Alarm</option>
                    </select>
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
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
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
