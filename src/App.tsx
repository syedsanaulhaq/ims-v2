import { Toaster } from "@/components/ui/sonner";import InitialSetupPageFresh from './pages/InitialSetupPageFresh';import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SessionProvider } from "@/contexts/SessionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import UserDashboard from "@/pages/UserDashboard";
import ApprovalManager from "@/pages/ApprovalManager";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Categories from "./pages/Categories";
import Offices from "./pages/Offices";
import Reports from "./pages/Reports";
import StockTransactions from "./pages/StockTransactions";
import StockIssuances from "./pages/StockIssuances";
import ContractTender from "./pages/ContractTender";
import CreateTender from "./pages/CreateTender";
import TenderFormFresh2 from './components/tenders/TenderFormFresh2';

import ItemMaster from "./pages/ItemMaster";
import VendorInfo from "./pages/VendorInfo";
import NotFound from "./pages/NotFound";
import TenderReport from "./pages/TenderReport";
import InventoryReportPage from "./pages/InventoryReportPage";
import StockAcquisitionReport from "./pages/StockAcquisitionReport";
import DeliveryReport from "./pages/DeliveryReport";
import InventoryDashboard from "./pages/InventoryDashboard";
import InventorySettings from "./pages/InventorySettings";
import StockIssuance from "./pages/StockIssuance";
import StockReturn from "./pages/StockReturn";
import ApprovalManagement from "./pages/ApprovalManagement";
import StockIssuanceProcessing from "./pages/StockIssuanceProcessing";
import { StockIssuanceDashboard } from "./pages/StockIssuanceDashboard";
import ExpandableReceivingForm from "./pages/ExpandableReceivingForm";
import IntegratedStockAcquisition from "./pages/IntegratedStockAcquisition";
import StockTransactionList from "./pages/StockTransactionList";
import TransactionManager from "./components/stockTransactions/TransactionManager";
import StockAcquisitionDashboard from "./components/stockTransactions/StockAcquisitionDashboard";
import AllInventoryItemsPage from "./pages/AllInventoryItemsPage";
import StockQuantitiesPage from "./pages/StockQuantitiesPage";
import InventoryAlertsPage from "./pages/InventoryAlertsPage";
import InventoryDetails from "./pages/InventoryDetails";
import StockOperations from "./pages/StockOperations";
import ProcurementDetails from "./pages/ProcurementDetails";
import NotificationsPage from "./pages/NotificationsPage";
import InitialSetupPage from "./pages/InitialSetupPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <SessionProvider>
            <TooltipProvider>
              <Toaster />
              <ShadcnToaster />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/user-dashboard" element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="initial-setup" element={<InitialSetupPageFresh />} />
                  <Route path="inventory-details" element={<InventoryDetails />} />
                  <Route path="stock-operations" element={<StockOperations />} />
                  <Route path="procurement-details" element={<ProcurementDetails />} />
                  <Route path="inventory-dashboard" element={<InventoryDashboard />} />
                  <Route path="inventory-all-items" element={<AllInventoryItemsPage />} />
                  <Route path="inventory-stock-quantities" element={<StockQuantitiesPage />} />
                  <Route path="inventory-alerts" element={<InventoryAlertsPage />} />
                  <Route path="inventory-settings" element={<InventorySettings />} />
                  <Route path="stock-issuance" element={<StockIssuance />} />
                  <Route path="stock-issuance-dashboard" element={<StockIssuanceDashboard />} />
                  <Route path="stock-return" element={<StockReturn />} />
                  <Route path="approval-management" element={<ApprovalManagement />} />
                  <Route path="stock-issuance-processing" element={<StockIssuanceProcessing />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="vendors" element={<VendorInfo />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="stock-transactions" element={<StockTransactions />} />
                  <Route path="stock-acquisition-dashboard" element={<StockAcquisitionDashboard />} />
                  <Route path="stock-transaction-list" element={<StockTransactionList />} />
                  <Route path="transaction-manager" element={<TransactionManager />} />
                  <Route path="transaction-manager/:tenderId" element={<TransactionManager />} />
                  <Route path="issuances" element={<StockIssuances />} />
                  <Route path="contract-tender" element={<ContractTender />} />
                  <Route path="create-tender" element={<CreateTender />} />
                  <Route path="spot-purchases" element={<ContractTender initialType="Spot Purchase" />} />
                  <Route path="tenders" element={<ContractTender />} />
                  <Route path="tenders/new" element={<TenderFormFresh2 />} />
                  <Route path="tenders/:id/edit" element={<TenderFormFresh2 />} />
                  <Route path="tenders/:id/report" element={<TenderReport />} />
                  <Route path="tenders/:id/stock-acquisition" element={<IntegratedStockAcquisition />} />
                  <Route path="stock-acquisition/:id/report" element={<StockAcquisitionReport />} />
                  <Route path="tenders/:tenderId/expandable-receiving" element={<ExpandableReceivingForm />} />
                  <Route path="delivery-report/:id" element={<DeliveryReport />} />
                  <Route path="inventory/:id/report" element={<InventoryReportPage />} />
                  <Route path="item-master" element={<ItemMaster />} />
                </Route>

                {/* Approval Manager - Protected */}
                <Route path="/approval-manager" element={
                  <ProtectedRoute>
                    <ApprovalManager />
                  </ProtectedRoute>
                } />

                {/* Stock Acquisition - Protected */}
                <Route path="/stock-acquisition" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="contract-tender" element={<ContractTender />} />
                  <Route path="spot-purchases" element={<ContractTender initialType="Spot Purchase" />} />
                  <Route path="dashboard" element={<StockAcquisitionDashboard />} />
                </Route>

                {/* Stock Issuance - Protected */}
                <Route path="/stock-issuance" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<StockIssuance />} />
                  <Route path="dashboard" element={<StockIssuanceDashboard />} />
                  <Route path="processing" element={<StockIssuanceProcessing />} />
                  <Route path="approval-management" element={<ApprovalManagement />} />
                </Route>

                {/* Reports - Protected */}
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<Reports />} />
                  <Route path="inventory" element={<InventoryReportPage />} />
                  <Route path="stock-acquisition" element={<StockAcquisitionReport />} />
                </Route>

                {/* Settings - Admin Only */}
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Layout><Outlet /></Layout>
                  </ProtectedRoute>
                }>
                  <Route index element={<InventorySettings />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="vendors" element={<VendorInfo />} />
                  <Route path="item-master" element={<ItemMaster />} />
                </Route>

                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SessionProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
}

export default App;
