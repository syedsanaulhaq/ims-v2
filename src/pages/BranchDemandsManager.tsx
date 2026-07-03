import React, { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/utils/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, History, RefreshCcw } from 'lucide-react';

interface DemandRow {
  id: string;
  staff_name?: string;
  item_nomenclature: string;
  requested_quantity: number;
  unit_label?: string;
  status: string;
  included_request_number?: string;
  included_request_status?: string;
  created_at?: string;
}

interface RequestRow {
  id: string;
  request_number?: string;
  requester_name?: string;
  request_status?: string;
  approval_status?: string;
  urgency_level?: string;
  submitted_at?: string;
  created_at?: string;
}

const parseApiJsonSafely = (raw: string) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const statusClass = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('approved') || normalized.includes('issued') || normalized.includes('included')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (normalized.includes('reject')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (normalized.includes('pending') || normalized.includes('submitted') || normalized.includes('forwarded')) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

const toDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const BranchDemandsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${getApiBaseUrl()}/api/stock-issuance/branch-demands/manager`, {
        credentials: 'include'
      });

      const raw = await response.text();
      const data = parseApiJsonSafely(raw);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load branch demands manager');
      }

      setDemands(data.demands || []);
      setRequests(data.requests || []);
      setSuccess('Branch demands manager loaded successfully.');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branch demands manager');
      setDemands([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const pendingDemands = demands.filter((d) => {
      const s = String(d.status || '').toLowerCase();
      return s.includes('submitted') || s.includes('pending');
    }).length;

    const completedDemands = demands.filter((d) => String(d.status || '').toLowerCase().includes('included')).length;

    const activeRequests = requests.filter((r) => {
      const s = String(r.approval_status || r.request_status || '').toLowerCase();
      return !(s.includes('approved') || s.includes('issued') || s.includes('rejected'));
    }).length;

    return {
      totalDemands: demands.length,
      pendingDemands,
      completedDemands,
      totalRequests: requests.length,
      activeRequests
    };
  }, [demands, requests]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Branch Demands Manager</h1>
            <p className="text-gray-600 mt-1">Track submitted demand lines and resulting branch request statuses</p>
          </div>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Demands</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalDemands}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Demands</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-700">{summary.pendingDemands}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Included Demands</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{summary.completedDemands}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Branch Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalRequests}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-700">{summary.activeRequests}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Submitted Branch Demands</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading demands...</div>
            ) : demands.length === 0 ? (
              <div className="text-sm text-gray-500">No demand lines found.</div>
            ) : (
              <div className="space-y-3">
                {demands.map((demand) => (
                  <div key={demand.id} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2 text-sm">
                    <div className="md:col-span-4">
                      <div className="font-medium break-words">{demand.item_nomenclature}</div>
                      <div className="text-xs text-gray-600">Staff: {demand.staff_name || '-'}</div>
                    </div>
                    <div className="md:col-span-2">Qty: <span className="font-semibold">{demand.requested_quantity} {demand.unit_label || 'No(s)'}</span></div>
                    <div className="md:col-span-2">
                      <Badge className={statusClass(demand.status)}>{demand.status || 'SUBMITTED'}</Badge>
                    </div>
                    <div className="md:col-span-2 break-words">Request: {demand.included_request_number || '-'}</div>
                    <div className="md:col-span-2 text-gray-600">{toDateTime(demand.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previously Submitted Branch Requests (With Status)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading branch requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-sm text-gray-500">No branch requests found.</div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const effectiveStatus = request.approval_status || request.request_status || 'Pending';
                  return (
                    <div key={request.id} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2 text-sm">
                      <div className="md:col-span-3">
                        <div className="font-medium">{request.request_number || '-'}</div>
                        <div className="text-xs text-gray-600">By: {request.requester_name || '-'}</div>
                      </div>
                      <div className="md:col-span-3">
                        <Badge className={statusClass(effectiveStatus)}>{effectiveStatus}</Badge>
                      </div>
                      <div className="md:col-span-2">Priority: <span className="font-medium">{request.urgency_level || 'Normal'}</span></div>
                      <div className="md:col-span-4 text-gray-600">Submitted: {toDateTime(request.submitted_at || request.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BranchDemandsManager;
