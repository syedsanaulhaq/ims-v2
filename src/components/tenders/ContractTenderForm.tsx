import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Save, Upload, ArrowLeft } from 'lucide-react';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import VendorForm from "@/components/vendors/VendorForm";
import MultiSelectOfficeHierarchySection from '@/components/tenders/shared/MultiSelectOfficeHierarchySection';
import { useOffices } from '@/hooks/useOffices';
import { useVendors } from '@/hooks/useVendors';
import { useSession } from '@/contexts/SessionContext';

const API_BASE_URL = 'http://localhost:3001';

// Date utility functions for dd/mm/yyyy format
const formatDateForDisplay = (date: Date | undefined): string => {
  if (!date) return '';
  return format(date, 'dd/MM/yyyy');
};

// Format input as user types to help with date entry
const formatDateInput = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Auto-format as dd/mm/yyyy
  if (digits.length >= 2) {
    let formatted = digits.substring(0, 2);
    if (digits.length >= 4) {
      formatted += '/' + digits.substring(2, 4);
      if (digits.length >= 6) {
        formatted += '/' + digits.substring(4, Math.min(digits.length, 8));
      }
    }
    return formatted;
  }
  
  return digits;
};

const parseDateFromInput = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  
  // Allow partial typing - only try to parse when we have enough input
  if (dateString.length < 6) return undefined;
  
  try {
    let cleanedString = dateString;
    
    // Handle different input formats
    if (dateString.includes('/')) {
      // Split by slash and clean each part
      const parts = dateString.split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts;
        
        // Clean and pad day
        day = day.replace(/\D/g, '').padStart(2, '0').substring(0, 2);
        
        // Clean and pad month
        month = month.replace(/\D/g, '').padStart(2, '0').substring(0, 2);
        
        // Clean year and handle various formats
        year = year.replace(/\D/g, '');
        if (year.length === 2) {
          // Convert 2-digit year to 4-digit (assume 20xx for now)
          year = '20' + year;
        } else if (year.length > 4) {
          // Take last 4 digits for year (handles 002023 -> 2023)
          year = year.substring(year.length - 4);
        } else if (year.length === 3) {
          // Assume missing leading digit is 2 (023 -> 2023)
          year = '2' + year;
        }
        
        // Validate ranges
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (dayNum < 1 || dayNum > 31) return undefined;
        if (monthNum < 1 || monthNum > 12) return undefined;
        if (yearNum < 1900 || yearNum > 2100) return undefined;
        
        cleanedString = `${day}/${month}/${year}`;
      }
    } else {
      // Handle numeric input (ddmmyyyy or variations)
      const digits = dateString.replace(/\D/g, '');
      
      if (digits.length >= 6 && digits.length <= 10) {
        let day, month, year;
        
        if (digits.length === 6) {
          // ddmmyy
          day = digits.substring(0, 2);
          month = digits.substring(2, 4);
          year = '20' + digits.substring(4, 6);
        } else if (digits.length === 8) {
          // ddmmyyyy
          day = digits.substring(0, 2);
          month = digits.substring(2, 4);
          year = digits.substring(4, 8);
        } else {
          // Handle other lengths by taking last part as year
          day = digits.substring(0, 2);
          month = digits.substring(2, 4);
          year = digits.substring(4);
          
          // Clean year similar to above
          if (year.length === 2) {
            year = '20' + year;
          } else if (year.length > 4) {
            year = year.substring(year.length - 4);
          } else if (year.length === 3) {
            year = '2' + year;
          }
        }
        
        cleanedString = `${day}/${month}/${year}`;
      } else {
        return undefined;
      }
    }
    
    const parsed = parse(cleanedString, 'dd/MM/yyyy', new Date());
    return isNaN(parsed.getTime()) ? undefined : parsed;
  } catch {
    return undefined;
  }
};

// Track the raw input values for date fields
const useRawDateInput = (initialValue: string = '') => {
  const [rawValue, setRawValue] = React.useState(initialValue);
  return { rawValue, setRawValue };
};

