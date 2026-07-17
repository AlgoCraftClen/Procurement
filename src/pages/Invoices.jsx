
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Invoice } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { PurchaseOrder } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Receipt, DollarSign, Clock, CheckCircle, AlertCircle, Search, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Import broken down components
import InvoiceStats from "../components/invoices/InvoiceStats";
import InvoiceTable from "../components/invoices/InvoiceTable";
import Pagination from "../components/shared/Pagination";
import InvoiceFormModal from "../components/invoices/InvoiceFormModal";
import InvoiceDetailModal from "../components/invoices/InvoiceDetailModal";
import { useInvoiceData } from "../components/invoices/useInvoiceData";
import { updateBudgetOnInvoice } from "@/api/functions";

const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-800", icon: Clock },
  received: { label: "Received", color: "bg-blue-100 text-blue-800", icon: Receipt },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: DollarSign },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: Clock },
  disputed: { label: "Disputed", color: "bg-orange-100 text-orange-800", icon: AlertCircle }
};

export default function InvoicesPage() {
  // State management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    supplier: 'all',
    dateRange: 'all'
  });

  const ITEMS_PER_PAGE = 10;

  // Custom hook for data management
  const {
    invoices,
    setInvoices,
    suppliers,
    purchaseOrders,
    loading,
    error,
    refreshData, // refreshData is used for budget update side effects
    updateInvoice,
    createInvoice,
    deleteInvoice
  } = useInvoiceData();

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const fromPOId = searchParams.get("fromPO");

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...invoices];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchLower) ||
        (suppliers.find(s => s.id === invoice.supplier_id)?.company_name.toLowerCase().includes(searchLower)) ||
        (invoice.notes && invoice.notes.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.status);
    }

    // Supplier filter
    if (filters.supplier !== 'all') {
      filtered = filtered.filter(invoice => invoice.supplier_id === filters.supplier);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let dateThreshold;
      
      switch (filters.dateRange) {
        case 'last_week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_quarter':
          dateThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = null;
      }
      
      if (dateThreshold) {
        filtered = filtered.filter(invoice => 
          invoice.invoice_date && new Date(invoice.invoice_date) >= dateThreshold
        );
      }
    }

    setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [invoices, filters, suppliers]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      supplier: 'all',
      dateRange: 'all'
    });
  };

  // Handle pre-filling from PO
  useEffect(() => {
    if (fromPOId && purchaseOrders.length > 0) {
      const po = purchaseOrders.find(p => p.id === fromPOId);
      if (po) {
        setSelectedInvoice({
          purchase_order_id: po.id,
          supplier_id: po.supplier_id,
          total_amount: po.total_amount,
          line_items: po.line_items,
          due_date: new Date(new Date(po.order_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setIsFormOpen(true);
      }
    }
  }, [fromPOId, purchaseOrders]);

  // Event handlers with proper state management
  const handleNew = useCallback(() => {
    setSelectedInvoice(null);
    setIsDetailModalOpen(false);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((invoice) => {
    if (!invoice) return;
    setSelectedInvoice({ ...invoice });
    setIsDetailModalOpen(false);
    setIsFormOpen(true);
  }, []);

  const handleViewDetails = useCallback((invoice) => {
    if (!invoice) return;
    setViewingInvoice({ ...invoice });
    setIsFormOpen(false);
    setIsDetailModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (invoice) => {
    try {
      // Capture status before deletion for budget adjustment
      const oldStatus = invoice.status;

      // IMPORTANT: Update budget BEFORE deleting the invoice so the invoice data is still available
      try {
        await updateBudgetOnInvoice({ 
          invoiceId: invoice.id, 
          oldStatus: oldStatus, 
          newStatus: "deleted" 
        });
      } catch (budgetError) {
        console.error("Failed to update budget before invoice deletion:", budgetError);
        // We can choose to either continue with deletion or abort here
        // For now, we'll continue but warn the user
        console.warn("Budget update failed, but proceeding with invoice deletion");
      }

      // Now delete the invoice
      await deleteInvoice(invoice.id);
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      
      if (viewingInvoice?.id === invoice.id) {
        setIsDetailModalOpen(false);
        setViewingInvoice(null);
      }

      // Refresh data after successful deletion
      refreshData();

    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice. Please try again.");
    }
  }, [deleteInvoice, setInvoices, viewingInvoice, refreshData]);

  const handleFormSubmit = useCallback(async (data) => {
    try {
      let savedInvoice;
      // Capture original status for existing invoice to compare later
      const originalStatus = selectedInvoice?.status; 

      if (selectedInvoice?.id) {
        // Existing invoice: update
        savedInvoice = await updateInvoice(selectedInvoice.id, data);
        setInvoices(prev => prev.map(inv => inv.id === savedInvoice.id ? savedInvoice : inv));
      } else {
        // New invoice: create
        savedInvoice = await createInvoice({
          ...data,
          invoice_number: data.invoice_number || `INV-${Date.now()}`
        });
        setInvoices(prev => [savedInvoice, ...prev]);
      }
      
      // Trigger budget update logic
      // For an existing invoice, update budget if status changed
      // For a new invoice, update budget based on its initial status
      const statusChanged = selectedInvoice?.id ? (originalStatus !== savedInvoice.status) : true;

      if (savedInvoice && statusChanged) {
        try {
          await updateBudgetOnInvoice({ 
            invoiceId: savedInvoice.id, 
            oldStatus: selectedInvoice?.id ? originalStatus : null, // oldStatus is null for new invoices
            newStatus: savedInvoice.status 
          });
          // Refresh all data after budget update to ensure consistency
          refreshData(); 
        } catch (budgetError) {
          console.error("Failed to update budget:", budgetError);
          alert("Invoice saved, but failed to update budget. Please check logs.");
        }
      }
      
      setIsFormOpen(false);
      setSelectedInvoice(null);

    } catch (error) {
      console.error("Error saving invoice:", error);
      // Re-throw to allow form modal to handle error feedback
      throw error;
    }
  }, [selectedInvoice, updateInvoice, createInvoice, setInvoices, refreshData]); // Added refreshData to dependency array

  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setSelectedInvoice(null);
  }, []);

  const handleDetailModalClose = useCallback(() => {
    setIsDetailModalOpen(false);
    setViewingInvoice(null);
  }, []);

  // Pagination
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle /> Error Loading Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={refreshData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoice Management</h1>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Invoice
        </Button>
      </div>

      <InvoiceStats invoices={invoices} />

      {/* Filters */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-medium text-slate-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search invoices..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          <Select 
            value={filters.status} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={filters.supplier} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, supplier: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>{supplier.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={filters.dateRange} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
        {(filters.search || filters.status !== 'all' || filters.supplier !== 'all' || filters.dateRange !== 'all') && (
          <div className="mt-2 text-sm text-slate-600">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceTable
            invoices={paginatedInvoices}
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            loading={loading}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredInvoices.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
      
      <InvoiceFormModal
        isOpen={isFormOpen}
        invoice={selectedInvoice}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
      
      <InvoiceDetailModal
        invoice={viewingInvoice}
        isOpen={isDetailModalOpen}
        onClose={handleDetailModalClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
}
