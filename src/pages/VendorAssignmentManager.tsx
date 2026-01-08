import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Check, X } from 'lucide-react';

interface AnnualTender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
}

interface ItemGroup {
  id: string;
  group_code: string;
  group_name: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
  contact_person: string;
}

interface GroupVendor {
  vendor_id: string;
  vendor_name: string;
}

interface ItemMaster {
  id: string;
  nomenclature: string;
  item_code: string;
}

interface VendorItemAssignment {
  vendorId: string;
  itemIds: string[];
}

export const VendorAssignmentManager: React.FC = () => {
  const [tenders, setTenders] = useState<AnnualTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<AnnualTender | null>(null);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [groupVendors, setGroupVendors] = useState<Record<string, GroupVendor[]>>({});
  const [groupItems, setGroupItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ItemGroup | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemMaster[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<string>('');

  useEffect(() => {
    loadTenders();
    loadVendors();
    loadGroups();
  }, []);

  const loadTenders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/annual-tenders');
      const data = await response.json();
      setTenders(data);
      if (data.length > 0) {
        setSelectedTender(data[0]);
        loadGroupVendors(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendors');
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Vendors loaded:', data);
        // Handle both array and object responses
        const vendorsArray = Array.isArray(data) ? data : (data.data || data.vendors || []);
        setVendors(vendorsArray);
        console.log('✅ Processed vendors:', vendorsArray);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors([]);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/item-groups');
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadGroupItems = async (groupId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/item-groups/${groupId}/items`);
      if (response.ok) {
        const data = await response.json();
        setGroupItems(data);
        console.log('📦 Group items loaded:', data);
      }
    } catch (error) {
      console.error('Error loading group items:', error);
    }
  };

  const loadGroupVendors = async (tenderId: string) => {
    try {
      for (const group of groups) {
        const response = await fetch(
          `http://localhost:3001/api/annual-tenders/${tenderId}/groups/${group.id}/vendors`
        );
        if (response.ok) {
          const data = await response.json();
          setGroupVendors(prev => ({
            ...prev,
            [group.id]: data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading group vendors:', error);
    }
  };

  const handleAssignVendors = async () => {
    if (!selectedTender || !selectedGroup || selectedItems.length === 0 || selectedVendors.length === 0) {
      alert('Please select Tender → Group → Items → Vendors');
      return;
    }

    try {
      // Assign selected vendors to selected items in the group
      const itemIds = selectedItems.map(item => item.id);
      const vendorIds = selectedVendors.map(vendor => vendor.id);

      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignments: [
              {
                groupId: selectedGroup.id,
                vendorIds: vendorIds,
                itemIds: itemIds
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign vendors');
      }

      alert('✅ Vendors assigned to items successfully!');
      if (selectedTender) {
        loadGroupVendors(selectedTender.id);
      }
      setShowAssignDialog(false);
      setSelectedItems([]);
      setSelectedVendors([]);
      setCurrentVendorId('');
    } catch (error) {
      console.error('Error assigning vendors:', error);
      alert('Failed to assign vendors');
    }
  };

  const handleTenderChange = (tenderId: string) => {
    const tender = tenders.find(t => t.id === tenderId);
    if (tender) {
      setSelectedTender(tender);
      loadGroupVendors(tender.id);
    }
  };

  const removeVendorFromGroup = async (groupId: string, vendorId: string) => {
    if (!selectedTender) return;

    try {
      const currentVendors = (groupVendors[groupId] || [])
        .filter(v => v.vendor_id !== vendorId)
        .map(v => v.vendor_id);

      const response = await fetch(
        `http://localhost:3001/api/annual-tenders/${selectedTender.id}/assign-vendors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignments: [
              {
                groupId: groupId,
                vendorIds: currentVendors
              }
            ]
          })
        }
      );

      if (response.ok) {
        loadGroupVendors(selectedTender.id);
      }
    } catch (error) {
      console.error('Error removing vendor:', error);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Assignment</h1>
        <p className="text-gray-600">Assign vendors to item groups in annual tenders</p>
      </div>

      {/* Tender Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Annual Tender</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {tenders.map(tender => (
              <Button
                key={tender.id}
                variant={selectedTender?.id === tender.id ? 'default' : 'outline'}
                onClick={() => handleTenderChange(tender.id)}
              >
                {tender.title}
                <Badge variant="secondary" className="ml-2">
                  {tender.tender_number}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : selectedTender ? (
        <div className="grid gap-6">
          {groups.map(group => {
            const assignedVendors = groupVendors[group.id] || [];
            
            return (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{group.group_name}</CardTitle>
                      <p className="text-sm text-gray-600">{group.group_code}</p>
                    </div>
                    <Dialog open={showAssignDialog && selectedGroup?.id === group.id} onOpenChange={setShowAssignDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedGroup(group);
                            loadGroupItems(group.id);
                            setSelectedItems([]);
                            setSelectedVendors([]);
                          }}
                        >
                          Assign Vendors
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Vendor Assignment Workflow</DialogTitle>
                          <DialogDescription>
                            Tender → Group → Items → Vendors
                          </DialogDescription>
                        </DialogHeader>

                        {/* Step 1: Tender (Already Selected) */}
                        <div className="space-y-3 p-4 bg-blue-50 rounded">
                          <p className="font-semibold text-sm">✅ Step 1: Tender Selected</p>
                          <p className="text-sm font-medium">{selectedTender?.title} ({selectedTender?.tender_number})</p>
                        </div>

                        {/* Step 2: Group (Already Selected) */}
                        <div className="space-y-3 p-4 bg-blue-50 rounded">
                          <p className="font-semibold text-sm">✅ Step 2: Group Selected</p>
                          <p className="text-sm font-medium">{selectedGroup?.group_name} ({selectedGroup?.group_code})</p>
                        </div>

                        {/* Step 3: Select Items */}
                        <div className="space-y-3 p-4 bg-yellow-50 rounded">
                          <p className="font-semibold text-sm">📍 Step 3: Select Items from {selectedGroup?.group_name}</p>
                          <div className="space-y-2 border rounded p-3 bg-white max-h-40 overflow-y-auto">
                            {groupItems.length > 0 ? (
                              groupItems.map(item => (
                                <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.some(i => i.id === item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItems([...selectedItems, item]);
                                      } else {
                                        setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                                      }
                                    }}
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.nomenclature}</p>
                                    <p className="text-xs text-gray-600">Code: {item.item_code}</p>
                                  </div>
                                </label>
                              ))
                            ) : (
                              <p className="text-center py-4 text-gray-500 text-sm">No items in this group</p>
                            )}
                          </div>
                          {selectedItems.length > 0 && (
                            <div className="text-xs text-green-600">✓ {selectedItems.length} item(s) selected</div>
                          )}
                        </div>

                        {/* Step 4: Select Vendors */}
                        <div className="space-y-3 p-4 bg-purple-50 rounded">
                          <p className="font-semibold text-sm">📍 Step 4: Select Vendors for These Items</p>
                          <div className="space-y-2 border rounded p-3 bg-white max-h-40 overflow-y-auto">
                            {Array.isArray(vendors) && vendors.length > 0 ? (
                              vendors.map(vendor => (
                                <label key={vendor.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedVendors.some(v => v.id === vendor.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedVendors([...selectedVendors, vendor]);
                                      } else {
                                        setSelectedVendors(selectedVendors.filter(v => v.id !== vendor.id));
                                      }
                                    }}
                                    disabled={selectedItems.length === 0}
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{vendor.vendor_name}</p>
                                    <p className="text-xs text-gray-600">{vendor.vendor_code}</p>
                                  </div>
                                </label>
                              ))
                            ) : (
                              <p className="text-center py-4 text-gray-500 text-sm">No vendors available</p>
                            )}
                          </div>
                          {selectedVendors.length > 0 && (
                            <div className="text-xs text-green-600">✓ {selectedVendors.length} vendor(s) selected</div>
                          )}
                        </div>

                        {/* Summary */}
                        {selectedItems.length > 0 && selectedVendors.length > 0 && (
                          <div className="space-y-3 p-4 bg-green-50 rounded">
                            <p className="font-semibold text-sm">📋 Summary</p>
                            <div className="text-sm space-y-1">
                              <p><strong>Tender:</strong> {selectedTender?.title}</p>
                              <p><strong>Group:</strong> {selectedGroup?.group_name}</p>
                              <p><strong>Items:</strong> {selectedItems.map(i => i.nomenclature).join(', ')}</p>
                              <p><strong>Vendors:</strong> {selectedVendors.map(v => v.vendor_name).join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => setShowAssignDialog(false)}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAssignVendors}
                            disabled={selectedItems.length === 0 || selectedVendors.length === 0}
                            className="gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Assign {selectedVendors.length} Vendors to {selectedItems.length} Items
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>

                <CardContent>
                  {assignedVendors.length === 0 ? (
                    <p className="text-gray-500 text-sm">No vendors assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {assignedVendors.map(vendor => (
                        <div
                          key={vendor.vendor_id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded"
                        >
                          <span className="font-medium">{vendor.vendor_name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVendorFromGroup(group.id, vendor.vendor_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No tenders available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorAssignmentManager;
