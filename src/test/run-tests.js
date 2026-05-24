/**
 * Smart Pill Reminder Test Suite
 * ------------------------------
 * This script runs diagnostic test cases for the core scheduling, unique ID generation,
 * and date calculation logic of MyMedAlert.
 * 
 * Run this test using Node:
 *   node src/test/run-tests.js
 */

const assert = {
    equal: (actual, expected, message) => {
        if (actual !== expected) {
            throw new Error(`FAIL: Expected [${expected}] but got [${actual}] - ${message}`);
        }
        console.log(`  ✅ PASS: ${message}`);
    },
    ok: (value, message) => {
        if (!value) {
            throw new Error(`FAIL: Expected truthy value - ${message}`);
        }
        console.log(`  ✅ PASS: ${message}`);
    }
};

// 1. Unique Notification/Alarm ID Generator Logic
const generateNotificationId = (medicineId, day = 0) => {
    // Extract numbers from the medicine ID (e.g., timestamp)
    const numericPart = parseInt(String(medicineId).replace(/\D/g, '').substring(0, 8)) || 1;
    // Add day offset to generate unique IDs for each day of the week
    return (numericPart % 1000000) * 10 + (day % 10);
};

// 2. Alert Time Calculation Logic (1 minute before specific time)
const calculateAlertTime = (specificTime) => {
    if (!specificTime) return '08:00';
    const [hoursStr, minutesStr] = specificTime.split(':');
    let hours = parseInt(hoursStr);
    let minutes = parseInt(minutesStr);
    
    minutes--;
    if (minutes < 0) {
        minutes = 59;
        hours--;
        if (hours < 0) {
            hours = 23;
        }
    }
    
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}`;
};

// 3. Medicine Date Scheduling Predicate Logic
const isMedicineScheduledForDate = (medicine, date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Check if date is within reminder end date
    if (medicine.reminderEndDate) {
        const endDate = new Date(medicine.reminderEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (checkDate > endDate) return false;
    }
    
    // Check medicine creation date
    const createdDate = medicine.createdAt ? new Date(medicine.createdAt) : new Date(0);
    createdDate.setHours(0, 0, 0, 0);
    if (checkDate < createdDate) return false;
    
    const frequency = medicine.frequency || 'daily';
    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    switch (frequency) {
        case 'daily':
            return true;
        
        case 'every-other-day': {
            const refDate = createdDate.getTime() > 0 ? createdDate : today;
            const diffDays = Math.floor((checkDate - refDate) / (1000 * 60 * 60 * 24));
            return diffDays % 2 === 0;
        }
        
        case 'every-n-days': {
            const nDays = medicine.frequencyDays || 2;
            const refDate = createdDate.getTime() > 0 ? createdDate : today;
            const diffDays = Math.floor((checkDate - refDate) / (1000 * 60 * 60 * 24));
            return diffDays % nDays === 0;
        }
        
        case 'specific-days': {
            const specificDays = medicine.specificWeekDays || [];
            return specificDays.includes(dayOfWeek);
        }
        
        case 'weekly': {
            const refDate = createdDate.getTime() > 0 ? createdDate : today;
            return checkDate.getDay() === refDate.getDay();
        }
        
        case 'monthly': {
            const refDate = createdDate.getTime() > 0 ? createdDate : today;
            return checkDate.getDate() === refDate.getDate();
        }
        
        case 'as-needed':
            return true;
        
        default:
            return true;
    }
};

// --- RUNNING TEST CASES ---

console.log("🎬 Starting Diagnostic Test Cases for MyMedAlert Core Utilities...");

try {
    // --- Test Unique ID Generator ---
    console.log("\n🧪 Test Case Group 1: Unique Notification ID Generator");
    const medId = "1684920019234";
    const idDay0 = generateNotificationId(medId, 0);
    const idDay1 = generateNotificationId(medId, 1);
    const idDay2 = generateNotificationId(medId, 2);
    
    assert.ok(idDay0 !== idDay1, "Notification IDs for different days must be unique");
    assert.ok(idDay1 !== idDay2, "Adjacent day offsets must produce unique IDs");
    assert.equal(idDay0 % 10, 0, "Day 0 notification ID should end with 0");
    assert.equal(idDay1 % 10, 1, "Day 1 notification ID should end with 1");

    // --- Test Alert Time Calculation ---
    console.log("\n🧪 Test Case Group 2: Alert Time Computations");
    assert.equal(calculateAlertTime("08:00"), "07:59", "8:00 AM alert time should be 7:59 AM");
    assert.equal(calculateAlertTime("12:00"), "11:59", "12:00 PM alert time should be 11:59 AM");
    assert.equal(calculateAlertTime("00:00"), "23:59", "Midnight alert time should roll back to 11:59 PM");
    assert.equal(calculateAlertTime("10:05"), "10:04", "Standard transition calculation");

    // --- Test Scheduling Predicates ---
    console.log("\n🧪 Test Case Group 3: Medicine Date Scheduling Predicate");
    
    const baseCreatedAt = new Date("2026-05-20T00:00:00").getTime();
    
    // Test A: Daily schedule
    const dailyMed = {
        id: "med1",
        createdAt: baseCreatedAt,
        frequency: "daily"
    };
    assert.ok(isMedicineScheduledForDate(dailyMed, new Date("2026-05-20")), "Daily med scheduled for Day 0");
    assert.ok(isMedicineScheduledForDate(dailyMed, new Date("2026-05-21")), "Daily med scheduled for Day 1");
    assert.ok(isMedicineScheduledForDate(dailyMed, new Date("2026-05-30")), "Daily med scheduled for Day 10");

    // Test B: Every Other Day schedule
    const alternateMed = {
        id: "med2",
        createdAt: baseCreatedAt,
        frequency: "every-other-day"
    };
    assert.ok(isMedicineScheduledForDate(alternateMed, new Date("2026-05-20")), "Alternate med active on Day 0");
    assert.equal(isMedicineScheduledForDate(alternateMed, new Date("2026-05-21")), false, "Alternate med inactive on Day 1");
    assert.ok(isMedicineScheduledForDate(alternateMed, new Date("2026-05-22")), "Alternate med active on Day 2");

    // Test C: Every N Days (N=3)
    const nDaysMed = {
        id: "med3",
        createdAt: baseCreatedAt,
        frequency: "every-n-days",
        frequencyDays: 3
    };
    assert.ok(isMedicineScheduledForDate(nDaysMed, new Date("2026-05-20")), "Every 3 days med active on Day 0");
    assert.equal(isMedicineScheduledForDate(nDaysMed, new Date("2026-05-21")), false, "Every 3 days med inactive on Day 1");
    assert.equal(isMedicineScheduledForDate(nDaysMed, new Date("2026-05-22")), false, "Every 3 days med inactive on Day 2");
    assert.ok(isMedicineScheduledForDate(nDaysMed, new Date("2026-05-23")), "Every 3 days med active on Day 3");

    // Test D: Specific Days of Week (Mon/Wed/Fri -> 1, 3, 5)
    const specificDaysMed = {
        id: "med4",
        createdAt: baseCreatedAt,
        frequency: "specific-days",
        specificWeekDays: [1, 3, 5]
    };
    assert.equal(isMedicineScheduledForDate(specificDaysMed, new Date("2026-05-24")), false, "Sunday (0) is not scheduled");
    assert.ok(isMedicineScheduledForDate(specificDaysMed, new Date("2026-05-25")), "Monday (1) is scheduled");
    assert.equal(isMedicineScheduledForDate(specificDaysMed, new Date("2026-05-26")), false, "Tuesday (2) is not scheduled");
    assert.ok(isMedicineScheduledForDate(specificDaysMed, new Date("2026-05-27")), "Wednesday (3) is scheduled");

    // Test E: Reminder End Date thresholds
    const limitedMed = {
        id: "med5",
        createdAt: baseCreatedAt,
        frequency: "daily",
        reminderEndDate: "2026-05-22"
    };
    assert.ok(isMedicineScheduledForDate(limitedMed, new Date("2026-05-21")), "Active before end threshold");
    assert.ok(isMedicineScheduledForDate(limitedMed, new Date("2026-05-22")), "Active exactly on end threshold date");
    assert.equal(isMedicineScheduledForDate(limitedMed, new Date("2026-05-23")), false, "Inactive after end threshold");

    // Test F: Creation date boundaries
    const futureMed = {
        id: "med6",
        createdAt: new Date("2026-05-25T00:00:00").getTime(),
        frequency: "daily"
    };
    assert.equal(isMedicineScheduledForDate(futureMed, new Date("2026-05-24")), false, "Inactive before creation timestamp");
    assert.ok(isMedicineScheduledForDate(futureMed, new Date("2026-05-25")), "Active on creation date");

    console.log("\n🎉 ALL DIAGNOSTIC TEST CASES COMPLETED SUCCESSFULLY!");

} catch (error) {
    console.error("\n❌ TEST SUITE FAILED WITH EXCEPTION:");
    console.error(error.message);
    process.exit(1);
}
