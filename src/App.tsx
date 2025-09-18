import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Medications } from '@/pages/Medications';
import { Inventory } from '@/pages/Inventory';
import { Calendar } from '@/pages/Calendar';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';
import { Reminders } from '@/pages/Reminders';
import { Reports } from '@/pages/Reports';
import { HealthProfile } from '@/pages/HealthProfile';
import { Wiki } from '@/pages/Wiki';
import { CyclicDosing } from '@/pages/CyclicDosing';
import { ChangelogModal } from '@/components/ui/ChangelogModal';
import { UpdateNotification, useUpdateNotification } from '@/components/ui/UpdateNotification';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useNotificationHandler } from '@/hooks/useNotificationHandler';
// import { AdminIntegration } from '@/components/admin/AdminIntegration'; // DISABLED
import { useMedicationStore } from '@/store';
import { notificationService } from '@/services/notificationService';
import { backendSyncService } from '@/services/backendSyncService';
import { consoleCapture } from '@/utils/consoleCapture';

function App() {
  const { userProfile } = useMedicationStore();
  const { shouldShowChangelog, currentVersion, markVersionSeen } = useVersionCheck();
  const { showUpdate, showUpdateNotification, handleUpdate, handleDismiss } = useUpdateNotification();

  // Initialize notification handling
  const { checkMissedNotifications } = useNotificationHandler();

  // Initialize user profile if it doesn't exist
  React.useEffect(() => {
    if (!userProfile) {
      // We'll show a welcome screen or automatically create a basic profile
      // For now, let's create a default profile
    }
  }, [userProfile]);

  // Check for missed notifications when the app loads
  React.useEffect(() => {
    const initializeApp = async () => {
      console.log('App loaded, initializing iOS PWA notification system...');
      
      // **CONSOLE CAPTURE**: Initialize global console capture for PWA debugging
      // This persists across page navigation
      consoleCapture; // Initialize the singleton
      
      // Get current reminders and medications from store
      const { reminders, medications } = useMedicationStore.getState();
      
      // **BACKEND SYNC**: Initialize backend sync service for iOS PWA reliability
      try {
        console.log('🔄 Initializing backend sync service...');
        await backendSyncService.initialize();
        console.log('✅ Backend sync service initialized successfully');

        // Sync existing data to backend if available
        if (reminders.length > 0 || medications.length > 0) {
          console.log('📤 Syncing existing data to backend...');
          const syncSuccess = await backendSyncService.syncUserDataToBackend(
            reminders, 
            medications, 
            useMedicationStore.getState().userProfile
          );
          
          if (syncSuccess) {
            console.log('✅ Initial backend sync completed - iOS PWA notifications enabled');
          } else {
            console.warn('⚠️ Initial backend sync failed - using client-side only');
          }
        }
      } catch (error) {
        console.error('❌ Backend sync initialization failed:', error);
        console.log('📱 Falling back to client-side notifications only');
      }

      // **iOS PWA FIX**: Migrate existing reminders to multi-instance system
      if (reminders.length > 0 && medications.length > 0) {
        try {
          console.log('🔄 Starting iOS PWA reminder migration...');
          await notificationService.migrateExistingReminders(reminders, medications);
          console.log('✅ iOS PWA reminder migration completed');
        } catch (error) {
          console.error('❌ iOS PWA reminder migration failed:', error);
        }
      }
      
      // **iOS PWA DIAGNOSTIC & RECOVERY**: Check for missed notifications and implement recovery
      console.log('Running iOS PWA notification diagnostic and recovery...');
      
      try {
        // Run comprehensive diagnostic
        const diagnostic = await notificationService.diagnoseIOSPWANotificationIssues();
        console.log('📊 iOS PWA Notification Diagnostic Results:', diagnostic);
        
        // If on iOS PWA, implement missed dose recovery system
        if (diagnostic.coreIssue.includes('iOS Safari')) {
          console.log('🍎 iOS PWA detected - implementing missed dose recovery system');
          await notificationService.implementMissedDoseRecovery();
        }
        
        // Still run standard missed notification check
        notificationService.checkMissedNotifications();
        
      } catch (error) {
        console.error('❌ Failed to run iOS PWA diagnostic:', error);
        // Fallback to standard check
        notificationService.checkMissedNotifications();
      }
    };
    
    // Initialize after a short delay to ensure store is ready
    const timer = setTimeout(initializeApp, 1500);
    
    // Also check when the window gains focus
    const handleFocus = () => {
      console.log('Window gained focus, checking for missed notifications');
      notificationService.checkMissedNotifications();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Expose the update notification to global scope for service worker integration
  React.useEffect(() => {
    (window as any).showAppUpdateNotification = (callback: () => void) => {
      showUpdateNotification(callback);
    };
    
    return () => {
      delete (window as any).showAppUpdateNotification;
    };
  }, [showUpdateNotification]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<HealthProfile />} />
          <Route path="/wiki" element={<Wiki />} />
          <Route path="/cyclic-dosing" element={<CyclicDosing />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
      
      {/* Hidden Admin Integration - tracks UI sequences for admin access */}
      {/* <AdminIntegration /> */}
      
      {/* Update Notification */}
      <UpdateNotification
        isVisible={showUpdate}
        onUpdate={handleUpdate}
        onDismiss={handleDismiss}
      />
      
      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={shouldShowChangelog}
        onClose={markVersionSeen}
        version={currentVersion}
      />
    </div>
  );
}

export default App;
