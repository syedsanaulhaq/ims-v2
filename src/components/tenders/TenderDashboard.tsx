import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, FileCheck, Search, Filter, Calendar, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "http://localhost:3001";

interface Tender {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  status: string;
  tender_status: string;
  tender_spot_type: string;
  procurement_method: string;
  publication_date: string;
  submission_date: string;
  opening_date: string;
  is_finalized: boolean;
  finalized_at: string;
  finalized_by: string;
  created_at: string;
  vendor_name?: string;
}

const TenderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch tenders");
      }
      
      const data = await response.json();
      setTenders(data);
    } catch (error) {
      console.error("Error fetching tenders:", error);
      toast({
        title: "Error",
        description: "Failed to load tenders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tender?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tender");
      }

      toast({
        title: "Success",
        description: "Tender deleted successfully",
      });

      fetchTenders();
    } catch (error) {
      console.error("Error deleting tender:", error);
      toast({
        title: "Error",
        description: "Failed to delete tender",
        variant: "destructive",
      });
    }
  };

  const handleFinalize = async (id: string) => {
    if (!confirm("Are you sure you want to finalize this tender? This action cannot be undone.")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}/finalize`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ finalized_by: "System User" }),
      });

      if (!response.ok) {
        throw new Error("Failed to finalize tender");
      }

      toast({
        title: "Success",
        description: "Tender finalized successfully",
      });

      fetchTenders();
    } catch (error) {
      console.error("Error finalizing tender:", error);
      toast({
        title: "Error",
        description: "Failed to finalize tender",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "draft": return "secondary";
      case "published": return "default";
      case "finalized": return "destructive";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Enhanced statistics calculation
  const tenderStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    return {
      total: tenders.length,
      draft: tenders.filter(t => t.status === "draft").length,
      published: tenders.filter(t => t.status === "published").length,
      finalized: tenders.filter(t => t.is_finalized).length,
      totalValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0),
      publishedValue: tenders
        .filter(t => t.status === "published")
        .reduce((sum, t) => sum + (t.estimated_value || 0), 0),
      urgentTenders: tenders.filter(t => {
        if (!t.submission_date) return false;
        const submissionDate = new Date(t.submission_date);
        return submissionDate <= thirtyDaysFromNow && submissionDate >= now && t.status === "published";
      }).length,
      completionRate: tenders.length > 0 ? (tenders.filter(t => t.is_finalized).length / tenders.length * 100) : 0
    };
  }, [tenders]);

  // Filtered tenders based on search and filters
  const filteredTenders = useMemo(() => {
    return tenders.filter(tender => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "finalized" ? tender.is_finalized : tender.status === statusFilter);

      // Type filter
      const typeMatch = typeFilter === "all" || 
        tender.tender_spot_type === typeFilter ||
        tender.procurement_method === typeFilter;

      // Date filter
      const now = new Date();
      let dateMatch = true;
      if (dateFilter === "recent") {
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        dateMatch = new Date(tender.created_at) >= sevenDaysAgo;
      } else if (dateFilter === "month") {
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        dateMatch = new Date(tender.created_at) >= thirtyDaysAgo;
      }

      return searchMatch && statusMatch && typeMatch && dateMatch;
    });
  }, [tenders, searchTerm, statusFilter, typeFilter, dateFilter]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tender Management</h1>
          <p className="text-muted-foreground">
            Manage contract tenders and procurement processes
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/tenders/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Tender
        </Button>
      </div>

      {/* Enhanced Statistics Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Tenders</CardTitle>
            <FileCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderStats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Draft</CardTitle>
            <Edit className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderStats.draft}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderStats.published}</div>
            <p className="text-xs text-muted-foreground">Active bidding</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Finalized</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderStats.finalized}</div>
            <p className="text-xs text-muted-foreground">{tenderStats.completionRate.toFixed(1)}% completed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderStats.urgentTenders}</div>
            <p className="text-xs text-muted-foreground">Due in 30 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(tenderStats.totalValue).replace('.00', '')}</div>
            <p className="text-xs text-muted-foreground">
              Active: {formatCurrency(tenderStats.publishedValue).replace('.00', '')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Tenders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title, reference, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Spot Purchase">Spot Purchase</SelectItem>
                  <SelectItem value="Open Tender">Open Tender</SelectItem>
                  <SelectItem value="Limited Tender">Limited Tender</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Created</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="recent">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Summary */}
          {(searchTerm || statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all") && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  Showing {filteredTenders.length} of {tenders.length} tenders
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                    setDateFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {filteredTenders.length > 0 ? `Tenders (${filteredTenders.length})` : 'All Tenders'}
            </span>
            {filteredTenders.length !== tenders.length && (
              <Badge variant="secondary">
                {filteredTenders.length} of {tenders.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Publication Date</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell className="font-medium">
                    {tender.reference_number || "N/A"}
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
                    <Badge variant="outline">
                      {tender.tender_spot_type || tender.procurement_method || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(tender.estimated_value)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={getStatusVariant(tender.status)}>
                        {tender.status || "Draft"}
                      </Badge>
                      {tender.is_finalized && (
                        <Badge variant="destructive" className="ml-1">
                          Finalized
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(tender.publication_date)}</TableCell>
                  <TableCell>{formatDate(tender.submission_date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/tenders/${tender.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {!tender.is_finalized && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/tenders/${tender.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFinalize(tender.id)}
                          >
                            <FileCheck className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tender.id)}
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
          
          {filteredTenders.length === 0 && tenders.length === 0 && (
            <div className="text-center py-8">
              <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No tenders found</p>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first tender</p>
              <Button 
                onClick={() => navigate("/dashboard/tenders/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tender
              </Button>
            </div>
          )}

          {filteredTenders.length === 0 && tenders.length > 0 && (
            <div className="text-center py-8">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No tenders match your filters</p>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search terms or filters to see more results
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDateFilter("all");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenderDashboard;