import React from 'react';
import { ArrowLeft, Shield, Lock, Database, Eye, FileText, Mail, Clock } from 'lucide-react';

const PrivacyPolicy = ({ onBack }) => {
  const lastUpdated = "July 8, 2025";

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex flex-col">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 flex-shrink-0 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 pointer-events-none"></div>
        
        <div className="relative px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="text-sm text-gray-600">MyMedAlert - Medicine Reminder App</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="px-4 py-6 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-8 mb-8">
          
          {/* Last Updated */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-600" />
              Introduction
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Welcome to MyMedAlert, a medicine reminder application designed to help you manage your medication schedule effectively. 
                This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our app.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                We are committed to protecting your privacy and ensuring the security of your personal health information. 
                By using MyMedAlert, you agree to the practices described in this Privacy Policy.
              </p>
            </div>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Data Collection
            </h2>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                <h3 className="font-semibold text-green-900 mb-2">What We DON'T Collect</h3>
                <ul className="text-green-800 space-y-1 list-disc list-inside">
                  <li><strong>We do not collect any personal data</strong> (e.g., name, email, phone number)</li>
                  <li><strong>No data is stored on external servers</strong></li>
                  <li><strong>All user settings and reminders are saved locally on the device only</strong></li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">App Data (Stored Locally Only)</h3>
                <ul className="text-gray-700 space-y-1 list-disc list-inside">
                  <li>Patient names (as entered by you)</li>
                  <li>Medicine names and dosage information</li>
                  <li>Medication schedules and reminder times</li>
                  <li>Medicine photos (if uploaded by you)</li>
                  <li>Notes and additional medication instructions</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Usage Information</h3>
                <ul className="text-gray-700 space-y-1 list-disc list-inside">
                  <li>Medication adherence data (when you mark medicines as taken/missed)</li>
                  <li>App usage patterns and interaction data</li>
                  <li>Notification preferences and settings</li>
                  <li>Device information for notification delivery</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Device Information</h3>
                <ul className="text-gray-700 space-y-1 list-disc list-inside">
                  <li>Device type and operating system</li>
                  <li>App version and technical diagnostics</li>
                  <li>Local storage data for offline functionality</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-blue-600" />
              How We Use Your Information
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>Primary Purpose:</strong> All information collected is used solely to provide you with medication reminder services.
              </p>
              <ul className="text-gray-700 space-y-2 list-disc list-inside">
                <li>Send medication reminders and notifications</li>
                <li>Track medication adherence and generate reports</li>
                <li>Maintain your medication schedule and history</li>
                <li>Provide refill reminders when pills are running low</li>
                <li>Improve app functionality and user experience</li>
                <li>Ensure proper app operation and troubleshoot issues</li>
              </ul>
            </div>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-blue-600" />
              Data Storage and Security
            </h2>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                <h3 className="font-semibold text-green-900 mb-2">Local Storage</h3>
                <p className="text-green-800">
                  Your medication data is stored locally on your device using browser localStorage. 
                  This means your sensitive health information never leaves your device and is not transmitted to external servers.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Security Measures</h3>
                <ul className="text-gray-700 space-y-1 list-disc list-inside">
                  <li>Data encryption using browser security standards</li>
                  <li>No cloud storage or external data transmission</li>
                  <li>Access restricted to the app on your device only</li>
                  <li>Regular security updates and patches</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sharing and Third Parties</h2>
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
              <p className="text-red-800 font-medium mb-3">We DO NOT share your information</p>
              <ul className="text-red-700 space-y-2 list-disc list-inside">
                <li><strong>We do not share any information with third parties</strong></li>
                <li><strong>There are no ads or analytics SDKs in this app</strong></li>
                <li>Your medication data is never sold or shared with third parties</li>
                <li>No data is transmitted to pharmaceutical companies</li>
                <li>No marketing or advertising uses of your health information</li>
                <li>No analytics tracking of your medication habits</li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights and Controls</h2>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h3 className="font-semibold text-blue-900">Access and Control</h3>
                <p className="text-blue-800">You have complete control over your data and can view, edit, or delete any information at any time within the app.</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <h3 className="font-semibold text-blue-900">Data Deletion</h3>
                <p className="text-blue-800">You can delete individual medicines, clear all data, or uninstall the app to remove all stored information.</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <h3 className="font-semibold text-blue-900">Notification Control</h3>
                <p className="text-blue-800">You can disable notifications at any time through your device settings or within the app.</p>
              </div>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
              <div className="space-y-3">
                <p className="text-yellow-800 font-medium">
                  <strong>Our app does not knowingly collect data from children under the age of 13.</strong>
                </p>
                <p className="text-yellow-800">
                  MyMedAlert can be used to manage medications for family members including children. 
                  When entering information for minors, parents or guardians are responsible for ensuring 
                  the accuracy of the information and managing their children's medication data within the app.
                </p>
                <p className="text-yellow-800">
                  Since all data is stored locally on your device and no personal information is collected or transmitted, 
                  the app is safe for family use under parental supervision.
                </p>
              </div>
            </div>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. 
              When we make changes, we will update the "Last Updated" date at the top of this policy. 
              We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="w-6 h-6 mr-2 text-blue-600" />
              Contact Us
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>If you have any questions about this Privacy Policy, feel free to contact us:</strong>
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> balivishnu.cs@gmail.com</p>
                <p><strong>App Support:</strong> Use the feedback option within the app</p>
                <p><strong>Response Time:</strong> We aim to respond to privacy inquiries within 48 hours</p>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Since this app operates entirely offline with local storage, 
                  most privacy concerns can be addressed by reviewing the app's functionality and this policy.
                </p>
              </div>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Compliance and Standards</h2>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 leading-relaxed">
                MyMedAlert is designed with privacy-by-design principles and follows best practices for health app privacy. 
                Our local-first approach ensures your sensitive health information remains under your control at all times.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t pt-6 mt-8">
            <p className="text-center text-gray-600 text-sm">
              This Privacy Policy is effective as of {lastUpdated} and applies to all users of MyMedAlert.
            </p>
          </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
