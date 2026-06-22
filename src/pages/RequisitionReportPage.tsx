import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';

interface ReportItem {
  id: string;
  item_master_id?: string;
  item_name: string;
  unit: string;
  requested_quantity: number;
  last_issued_quantity?: number;
  last_issue_date?: string | null;
}

interface RequisitionReport {
  id: string;
  request_number?: string;
  request_type: string;
  requester_name: string;
  office_name?: string;
  wing_name?: string;
  submitted_date?: string;
  purpose?: string;
  items: ReportItem[];
}

const formatDate = (value?: string | null, fallback = '-') => {
  if (!value) return fallback;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return fallback;
  return dt.toLocaleDateString('en-GB');
};

const RequisitionReportPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RequisitionReport | null>(null);
  const todayText = formatDate(new Date().toISOString(), '-');

  useEffect(() => {
    const loadReport = async () => {
      if (!requestId) {
        setError('Missing request id');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const requestsResp = await fetch(`${getApiBaseUrl()}/stock-issuance/requests`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!requestsResp.ok) {
          throw new Error(`Failed to load request (${requestsResp.status})`);
        }

        const requestsData = await requestsResp.json();
        const found = (requestsData?.data || []).find((r: any) => r.id === requestId);

        if (!found) {
          throw new Error('Request not found');
        }

        let items: ReportItem[] = (found.items || []).map((item: any) => ({
          id: String(item.id),
          item_master_id: item.item_master_id ? String(item.item_master_id) : undefined,
          item_name: item.nomenclature || item.custom_item_name || 'Unknown Item',
          requested_quantity: Number(item.requested_quantity || 0),
          unit: item.unit || 'Nos.'
        }));

        try {
          const detailResp = await fetch(`http://localhost:3001/api/approvals/request/${found.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (detailResp.ok) {
            const detailData = await detailResp.json();
            if (Array.isArray(detailData?.items) && detailData.items.length > 0) {
              items = detailData.items.map((item: any) => ({
                id: String(item.id),
                item_master_id: item.item_master_id ? String(item.item_master_id) : undefined,
                item_name: item.nomenclature || item.custom_item_name || item.item_name || 'Unknown Item',
                requested_quantity: Number(item.requested_quantity || 0),
                unit: item.unit || 'Nos.'
              }));
            }
          }
        } catch (detailError) {
          console.warn('Requisition report: failed to load detailed items, using base request data', detailError);
        }

        try {
          const params = new URLSearchParams();
          if (String(found.request_type || '').toLowerCase() === 'individual' && found.requester_user_id) {
            params.append('user_id', String(found.requester_user_id));
          } else if (found.requester_wing_id) {
            params.append('wing_id', String(found.requester_wing_id));
          }

          if (params.toString()) {
            const summaryResp = await fetch(`${getApiBaseUrl()}/stock-issuance/last-issued-summary?${params.toString()}`, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });

            if (summaryResp.ok) {
              const summaryData = await summaryResp.json();
              const summaryMap: Record<string, { qty: number; date: string | null }> = {};
              (summaryData?.data || []).forEach((row: any) => {
                const key = String(row.item_master_id || '');
                if (!key) return;
                summaryMap[key] = {
                  qty: Number(row.last_issued_quantity || 0),
                  date: row.last_issue_date || null
                };
              });

              items = items.map((item) => {
                const history = item.item_master_id ? summaryMap[String(item.item_master_id)] : undefined;
                return {
                  ...item,
                  last_issued_quantity: history?.qty,
                  last_issue_date: history?.date || null
                };
              });
            }
          }
        } catch (summaryError) {
          console.warn('Requisition report: failed to load last-issued summary, using default values', summaryError);
        }

        setReport({
          id: found.id,
          request_number: found.request_number,
          request_type: found.request_type || '-',
          requester_name: found.requester?.full_name || found.requester_name || 'Unknown',
          office_name: found.office?.name || found.office?.office_name || '-',
          wing_name: found.wing?.name || '-',
          submitted_date: found.submitted_at || found.created_at || null,
          purpose: found.purpose || '-',
          items
        });
      } catch (err: any) {
        setError(err?.message || 'Failed to load requisition report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [requestId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading requisition report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-red-600">{error || 'Unable to load report'}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard/my-requests')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFreshRequirement = report.items.reduce((sum, item) => sum + Number(item.requested_quantity || 0), 0);

  return (
    <div className="container mx-auto p-6 bg-[#f5f6f7] print:bg-white print:p-0">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate(`/dashboard/request-details/${report.id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print Requisition
        </Button>
      </div>

      <Card className="max-w-5xl mx-auto border-2 border-black/70 rounded-sm bg-white print:shadow-none print:border-none">
        <CardContent className="p-0">
          <div className="border-b-2 border-black/70 px-6 py-5 text-center">
            <p className="text-xs tracking-[0.18em] uppercase text-gray-700">Election Commission of Pakistan</p>
            <h1 className="text-2xl font-semibold tracking-wide mt-1">REQUISITION REPORT</h1>
            <p className="text-xs mt-1 text-gray-700">Inventory Management System - Formal Slip</p>
          </div>

          <div className="px-6 py-4 border-b border-black/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm">
              <div><span className="font-semibold">Requisition No:</span> {report.request_number || report.id.slice(0, 12)}</div>
              <div><span className="font-semibold">Generated On:</span> {todayText}</div>
              <div><span className="font-semibold">Submitted Date:</span> {formatDate(report.submitted_date, 'N/A')}</div>
              <div><span className="font-semibold">Request Type:</span> {report.request_type}</div>
              <div><span className="font-semibold">Requester:</span> {report.requester_name}</div>
              <div><span className="font-semibold">Wing:</span> {report.wing_name || '-'}</div>
              <div className="md:col-span-2"><span className="font-semibold">Office:</span> {report.office_name || '-'}</div>
              <div className="md:col-span-2"><span className="font-semibold">Purpose:</span> {report.purpose || '-'}</div>
            </div>
          </div>

          <div className="px-6 py-4">
            <table className="w-full text-sm border border-black/60 border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black/60 px-2 py-2 w-12 text-center">Sr.</th>
                  <th className="border border-black/60 px-2 py-2 text-left">Item Description</th>
                  <th className="border border-black/60 px-2 py-2 w-36 text-left">Last Issued Qty</th>
                  <th className="border border-black/60 px-2 py-2 w-36 text-left">Last Issue Date</th>
                  <th className="border border-black/60 px-2 py-2 w-40 text-left">Fresh Requirement</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-black/60 px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black/60 px-2 py-2">{item.item_name}</td>
                    <td className="border border-black/60 px-2 py-2">{item.last_issued_quantity ?? 0}</td>
                    <td className="border border-black/60 px-2 py-2">{formatDate(item.last_issue_date, '-')}</td>
                    <td className="border border-black/60 px-2 py-2">{item.requested_quantity} {item.unit}</td>
                  </tr>
                ))}
                {report.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-black/60 px-2 py-6 text-center text-gray-600">
                      No items available in this requisition.
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-semibold">
                  <td className="border border-black/60 px-2 py-2 text-center" colSpan={4}>Total Fresh Requirement</td>
                  <td className="border border-black/60 px-2 py-2">{totalFreshRequirement}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 pb-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div className="text-center">
                <div className="border-t border-black/70 pt-2">Requested By</div>
                <div className="mt-1 text-xs text-gray-600">{report.requester_name}</div>
              </div>
              <div className="text-center">
                <div className="border-t border-black/70 pt-2">Verified By</div>
                <div className="mt-1 text-xs text-gray-600">Store Keeper</div>
              </div>
              <div className="text-center">
                <div className="border-t border-black/70 pt-2">Approved By</div>
                <div className="mt-1 text-xs text-gray-600">Competent Authority</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequisitionReportPage;
