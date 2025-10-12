
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { RFQ } from "@/api/entities";
import { RFQResponse } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Loader2, Wand2, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Pagination from "../components/shared/Pagination";
import RequisitionUpload from "../components/rfqs/RequisitionUpload";
import RFQDetailModal from "../components/rfqs/RFQDetailModal"; // New import

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-800 border-slate-200",
  },
  sent: {
    label: "Sent",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  responses_received: {
    label: "Responses Received",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  evaluated: {
    label: "Evaluated",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  awarded: {
    label: "Awarded",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
  },
};

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState([]);
  const [filteredRFQs, setFilteredRFQs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // New state
  const [viewingRFQ, setViewingRFQ] = useState(null); // New state
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: 'all'
  });
  
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...rfqs];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(rfq => 
        rfq.rfq_number.toLowerCase().includes(searchLower) ||
        rfq.title.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(rfq => rfq.status === filters.status);
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
        filtered = filtered.filter(rfq => 
          rfq.created_date && new Date(rfq.created_date) >= dateThreshold
        );
      }
    }

    setFilteredRFQs(filtered);
    setCurrentPage(1);
  }, [rfqs, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadData = async () => {
    setLoading(true);
    const [rfqsData, suppliersData] = await Promise.all([
      RFQ.list("-created_date"),
      Supplier.list()
    ]);
    setRfqs(rfqsData);
    setSuppliers(suppliersData);
    setLoading(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dateRange: 'all'
    });
  };

  const handleEdit = (rfq) => {
    setIsDetailModalOpen(false); // Close detail modal if open
    navigate(createPageUrl(`RFQDetail?id=${rfq.id}`));
  };

  const handleDelete = async (id) => {
    const responses = await RFQResponse.filter({ rfq_id: id });
    await Promise.all(responses.map(response => RFQResponse.delete(response.id)));
    
    await RFQ.delete(id);
    await loadData();
    setIsDetailModalOpen(false); // Close detail modal if open
  };

  const handleRequisitionProcessed = async (rfqData) => {
    await RFQ.create({
      ...rfqData,
      rfq_number: `RFQ-${Date.now()}`,
      status: 'draft'
    });
    await loadData();
    setIsRequisitionModalOpen(false);
  };

  const handleViewDetails = (rfq) => { // New handler
    setViewingRFQ(rfq);
    setIsDetailModalOpen(true);
  };

  const paginatedRFQs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRFQs.slice(startIndex, endIndex);
  }, [filteredRFQs, currentPage, ITEMS_PER_PAGE]);

  const totalPages = Math.ceil(filteredRFQs.length / ITEMS_PER_PAGE);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, "MMM d, yyyy");
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Request for Quotations</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isRequisitionModalOpen} onOpenChange={setIsRequisitionModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Wand2 className="w-4 h-4 mr-2" />
                Process Requisition
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-500" />
                  Smart Requisition Processing
                </DialogTitle>
              </DialogHeader>
              <RequisitionUpload 
                suppliers={suppliers}
                onRFQCreated={handleRequisitionProcessed}
                onCancel={() => setIsRequisitionModalOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button onClick={() => navigate(createPageUrl("RFQDetail"))}>
            <Plus className="w-4 h-4 mr-2" />
            Create RFQ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-medium text-slate-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search RFQs..."
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
        {(filters.search || filters.status !== 'all' || filters.dateRange !== 'all') && (
          <div className="mt-2 text-sm text-slate-600">
            Showing {filteredRFQs.length} of {rfqs.length} RFQs
          </div>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>All RFQs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>RFQ Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Next Follow-up</TableHead>
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
                ) : paginatedRFQs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-slate-500">
                      {filteredRFQs.length === 0 && rfqs.length > 0 ? 
                        "No RFQs match the current filters." : 
                        "No RFQs found."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRFQs.map((rfq) => (
                    <TableRow key={rfq.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleViewDetails(rfq)}>
                      <TableCell className="font-mono text-blue-600">{rfq.rfq_number}</TableCell>
                      <TableCell className="font-medium">{rfq.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig[rfq.status]?.color}>
                          {statusConfig[rfq.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>${rfq.total_value?.toLocaleString() || '0'}</TableCell>
                      <TableCell>{formatDate(rfq.due_date)}</TableCell>
                      <TableCell>{formatDate(rfq.next_followup_date)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(rfq); }}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => { e.stopPropagation(); handleDelete(rfq.id); }}
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
          {!loading && filteredRFQs.length > 0 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              totalItems={filteredRFQs.length} 
              itemsPerPage={ITEMS_PER_PAGE} 
            />
          )}
        </CardContent>
      </Card>
      
      <RFQDetailModal
        rfq={viewingRFQ}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEdit}
        suppliers={suppliers}
      />
    </div>
  );
}
