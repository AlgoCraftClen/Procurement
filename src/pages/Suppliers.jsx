
import React, { useState, useEffect, useCallback } from "react";
import { Supplier } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";
import { Plus, Loader2, Search, Filter, X } from "lucide-react";
import SupplierForm from "../components/suppliers/SupplierForm";
import Pagination from "../components/shared/Pagination";
import SupplierCard from "../components/suppliers/SupplierCard";
import SupplierCardSkeleton from "../components/suppliers/SupplierCardSkeleton";
import SupplierDetailModal from "../components/suppliers/SupplierDetailModal";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [validatingId, setValidatingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    validationStatus: 'all',
    supplierType: 'all'
  });
  
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    loadSuppliers();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...suppliers];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(supplier => 
        supplier.company_name.toLowerCase().includes(searchLower) ||
        supplier.contact_person.toLowerCase().includes(searchLower) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(supplier => supplier.category === filters.category);
    }

    // Validation status filter
    if (filters.validationStatus !== 'all') {
      filtered = filtered.filter(supplier => 
        (supplier.validation_status || 'pending') === filters.validationStatus
      );
    }

    // Supplier Type filter
    if (filters.supplierType !== 'all') {
      filtered = filtered.filter(supplier => 
        (supplier.supplier_type || 'local') === filters.supplierType
      );
    }

    setFilteredSuppliers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [suppliers, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadSuppliers = async () => {
    setLoading(true);
    const data = await Supplier.list("-created_date");
    setSuppliers(data);
    setLoading(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      validationStatus: 'all',
      supplierType: 'all'
    });
  };

  const handleFormSubmit = async (data) => {
    if (selectedSupplier) {
      await Supplier.update(selectedSupplier.id, data);
    } else {
      await Supplier.create(data);
    }
    await loadSuppliers();
    setIsFormOpen(false);
    setSelectedSupplier(null);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleViewDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    await Supplier.delete(id);
    await loadSuppliers();
  };

  const handleValidate = async (supplier) => {
    setValidatingId(supplier.id);
    try {
      const result = await InvokeLLM({
        prompt: `Based on public data from business registries, news articles, and web search results, please assess the legitimacy of the following company: ${supplier.company_name}. Provide a validation status (verified, uncertain, potential_risk), a confidence score (0-100), and a brief summary of your findings.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            validation_status: {
              type: "string",
              enum: ["verified", "uncertain", "potential_risk"]
            },
            confidence_score: { type: "number" },
            validation_details: { type: "string" }
          },
          required: ["validation_status", "confidence_score", "validation_details"]
        }
      });

      if (result) {
        await Supplier.update(supplier.id, {
          validation_status: result.validation_status,
          confidence_score: result.confidence_score,
          validation_details: result.validation_details
        });
        await loadSuppliers();
      }
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setValidatingId(null);
    }
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);

  // Get unique categories for filter dropdown
  const uniqueCategories = [...new Set(suppliers.map(s => s.category).filter(Boolean))];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-slate-950 font-bold">Supplier Management</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedSupplier(null)}>
              <Plus className="w-4 h-4 mr-2" /> Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>
                {selectedSupplier ? "Edit Supplier" : "Add New Supplier"}
              </DialogTitle>
            </DialogHeader>
            <SupplierForm
              supplier={selectedSupplier}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

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
              placeholder="Search suppliers..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          <Select 
            value={filters.category} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={filters.validationStatus} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, validationStatus: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Validation Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="uncertain">Uncertain</SelectItem>
              <SelectItem value="potential_risk">Potential Risk</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={filters.supplierType} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, supplierType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="international">International</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
        {(filters.search || filters.category !== 'all' || filters.validationStatus !== 'all' || filters.supplierType !== 'all') && (
          <div className="mt-2 text-sm text-slate-600">
            Showing {filteredSuppliers.length} of {suppliers.length} suppliers
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ?
          Array(ITEMS_PER_PAGE).fill(0).map((_, i) =>
          <SupplierCardSkeleton key={i} />
          ) :

          paginatedSuppliers.map((supplier) =>
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onValidate={handleValidate}
            onViewDetails={handleViewDetails}
            validatingId={validatingId} />
          )
          }
        </div>

        {!loading && filteredSuppliers.length === 0 && (
        <div className="text-center p-16 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium text-slate-900">No suppliers found.</h3>
                <p className="text-slate-500 mt-1">
                  {suppliers.length === 0 ? 
                    "Get started by adding a new supplier." : 
                    "Try adjusting your filters or search terms."
                  }
                </p>
            </div>
        )}

        {!loading && filteredSuppliers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredSuppliers.length}
          itemsPerPage={ITEMS_PER_PAGE} />
        )}
      </div>

      {/* Supplier Detail Modal */}
      <SupplierDetailModal
        supplier={selectedSupplier}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={(supplier) => {
          setShowDetailModal(false); // Close detail modal
          handleEdit(supplier);      // Open edit form
        }}
      />
    </div>
  );
}
