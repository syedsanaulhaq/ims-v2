import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
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
import { useOffices } from '@/hooks/useOffices';
import { useVendors } from '@/hooks/useVendors';
import { useSession } from '@/contexts/SessionContext';

const API_BASE_URL = 'http://localhost:3001';

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
  
  // Financial Information
  estimated_value: z.coerce.number().min(0, "Estimated value must be positive").optional(),
  
  // Date Fields (matching database exactly)
  publish_date: z.date().optional(),
  publication_date: z.date().optional(),
  submission_date: z.date().optional(),
  submission_deadline: z.date().optional(),
  opening_date: z.date().optional(),
  
  // Publication
  publication_daily: z.string().optional(),
  
  // Criteria and Procedures
  eligibility_criteria: z.string().optional(),
  bidding_procedure: z.string().optional(),
  
  // Organizational (arrays that will be converted to comma-separated strings)
  office_ids: z.array(z.string()).min(1, "At least one office is required"),
  wing_ids: z.array(z.string()).min(1, "At least one wing is required"),
  dec_ids: z.array(z.string()).optional(),
  
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

export default function ContractTenderForm() {
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
  
  const isEditMode = Boolean(id);
  
  const form = useForm<ContractTenderFormData>({
    resolver: zodResolver(contractTenderSchema),
    defaultValues: {
      tender_spot_type: 'Contract/Tender',
      office_ids: [],
      wing_ids: [],
      dec_ids: [],
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

  // Load tender data for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadTenderData(id);
    }
  }, [id, isEditMode]);

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
        office_ids: tender.office_ids ? tender.office_ids.split(',').filter(Boolean) : [],
        wing_ids: tender.wing_ids ? tender.wing_ids.split(',').filter(Boolean) : [],
        dec_ids: tender.dec_ids ? tender.dec_ids.split(',').filter(Boolean) : [],
        
        // Parse dates
        publish_date: tender.publish_date ? new Date(tender.publish_date) : undefined,
        publication_date: tender.publication_date ? new Date(tender.publication_date) : undefined,
        submission_date: tender.submission_date ? new Date(tender.submission_date) : undefined,
        submission_deadline: tender.submission_deadline ? new Date(tender.submission_deadline) : undefined,
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

  const onSubmit = async (data: ContractTenderFormData) => {
    try {
      setSaving(true);
      
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
        office_ids: data.office_ids.join(','),
        wing_ids: data.wing_ids.join(','),
        dec_ids: data.dec_ids?.join(',') || '',
        
        // Format dates as ISO strings for database
        publish_date: data.publish_date ? data.publish_date.toISOString().split('T')[0] : null,
        publication_date: data.publication_date ? data.publication_date.toISOString().split('T')[0] : null,
        submission_date: data.submission_date ? data.submission_date.toISOString().split('T')[0] : null,
        submission_deadline: data.submission_deadline ? data.submission_deadline.toISOString() : null,
        opening_date: data.opening_date ? data.opening_date.toISOString() : null,
        
        // Items
        items: data.items,
        
        // User information
        created_by: user?.Username || 'system',
      };
      
      console.log('📤 Submitting payload:', payload);
      
      const url = isEditMode 
        ? `${API_BASE_URL}/api/tenders/${id}`
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
      
    } catch (error) {
      console.error('Error saving tender:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tender",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
                      <FormControl>
                        <Input placeholder="e.g., Open Tender, Limited Tender" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                
                {/* Publish Date */}
                <FormField
                  control={form.control}
                  name="publish_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Publish Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Publication Date */}
                <FormField
                  control={form.control}
                  name="publication_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Advertisement/Publication</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submission Date */}
                <FormField
                  control={form.control}
                  name="submission_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Submission Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submission Deadline */}
                <FormField
                  control={form.control}
                  name="submission_deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Submission Deadline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opening Date */}
                <FormField
                  control={form.control}
                  name="opening_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Opening Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

          {/* Organizational Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Organizational Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Offices */}
                <FormField
                  control={form.control}
                  name="office_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offices *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const currentValues = field.value || [];
                          if (!currentValues.includes(value)) {
                            field.onChange([...currentValues, value]);
                          }
                        }} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select offices" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id}>
                              {office.office_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {field.value.map((officeId) => {
                            const office = offices.find(o => o.id === officeId);
                            return office ? (
                              <div key={officeId} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded">
                                <span className="text-sm">{office.office_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    field.onChange(field.value.filter(id => id !== officeId));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Wings */}
                <FormField
                  control={form.control}
                  name="wing_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wings *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const currentValues = field.value || [];
                          if (!currentValues.includes(value)) {
                            field.onChange([...currentValues, value]);
                          }
                        }} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wings" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wings.map((wing) => (
                            <SelectItem key={wing.id} value={wing.id}>
                              {wing.wing_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {field.value.map((wingId) => {
                            const wing = wings.find(w => w.id === wingId);
                            return wing ? (
                              <div key={wingId} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded">
                                <span className="text-sm">{wing.wing_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    field.onChange(field.value.filter(id => id !== wingId));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* DECs */}
                <FormField
                  control={form.control}
                  name="dec_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DECs</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const currentValues = field.value || [];
                          if (!currentValues.includes(value)) {
                            field.onChange([...currentValues, value]);
                          }
                        }} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select DECs" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {decs.map((dec) => (
                            <SelectItem key={dec.id} value={dec.id}>
                              {dec.dec_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {field.value.map((decId) => {
                            const dec = decs.find(d => d.id === decId);
                            return dec ? (
                              <div key={decId} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded">
                                <span className="text-sm">{dec.dec_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    field.onChange(field.value.filter(id => id !== decId));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

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

              {/* Bidding Procedure */}
              <FormField
                control={form.control}
                name="bidding_procedure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bidding Procedure</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter bidding procedure" 
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
          <VendorForm onSuccess={onVendorCreated} />
        </DialogContent>
      </Dialog>

    </div>
  );
}
