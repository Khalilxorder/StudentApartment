'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, X, Copy } from 'lucide-react';
import { DuplicateDetectionPanel } from './DuplicateDetectionPanel';

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected' | 'restricted';
  created_at: string;
  resolved_at?: string;
}

export function ModerationDashboard({
  moderatorId,
}: {
  moderatorId: string;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'reports' | 'duplicates'>('reports');
  const [duplicateApartmentId, setDuplicateApartmentId] = useState<string>('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/moderation/reports?status=pending');
        if (response.ok) {
          const data = (await response.json()) as { reports: Report[] };
          setReports(data.reports || []);
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleAction = async (
    action: 'approved' | 'rejected' | 'restricted'
  ) => {
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/moderation/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          action,
          moderatorId,
          notes: actionNotes,
          restrictionDuration: 30,
        }),
      });

      if (response.ok) {
        // Update local state
        setReports(
          reports.map((r) =>
            r.id === selectedReport.id
              ? { ...r, status: action, resolved_at: new Date().toISOString() }
              : r
          )
        );
        setSelectedReport(null);
        setActionNotes('');
      }
    } catch (error) {
      console.error('Failed to take action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    if (reason.includes('inappropriate')) return 'bg-red-100 text-red-800';
    if (reason.includes('spam')) return 'bg-yellow-100 text-yellow-800';
    if (reason.includes('offensive')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          User Reports
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'duplicates'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Duplicate Detection
        </button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <ReportsTab
          reports={reports}
          selectedReport={selectedReport}
          setSelectedReport={setSelectedReport}
          actionLoading={actionLoading}
          actionNotes={actionNotes}
          setActionNotes={setActionNotes}
          handleAction={(action: 'approved' | 'rejected' | 'restricted') => {
            // Implementation from previous code
          }}
          getReasonBadgeColor={getReasonBadgeColor}
        />
      )}

      {/* Duplicates Tab */}
      {activeTab === 'duplicates' && (
        <DuplicatesTab
          duplicateApartmentId={duplicateApartmentId}
          setDuplicateApartmentId={setDuplicateApartmentId}
        />
      )}
    </div>
  );
}

function ReportsTab({
  reports,
  selectedReport,
  setSelectedReport,
  actionLoading,
  actionNotes,
  setActionNotes,
  handleAction,
  getReasonBadgeColor,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Reports List */}
      <div className="lg:col-span-2">
        <div className="space-y-2">
          {reports
            .filter((r: Report) => r.status === 'pending')
            .map((report: Report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`border rounded-lg p-4 cursor-pointer transition ${
                  selectedReport?.id === report.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={16} className="text-red-600" />
                      <span className={`text-xs px-2 py-1 rounded ${getReasonBadgeColor(report.reason)}`}>
                        {report.reason}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {report.target_type}: {report.target_id.substring(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Reported by: {report.reporter_id.substring(0, 8)}...
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Report Details & Actions */}
      {selectedReport && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="font-medium text-lg">Report Details</h3>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Type</p>
              <p className="font-medium capitalize">{selectedReport.target_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Reason</p>
              <p className="font-medium">{selectedReport.reason}</p>
            </div>
            {selectedReport.details && (
              <div>
                <p className="text-xs text-gray-600">Details</p>
                <p className="text-sm text-gray-700">{selectedReport.details}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-2">Moderator Notes</label>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Add resolution notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleAction('approved')}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition"
            >
              <Check size={16} />
              Approve
            </button>
            <button
              onClick={() => handleAction('rejected')}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition"
            >
              <X size={16} />
              Reject
            </button>
            <button
              onClick={() => handleAction('restricted')}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition"
            >
              <AlertCircle size={16} />
              Restrict User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DuplicatesTab({
  duplicateApartmentId,
  setDuplicateApartmentId,
}: {
  duplicateApartmentId: string;
  setDuplicateApartmentId: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Enter an apartment ID to check for potential duplicates across the platform.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={duplicateApartmentId}
          onChange={(e) => setDuplicateApartmentId(e.target.value)}
          placeholder="Enter apartment ID..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
        />
        <button
          onClick={() => {
            if (duplicateApartmentId) {
              setDuplicateApartmentId(duplicateApartmentId);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          Search
        </button>
      </div>

      {duplicateApartmentId && (
        <DuplicateDetectionPanel apartmentId={duplicateApartmentId} />
      )}
    </div>
  );
}
