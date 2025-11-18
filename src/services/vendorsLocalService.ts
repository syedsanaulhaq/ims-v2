import { ApiResponse } from './api';
import { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../types/vendor';
import { getApiBaseUrl } from './invmisApi';


const getBaseUrl = () => getApiBaseUrl();
// Local SQL Server vendor service
export const vendorsLocalService = {
  // Get all vendors
  getVendors: async (): Promise<ApiResponse<Vendor[]>> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/vendors`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Vendors fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      return {
        success: false,
        data: [] as Vendor[],
        message: error.message || 'Failed to fetch vendors'
      };
    }
  },

  // Get single vendor by ID
  getVendor: async (id: string): Promise<ApiResponse<Vendor>> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/vendors/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Vendor fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching vendor:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch vendor'
      };
    }
  },

  // Create vendor
  createVendor: async (vendor: CreateVendorRequest): Promise<ApiResponse<Vendor>> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendor),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Vendor created successfully'
      };
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to create vendor'
      };
    }
  },

  // Update vendor
  updateVendor: async (id: string, vendor: UpdateVendorRequest): Promise<ApiResponse<Vendor>> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/vendors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendor),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Vendor updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update vendor'
      };
    }
  },

  // Delete vendor
  deleteVendor: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/vendors/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true,
        message: 'Vendor deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      return {
        success: false,
        data: false,
        message: error.message || 'Failed to delete vendor'
      };
    }
  },
};
