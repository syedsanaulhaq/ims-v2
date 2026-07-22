import React, { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/utils/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { AlertCircle, CheckCircle2, History, RefreshCcw } from 'lucide-react';

interface DemandRow {
  id: string;
  staff_user_id?: string;
  staff_name?: string;
  item_nomenclature: string;
  requested_quantity: number;
  unit_label?: string;
  status: string;
  included_in_request_id?: string;
  included_request_number?: string;
  included_request_status?: string;
  included_request_submitted_at?: string;
  created_at?: string;
}

interface RequestRow {
  id: string;
  request_type?: string;
  request_number?: string;
  purpose?: string;
  justification?: string;
  requester_name?: string;
  request_status?: string;
  approval_status?: string;
  urgency_level?: string;
  submitted_at?: string;
  created_at?: string;
  linked_demand_count?: number;
  linked_demand_qty?: number;
}

interface RequestWithTotals extends RequestRow {
  total_requested_quantity: number;
  total_demand_lines: number;
  items: DemandRow[];
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
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec}`;
};

const MyBranchDemands: React.FC = () => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [requests, setRequests] = useState<RequestWithTotals[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithTotals | null>(null);

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
        throw new Error(data?.error || 'Failed to load my branch demands');
      }

      const myDemands = (data.demands || []) as DemandRow[];
      const requestMap = new Map<string, RequestWithTotals>();

      for (const demand of myDemands) {
        const requestId = String(demand.included_in_request_id || `pending-${demand.staff_user_id || 'me'}`);
        const existing = requestMap.get(requestId);
        const currentItems = existing?.items || [];
        const nextItems = [...currentItems, demand];
        const totalRequestedQuantity = nextItems.reduce((sum, item) => sum + Number(item.requested_quantity || 0), 0);

        requestMap.set(requestId, {
          id: requestId,
          request_type: 'branch',
          request_number: demand.included_request_number || `Request ${requestId}`,
          purpose: demand.justification || demand.item_nomenclature,
          justification: demand.included_request_number ? demand.justification || demand.item_nomenclature : demand.justification || demand.item_nomenclature,
          requester_name: demand.staff_name || user?.FullName || 'You',
          request_status: demand.included_request_status || demand.status,
          approval_status: demand.included_request_status || demand.status,
          submitted_at: demand.included_request_submitted_at || demand.created_at,
          created_at: demand.included_request_submitted_at || demand.created_at,
          linked_demand_count: nextItems.length,
          linked_demand_qty: totalRequestedQuantity,
          total_requested_quantity: totalRequestedQuantity,
          total_demand_lines: nextItems.length,
          items: nextItems
        });
      }

      const myRequests = Array.from(requestMap.values())
        .sort((a, b) => new Date(b.submitted_at || b.created_at || 0).getTime() - new Date(a.submitted_at || a.created_at || 0).getTime());

      setDemands(myDemands);
      setRequests(myRequests);
      setSelectedRequest(myRequests[0] || null);
      setSuccess('My branch demands loaded successfully.');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load my branch demands');
      setDemands([]);
      setRequests([]);
      setSelectedRequest(null);
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

    const activeRequests = requests.filter((request) => {
      const s = String(request.approval_status || request.request_status || '').toLowerCase();
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
            <h1 className="text-3xl font-bold text-gray-900">My Branch Demands</h1>
            <p className="text-gray-600 mt-1">Track your submitted demand lines and the requests created from them</p>
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
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Branch Demand Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalRequests}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-700">{summary.activeRequests}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />My Submitted Branch Demands</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading demands...</div>
            ) : requests.length === 0 ? (
              <div className="text-sm text-gray-500">No branch demand requests found yet.</div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="text-left p-3 font-semibold">Branch Demand Request</th>
                        <th className="text-left p-3 font-semibold">Submitted By</th>
                        <th className="text-left p-3 font-semibold">Date & Time</th>
                        <th className="text-left p-3 font-semibold">Total Items</th>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-center p-3 font-semibold">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => {
                        const effectiveStatus = request.approval_status || request.request_status || 'Pending';
                        return (
                          <tr key={request.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-bold text-base break-words">{request.justification || request.purpose || '-'}</div>
                              {request.request_number && <div className="text-xs text-gray-500 mt-1">Request: {request.request_number}</div>}
                            </td>
                            <td className="p-3">{request.requester_name || user?.FullName || '-'}</td>
                            <td className="p-3">{toDateTime(request.submitted_at || request.created_at)}</td>
                            <td className="p-3"><div className="font-semibold">{request.total_requested_quantity} Qty <span className="text-xs text-gray-600">({request.total_demand_lines} lines)</span></div></td>
                            <td className="p-3"><Badge className={statusClass(effectiveStatus)}>{effectiveStatus}</Badge></td>
                            <td className="p-3 text-center">
                              <button type="button" className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200 transition-colors text-sm" onClick={() => setSelectedRequest(request)}>
                                View Request
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedRequest && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Demanded Items - {selectedRequest.request_number || '-'}</h2>
                <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>Close</Button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[65vh] space-y-2">
                {selectedRequest.items.length === 0 ? (
                  <div className="text-sm text-gray-500">No linked demand items found for this request.</div>
                ) : (
                  selectedRequest.items.map((item) => (
                    <div key={item.id} className="border rounded p-3 text-sm grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-6 font-medium break-words">{item.item_nomenclature}</div>
                      <div className="md:col-span-2">Qty: {item.requested_quantity}</div>
                      <div className="md:col-span-2">Unit: {item.unit_label || 'No(s)'}</div>
                      <div className="md:col-span-2"><Badge className={statusClass(item.status || 'SUBMITTED')}>{item.status || 'SUBMITTED'}</Badge></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBranchDemands;