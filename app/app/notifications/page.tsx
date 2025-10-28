'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  booking_updates: boolean;
  message_notifications: boolean;
  marketing_emails: boolean;
  system_alerts: boolean;
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,
    booking_updates: true,
    message_notifications: true,
    marketing_emails: false,
    system_alerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('preferences');

  useEffect(() => {
    loadPreferences();
    loadNotifications();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (data && !error) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const response = await fetch(`/api/notifications?user_id=${user.user.id}&unread_only=true`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving preferences:', error);
        alert('Failed to save preferences');
      } else {
        alert('Preferences saved successfully!');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const markNotificationsAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          action: 'mark_read',
        }),
      });

      // Refresh notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAllAsRead = () => {
    const ids = notifications.map(n => n.id);
    if (ids.length > 0) {
      markNotificationsAsRead(ids);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your notification preferences and view recent notifications
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'preferences', name: 'Preferences' },
              { id: 'history', name: 'Notification History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.id === 'history' && notifications.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'preferences' && (
          <div className="max-w-2xl">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Choose how you want to be notified about important updates
                </p>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* Channel Preferences */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.email_enabled}
                        onChange={(e) => setPreferences(prev => ({ ...prev, email_enabled: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                        <p className="text-sm text-gray-500">Receive notifications via text message</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.sms_enabled}
                        onChange={(e) => setPreferences(prev => ({ ...prev, sms_enabled: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                        <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.push_enabled}
                        onChange={(e) => setPreferences(prev => ({ ...prev, push_enabled: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">In-App Notifications</label>
                        <p className="text-sm text-gray-500">Receive notifications within the app</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.in_app_enabled}
                        onChange={(e) => setPreferences(prev => ({ ...prev, in_app_enabled: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Types */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Booking Updates</label>
                        <p className="text-sm text-gray-500">Updates about your bookings and reservations</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.booking_updates}
                        onChange={(e) => setPreferences(prev => ({ ...prev, booking_updates: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Message Notifications</label>
                        <p className="text-sm text-gray-500">New messages from other users</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.message_notifications}
                        onChange={(e) => setPreferences(prev => ({ ...prev, message_notifications: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Marketing Emails</label>
                        <p className="text-sm text-gray-500">Promotional emails and special offers</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.marketing_emails}
                        onChange={(e) => setPreferences(prev => ({ ...prev, marketing_emails: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">System Alerts</label>
                        <p className="text-sm text-gray-500">Important system updates and maintenance notices</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.system_alerts}
                        onChange={(e) => setPreferences(prev => ({ ...prev, system_alerts: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.683L4 21l4.868-8.317z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Unread Notifications</h3>
                <p className="text-gray-600">You&apos;re all caught up! Check back later for new notifications.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            notification.type === 'email' ? 'bg-blue-100 text-blue-800' :
                            notification.type === 'sms' ? 'bg-green-100 text-green-800' :
                            notification.type === 'push' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{notification.title}</h3>
                        <p className="text-gray-700">{notification.message}</p>
                      </div>
                      <button
                        onClick={() => markNotificationsAsRead([notification.id])}
                        className="ml-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Mark as Read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}