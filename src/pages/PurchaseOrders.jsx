
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PurchaseOrder } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Loader2, AlertCircle, Search, Filter, X } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Pagination from "../components/shared/Pagination";
import PurchaseOrderDetailModal from "../components/purchase_orders/PurchaseOrderDetailModal";
import { updateBudgetOnPO } from "@/api/functions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800 border-slate-200" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800 border-blue-200" },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
  partially_received: { label: "Partially Received", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
};

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredPOs, setFilteredPOs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState({ poId: null, fromRfqId: null, winningResponseId: null });

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    supplier: 'all',
    dateRange: 'all'
  });

  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();
  const location = useLocation();

  // Handle opening modal from URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    const fromRFQ = searchParams.get('fromRFQ');
    const winningResponseId = searchParams.get('winningResponseId');

    if (action === 'create_po' && fromRFQ && winningResponseId) {
      setModalState({ poId: null, fromRfqId: fromRFQ, winningResponseId: winningResponseId });
      setIsModalOpen(true);
      // Clean up URL to prevent re-triggering
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Modified: loadData with server-side sorting only (pagination handled by filters)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [posData, suppliersData] = await Promise.all([
        PurchaseOrder.list("-created_date"), // Sorted by most recent first
        Supplier.list()
      ]);
      
      setPurchaseOrders(posData || []);
      setSuppliers(suppliersData || []);
    } catch (err) {
      console.error("Error loading purchase orders:", err);
      setError("Failed to load purchase orders. Please check the console and try again.");
      setPurchaseOrders([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSupplierName = useCallback((supplierId) => {
    if (!suppliers || !supplierId) return 'Unknown Supplier';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.company_name : 'Unknown Supplier';
  }, [suppliers]);

  const applyFilters = useCallback(() => {
    let filtered = [...purchaseOrders];

    // Search filter (by PO number or supplier name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(po => {
        const supplierName = getSupplierName(po.supplier_id)?.toLowerCase() || '';
        return (po.po_number && po.po_number.toLowerCase().includes(searchLower)) ||
               supplierName.includes(searchLower);
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(po => po.status === filters.status);
    }

    // Supplier filter
    if (filters.supplier !== 'all') {
      filtered = filtered.filter(po => po.supplier_id === filters.supplier);
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
        case 'last_quarter': // 3 months
          dateThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = null;
      }
      if (dateThreshold) {
        filtered = filtered.filter(po => po.order_date && parseISO(po.order_date) >= dateThreshold);
      }
    }

    setFilteredPOs(filtered);
    setCurrentPage(1); // Reset page to 1 whenever filters change
  }, [purchaseOrders, filters, getSupplierName]);

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

  const handleOpenModalForCreate = () => {
    setModalState({ poId: null, fromRfqId: null, winningResponseId: null });
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (po) => {
    setModalState({ poId: po.id, fromRfqId: null, winningResponseId: null });
    setIsModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setIsModalOpen(false);
    loadData(); // Refresh the list
  };

  const handleChangeStatus = async (po, newStatus) => {
    const oldStatus = po.status;
    await PurchaseOrder.update(po.id, { status: newStatus });
    // Trigger budget update
    try {
      await updateBudgetOnPO({ poId: po.id, oldStatus, newStatus });
    } catch (budgetError) {
      console.error("Failed to update budget:", budgetError);
      // Optionally show an error to the user
    }
    loadData();
  };

  const handleDelete = async (po) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Purchase Order ${po.po_number || 'N/A'}?\n\n` +
      `Supplier: ${getSupplierName(po.supplier_id)}\n` +
      `Amount: ${formatCurrency(po.total_amount)}\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      setLoading(true); // Show loading indicator
      
      // Update budget BEFORE deleting (only if PO affects budget)
      if (['sent', 'confirmed', 'partially_received'].includes(po.status)) {
        try {
          // Add timeout to prevent hanging
          const budgetUpdatePromise = updateBudgetOnPO({ 
            poId: po.id, 
            oldStatus: po.status, 
            newStatus: 'cancelled'
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Budget update timed out after 10 seconds')), 10000) // 10 second timeout
          );
          
          await Promise.race([budgetUpdatePromise, timeoutPromise]);
          console.log("Budget updated successfully before deletion");
        } catch (budgetError) {
          console.error("Budget update failed:", budgetError);
          // Ask user if they want to continue despite budget update failure
          const continueAnyway = window.confirm(
            `Warning: Failed to update budget for this Purchase Order (${budgetError.message || 'Unknown error'}).\n\n` +
            `Do you still want to delete this Purchase Order?\n` +
            `You may need to manually adjust the budget.`
          );
          
          if (!continueAnyway) {
            setLoading(false);
            return;
          }
        }
      }

      // Delete the PO
      await PurchaseOrder.delete(po.id);
      console.log("Purchase Order deleted successfully");
      
      await loadData(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete Purchase Order:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      alert(`Failed to delete Purchase Order: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "MMM d, yyyy") : 'Invalid Date';
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) {
      return '$0.00';
    }
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPOs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPOs, currentPage, ITEMS_PER_PAGE]);

  const totalPages = Math.ceil(filteredPOs.length / ITEMS_PER_PAGE);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle /> An Error Occurred
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Restructured to wrap everything inside a single Card component as per outline */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Purchase Orders</CardTitle>
              <CardDescription>Manage and track all company purchase orders.</CardDescription>
            </div>
            <Button onClick={handleOpenModalForCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>
        </CardHeader>

        {/* Filters - Moved inside the main Card, after CardHeader and before CardContent */}
        {/* Added mx-6 for horizontal padding to align with CardContent */}
        <div className="mb-6 mx-6 p-4 bg-slate-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <h3 className="font-medium text-slate-700">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by PO number or supplier..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.supplier} onValueChange={(value) => setFilters(prev => ({ ...prev, supplier: value }))}>
              <SelectTrigger><SelectValue placeholder="All Suppliers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger><SelectValue placeholder="All Dates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="last_week">Last 7 Days</SelectItem>
                <SelectItem value="last_month">Last 30 Days</SelectItem>
                <SelectItem value="last_quarter">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}><X className="w-4 h-4 mr-2" />Clear</Button>
          </div>
          {(filters.search || filters.status !== 'all' || filters.supplier !== 'all' || filters.dateRange !== 'all') && (
            <div className="mt-2 text-sm text-slate-600">
              Showing {filteredPOs.length} of {purchaseOrders.length} purchase orders
            </div>
          )}
        </div>

        <CardContent>
          <div className="border border-slate-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : paginatedPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-slate-500">
                      {filteredPOs.length === 0 && purchaseOrders.length > 0 ?
                        "No purchase orders match the current filters." :
                        "No Purchase Orders found."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPOs.map((po) => (
                    <TableRow 
                      key={po.id} 
                      className="hover:bg-slate-50 cursor-pointer" 
                      onClick={() => handleOpenModalForEdit(po)}
                    >
                      <TableCell className="font-mono text-blue-600">{po.po_number || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{getSupplierName(po.supplier_id)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig[po.status]?.color || statusConfig.draft.color}>
                          {statusConfig[po.status]?.label || po.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                      <TableCell>{formatDate(po.order_date)}</TableCell>
                      <TableCell>{formatDate(po.expected_delivery)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModalForEdit(po);
                            }}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 hover:bg-red-50 focus:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(po);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && filteredPOs.length > 0 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              totalItems={filteredPOs.length}
              itemsPerPage={ITEMS_PER_PAGE} 
            />
          )}
        </CardContent>
      </Card>
      
      <PurchaseOrderDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
        poId={modalState.poId}
        fromRfqId={modalState.fromRfqId}
        winningResponseId={modalState.winningResponseId}
        // If the modal itself allows status changes that need to trigger budgeting,
        // handleChangeStatus should be passed as a prop, e.g., onStatusChange={handleChangeStatus}
      />
    </div>
  );
}
