import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Dashboard Components
import InventoryManagementDashboard from '@/components/dashboard/InventoryManagementDashboard';

// Vendor Components
import VendorManagement from '@/components/vendors/VendorManagement';
import VendorForm from '@/components/vendors/VendorForm';

// Category Components  
import CategoryManagement from '@/components/categories/CategoryManagement';

// Item Master Components
import ItemMasterManagement from '@/components/itemMasters/ItemMasterManagement';

// Tender Components
import TenderManagement from '@/components/tenders/TenderManagement';
import TenderForm from '@/components/tenders/TenderFormUpdated';
import TenderViewDialog from '@/components/tenders/TenderViewDialog';

// Stock Transaction Components
import TransactionManager from '@/components/stockTransactions/TransactionManager';
import StockTransactionDashboard from '@/components/stockTransactions/StockTransactionDashboard';

// Delivery Components
import DeliveryManagement from '@/components/deliveries/DeliveryManagement';
import DeliveryForm from '@/components/deliveries/DeliveryForm';

// Inventory Components
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import CurrentInventoryStock from '@/components/inventory/CurrentInventoryStock';

// Reports Components
import ReportsModule from '@/components/reports/ReportsModule';

// Settings Components
import SystemSettings from '@/components/settings/SystemSettings';

// Error Components
import NotFound from '@/components/common/NotFound';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Main Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<InventoryManagementDashboard />} />

        {/* Vendor Management Routes */}
        <Route path="/vendors" element={<VendorManagement />} />
        <Route path="/vendors/new" element={<VendorForm />} />
        <Route path="/vendors/:id/edit" element={<VendorForm />} />

        {/* Category Management Routes */}
        <Route path="/categories" element={<CategoryManagement />} />

        {/* Item Master Management Routes */}
        <Route path="/item-masters" element={<ItemMasterManagement />} />

        {/* Tender Management Routes */}
        <Route path="/tenders" element={<TenderManagement />} />
        <Route path="/tenders/new" element={<TenderForm />} />
        <Route path="/tenders/:id/edit" element={<TenderForm />} />
        <Route path="/tenders/:id/view" element={<TenderViewDialog />} />

        {/* Stock Transaction Routes */}
        <Route path="/stock-transactions" element={<StockTransactionDashboard />} />
        <Route path="/stock-transactions/manager" element={<TransactionManager />} />
        
        {/* Stock Acquisition Dashboard - Legacy Route */}
        <Route path="/dashboard/stock-acquisition-dashboard" element={<Navigate to="/stock-transactions" replace />} />
        <Route path="/dashboard/transaction-manager" element={<TransactionManager />} />

        {/* Delivery Management Routes */}
        <Route path="/deliveries" element={<DeliveryManagement />} />
        <Route path="/deliveries/new" element={<DeliveryForm />} />
        <Route path="/deliveries/:id/edit" element={<DeliveryForm />} />

        {/* Inventory Management Routes */}
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/inventory/current-stock" element={<CurrentInventoryStock />} />

        {/* Reports Routes */}
        <Route path="/reports" element={<ReportsModule />} />
        <Route path="/reports/tenders" element={<ReportsModule tab="tenders" />} />
        <Route path="/reports/inventory" element={<ReportsModule tab="inventory" />} />
        <Route path="/reports/vendors" element={<ReportsModule tab="vendors" />} />
        <Route path="/reports/deliveries" element={<ReportsModule tab="deliveries" />} />

        {/* Settings Routes */}
        <Route path="/settings" element={<SystemSettings />} />

        {/* Specialized Workflows */}
        <Route path="/workflows">
          <Route path="tender-to-stock" element={<TransactionManager />} />
          <Route path="stock-to-delivery" element={<DeliveryForm />} />
          <Route path="inventory-tracking" element={<InventoryDashboard />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin">
          <Route path="system-health" element={<SystemSettings tab="health" />} />
          <Route path="data-management" element={<SystemSettings tab="data" />} />
          <Route path="user-management" element={<SystemSettings tab="users" />} />
        </Route>

        {/* API Testing Routes (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Route path="/api-test">
            <Route path="vendors" element={<div>Vendor API Test</div>} />
            <Route path="tenders" element={<div>Tender API Test</div>} />
            <Route path="stock-transactions" element={<div>Stock Transaction API Test</div>} />
            <Route path="deliveries" element={<div>Delivery API Test</div>} />
          </Route>
        )}

        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default AppRoutes;
