import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, AlertCircle, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import VendorCombobox from "@/components/common/VendorCombobox";
import VendorForm from "@/components/vendors/VendorForm";

const API_BASE_URL = "http://localhost:3001";

// Schema matching the actual database tenders table
const tenderFormSchema = z.object({
  reference_number: z.string().min(1, "Reference number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  estimated_value: z.coerce.number().min(0, "Estimated value must be positive"),
  status: z.string().min(1, "Status is required"),
  tender_status: z.string().min(1, "Tender status is required"),
  tender_spot_type: z.string().optional(),
  tender_type: z.string().optional(),
  tender_number: z.string().optional(),
  procurement_method: z.string().optional(),
  procedure_adopted: z.string().optional(),
  publication_daily: z.string().optional(),
  publish_date: z.date({ required_error: "Publish date is required" }),
  publication_date: z.date().optional(),
  advertisement_date: z.date().optional(),
  submission_date: z.date({ required_error: "Submission date is required" }),
  submission_deadline: z.date().optional(),
  opening_date: z.date({ required_error: "Opening date is required" }),
  vendor_id: z.string().optional(),
  office_ids: z.string().optional(),
  wing_ids: z.string().optional(),
  dec_ids: z.string().optional(),
  individual_total: z.string().optional(),
  actual_price_total: z.coerce.number().optional(),
  document_path: z.string().optional(),
  contract_file_path: z.string().optional(),
  loi_file_path: z.string().optional(),
  noting_file_path: z.string().optional(),
  po_file_path: z.string().optional(),
  rfp_file_path: z.string().optional(),
});

type TenderFormValues = z.infer<typeof tenderFormSchema>;

const TenderForm: React.FC = () => {
  console.log("🚀 TenderFormUpdated component loaded - UPDATED VERSION with database schema");
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  // Form setup with React Hook Form (matching database schema)
  const form = useForm<TenderFormValues>({
    resolver: zodResolver(tenderFormSchema),
    mode: "onBlur",
    defaultValues: {
      reference_number: "",
      title: "",
      description: "",
      estimated_value: 0,
      status: "Draft",
      tender_status: "Open",
      tender_spot_type: "Contract/Tender",
      tender_type: "",
      tender_number: "",
      procurement_method: "Open Competitive Bidding",
      procedure_adopted: "",
      publication_daily: "",
      publish_date: new Date(),
      publication_date: new Date(),
      advertisement_date: new Date(),
      submission_date: new Date(),
      submission_deadline: new Date(),
      opening_date: new Date(),
      vendor_id: "",
      office_ids: "",
      wing_ids: "",
      dec_ids: "",
      individual_total: "",
      actual_price_total: 0,
      document_path: "",
      contract_file_path: "",
      loi_file_path: "",
      noting_file_path: "",
      po_file_path: "",
      rfp_file_path: "",
    },
  });

  // Fetch tender data if editing
  useEffect(() => {
    if (isEditing && id) {
      fetchTender(id);
    }
  }, [id, isEditing]);

  const fetchTender = async (tenderId: string) => {
    try {
      setFetchLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders/${tenderId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch tender");
      }
      
      const tender = await response.json();
      
      // Map backend fields to form fields and ensure no null values
      const formData = {
        referenceNumber: tender.reference_number || "",
        title: tender.title || "",
        description: tender.description || "",
        estimatedValue: tender.estimated_value || 0,
        status: tender.status || "Draft",
        tender_status: tender.tender_status || "Open",
        tender_spot_type: tender.tender_spot_type || "Contract/Tender",
        procurementMethod: tender.procurement_method || "Open Competitive Bidding",
        publishDate: tender.publication_date ? new Date(tender.publication_date) : new Date(),
        submissionDate: tender.submission_date ? new Date(tender.submission_date) : new Date(),
        openingDate: tender.opening_date ? new Date(tender.opening_date) : new Date(),
        vendor_id: tender.vendor_id || "",
        vendor_name: tender.vendor_name || "",
        vendor_contact: tender.vendor_contact || "",
        vendor_email: tender.vendor_email || "",
        delivery_location: tender.delivery_location || "",
        payment_terms: tender.payment_terms || "",
        evaluation_criteria: tender.evaluation_criteria || "",
        bid_security_required: tender.bid_security_required || false,
        bid_security_amount: tender.bid_security_amount || 0,
        performance_guarantee_required: tender.performance_guarantee_required || false,
        performance_guarantee_percentage: tender.performance_guarantee_percentage || 0,
        contract_duration_months: tender.contract_duration_months || 0,
        special_conditions: tender.special_conditions || "",
        technical_specifications: tender.technical_specifications || "",
        eligibility_criteria: tender.eligibility_criteria || "",
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

  const handleSubmit = async (values: TenderFormValues) => {
    try {
      setLoading(true);
      
      // Map form fields to database field names
      const requestData = {
        reference_number: values.reference_number,
        title: values.title,
        description: values.description || "",
        estimated_value: values.estimated_value,
        status: values.status,
        tender_status: values.tender_status,
        tender_spot_type: values.tender_spot_type || "",
        tender_type: values.tender_type || "",
        tender_number: values.tender_number || "",
        procurement_method: values.procurement_method || "",
        procedure_adopted: values.procedure_adopted || "",
        publication_daily: values.publication_daily || "",
        publish_date: values.publish_date.toISOString().split('T')[0],
        publication_date: values.publication_date?.toISOString().split('T')[0] || null,
        advertisement_date: values.advertisement_date?.toISOString().split('T')[0] || null,
        submission_date: values.submission_date.toISOString().split('T')[0],
        submission_deadline: values.submission_deadline?.toISOString().split('T')[0] || null,
        opening_date: values.opening_date.toISOString().split('T')[0],
        vendor_id: values.vendor_id || null,
        office_ids: values.office_ids || "",
        wing_ids: values.wing_ids || "",
        dec_ids: values.dec_ids || "",
        individual_total: values.individual_total || "",
        actual_price_total: values.actual_price_total || 0,
        document_path: values.document_path || "",
        contract_file_path: values.contract_file_path || "",
        loi_file_path: values.loi_file_path || "",
        noting_file_path: values.noting_file_path || "",
        po_file_path: values.po_file_path || "",
        rfp_file_path: values.rfp_file_path || "",
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
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} tender`);
      }

      toast({
        title: "Success",
        description: `Tender ${isEditing ? 'updated' : 'created'} successfully`,
      });

      navigate("/dashboard/tenders");
      
    } catch (error) {
      console.error("Error saving tender:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} tender`,
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

  const watchedType = form.watch('tender_spot_type');
  const isSpotPurchase = watchedType === 'Spot Purchase';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard/tenders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Edit Tender (Updated Schema)" : "Create New Tender (Updated Schema)"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update tender information - Database Schema Matched" : "Fill in the details to create a new tender - Database Schema Matched"}
            </p>
          </div>
        </div>
        {isEditing && form.watch('status') && (
          <Badge variant={form.watch('status') === "Finalized" ? "destructive" : "default"}>
            {form.watch('status')}
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Tender Type Selection - Matching original styling */}
          <Card>
            <CardHeader>
              <CardTitle>Tender Type</CardTitle>
              <CardDescription>Select the type for this tender</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="tender_spot_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
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
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
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
                        <Input {...field} placeholder="Enter reference number" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Published">Published</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Finalized">Finalized</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Input {...field} placeholder="Enter tender title" disabled={loading} />
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
                      <Textarea {...field} placeholder="Enter tender description" rows={4} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        placeholder="0.00"
                        step="0.01"
                        disabled={loading}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tender Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tender Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="procurement_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procurement Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open Competitive Bidding">Open Competitive Bidding</SelectItem>
                          <SelectItem value="Limited Competitive Bidding">Limited Competitive Bidding</SelectItem>
                          <SelectItem value="Direct Contracting">Direct Contracting</SelectItem>
                          <SelectItem value="Shopping">Shopping</SelectItem>
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
                      <FormLabel>Tender Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Evaluated">Evaluated</SelectItem>
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

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="publish_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submission_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="opening_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vendor Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Selection</CardTitle>
              <CardDescription>Select the vendor for this tender</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <VendorCombobox
                          value={field.value}
                          onValueChange={(vendorId: string) => {
                            field.onChange(vendorId);
                          }}
                          disabled={loading}
                          placeholder="Select vendor..."
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-1"
                        title="Add New Vendor"
                        onClick={() => setVendorDialogOpen(true)}
                        disabled={loading}
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                    {form.watch('vendor_id') && form.watch('vendor_name') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Selected: <span className="font-semibold">{form.watch('vendor_id')}</span> - {form.watch('vendor_name')}
                      </div>
                    )}
                    <FormMessage />
                    
                    {/* Vendor Add Dialog */}
                    <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add New Vendor</DialogTitle>
                        </DialogHeader>
                        <VendorForm
                          onSubmit={async (vendorData) => {
                            // Handle vendor creation
                            console.log('New vendor:', vendorData);
                            setVendorDialogOpen(false);
                            toast({
                              title: "Success",
                              description: "Vendor added successfully",
                            });
                          }}
                          onCancel={() => setVendorDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter payment terms" rows={3} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evaluation_criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evaluation Criteria</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter evaluation criteria" rows={3} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technical_specifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technical Specifications</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter technical specifications" rows={3} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eligibility_criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eligibility Criteria</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter eligibility criteria" rows={3} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

export default TenderForm;
