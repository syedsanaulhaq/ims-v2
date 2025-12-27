/**
 * STOCK ISSUANCE SERVICE
 * 
 * Service for stock issuance operations with SQL Server backend
 */

import { getApiBaseUrl } from './invmisApi';

export interface StockIssuanceRequest {
  request_number?: string; // Auto-generated on server side
  request_type: 'Individual' | 'Organizational';
  requester_office_id: number;
  requester_wing_id: number;
  requester_branch_id?: string;
  requester_user_id?: string;
  purpose: string;
  urgency_level: 'Low' | 'Normal' | 'High' | 'Critical';
  justification?: string;
  expected_return_date?: string;
  is_returnable: boolean;
  request_status?: string;
  items?: StockIssuanceItem[];
}

export interface StockIssuanceItem {
  item_master_id?: string;
  nomenclature: string;
  requested_quantity: number;
  unit_price?: number;
  item_type: 'inventory' | 'custom';
  custom_item_name?: string;
}

export interface StockIssuanceFilters {
  status?: string;
  office_id?: number;
  date_from?: string;
  date_to?: string;
  urgency_level?: string;
  request_type?: string;
}

class StockIssuanceService {
  private baseUrl = `${getApiBaseUrl()}/stock-issuance`;

  async submitRequest(request: StockIssuanceRequest): Promise<{ id: string; request_number: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Stock issuance request submitted: ${result.data?.request_number || 'Unknown'}`);
      console.log('🔍 Full API response:', result);
      console.log('🔍 Response data:', result.data);
      console.log('🔍 Response data id:', result.data?.id);
      return result.data || result;
    } catch (error) {
      console.error('❌ Error submitting stock issuance request:', error);
      throw error;
    }
  }

  async submitItems(requestId: string, items: StockIssuanceItem[]): Promise<{ success: boolean; items_count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          items: items,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Stock issuance items submitted: ${result.items_count} items`);
      return result;
    } catch (error) {
      console.error('❌ Error submitting stock issuance items:', error);
      throw error;
    }
  }

  async getRequests(filters?: StockIssuanceFilters, pagination?: { page: number; limit: number }): Promise<{ 
    data: any[]; 
    totalPages?: number; 
    totalCount?: number;
    pendingCount?: number;
    approvedCount?: number;
    issuedCount?: number;
  }> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.office_id) queryParams.append('office_id', filters.office_id.toString());
      if (filters?.date_from) queryParams.append('date_from', filters.date_from);
      if (filters?.date_to) queryParams.append('date_to', filters.date_to);
      
      if (pagination?.page) queryParams.append('page', pagination.page.toString());
      if (pagination?.limit) queryParams.append('limit', pagination.limit.toString());
      
      const url = `${this.baseUrl}/requests${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('🔗 Fetching stock issuance requests from:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📦 Full API Response:', result);
      console.log(`✅ Retrieved ${result.data?.length || 0} stock issuance requests from SQL Server`);
      
      // Extract data from the new API response structure with summary
      const summary = result.summary || {};
      return {
        data: result.data || [],
        totalPages: result.pagination?.totalPages || 1,
        totalCount: summary.totalCount || 0,
        pendingCount: summary.pendingCount || 0,
        approvedCount: summary.approvedCount || 0,
        issuedCount: summary.issuedCount || 0
      };
    } catch (error) {
      console.error('❌ Error fetching stock issuance requests:', error);
      throw error;
    }
  }

  async getIssuedItems(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/issued-items`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.data?.length || 0} issued items from SQL Server`);
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching issued items:', error);
      throw error;
    }
  }

  // Get approved requests for processing
  async getApprovedRequests(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/requests?status=Approved`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.data?.length || 0} approved requests from SQL Server`);
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching approved requests:', error);
      throw error;
    }
  }

  async createRequest(request: StockIssuanceRequest): Promise<{ data: any; error: any }> {
    try {
      const result = await this.submitRequest(request);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getDashboardStats(): Promise<{ data: any; error: any }> {
    try {
      // Get the stats from the main requests endpoint
      const response = await this.getRequests();
      return {
        data: {
          totalRequests: response.totalCount || 0,
          pendingRequests: response.pendingCount || 0,
          approvedRequests: response.approvedCount || 0,
          issuedRequests: response.issuedCount || 0
        },
        error: null
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        data: {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          issuedRequests: 0
        },
        error: error
      };
    }
  }

  generateRequestNumber(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000);
    
    return `ISS-${year}${month}${day}-${random}`;
  }
}

export default new StockIssuanceService();
export const stockIssuanceService = new StockIssuanceService();
