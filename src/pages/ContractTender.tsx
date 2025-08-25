import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, Calendar, Clock, CheckCircle, AlertCircle, Eye, Search } from "lucide-react";
import TenderViewDialog from '@/components/tenders/TenderViewDialog';
import TenderViewAction from '@/components/tenders/TenderViewAction';
import { formatDateDMY } from '@/utils/dateUtils';
import EnhancedTenderActions from '@/components/tenders/EnhancedTenderActions';
import { useTenderData } from '@/hooks/useTenderData';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import { Tender, CreateTenderRequest } from '@/types/tender';
import ContractTenderForm from '@/components/tenders/ContractTenderForm';
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorState from "@/components/common/ErrorState";
import { createNameResolver, formatNamesForDisplay } from '@/utils/nameResolver';
import { tendersLocalService } from '@/services/tendersLocalService';
import { toast } from 'sonner';

interface ContractTenderProps {
  initialType?: 'Contract/Tender' | 'Spot Purchase';
}

const ContractTender: React.FC<ContractTenderProps> = ({ initialType }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [viewTender, setViewTender] = useState<Tender | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list-contracts');
  // Add state for tender/spot type filter
  const [tenderSpotType, setTenderSpotType] = useState<'Contract/Tender' | 'Spot Purchase'>(initialType || 'Contract/Tender');
  // Add search filter state
  const [searchFilter, setSearchFilter] = useState('');

  const {
    tenders,
    stats,
    isLoading,
    error,
    isApiError,
    createTender,
    updateTender,
    deleteTender,
    updateStatus,
    isCreating,
    isUpdating,
    isDeleting,
    isUpdatingStatus
  } = useTenderData();

  // Fetch office hierarchy data for name resolution
  const { offices, wings, decs, isLoading: isLoadingHierarchy } = useOfficeHierarchy();

  // Create name resolver with safety check
  const nameResolver = React.useMemo(() => {
    try {
      return createNameResolver(offices || [], wings || [], decs || []);
    } catch (error) {
      // Fallback resolver that just returns the IDs
      return {
        resolveOfficeNames: (ids: (string | number)[]) => ids.map(id => `Office-${id}`),
        resolveWingNames: (ids: (string | number)[]) => ids.map(id => `Wing-${id}`),
        resolveDecNames: (ids: (string | number)[]) => ids.map(id => `DEC-${id}`)
      };
    }
  }, [offices, wings, decs]);

  // Filter by tender_spot_type
  // Map UI type to backend type (now identical)
  const mapUiTypeToBackend = (uiType: 'Contract/Tender' | 'Spot Purchase') => uiType;
  const mapBackendTypeToUi = (backendType: string) =>
    backendType === 'Contract/Tender' ? 'Contract/Tender' : 'Spot Purchase';

  // Filter function to search across tender fields
  const filterTenders = (tenders: any[]) => {
    if (!searchFilter.trim()) return tenders;
    
    const searchTerm = searchFilter.toLowerCase();
    return tenders.filter(tender => 
      (tender.title || '').toLowerCase().includes(searchTerm) ||
      (tender.reference_number || '').toLowerCase().includes(searchTerm) ||
      (tender.vendor?.name || '').toLowerCase().includes(searchTerm) ||
      (tender.status || '').toLowerCase().includes(searchTerm) ||
      (tender.tender_status || '').toLowerCase().includes(searchTerm) ||
      (tender.description || '').toLowerCase().includes(searchTerm) ||
      (formatDateDMY(tender.created_at) || '').toLowerCase().includes(searchTerm)
    );
  };

  // Filter by tender_spot_type and search term
  const filteredTenders = useMemo(() => {
    const typeFiltered = tenders.filter(tender =>
      tender.type === mapUiTypeToBackend(tenderSpotType)
    );
    return filterTenders(typeFiltered);
  }, [tenders, tenderSpotType, searchFilter]);
  const contractStats = {
    totalTenders: filteredTenders.length,
    activeTenders: filteredTenders.filter(t => t.tender_status === 'Published').length,
    awardedTenders: filteredTenders.filter(t => t.tender_status === 'Awarded').length,
    draftTenders: filteredTenders.filter(t => t.status === 'Draft').length,
    closedTenders: filteredTenders.filter(t => t.status === 'Closed').length,
    finalizedTenders: filteredTenders.filter(t => t.is_finalized === true).length,
  };

  const handleCreateTender = async (tenderData: CreateTenderRequest) => {
    try {
      await new Promise<void>((resolve, reject) => {
        createTender(tenderData, {
          onSuccess: () => {
            setActiveTab('list-contracts');
            setSearchParams({ tab: 'list-contracts' });
            resolve();
          },
          onError: (error) => {
            reject(error);
          }
        });
      });
    } catch (error) {
      // Error handled by useTenderData hook
    }
  };

  const handleUpdateTender = async (tenderData: CreateTenderRequest) => {
    if (!editingTender) {
      return;
    }
    
    try {
      await new Promise<void>((resolve, reject) => {
        updateTender({ id: editingTender.id, tender: tenderData }, {
          onSuccess: () => {
            setEditingTender(null);
            setActiveTab('list-contracts');
            setSearchParams({ tab: 'list-contracts' });
            resolve();
          },
          onError: (error) => {
            reject(error);
          }
        });
      });
    } catch (error) {
      // Error handled by useTenderData hook
    }
  };

  const handleEditTender = async (tender: Tender) => {
    // Load full tender data including items
    try {
      const response = await tendersLocalService.getById(tender.id);
      if (response.success && response.data) {
        setEditingTender(response.data);
        setActiveTab('add-tender');
        setSearchParams({ tab: 'add-tender' });
      } else {
        toast.error('Failed to load tender details');
      }
    } catch (error) {
      console.error('Error loading tender for edit:', error);
      toast.error('Failed to load tender details');
    }
  };

  const handleDeleteTender = (id: string) => {
    if (window.confirm('Are you sure you want to delete this tender?')) {
      deleteTender(id);
    }
  };

  const handleStatusChange = (id: string, status: Tender['status']) => {
    
    updateStatus({ id, status });
  };

  const handleCancelForm = () => {
    setEditingTender(null);
    setActiveTab('list-contracts');
    setSearchParams({ tab: 'list-contracts' });
  };

  const handleViewTender = (tender: Tender) => {
    setViewTender(tender);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewTender(null);
    setViewDialogOpen(false);
  };

  const getStatusColor = (status: Tender['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Published': return 'bg-blue-100 text-blue-800';
      case 'Closed': return 'bg-red-100 text-red-800';
      case 'Awarded': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateDMY(dateString);
  };

  useEffect(() => {
    // If initialType is provided, set it on mount (for /spot-purchases route)
    if (initialType) {
      setTenderSpotType(initialType);
    }
    const tab = searchParams.get('tab');
    if (tab === 'list-contracts' || tab === 'add-tender') {
      setActiveTab(tab);
    } else {
      setActiveTab('list-contracts');
      setSearchParams({ tab: 'list-contracts' });
    }
  }, [searchParams, setSearchParams, initialType]);

  // Reset state if user navigates to /contract-tender (even if already there)
  useEffect(() => {
    if (location.pathname === '/contract-tender') {
      setActiveTab('list-contracts');
      setEditingTender(null);
      setTenderSpotType('Contract/Tender');
    }
    if (location.pathname === '/spot-purchases') {
      setActiveTab('list-contracts');
      setEditingTender(null);
      setTenderSpotType('Spot Purchase');
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
    if (value === 'list-contracts') {
      setEditingTender(null);
    }
  };

  if (isLoading || isLoadingHierarchy) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading contract/tender data...</p>
        </div>
      </div>
    );
  }

  if (error && !isApiError) {
    return (
      <div className="p-6">
        <ErrorState 
          message="Failed to load contract/tender data. Please check your connection and try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {tenderSpotType === 'Spot Purchase' ? 'Spot Purchase Management' : 'Contract/Tender Management'}
          </h1>
          <p className="text-muted-foreground mt-2">Manage procurement contracts and tenders</p>
          {isApiError && (
            <div className="flex items-center mt-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>API connection failed - showing demo data</span>
            </div>
          )}
        </div>
        {/* Toggle for Tenders/Spot Purchases */}
        <div className="flex items-center gap-4">
          <div>
            <label className="font-semibold mr-2">Show:</label>
            <select
              value={tenderSpotType}
              onChange={e => setTenderSpotType(e.target.value as 'Contract/Tender' | 'Spot Purchase')}
              className="border rounded px-2 py-1"
              aria-label="Filter tender type"
            >
              <option value="Contract/Tender">Contract/Tender</option>
              <option value="Spot Purchase">Spot Purchase</option>
            </select>
          </div>
          <Button 
            onClick={() => {
              setEditingTender(null); // Clear editing state when adding new tender
              setActiveTab('add-tender');
              setSearchParams({ tab: 'add-tender' });
            }} 
            className="flex items-center space-x-2"
            disabled={isCreating}
          >
            {isCreating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{isCreating ? 'Adding...' : `Add ${tenderSpotType === 'Contract/Tender' ? 'Tender' : 'Spot Purchase'}`}</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list-contracts">{tenderSpotType === 'Contract/Tender' ? 'List of Tenders' : 'List of Spot Purchases'}</TabsTrigger>
          <TabsTrigger value="add-tender">Add</TabsTrigger>
        </TabsList>

        <TabsContent value="list-contracts" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contractStats.totalTenders}</div>
                <p className="text-xs text-muted-foreground">All time contracts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Awarded Tenders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{contractStats.awardedTenders}</div>
                <p className="text-xs text-muted-foreground">Currently Awarded Tenders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Contracts</CardTitle>
                <Edit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{contractStats.draftTenders}</div>
                <p className="text-xs text-muted-foreground">Pending publication</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Finalized Tenders</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{contractStats.finalizedTenders}</div>
                <p className="text-xs text-muted-foreground">Completed and finalized</p>
              </CardContent>
            </Card>
          </div>

          {/* Contracts Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {tenderSpotType === 'Spot Purchase' ? 'All Spot Purchases' : 'All Contracts/Tenders'}
                  </CardTitle>
                  <CardDescription>Complete list of all contracts and tenders</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tenders..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTenders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No {tenderSpotType === 'Contract/Tender' ? 'tenders' : 'spot purchases'} found. Create your first {tenderSpotType === 'Contract/Tender' ? 'tender' : 'spot purchase'} to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tenderSpotType === 'Contract/Tender' ? 'Tender Details' : 'Spot Purchase Details'}</TableHead>
                      <TableHead>Reference Number</TableHead>
                      <TableHead>Office Hierarchy</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenders.map((tender) => (
                      <TableRow key={tender.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tender.title}</div>
                            <div className="text-sm text-muted-foreground">{tender.tenderNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>{tender.referenceNumber}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tender.hierarchyPath ? (
                              <div className="text-sm">{tender.hierarchyPath}</div>
                            ) : (
                              <div className="space-y-1">
                                {tender.officeName && (
                                  <div className="text-sm font-medium">{tender.officeName}</div>
                                )}
                                {tender.wingName && (
                                  <div className="text-sm text-muted-foreground">Wing: {tender.wingName}</div>
                                )}
                                {tender.decName && (
                                  <div className="text-sm text-muted-foreground">DEC: {tender.decName}</div>
                                )}
                                
                                {/* Show resolved names or fallback to IDs if names are not available */}
                                {!tender.officeName && !tender.wingName && !tender.decName && (
                                  <div className="space-y-1">
                                    {tender.officeIds && tender.officeIds.length > 0 && (
                                      <div className="text-xs">
                                        <strong className="text-blue-600">Offices:</strong>{' '}
                                        <span className="text-blue-700">
                                          {formatNamesForDisplay(
                                            nameResolver.resolveOfficeNames(tender.officeIds), 
                                            'offices'
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {tender.wingIds && tender.wingIds.length > 0 && (
                                      <div className="text-xs">
                                        <strong className="text-green-600">Wings:</strong>{' '}
                                        <span className="text-green-700">
                                          {formatNamesForDisplay(
                                            nameResolver.resolveWingNames(tender.wingIds), 
                                            'wings'
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {tender.decIds && tender.decIds.length > 0 && (
                                      <div className="text-xs">
                                        <strong className="text-purple-600">DECs:</strong>{' '}
                                        <span className="text-purple-700">
                                          {formatNamesForDisplay(
                                            nameResolver.resolveDecNames(tender.decIds), 
                                            'DECs'
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {tender.vendor?.vendorName ? (
                              <span className="font-medium text-blue-600">{tender.vendor.vendorName}</span>
                            ) : (
                              <span className="text-muted-foreground">No vendor assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={getStatusColor(tender.status)}>
                              {tender.status}
                            </Badge>
                            {tender.is_finalized && (
                              <Badge variant="secondary" className="text-xs">
                                Finalized
                              </Badge>
                            )}
                            {tender.status === 'Draft' && !tender.is_finalized && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleStatusChange(tender.id, 'Published')}
                                disabled={isUpdatingStatus}
                                className="text-green-600 border-green-600 hover:bg-green-50 text-xs h-6 px-2"
                              >
                                {isUpdatingStatus ? (
                                  <div className="flex items-center">
                                    <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                    Publishing...
                                  </div>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Publish
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Deadline: </span>
                              {formatDate(tender.submissionDeadline)}
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Opening: </span>
                              {formatDate(tender.openingDate)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{tender.itemCount || 0} items</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <EnhancedTenderActions 
                              tenderId={tender.id} 
                              tenderStatus={tender.tender_status}
                              isFinalized={tender.is_finalized}
                              onFinalize={() => window.location.reload()}
                              onViewDialog={() => handleViewTender(tender)}
                            />
                            {/* Only show Edit and Delete buttons when tender is NOT finalized */}
                            {!tender.is_finalized && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEditTender(tender)}
                                  disabled={isUpdating}
                                  title="Edit tender"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600"
                                  onClick={() => handleDeleteTender(tender.id)}
                                  disabled={isDeleting}
                                  title="Delete tender"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-tender" className="space-y-6">
          <ContractTenderForm
            onSubmit={editingTender ? handleUpdateTender : handleCreateTender}
            onCancel={handleCancelForm}
            isLoading={isCreating || isUpdating}
            editingTender={editingTender}
            initialData={editingTender ? {
              tender_spot_type: mapBackendTypeToUi(editingTender.type),
              title: editingTender.title,
              referenceNumber: editingTender.referenceNumber,
              description: editingTender.description,
              estimatedValue: editingTender.estimatedValue,
              publishDate: editingTender.publishDate,
              publicationDate: editingTender.publicationDate,
              submissionDate: editingTender.submissionDate,
              submissionDeadline: editingTender.submissionDeadline,
              openingDate: editingTender.openingDate,
              eligibilityCriteria: editingTender.eligibilityCriteria,
              officeIds: editingTender.officeIds,
              wingIds: editingTender.wingIds,
              decIds: editingTender.decIds,
              items: editingTender.items.map(item => ({
                itemMasterId: item.itemMasterId,
                nomenclature: item.nomenclature,
                quantity: item.quantity,
                estimatedUnitPrice: item.estimatedUnitPrice,
                specifications: item.specifications,
                remarks: item.remarks
              })),
              vendor: editingTender.vendor || {
                vendorId: editingTender.vendor_id || '',
                vendorName: '',
                contactPerson: '',
                email: '',
                phone: '',
                address: '',
                contractValue: 0,
                contractDate: '',
                remarks: ''
              },
              vendor_id: editingTender.vendor_id || '',
              biddingProcedure: editingTender.biddingProcedure || '',
              tender_status: editingTender.tender_status || 'Open',
              advertisementDate: editingTender.advertisementDate || '',
              publicationDailies: editingTender.publicationDailies || '',
              procurementMethod: editingTender.procurementMethod || '',
              // Pass file path fields for already uploaded files (for edit mode)
              rfp_file_path: editingTender.rfp_file_path || '',
              contract_file_path: editingTender.contract_file_path || '',
              loi_file_path: editingTender.loi_file_path || '',
              po_file_path: editingTender.po_file_path || '',
              noting_file_path: editingTender.noting_file_path || '',
            } : { tender_spot_type: tenderSpotType }}
          />
        </TabsContent>
      </Tabs>

      {/* View Dialog for non-finalized tenders */}
      <TenderViewDialog
        tender={viewTender}
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
      />
    </div>
  );
};

export default ContractTender;
