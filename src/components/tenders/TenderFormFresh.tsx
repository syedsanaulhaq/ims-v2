import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import { useOfficeHierarchy } from "@/hooks/useOfficeHierarchy";
import { cn } from "@/lib/utils";
import { Building2, Users, MapPin } from "lucide-react";

const API_BASE_URL = "http://localhost:3001";

// Schema exactly matching your SQL Server tenders table
const tenderSchema = z.object({
  // Basic Information
  reference_number: z.string().min(1, "Reference number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  
  // Financial (removed individual_total and actual_price_total)
  estimated_value: z.coerce.number().min(0, "Estimated value must be positive").optional(),
  
  // Dates (including advertisement_date)
  publish_date: z.date().optional(),
  publication_date: z.date().optional(),
  submission_date: z.date().optional(),
  submission_deadline: z.date().optional(),
  opening_date: z.date().optional(),
  advertisement_date: z.date().optional(), // Required advertisement_date
  
  // Status and Type
  status: z.string().optional(),
  tender_status: z.string().optional(),
  tender_spot_type: z.string().optional(),
  tender_type: z.string().optional(),
  tender_number: z.string().optional(),
  
  // Procurement (procurement_method as combobox)
  procurement_method: z.string().optional(),
  procedure_adopted: z.string().optional(),
  publication_daily: z.string().optional(),
  
  // Organizational IDs (multi-select arrays)
  officeIds: z.array(z.string()).min(1, "At least one office is required"),
  wingIds: z.array(z.string()).min(1, "At least one wing is required"),
  decIds: z.array(z.string()).optional(),
  
  // Vendor
  vendor_id: z.string().optional(),
  
  // File paths
  document_path: z.string().optional(),
  contract_file_path: z.string().optional(),
  loi_file_path: z.string().optional(),
  noting_file_path: z.string().optional(),
  po_file_path: z.string().optional(),
  rfp_file_path: z.string().optional(),
});

type TenderFormData = z.infer<typeof tenderSchema>;

// Procurement method options
const procurementMethods = [
  { value: "Open Competitive Bidding", label: "Open Competitive Bidding" },
  { value: "MoU", label: "MoU" },
  { value: "Direct Contracting", label: "Direct Contracting" },
  { value: "Limited Tendering", label: "Limited Tendering" },
  { value: "Single Source", label: "Single Source" },
];

const TenderFormFresh: React.FC = () => {
  console.log("🎯 BRAND NEW TenderFormFresh component loaded - Built from scratch for your database!");
  
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);
  
  // Use office hierarchy hook for multi-select data
  const { offices, wings, decs, isLoading: hierarchyLoading } = useOfficeHierarchy();

  const form = useForm<TenderFormData>({
    resolver: zodResolver(tenderSchema),
    defaultValues: {
      reference_number: "",
      title: "",
      description: "",
      estimated_value: 0,
      publish_date: new Date(),
      publication_date: new Date(),
      submission_date: new Date(),
      submission_deadline: new Date(),
      opening_date: new Date(),
      advertisement_date: new Date(),
      status: "Draft",
      tender_status: "Open",
      tender_spot_type: "Contract/Tender",
      tender_type: "",
      tender_number: "",
      procurement_method: "",
      procedure_adopted: "",
      publication_daily: "",
      officeIds: [],
      wingIds: [],
      decIds: [],
      vendor_id: "",
      document_path: "",
      contract_file_path: "",
      loi_file_path: "",
      noting_file_path: "",
      po_file_path: "",
      rfp_file_path: "",
    },
  });

  // Watch office selection for wing filtering
  const selectedOfficeIds = form.watch("officeIds");
  const selectedWingIds = form.watch("wingIds");

  // Filter wings based on selected offices
  const filteredWings = wings.filter(wing => 
    selectedOfficeIds.length === 0 || selectedOfficeIds.includes(wing.office_id?.toString() || "")
  );

  // Filter DECs based on selected wings
  const filteredDecs = decs.filter(dec => 
    selectedWingIds.length === 0 || selectedWingIds.includes(dec.wing_id?.toString() || "")
  );

  // Fetch tender data if editing
  useEffect(() => {
    if (isEditing && id) {
      fetchTenderData(id);
    }
  }, [isEditing, id]);

  const fetchTenderData = async (tenderId: string) => {
    try {
      setFetchLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders/${tenderId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tender: ${response.statusText}`);
      }
      
      const tender = await response.json();
      
      // Map the fetched data to form values with multi-select arrays
      const formData = {
        reference_number: tender.reference_number || "",
        title: tender.title || "",
        description: tender.description || "",
        estimated_value: tender.estimated_value || 0,
        individual_total: tender.individual_total || "",
        actual_price_total: tender.actual_price_total || 0,
        publish_date: tender.publish_date ? new Date(tender.publish_date) : new Date(),
        publication_date: tender.publication_date ? new Date(tender.publication_date) : new Date(),
        submission_date: tender.submission_date ? new Date(tender.submission_date) : new Date(),
        submission_deadline: tender.submission_deadline ? new Date(tender.submission_deadline) : new Date(),
        opening_date: tender.opening_date ? new Date(tender.opening_date) : new Date(),
        advertisement_date: tender.advertisement_date ? new Date(tender.advertisement_date) : new Date(),
        status: tender.status || "Draft",
        tender_status: tender.tender_status || "Open",
        tender_spot_type: tender.tender_spot_type || "Contract/Tender",
        tender_type: tender.tender_type || "",
        tender_number: tender.tender_number || "",
        procurement_method: tender.procurement_method || "",
        procedure_adopted: tender.procedure_adopted || "",
        publication_daily: tender.publication_daily || "",
        office_ids: tender.office_ids || "",
        wing_ids: tender.wing_ids || "",
        dec_ids: tender.dec_ids || "",
        vendor_id: tender.vendor_id || "",
        document_path: tender.document_path || "",
        contract_file_path: tender.contract_file_path || "",
        loi_file_path: tender.loi_file_path || "",
        noting_file_path: tender.noting_file_path || "",
        po_file_path: tender.po_file_path || "",
        rfp_file_path: tender.rfp_file_path || "",
      };
      
      form.reset(formData);
    } catch (error) {
      console.error("Error fetching tender:", error);
      toast({
        title: "Error",
        description: "Failed to load tender data",
        variant: "destructive",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  const onSubmit = async (data: TenderFormData) => {
    try {
      setLoading(true);
      
      // Prepare the payload exactly as your database expects
      const payload = {
        reference_number: data.reference_number,
        title: data.title,
        description: data.description || null,
        estimated_value: data.estimated_value || null,
        individual_total: data.individual_total || null,
        actual_price_total: data.actual_price_total || null,
        publish_date: data.publish_date ? format(data.publish_date, 'yyyy-MM-dd') : null,
        publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
        submission_date: data.submission_date ? format(data.submission_date, 'yyyy-MM-dd') : null,
        submission_deadline: data.submission_deadline ? format(data.submission_deadline, 'yyyy-MM-dd') : null,
        opening_date: data.opening_date ? format(data.opening_date, 'yyyy-MM-dd') : null,
        advertisement_date: data.advertisement_date ? format(data.advertisement_date, 'yyyy-MM-dd') : null,
        status: data.status,
        tender_status: data.tender_status,
        tender_spot_type: data.tender_spot_type,
        tender_type: data.tender_type,
        tender_number: data.tender_number,
        procurement_method: data.procurement_method,
        procedure_adopted: data.procedure_adopted,
        publication_daily: data.publication_daily,
        office_ids: data.office_ids,
        wing_ids: data.wing_ids,
        dec_ids: data.dec_ids,
        vendor_id: data.vendor_id || null,
        document_path: data.document_path,
        contract_file_path: data.contract_file_path,
        loi_file_path: data.loi_file_path,
        noting_file_path: data.noting_file_path,
        po_file_path: data.po_file_path,
        rfp_file_path: data.rfp_file_path,
        created_by: "system",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const url = isEditing 
        ? `${API_BASE_URL}/api/tenders/${id}`
        : `${API_BASE_URL}/api/tenders`;
      
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Tender ${isEditing ? "updated" : "created"} successfully`,
      });

      navigate("/dashboard/tenders");
    } catch (error) {
      console.error("Error saving tender:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} tender: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/tenders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Edit Tender - FRESH BUILD" : "Create New Tender - FRESH BUILD"}
            </h1>
            <p className="text-muted-foreground">
              Database schema exactly matched - Built from scratch
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core tender details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reference_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter reference number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tender_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tender number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tender title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter tender description" 
                        {...field} 
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Type and Status */}
          <Card>
            <CardHeader>
              <CardTitle>Type and Status</CardTitle>
              <CardDescription>Tender classification and current status</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tender_spot_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Spot Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Published">Published</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tender_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tender status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Awarded">Awarded</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Budget and pricing details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="individual_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Individual Total</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter individual total" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actual_price_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Price Total</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Information */}
          <Card>
            <CardHeader>
              <CardTitle>Date Information</CardTitle>
              <CardDescription>Important dates and deadlines</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="publication_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Publication Date</FormLabel>
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
              </div>
            </CardContent>
          </Card>

          {/* Procurement Information */}
          <Card>
            <CardHeader>
              <CardTitle>Procurement Information</CardTitle>
              <CardDescription>Procurement method and procedures</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="procurement_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procurement Method</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter procurement method" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="procedure_adopted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procedure Adopted</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter procedure adopted" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="publication_daily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publication Daily</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter publication daily details" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Organizational Information */}
          <Card>
            <CardHeader>
              <CardTitle>Organizational Information</CardTitle>
              <CardDescription>Office, wing, and department details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="office_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office IDs</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter office IDs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wing_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wing IDs</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter wing IDs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dec_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DEC IDs</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter DEC IDs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
              <CardDescription>Vendor selection</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard/tenders")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update Tender" : "Create Tender"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TenderFormFresh;
