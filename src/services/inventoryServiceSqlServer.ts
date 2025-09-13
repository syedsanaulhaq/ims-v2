// SQL Server Inventory Service - Replaces Supabase service
export interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderLevel?: number;
  unit: string;
  location: string;
  category: string;
  subCategory?: string;
  lastUpdated: string;
  status: string;
}

export interface InventoryStats {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  normalStockItems: number;
  overstockItems: number;
}

export class InventoryService {
  private static baseUrl = 'http://localhost:3001/api';

  /**
   * Fetch inventory data from SQL Server backend
   */
  static async getInventoryData(): Promise<{ data: InventoryItem[]; stats: InventoryStats }> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/dashboard`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch inventory data');
      }

      return {
        data: result.data?.items || [],
        stats: result.data?.stats || {
          totalItems: 0,
          totalStockValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          normalStockItems: 0,
          overstockItems: 0
        }
      };
    } catch (error) {
      console.error('❌ Error fetching inventory data:', error);
      
      // Return fallback data
      return {
        data: [],
        stats: {
          totalItems: 0,
          totalStockValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          normalStockItems: 0,
          overstockItems: 0
        }
      };
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/low-stock`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('❌ Error fetching low stock items:', error);
      return [];
    }
  }

  /**
   * Get items needing reorder
   */
  static async getReorderItems(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/reorder`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('❌ Error fetching reorder items:', error);
      return [];
    }
  }

  /**
   * Get top items by stock quantity
   */
  static async getTopItems(limit: number = 10): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/inventory/top-items?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('❌ Error fetching top items:', error);
      return [];
    }
  }
}