// Complete schema based on database structure
const contractTenderSchema = z.object({
  // Basic Information
  tender_number: z.string().min(1, "Tender number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  
  // Type and Method
  tender_spot_type: z.enum(['Contract/Tender', 'Spot Purchase'], { 
    required_error: 'Tender type is required' 
  }),
  procurement_method: z.string().optional(),
  bidding_procedure: z.string().optional(),
  
  // Financial Information
  estimated_value: z.coerce.number().min(0, "Estimated value must be positive").optional(),
  
  // Date Fields (matching database exactly)
  publication_date: z.date().optional(),
  submission_date: z.date().optional(),
  opening_date: z.date().optional(),
  
  // Publication
  publication_daily: z.string().optional(),
  
  // Criteria and Procedures
  eligibility_criteria: z.string().optional(),
  
  // Organizational (arrays for multi-select - changed from single strings)
  officeIds: z.array(z.string()).min(1, "At least one office is required"),
  wingIds: z.array(z.string()).min(1, "At least one wing is required"),
  decIds: z.array(z.string()).optional(),
  
  // Vendor
  vendor_id: z.string().optional(),
  
  // Items
  items: z.array(z.object({
    item_master_id: z.string().min(1, "Item is required"),
    nomenclature: z.string().min(1, "Nomenclature is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    estimated_unit_price: z.coerce.number().min(0, "Unit price must be positive"),
    specifications: z.string().optional(),
    remarks: z.string().optional(),
  })).min(1, "At least one item is required"),
});

type ContractTenderFormData = z.infer<typeof contractTenderSchema>;

interface ItemMaster {
  id: string;
  nomenclature: string;
  unit: string;
  category_id: string;
  specifications?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

interface ContractTenderFormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: any;
  editingTender?: any;
}

export default function ContractTenderForm({ 
  onSubmit, 
  onCancel, 
  isLoading: propLoading, 
  initialData,
  editingTender 
}: ContractTenderFormProps = {}) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  
  // Use hooks
  const { offices, wings, decs, loading: officesLoading } = useOffices();
  const { vendors, loading: vendorsLoading, refetch: refetchVendors } = useVendors();
  
  // Edit mode can be detected from URL params OR from props
  const isEditMode = Boolean(id) || Boolean(editingTender);
  const currentTenderId = id || editingTender?.id;
  
  const form = useForm<ContractTenderFormData>({
    resolver: zodResolver(contractTenderSchema),
    defaultValues: {
      tender_spot_type: 'Contract/Tender',
      officeIds: [],
      wingIds: [],
      decIds: [],
      items: [],
      estimated_value: 0,
    },
  });

  // Load item masters
  useEffect(() => {
    const fetchItemMasters = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/item-masters`);
        if (response.ok) {
          const data = await response.json();
          setItemMasters(data);
        }
      } catch (error) {
        console.error('Error loading item masters:', error);
      }
    };

    fetchItemMasters();
  }, []);

  // Load tender data for edit mode (either from URL or props)
  useEffect(() => {
    if (isEditMode) {
      if (editingTender) {
        // Use prop data if available
        loadTenderFromProp(editingTender);
      } else if (currentTenderId) {
        // Load from API if we have an ID
        loadTenderData(currentTenderId);
      }
    }
  }, [isEditMode, editingTender, currentTenderId]);

  const loadTenderFromProp = (tender: any) => {
    try {
      setLoading(true);
      
      // Process the prop data to match form structure
      const formData: Partial<ContractTenderFormData> = {
        tender_number: tender.tender_number || tender.referenceNumber || '',
        title: tender.title || '',
        description: tender.description || '',
        tender_spot_type: tender.tender_spot_type || tender.type || 'Contract/Tender',
        procurement_method: tender.procurement_method || '',
        estimated_value: tender.estimated_value || tender.estimatedValue || 0,
        publication_daily: tender.publication_daily || '',
        eligibility_criteria: tender.eligibility_criteria || '',
        bidding_procedure: tender.bidding_procedure || '',
        vendor_id: tender.vendor_id || '',
        
        // Parse organizational IDs (they might come as arrays or comma-separated strings)
        officeIds: Array.isArray(tender.officeIds) ? tender.officeIds :
          (tender.office_ids ? tender.office_ids.split(',').filter(Boolean) : []),
        wingIds: Array.isArray(tender.wingIds) ? tender.wingIds :
          (tender.wing_ids ? tender.wing_ids.split(',').filter(Boolean) : []),
        decIds: Array.isArray(tender.decIds) ? tender.decIds :
          (tender.dec_ids ? tender.dec_ids.split(',').filter(Boolean) : []),        // Parse dates
        publication_date: tender.publication_date ? new Date(tender.publication_date) : 
                         (tender.publicationDate ? new Date(tender.publicationDate) : undefined),
        submission_date: tender.submission_date ? new Date(tender.submission_date) : 
                        (tender.submissionDate ? new Date(tender.submissionDate) : undefined),
        opening_date: tender.opening_date ? new Date(tender.opening_date) : 
                     (tender.openingDate ? new Date(tender.openingDate) : undefined),
      };
      
      // Handle items if they exist
      if (tender.items && Array.isArray(tender.items)) {
        formData.items = tender.items.map((item: any) => ({
          item_master_id: item.item_master_id || item.itemMasterId || '',
          nomenclature: item.nomenclature || '',
          quantity: item.quantity || 0,
          estimated_unit_price: item.estimated_unit_price || item.estimatedUnitPrice || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || '',
        }));
        setSelectedItems(tender.items);
      }
      
      // Reset form with loaded data
      form.reset(formData);
      
    } catch (error) {
      console.error('Error loading tender from props:', error);
      toast({
        title: "Error",
        description: "Failed to load tender data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTenderData = async (tenderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders/${tenderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load tender data');
      }
      
      const tender = await response.json();
      
      // Process the data to match form structure
      const formData: Partial<ContractTenderFormData> = {
        tender_number: tender.tender_number || '',
        title: tender.title || '',
        description: tender.description || '',
        tender_spot_type: tender.tender_spot_type || 'Contract/Tender',
        procurement_method: tender.procurement_method || '',
        estimated_value: tender.estimated_value || 0,
        publication_daily: tender.publication_daily || '',
        eligibility_criteria: tender.eligibility_criteria || '',
        bidding_procedure: tender.bidding_procedure || '',
        vendor_id: tender.vendor_id || '',
        
        // Parse comma-separated organizational IDs
        officeIds: tender.office_ids ? tender.office_ids.split(',').filter(Boolean) : [],
        wingIds: tender.wing_ids ? tender.wing_ids.split(',').filter(Boolean) : [],
        decIds: tender.dec_ids ? tender.dec_ids.split(',').filter(Boolean) : [],
        
        // Parse dates
        publication_date: tender.publication_date ? new Date(tender.publication_date) : undefined,
        submission_date: tender.submission_date ? new Date(tender.submission_date) : undefined,
        opening_date: tender.opening_date ? new Date(tender.opening_date) : undefined,
      };
      
      // Load tender items
      const itemsResponse = await fetch(`${API_BASE_URL}/api/tenders/${tenderId}/items`);
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        formData.items = items.map((item: any) => ({
          item_master_id: item.item_master_id,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimated_unit_price || 0,
          specifications: item.specifications || '',
          remarks: item.remarks || '',
        }));
        setSelectedItems(items);
      }
      
      // Reset form with loaded data
      form.reset(formData);
      
    } catch (error) {
      console.error('Error loading tender:', error);
      toast({
        title: "Error",
        description: "Failed to load tender data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: ContractTenderFormData) => {
    try {
      setSaving(true);
      
      // Debug: Log the form data to see what date values we have
      console.log('🔍 Form submission data:', {
        publication_date: data.publication_date,
        submission_date: data.submission_date,
        opening_date: data.opening_date,
        fullData: data
      });
      
      // If onSubmit prop is provided, use it (for integration with existing system)
      if (onSubmit) {
        // Transform data to match expected format for the prop-based system
        const transformedData = {
          tender_number: data.tender_number,
          title: data.title,
          description: data.description || '',
          tender_spot_type: data.tender_spot_type,
          type: data.tender_spot_type, // Also include as 'type' for backward compatibility
          procurement_method: data.procurement_method || '',
          estimated_value: data.estimated_value || 0,
          estimatedValue: data.estimated_value || 0, // Backward compatibility
          publication_daily: data.publication_daily || '',
          eligibility_criteria: data.eligibility_criteria || '',
          bidding_procedure: data.bidding_procedure || '',
          vendor_id: data.vendor_id || null,
          
          // Organizational data - provide both formats
          office_ids: data.officeIds.join(','),
          wing_ids: data.wingIds.join(','),
          dec_ids: data.decIds?.join(',') || '',
          officeIds: data.officeIds, // Array format
          wingIds: data.wingIds,     // Array format
          decIds: data.decIds || [], // Array format
          
          // Dates
          publication_date: data.publication_date ? data.publication_date.toISOString().split('T')[0] : null,
          submission_date: data.submission_date ? data.submission_date.toISOString().split('T')[0] : null,
          opening_date: data.opening_date ? data.opening_date.toISOString() : null,
          
          // Debug: Log date transformations
          _debug_dates: {
            original_publication_date: data.publication_date,
            transformed_publication_date: data.publication_date ? data.publication_date.toISOString().split('T')[0] : null,
            original_submission_date: data.submission_date,
            transformed_submission_date: data.submission_date ? data.submission_date.toISOString().split('T')[0] : null,
            original_opening_date: data.opening_date,
            transformed_opening_date: data.opening_date ? data.opening_date.toISOString() : null,
          },
          
          // Items
          items: data.items,
          
          // User information
          created_by: user?.user_name || 'system',
        };
        
        await onSubmit(transformedData);
        return;
      }
      
      // Original direct API submission (for standalone routing)
      await handleDirectSubmit(data);
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tender",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDirectSubmit = async (data: ContractTenderFormData) => {
    // Prepare the payload with proper field mapping
    const payload = {
      // Use exact database field names
      tender_number: data.tender_number,
      title: data.title,
      description: data.description || '',
      tender_spot_type: data.tender_spot_type,
      procurement_method: data.procurement_method || '',
      estimated_value: data.estimated_value || 0,
      publication_daily: data.publication_daily || '',
      eligibility_criteria: data.eligibility_criteria || '',
      bidding_procedure: data.bidding_procedure || '',
      vendor_id: data.vendor_id || null,
      
      // Convert arrays to comma-separated strings (as expected by backend)
      office_ids: data.officeIds.join(','),
      wing_ids: data.wingIds.join(','),
      dec_ids: data.decIds?.join(',') || '',
      
      // Format dates as ISO strings for database
      publication_date: data.publication_date ? data.publication_date.toISOString().split('T')[0] : null,
      submission_date: data.submission_date ? data.submission_date.toISOString().split('T')[0] : null,
      opening_date: data.opening_date ? data.opening_date.toISOString() : null,
      
      // Debug: Log date transformations for direct submit
      _debug_direct_dates: {
        original_publication_date: data.publication_date,
        transformed_publication_date: data.publication_date ? data.publication_date.toISOString().split('T')[0] : null,
        original_submission_date: data.submission_date,
        transformed_submission_date: data.submission_date ? data.submission_date.toISOString().split('T')[0] : null,
        original_opening_date: data.opening_date,
        transformed_opening_date: data.opening_date ? data.opening_date.toISOString() : null,
      },
      
      // Items
      items: data.items,
      
      // User information
      created_by: user?.user_name || 'system',
    };
    
    console.log('📤 Submitting payload:', payload);
    
    const url = isEditMode 
      ? `${API_BASE_URL}/api/tenders/${currentTenderId}`
      : `${API_BASE_URL}/api/tenders`;
      
    const method = isEditMode ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} tender`);
    }
    
    const result = await response.json();
    
    toast({
      title: "Success",
      description: `Tender ${isEditMode ? 'updated' : 'created'} successfully`,
      variant: "default",
    });
    
    // Navigate back to tenders list or to the created/updated tender
    navigate('/dashboard/tenders');
  };

  const addItem = () => {
    const currentItems = form.getValues('items');
    form.setValue('items', [
      ...currentItems,
      {
        item_master_id: '',
        nomenclature: '',
        quantity: 1,
        estimated_unit_price: 0,
        specifications: '',
        remarks: '',
      },
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.filter((_, i) => i !== index);
    form.setValue('items', updatedItems);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = itemMasters.find(item => item.id === itemId);
    if (selectedItem) {
      const currentItems = form.getValues('items');
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        item_master_id: itemId,
        nomenclature: selectedItem.nomenclature,
        specifications: selectedItem.specifications || '',
      };
      form.setValue('items', updatedItems);
    }
  };

  const onVendorCreated = () => {
    refetchVendors();
    setIsVendorDialogOpen(false);
    toast({
      title: "Success",
      description: "Vendor created successfully",
    });
  };

  if (loading || officesLoading || vendorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/tenders')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tenders</span>
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Edit Contract/Tender' : 'Create New Contract/Tender'}
          </h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Tender Number */}
                <FormField
                  control={form.control}
                  name="tender_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender/Reference Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tender number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tender Type */}
                <FormField
                  control={form.control}
                  name="tender_spot_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tender type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Contract/Tender">Contract/Tender</SelectItem>
                          <SelectItem value="Spot Purchase">Spot Purchase</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tender title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter tender description" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Procurement Method */}
                <FormField
                  control={form.control}
                  name="procurement_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procurement Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select procurement method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open Competitive Bidding">Open Competitive Bidding</SelectItem>
                          <SelectItem value="MoU">MoU</SelectItem>
                          <SelectItem value="Direct Contracting">Direct Contracting</SelectItem>
                          <SelectItem value="Limited Tendering">Limited Tendering</SelectItem>
                          <SelectItem value="Single Source">Single Source</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bidding Procedure - Only show for Open Competitive Bidding */}
                {form.watch('procurement_method') === 'Open Competitive Bidding' && (
                  <FormField
                    control={form.control}
                    name="bidding_procedure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedure Adopted (for Open Competitive Bidding)</FormLabel>
                        <div className="space-y-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select bidding procedure" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Single Stage One Envelope">Single Stage One Envelope</SelectItem>
                              <SelectItem value="Single Stage Two Envelope">Single Stage Two Envelope</SelectItem>
                              <SelectItem value="Two Stage Bidding">Two Stage Bidding</SelectItem>
                              <SelectItem value="Request for Quotations">Request for Quotations</SelectItem>
                              <SelectItem value="custom">Other (specify below)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormControl>
                            <Input
                              placeholder="Or enter custom bidding procedure"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="mt-2"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Estimated Value */}
                <FormField
                  control={form.control}
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Publication Daily */}
                <FormField
                  control={form.control}
                  name="publication_daily"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Publication Daily/Newspaper</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter publication details" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

          {/* Date Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Publication Date */}
                <FormField
                  control={form.control}
                  name="publication_date"
                  render={({ field }) => {
                    const [inputValue, setInputValue] = React.useState(
                      field.value ? formatDateForDisplay(field.value) : ''
                    );

                    // Update input value when field value changes (e.g., from calendar)
                    React.useEffect(() => {
                      setInputValue(field.value ? formatDateForDisplay(field.value) : '');
                    }, [field.value]);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Advertisement/Publication</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="dd/mm/yyyy"
                              value={inputValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setInputValue(value);
                                
                                // Try to parse the date
                                const parsed = parseDateFromInput(value);
                                if (parsed) {
                                  field.onChange(parsed);
                                } else if (value === '') {
                                  field.onChange(undefined);
                                }
                              }}
                              onBlur={() => {
                                // On blur, try to format the input or clear if invalid
                                const parsed = parseDateFromInput(inputValue);
                                if (parsed) {
                                  setInputValue(formatDateForDisplay(parsed));
                                  field.onChange(parsed);
                                } else if (inputValue && inputValue.trim() !== '') {
                                  // Invalid date, clear the field
                                  setInputValue('');
                                  field.onChange(undefined);
                                }
                              }}
                              className="flex-1"
                            />
                          </FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setInputValue(date ? formatDateForDisplay(date) : '');
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Submission Date */}
                <FormField
                  control={form.control}
                  name="submission_date"
                  render={({ field }) => {
                    const [inputValue, setInputValue] = React.useState(
                      field.value ? formatDateForDisplay(field.value) : ''
                    );

                    // Update input value when field value changes (e.g., from calendar)
                    React.useEffect(() => {
                      setInputValue(field.value ? formatDateForDisplay(field.value) : '');
                    }, [field.value]);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Submission Date</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="dd/mm/yyyy"
                              value={inputValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setInputValue(value);
                                
                                // Try to parse the date
                                const parsed = parseDateFromInput(value);
                                if (parsed) {
                                  field.onChange(parsed);
                                } else if (value === '') {
                                  field.onChange(undefined);
                                }
                              }}
                              onBlur={() => {
                                // On blur, try to format the input or clear if invalid
                                const parsed = parseDateFromInput(inputValue);
                                if (parsed) {
                                  setInputValue(formatDateForDisplay(parsed));
                                  field.onChange(parsed);
                                } else if (inputValue && inputValue.trim() !== '') {
                                  // Invalid date, clear the field
                                  setInputValue('');
                                  field.onChange(undefined);
                                }
                              }}
                              className="flex-1"
                            />
                          </FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setInputValue(date ? formatDateForDisplay(date) : '');
                                }}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Opening Date */}
                <FormField
                  control={form.control}
                  name="opening_date"
                  render={({ field }) => {
                    const [inputValue, setInputValue] = React.useState(
                      field.value ? formatDateForDisplay(field.value) : ''
                    );

                    // Update input value when field value changes (e.g., from calendar)
                    React.useEffect(() => {
                      setInputValue(field.value ? formatDateForDisplay(field.value) : '');
                    }, [field.value]);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Opening Date</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="dd/mm/yyyy"
                              value={inputValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setInputValue(value);
                                
                                // Try to parse the date
                                const parsed = parseDateFromInput(value);
                                if (parsed) {
                                  field.onChange(parsed);
                                } else if (value === '') {
                                  field.onChange(undefined);
                                }
                              }}
                              onBlur={() => {
                                // On blur, try to format the input or clear if invalid
                                const parsed = parseDateFromInput(inputValue);
                                if (parsed) {
                                  setInputValue(formatDateForDisplay(parsed));
                                  field.onChange(parsed);
                                } else if (inputValue && inputValue.trim() !== '') {
                                  // Invalid date, clear the field
                                  setInputValue('');
                                  field.onChange(undefined);
                                }
                              }}
                              className="flex-1"
                            />
                          </FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setInputValue(date ? formatDateForDisplay(date) : '');
                                }}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

              </div>
            </CardContent>
          </Card>

          {/* Organizational Information Card */}
          <MultiSelectOfficeHierarchySection
            form={form}
            isLoading={loading || officesLoading}
            wingsDecLabel="Tender Related Wings/DEC"
            wingsDecHeading="Tender Related Wings/DEC
