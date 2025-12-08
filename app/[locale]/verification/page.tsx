'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

interface VerificationRequirement {
  type: string;
  name: string;
  description: string;
  required: boolean;
}

interface VerificationRecord {
  id: string;
  document_type: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  review_notes?: string;
}

export default function VerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userType, setUserType] = useState<string>('');
  const [requirements, setRequirements] = useState<VerificationRequirement[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadVerificationData();
  }, []);

  const loadVerificationData = async () => {
    try {
      const response = await fetch('/api/verification/upload');
      if (response.ok) {
        const data = await response.json();
        setUserType(data.profile.user_type || '');
        setRequirements(data.requirements || []);
        setVerifications(data.verifications || []);
      }
    } catch (error) {
      console.error('Failed to load verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedDocumentType) {
      setError('Please select a document type and file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('documentType', selectedDocumentType);
      formData.append('file', selectedFile);

      const response = await fetch('/api/verification/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message);
        setSelectedFile(null);
        setSelectedDocumentType('');
        // Reload verification data
        await loadVerificationData();
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (error) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRequirementStatus = (type: string) => {
    const verification = verifications.find(v => v.document_type === type);
    return verification ? verification.status : 'missing';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Verification</h1>
          <p className="text-gray-600">
            Complete verification to unlock all features and build trust in our community.
            All documents are encrypted and securely stored.
          </p>
        </div>

        {/* Verification Requirements */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
          <div className="space-y-4">
            {requirements.map((req) => (
              <div key={req.type} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{req.name}</h3>
                  <p className="text-sm text-gray-600">{req.description}</p>
                </div>
                <div className="ml-4">
                  {getRequirementStatus(req.type) === 'missing' ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      Not Submitted
                    </span>
                  ) : (
                    getStatusBadge(getRequirementStatus(req.type))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Documents</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select document type</option>
                {requirements.map((req) => (
                  <option key={req.type} value={req.type}>
                    {req.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: JPEG, PNG, WebP, PDF. Maximum size: 10MB.
              </p>
            </div>

            <button
              onClick={handleFileUpload}
              disabled={uploading || !selectedFile || !selectedDocumentType}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>

        {/* Submitted Documents */}
        {verifications.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Submitted Documents</h2>
            <div className="space-y-4">
              {verifications.map((verification) => (
                <div key={verification.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {requirements.find(r => r.type === verification.document_type)?.name || verification.document_type}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Submitted {new Date(verification.submitted_at).toLocaleDateString()}
                    </p>
                    {verification.review_notes && (
                      <p className="text-sm text-gray-500 mt-1">{verification.review_notes}</p>
                    )}
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(verification.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust & Safety Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Trust & Safety</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• All documents are encrypted and stored securely</li>
            <li>• Verification typically takes 24-48 hours</li>
            <li>• You&apos;ll receive an email notification when review is complete</li>
            <li>• Documents are only used for verification purposes</li>
            <li>• You can request document deletion after successful verification</li>
          </ul>
        </div>
      </div>
    </div>
  );
}