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

const BranchDemandsManager: React.FC = () => {
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
        throw new Error(data?.error || 'Failed to load branch demands manager');
      }

      const myDemands = (data.demands || []) as DemandRow[];

      const requestMap = new Map<string, RequestWithTotals>();
      for (const req of (data.requests || []) as RequestRow[]) {
        const linkedCount = Number(req.linked_demand_count || 0);
        const linkedQty = Number(req.linked_demand_qty || 0);
        requestMap.set(String(req.id), {
          ...req,
          total_requested_quantity: linkedQty,
          total_demand_lines: linkedCount,
          items: []
        });
      }

      for (const demand of myDemands) {
        const requestId = String(demand.included_in_request_id || '');
        if (!requestId || !requestMap.has(requestId)) continue;
        const current = requestMap.get(requestId)!;
        current.items.push(demand);
      }

      const unlinkedDemandRows = myDemands
        .filter((d) => !d.included_in_request_id)
        .sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime());

      if (unlinkedDemandRows.length > 0) {
        const totalQty = unlinkedDemandRows.reduce((sum, d) => sum + Number(d.requested_quantity || 0), 0);
        const requestTitle = unlinkedDemandRows.length === 1
          ? unlinkedDemandRows[0].item_nomenclature
          : `${unlinkedDemandRows[0].item_nomenclature} + ${unlinkedDemandRows.length - 1} more`;
        const latestCreatedAt = unlinkedDemandRows[0]?.created_at;

        requestMap.set(`pending-${unlinkedDemandRows[0].staff_user_id || 'me'}`, {
          id: `pending-${unlinkedDemandRows[0].staff_user_id || 'me'}`,
          request_number: requestTitle,
          purpose: unlinkedDemandRows[0]?.justification || requestTitle,
          justification: unlinkedDemandRows[0]?.justification || requestTitle,
          requester_name: unlinkedDemandRows[0]?.staff_name || 'Current User',
          request_status: 'SUBMITTED',
          approval_status: 'SUBMITTED',
          urgency_level: 'Normal',
          submitted_at: latestCreatedAt,
          created_at: latestCreatedAt,
          linked_demand_count: unlinkedDemandRows.length,
          linked_demand_qty: totalQty,
          total_requested_quantity: totalQty,
          total_demand_lines: unlinkedDemandRows.length,
          items: unlinkedDemandRows
        });
      }

      const myRequests = Array.from(requestMap.values())
        .filter((r) => r.total_demand_lines > 0)
        .sort((a, b) => {
          const da = new Date(a.submitted_at || a.created_at || 0).getTime();
          const db = new Date(b.submitted_at || b.created_at || 0).getTime();
          return db - da;
        });

      setDemands(myDemands);
      setRequests(myRequests);
      setSuccess('Branch demands manager loaded successfully.');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branch demands manager');
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
            ) : requests.length === 0 ? (
              <div className="text-sm text-gray-500">No submitted branch requests found yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="text-left p-3 font-semibold">Request Number</th>
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
                          </td>
                          <td className="p-3">{request.requester_name || '-'}</td>
                          <td className="p-3">{toDateTime(request.submitted_at || request.created_at)}</td>
                          <td className="p-3">
                            <div className="font-semibold">
                              {request.total_requested_quantity} Qty <span className="text-xs text-gray-600">({request.total_demand_lines} lines)</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={statusClass(effectiveStatus)}>{effectiveStatus}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200 transition-colors text-sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Items ({request.items.length})
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                      <div className="md:col-span-2">
                        <Badge className={statusClass(item.status || 'SUBMITTED')}>{item.status || 'SUBMITTED'}</Badge>
                      </div>
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

export default BranchDemandsManager;
