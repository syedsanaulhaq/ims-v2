import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface VerificationRequest {
  id: number;
  item_nomenclature: string;
  requested_quantity: number;
  status: string;
  physical_count?: number;
  available_quantity?: number;
  verification_notes?: string;
  verified_by_name?: string;
  wing_name: string;
  requested_at: string;
  verified_at?: string;
}

export default function VerificationHistoryPage() {
  const { user } = useSession();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchVerificationHistory();
  }, [user?.user_id]);

  const fetchVerificationHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inventory/verification-history?userId=${user?.user_id}`
      );
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setVerifications(result.data);
      }
    } catch (error) {
      console.error('Error fetching verification history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified_available':
        return <Badge className="bg-green-100 text-green-800">✅ Available</Badge>;
      case 'verified_partial':
        return <Badge className="bg-yellow-100 text-yellow-800">⚠️ Partially Available</Badge>;
      case 'verified_unavailable':
        return <Badge className="bg-red-100 text-red-800">❌ Unavailable</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">⏳ Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified_available':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'verified_partial':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'verified_unavailable':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Verification History</h1>
        <p className="text-gray-600 mt-2">View the status of your inventory verification requests</p>
      </div>

      {verifications.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No verification requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {verifications.map((verification) => (
            <Card
              key={verification.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() =>
                setSelectedId(selectedId === verification.id ? null : verification.id)
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(verification.status)}
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {verification.item_nomenclature}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Wing: {verification.wing_name}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 py-3 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">
                          Status
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(verification.status)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">
                          Requested Qty
                        </p>
                        <p className="font-semibold text-gray-900">
                          {verification.requested_quantity} units
                        </p>
                      </div>
                      {verification.physical_count !== undefined && (
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wide">
                            Verified Qty
                          </p>
                          <p className="font-semibold text-gray-900">
                            {verification.physical_count || 0} units
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">
                          Verified
                        </p>
                        <p className="text-sm text-gray-900">
                          {verification.verified_at
                            ? new Date(verification.verified_at).toLocaleDateString()
                            : 'Pending'}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedId === verification.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        {verification.verified_by_name && (
                          <div>
                            <p className="text-sm text-gray-600">Verified By</p>
                            <p className="font-semibold text-gray-900">
                              {verification.verified_by_name}
                            </p>
                          </div>
                        )}
                        {verification.verification_notes && (
                          <div>
                            <p className="text-sm text-gray-600">Verification Notes</p>
                            <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-900 font-medium">
                                {verification.verification_notes}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Request Date</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(verification.requested_at).toLocaleDateString()}
                            </p>
                          </div>
                          {verification.verified_at && (
                            <div>
                              <p className="text-gray-600">Verification Date</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(verification.verified_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Eye
                      className={`w-5 h-5 transition-transform ${
                        selectedId === verification.id ? 'rotate-180' : ''
                      } text-gray-400`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
