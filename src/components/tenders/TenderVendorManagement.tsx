import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  Award,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

interface TenderVendor {
  id?: string;
  vendor_id: string;
  vendor_name: string;
  vendor_code?: string;
  quoted_amount?: number;
  proposal_document_path?: string;
  proposal_document_name?: string;
  proposal_upload_date?: string;
  proposal_file_size?: number;
  is_awarded: boolean;
  remarks?: string;
}

interface TenderVendorManagementProps {
  tenderId?: string; // Optional - for editing existing tender
  vendors: Vendor[]; // All available vendors
  onVendorsChange?: (vendors: TenderVendor[]) => void; // Callback for parent component
  readOnly?: boolean;
}

const TenderVendorManagement: React.FC<TenderVendorManagementProps> = ({
  tenderId,
  vendors,
  onVendorsChange,
  readOnly = false
}) => {
  const [tenderVendors, setTenderVendors] = useState<TenderVendor[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<TenderVendor | null>(null);
  const [uploadingProposal, setUploadingProposal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for add/edit dialog
  const [formData, setFormData] = useState({
    vendor_id: '',
    quoted_amount: '',
    remarks: ''
  });

  // Load tender vendors if tender ID is provided (editing mode)
  useEffect(() => {
    if (tenderId) {
      loadTenderVendors();
    }
  }, [tenderId]);

  // Notify parent component when vendors change
  useEffect(() => {
    if (onVendorsChange) {
      onVendorsChange(tenderVendors);
    }
  }, [tenderVendors, onVendorsChange]);

  const loadTenderVendors = async () => {
    if (!tenderId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/vendors`);
      if (response.ok) {
        const data = await response.json();
        setTenderVendors(data);
      } else {
        throw new Error('Failed to load vendors');
      }
    } catch (err) {
      console.error('Error loading tender vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = async () => {
    if (!formData.vendor_id) {
      setError('Please select a vendor');
      return;
    }

    const selectedVendorInfo = vendors.find(v => v.id === formData.vendor_id);
    if (!selectedVendorInfo) return;

    // Check if vendor already added
    if (tenderVendors.some(tv => tv.vendor_id === formData.vendor_id)) {
      setError('This vendor is already added');
      return;
    }

    const newVendor: TenderVendor = {
      vendor_id: formData.vendor_id,
      vendor_name: selectedVendorInfo.vendor_name,
      vendor_code: selectedVendorInfo.vendor_code,
      quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount) : undefined,
      remarks: formData.remarks,
      is_awarded: false
    };

    if (tenderId) {
      // If tender exists, save to backend
      try {
        const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/vendors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newVendor)
        });

        if (response.ok) {
          const savedVendor = await response.json();
          setTenderVendors([...tenderVendors, savedVendor]);
          resetForm();
          setShowAddDialog(false);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to add vendor');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add vendor');
      }
    } else {
      // If tender doesn't exist yet, just add to local state
      setTenderVendors([...tenderVendors, newVendor]);
      resetForm();
      setShowAddDialog(false);
    }
  };

  const handleUpdateVendor = async () => {
    if (!selectedVendor || !tenderId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${selectedVendor.vendor_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount) : null,
            remarks: formData.remarks
          })
        }
      );

      if (response.ok) {
        const updatedVendor = await response.json();
        setTenderVendors(tenderVendors.map(tv => 
          tv.vendor_id === selectedVendor.vendor_id ? updatedVendor : tv
        ));
        resetForm();
        setShowEditDialog(false);
        setSelectedVendor(null);
      } else {
        throw new Error('Failed to update vendor');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    }
  };

  const handleUploadProposal = async (vendorId: string, file: File) => {
    if (!tenderId) {
      setError('Please save the tender first before uploading proposals');
      return;
    }

    setUploadingProposal(vendorId);
    const formData = new FormData();
    formData.append('proposal', file);

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}/proposal`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTenderVendors(tenderVendors.map(tv => 
          tv.vendor_id === vendorId ? result.vendor : tv
        ));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload proposal');
    } finally {
      setUploadingProposal(null);
    }
  };

  const handleDownloadProposal = async (vendorId: string) => {
    if (!tenderId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}/proposal/download`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proposal_${vendorId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download proposal');
    }
  };

  const handleAwardVendor = async (vendorId: string) => {
    if (!tenderId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}/award`,
        { method: 'PUT' }
      );

      if (response.ok) {
        // Mark all vendors as not awarded except the selected one
        setTenderVendors(tenderVendors.map(tv => ({
          ...tv,
          is_awarded: tv.vendor_id === vendorId
        })));
      } else {
        throw new Error('Failed to award vendor');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award vendor');
    }
  };

  const handleRemoveVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to remove this vendor?')) return;

    if (tenderId) {
      try {
        const response = await fetch(
          `http://localhost:3001/api/tenders/${tenderId}/vendors/${vendorId}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          setTenderVendors(tenderVendors.filter(tv => tv.vendor_id !== vendorId));
        } else {
          throw new Error('Failed to remove vendor');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove vendor');
      }
    } else {
      // Just remove from local state
      setTenderVendors(tenderVendors.filter(tv => tv.vendor_id !== vendorId));
    }
  };

  const openEditDialog = (vendor: TenderVendor) => {
    setSelectedVendor(vendor);
    setFormData({
      vendor_id: vendor.vendor_id,
      quoted_amount: vendor.quoted_amount?.toString() || '',
      remarks: vendor.remarks || ''
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      quoted_amount: '',
      remarks: ''
    });
    setError(null);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Participating Vendors
            <Badge variant="outline">{tenderVendors.length}</Badge>
          </span>
          {!readOnly && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Vendor to Tender</DialogTitle>
                  <DialogDescription>
                    Select a vendor and optionally add their quoted amount and remarks
                  </DialogDescription>
                </DialogHeader>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vendor">Vendor *</Label>
                    <Select 
                      value={formData.vendor_id} 
                      onValueChange={(value) => setFormData({...formData, vendor_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors
                          .filter(v => !tenderVendors.some(tv => tv.vendor_id === v.id))
                          .map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name} {vendor.vendor_code && `(${vendor.vendor_code})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quoted_amount">Quoted Amount (Rs)</Label>
                    <Input
                      id="quoted_amount"
                      type="number"
                      step="0.01"
                      value={formData.quoted_amount}
                      onChange={(e) => setFormData({...formData, quoted_amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={formData.remarks}
                      onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      placeholder="Additional notes about this vendor's proposal..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVendor}>
                    Add Vendor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {tenderVendors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No vendors added yet</p>
            {!readOnly && <p className="text-sm">Click "Add Vendor" to get started</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Quoted Amount</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Status</TableHead>
                  {!readOnly && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenderVendors.map((vendor) => (
                  <TableRow key={vendor.vendor_id}>
                    <TableCell className="font-medium">
                      {vendor.vendor_name}
                      {vendor.is_awarded && (
                        <Badge className="ml-2 bg-green-600 text-white">
                          <Award className="w-3 h-3 mr-1" />
                          Awarded
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{vendor.vendor_code || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(vendor.quoted_amount)}</TableCell>
                    <TableCell>
                      {vendor.proposal_document_name ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Uploaded
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadProposal(vendor.vendor_id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            Pending
                          </Badge>
                          {!readOnly && tenderId && (
                            <label className="cursor-pointer">
                              <Upload className="w-4 h-4 text-blue-600" />
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadProposal(vendor.vendor_id, file);
                                }}
                                disabled={uploadingProposal === vendor.vendor_id}
                              />
                            </label>
                          )}
                        </div>
                      )}
                      {uploadingProposal === vendor.vendor_id && (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.remarks && (
                        <span className="text-sm text-gray-600">{vendor.remarks}</span>
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(vendor)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {tenderId && !vendor.is_awarded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAwardVendor(vendor.vendor_id)}
                              className="text-green-600 hover:text-green-700"
                              title="Award Tender"
                            >
                              <Award className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVendor(vendor.vendor_id)}
                            className="text-red-600 hover:text-red-700"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vendor Information</DialogTitle>
              <DialogDescription>
                Update quoted amount and remarks for {selectedVendor?.vendor_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_quoted_amount">Quoted Amount (Rs)</Label>
                <Input
                  id="edit_quoted_amount"
                  type="number"
                  step="0.01"
                  value={formData.quoted_amount}
                  onChange={(e) => setFormData({...formData, quoted_amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="edit_remarks">Remarks</Label>
                <Textarea
                  id="edit_remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedVendor(null); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateVendor}>
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TenderVendorManagement;
