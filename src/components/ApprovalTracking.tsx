import React, { useState, useEffect } from 'react';
import { Clock, User, ArrowRight, CheckCircle, XCircle, Forward, FileText } from 'lucide-react';

interface ApprovalTrackingEntry {
  step_number: number;
  action_type: string;
  action_by_name: string;
  forwarded_from_name?: string;
  forwarded_to_name?: string;
  comments: string;
  action_date: string;
  is_current_step: boolean;
}

interface ApprovalTrackingProps {
  approvalId: string;
  requestTitle?: string;
}

const ApprovalTracking: React.FC<ApprovalTrackingProps> = ({ approvalId, requestTitle }) => {
  const [trackingData, setTrackingData] = useState<ApprovalTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrackingData();
  }, [approvalId]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/approvals/${approvalId}/history`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load tracking data');
      }
      
      setTrackingData(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return <Forward className="w-5 h-5 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'submitted':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'forwarded':
        return 'border-blue-500 bg-blue-50';
      case 'approved':
        return 'border-green-500 bg-green-50';
      case 'rejected':
        return 'border-red-500 bg-red-50';
      case 'submitted':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading tracking information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading tracking data: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">Approval Tracking Timeline</h3>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Latest First
        </span>
      </div>

      {requestTitle && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Request: <span className="font-medium">{requestTitle}</span></p>
          <p className="text-xs text-gray-500">Approval ID: {approvalId}</p>
        </div>
      )}

      <div className="space-y-4">
        {trackingData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tracking information available</p>
        ) : (
          // Data already sorted by backend in descending order (latest first)
          trackingData.map((entry, index) => (
            <div
              key={index}
              className={`relative border-l-4 pl-6 pb-4 ${getActionColor(entry.action_type)} ${
                entry.is_current_step ? 'ring-2 ring-blue-300' : ''
              }`}
            >
              {/* Timeline dot */}
              <div className="absolute -left-3 top-2 bg-white border-4 border-gray-300 rounded-full p-1">
                {getActionIcon(entry.action_type)}
              </div>

              {/* Current step indicator */}
              {entry.is_current_step && (
                <div className="absolute -left-6 -top-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  Current
                </div>
              )}

              {/* Step content */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      Step {entry.step_number}: {entry.action_type.charAt(0).toUpperCase() + entry.action_type.slice(1)}
                    </span>
                    {entry.is_current_step && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Pending Action
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(entry.action_date)}
                  </span>
                </div>

                {/* Action details */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      Action by: <span className="font-medium">{entry.action_by_name}</span>
                    </span>
                  </div>

                  {/* Forward-specific details */}
                  {entry.action_type === 'forwarded' && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                      <span>
                        From: <span className="font-medium">{entry.forwarded_from_name || 'System'}</span>
                        {entry.forwarded_to_name && (
                          <>
                            {' → '}
                            To: <span className="font-medium">{entry.forwarded_to_name}</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Comments */}
                  {entry.comments && (
                    <div className="bg-gray-50 rounded p-2 mt-2">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Comments:</span> {entry.comments}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Total Steps: <span className="font-medium">{trackingData.length}</span>
          </span>
          <span className="text-gray-600">
            Current Status: <span className="font-medium">
              {trackingData.find(entry => entry.is_current_step)?.action_type === 'forwarded' 
                ? 'Pending Action' 
                : trackingData[trackingData.length - 1]?.action_type || 'Unknown'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTracking;