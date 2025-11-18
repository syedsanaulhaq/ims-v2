// Local inventory service for SQL Server backend
import { getApiBaseUrl } from './invmisApi';

const getBaseUrl = () => getApiBaseUrl();

export interface InventoryItem {
  intOfficeID: string;
  intItemMasterID: string;
  intVendorID?: string;
  intStoreID?: string;
  intCurrentStock: number;
  intMinimumLevel: number;
  intMaximumLevel: number;
  intReorderLevel: number;
  intReorderQuantity: number;
  fltUnitPrice: number;
  fltTotalValue: number;
  dtLastUpdated: string;
  strStockLocation?: string;
  strBatchNumber?: string;
  dtExpiryDate?: string;
  strSerialNumbers?: string;
  strRemarks?: string;
  boolActive: boolean;
  boolDeleted: boolean;
  // Related data
  item_masters?: {
    id: string;
    nomenclature: string;
    unit: string;
    categories?: { id: string; category_name: string };
    sub_categories?: { id: string; sub_category_name: string };
  };
  stores?: { id: string; store_name: string };
  vendors?: { id: string; vendor_name: string };
}

export interface CreateInventoryItem {
  intOfficeID: string;
  intItemMasterID: string;
  intVendorID?: string;
  intStoreID?: string;
  intCurrentStock: number;
  intMinimumLevel: number;
  intMaximumLevel: number;
  intReorderLevel: number;
  intReorderQuantity: number;
  fltUnitPrice: number;
  fltTotalValue: number;
  strStockLocation?: string;
  strBatchNumber?: string;
  dtExpiryDate?: string;
  strSerialNumbers?: string;
  strRemarks?: string;
}

export interface UpdateInventoryItem extends Partial<CreateInventoryItem> {}

export const inventoryLocalService = {
  async getAll(): Promise<InventoryItem[]> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock`);
    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<InventoryItem> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch inventory item: ${response.statusText}`);
    }
    return response.json();
  },

  async getByOffice(officeId: string): Promise<InventoryItem[]> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock?officeId=${officeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch office inventory: ${response.statusText}`);
    }
    return response.json();
  },

  async create(item: CreateInventoryItem): Promise<InventoryItem> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create inventory item: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async update(id: string, item: UpdateInventoryItem): Promise<InventoryItem> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update inventory item: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  async remove(id: string): Promise<boolean> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete inventory item: ${errorData.error || response.statusText}`);
    }
    
    return true;
  },

  async addTransaction(id: string, transaction: {
    transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    reference_type?: string;
    reference_id?: string;
    remarks?: string;
  }): Promise<any> {
    const response = await fetch(`${getBaseUrl()}/inventory-stock/${id}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to add inventory transaction: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  },

  // Legacy compatibility methods for existing code
  async getOffices(): Promise<any[]> {
    const response = await fetch(`${getBaseUrl()}/offices`);
    if (!response.ok) {
      throw new Error(`Failed to fetch offices: ${response.statusText}`);
    }
    return response.json();
  },
};