Select offices and wings (both required), and optionally select DECs for this tender."
          />

          {/* Vendor Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Vendor Information
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVendorDialogOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Vendor</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vendor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Additional Criteria Card */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Eligibility Criteria */}
              <FormField
                control={form.control}
                name="eligibility_criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eligibility Criteria</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter eligibility criteria" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Tender Items
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {form.watch('items').map((item, index) => (
                  <div key={index} className="border p-4 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Item Master */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.item_master_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleItemSelect(index, value);
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {itemMasters.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.nomenclature}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                step="1"
                                placeholder="1" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Estimated Unit Price */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.estimated_unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Unit Price</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Specifications */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.specifications`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Specifications</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter item specifications" 
                                className="min-h-[60px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Remarks */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.remarks`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remarks</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter remarks" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>
                  </div>
                ))}
                
                {form.watch('items').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items added yet. Click "Add Item" to start.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard/tenders')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="flex items-center space-x-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : (isEditMode ? 'Update Tender' : 'Create Tender')}</span>
            </Button>
          </div>

        </form>
      </Form>

      {/* Vendor Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm 
            onSubmit={async (data) => {
              try {
                await fetch(`${API_BASE_URL}/api/vendors`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                onVendorCreated();
              } catch (error) {
                console.error('Error creating vendor:', error);
                toast({
                  title: "Error",
                  description: "Failed to create vendor",
                  variant: "destructive",
                });
              }
            }}
            onCancel={() => setIsVendorDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
