import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Plus, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Tender {
  id: string;
  reference_number: string;
  title: string;
  description?: string;
  estimated_value?: number;
  publish_date?: string;
  submission_deadline?: string;
  opening_date?: string;
  status: string;
  tender_type?: string;
  tender_status?: string;
  document_path?: string;
  created_at: string;
  updated_at: string;
  is_finalized: boolean;
}

interface TenderDashboardProps {
  onCreateTender?: () => void;
  onEditTender?: (tender: Tender) => void;
}

const TenderDashboard: React.FC<TenderDashboardProps> = ({
  onCreateTender,
  onEditTender
}) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch tenders from API
  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/tenders');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTenders(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch tenders');
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete tender
  const deleteTender = async (tenderId: string) => {
    if (!confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Remove tender from state
        setTenders(prev => prev.filter(t => t.id !== tenderId));
        alert('Tender deleted successfully');
      } else {
        throw new Error(data.error || 'Failed to delete tender');
      }
    } catch (err) {
      console.error('Error deleting tender:', err);
      alert('Failed to delete tender: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Finalize tender
  const finalizeTender = async (tenderId: string) => {
    if (!confirm('Are you sure you want to finalize this tender? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tenders/${tenderId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update tender in state
        setTenders(prev => prev.map(t => 
          t.id === tenderId ? { ...t, is_finalized: true } : t
        ));
        alert('Tender finalized successfully');
      } else {
        throw new Error(data.error || 'Failed to finalize tender');
      }
    } catch (err) {
      console.error('Error finalizing tender:', err);
      alert('Failed to finalize tender: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  // Filter tenders based on search and filters
  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = 
      tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tender.description && tender.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
    const matchesType = typeFilter === 'all' || tender.tender_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'secondary';
      case 'published':
        return 'default';
      case 'closed':
        return 'destructive';
      case 'awarded':
        return 'success';
      default:
        return 'outline';
    }
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tenders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tender Management</h2>
          <p className="text-muted-foreground">
            Manage procurement tenders and track their progress
          </p>
        </div>
        <Button onClick={onCreateTender} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Tender
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenders by title, reference number, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="open">Open Tender</SelectItem>
                <SelectItem value="limited">Limited Tender</SelectItem>
                <SelectItem value="quotation">Quotation</SelectItem>
                <SelectItem value="framework">Framework Agreement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tenders ({filteredTenders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTenders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tenders.length === 0 ? 'No tenders found' : 'No tenders match your search criteria'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Estimated Value</TableHead>
                  <TableHead>Submission Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenders.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell className="font-medium">
                      {tender.reference_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tender.title}</div>
                        {tender.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {tender.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tender.tender_type || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(tender.estimated_value)}
                    </TableCell>
                    <TableCell>
                      {tender.submission_deadline ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(tender.submission_deadline), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(tender.status)}>
                          {tender.status}
                        </Badge>
                        {tender.is_finalized && (
                          <Badge variant="outline">Finalized</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTender(tender);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTender?.(tender)}
                          disabled={tender.is_finalized}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!tender.is_finalized && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => finalizeTender(tender.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTender(tender.id)}
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

      {/* Tender Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tender Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected tender
            </DialogDescription>
          </DialogHeader>
          {selectedTender && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Reference Number</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTender.reference_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <p className="text-sm text-muted-foreground">{selectedTender.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTender.tender_type || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    <Badge variant={getStatusBadgeVariant(selectedTender.status)}>
                      {selectedTender.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Value</label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedTender.estimated_value)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Publish Date</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTender.publish_date ? 
                      format(new Date(selectedTender.publish_date), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Submission Deadline</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTender.submission_deadline ? 
                      format(new Date(selectedTender.submission_deadline), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Opening Date</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTender.opening_date ? 
                      format(new Date(selectedTender.opening_date), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
              {selectedTender.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTender.description}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onEditTender?.(selectedTender)}
                  disabled={selectedTender.is_finalized}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Tender
                </Button>
                {!selectedTender.is_finalized && (
                  <Button
                    variant="outline"
                    onClick={() => finalizeTender(selectedTender.id)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Finalize Tender
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenderDashboard;
