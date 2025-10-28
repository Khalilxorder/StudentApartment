'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Trash2,
  Eye,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  dataSharing: boolean;
  marketingEmails: boolean;
  analyticsTracking: boolean;
}

export default function PrivacyDashboard() {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'private',
    dataSharing: false,
    marketingEmails: false,
    analyticsTracking: true,
  });

  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'confirming' | 'processing'>('idle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const response = await fetch('/api/privacy/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    try {
      const response = await fetch('/api/privacy/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
    }
  };

  const requestDataExport = async () => {
    setExportStatus('processing');
    try {
      const response = await fetch('/api/privacy/data-export', {
        method: 'POST',
      });

      if (response.ok) {
        // Trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-apartments-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setExportStatus('ready');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      setExportStatus('idle');
    }
  };

  const requestDataDeletion = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setDeleteStatus('confirming');
      return;
    }

    setDeleteStatus('processing');
    try {
      const response = await fetch('/api/privacy/data-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmDeletion: true }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Your data has been successfully deleted. You will be logged out.');
          // Redirect to home page or logout
          window.location.href = '/';
        } else {
          alert('Some data could not be deleted. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Failed to delete data:', error);
      setDeleteStatus('idle');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Dashboard
          </CardTitle>
          <CardDescription>
            Manage your privacy settings and data rights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Eye className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">Data Control</h3>
              <p className="text-sm text-gray-600">Manage what data we collect</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Download className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Data Export</h3>
              <p className="text-sm text-gray-600">Download your personal data</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Trash2 className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <h3 className="font-semibold">Data Deletion</h3>
              <p className="text-sm text-gray-600">Request account deletion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Control how your data is used and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Visibility */}
          <div className="space-y-3">
            <label className="font-semibold">Profile Visibility</label>
            <div className="space-y-2">
              {[
                { value: 'public', label: 'Public', description: 'Anyone can see your profile' },
                { value: 'friends', label: 'Friends Only', description: 'Only connected users can see your profile' },
                { value: 'private', label: 'Private', description: 'Only you can see your profile' },
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`visibility-${option.value}`}
                    name="profileVisibility"
                    value={option.value}
                    checked={settings.profileVisibility === option.value}
                    onChange={(e) => updateSetting('profileVisibility', e.target.value)}
                    className="text-blue-600"
                  />
                  <label htmlFor={`visibility-${option.value}`} className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sharing */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold">Data Sharing for Research</label>
              <p className="text-sm text-gray-600">Allow anonymized data sharing for academic research</p>
            </div>
            <Checkbox
              checked={settings.dataSharing}
              onCheckedChange={(checked) => updateSetting('dataSharing', checked)}
            />
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold">Marketing Emails</label>
              <p className="text-sm text-gray-600">Receive emails about new features and promotions</p>
            </div>
            <Checkbox
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
            />
          </div>

          {/* Analytics Tracking */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold">Analytics Tracking</label>
              <p className="text-sm text-gray-600">Help improve our service with usage analytics</p>
            </div>
            <Checkbox
              checked={settings.analyticsTracking}
              onCheckedChange={(checked) => updateSetting('analyticsTracking', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export (GDPR Article 20)
          </CardTitle>
          <CardDescription>
            Download a copy of all your personal data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-700">
              You can request a complete export of all personal data we have stored about you.
              This includes your profile, apartments, reviews, messages, and other information.
            </p>

            <div className="flex items-center gap-4">
              <Button
                onClick={requestDataExport}
                disabled={exportStatus === 'processing'}
                className="flex items-center gap-2"
              >
                {exportStatus === 'processing' ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exportStatus === 'processing' ? 'Preparing Export...' : 'Export My Data'}
              </Button>

              {exportStatus === 'ready' && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Export Ready
                </Badge>
              )}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Data export may take a few minutes. You will receive a download link when ready.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Data Deletion (Right to be Forgotten)
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All your data, including
                apartments, reviews, and messages, will be permanently deleted.
              </AlertDescription>
            </Alert>

            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Request Account Deletion
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="font-semibold text-red-600">
                  Are you sure you want to delete your account?
                </p>
                <p className="text-sm text-gray-600">
                  This will permanently delete all your data and cannot be reversed.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={requestDataDeletion}
                    disabled={deleteStatus === 'processing'}
                    className="flex items-center gap-2"
                  >
                    {deleteStatus === 'processing' ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deleteStatus === 'processing' ? 'Deleting...' : 'Yes, Delete My Account'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteStatus('idle');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}