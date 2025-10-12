import React, { useState, useEffect, useCallback } from "react";
import { Contract } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Filter, X, Loader2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import ContractForm from "../components/contracts/ContractForm";
import ContractDetailModal from "../components/contracts/ContractDetailModal";
import Pagination from "../components/shared/Pagination";

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  expired: { label: "Expired", color: "bg-red-100 text-red-800" },
  terminated: { label: "Terminated", color: "bg-orange-100 text-orange-800" },
  renewed: { label: "Renewed", color: "bg-blue-100 text-blue-800" }
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    supplier: 'all',
    contractType: 'all'
  });
  
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...contracts];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(contract => 
        contract.contract_number.toLowerCase().includes(searchLower) ||
        contract.title.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(contract => contract.status === filters.status);
    }

    if (filters.supplier !== 'all') {
      filtered = filtered.filter(contract => contract.supplier_id === filters.supplier);
    }

    if (filters.contractType !== 'all') {
      filtered = filtered.filter(contract => contract.contract_type === filters.contractType);
    }

    setFilteredContracts(filtered);
    setCurrentPage(1);
  }, [contracts, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadData = async () => {
    setLoading(true);
    const [contractsData, suppliersData] = await Promise.all([
      Contract.list("-created_date"),
      Supplier.list()
    ]);
    setContracts(contractsData);
    setSuppliers(suppliersData);
    setLoading(false);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      supplier: 'all',
      contractType: 'all'
    });
  };

  const handleFormSubmit = async (data) => {
    if (selectedContract) {
      await Contract.update(selectedContract.id, data);
    } else {
      await Contract.create({
        ...data,
        contract_number: data.contract_number || `CT-${Date.now()}`
      });
    }
    await loadData();
    setIsFormOpen(false);
    setSelectedContract(null);
  };

  const handleEdit = (contract) => {
    setSelectedContract(contract);
    setIsFormOpen(true);
  };

  const handleViewDetails = (contract) => {
    setViewingContract(contract);
    setIsDetailModalOpen(true);
  };

  const handleNew = () => {
    setSelectedContract(null);
    setIsFormOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => `$${Number(amount || 0).toLocaleString()}`;
  
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.company_name : 'Unknown Supplier';
  };

  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
  const uniqueTypes = [...new Set(contracts.map(c => c.contract_type).filter(Boolean))];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contract Management</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedContract ? "Edit Contract" : "Add New Contract"}</DialogTitle>
            </DialogHeader>
            <ContractForm
              contract={selectedContract}
              suppliers={suppliers}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
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
              placeholder="Search contracts..."
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
          <Select value={filters.contractType} onValueChange={(value) => setFilters(prev => ({ ...prev, contractType: value }))}>
            <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />Clear
          </Button>
        </div>
        {(filters.search || filters.status !== 'all' || filters.supplier !== 'all' || filters.contractType !== 'all') && (
          <div className="mt-2 text-sm text-slate-600">
            Showing {filteredContracts.length} of {contracts.length} contracts
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Contract Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : paginatedContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-8 text-slate-500">
                      {filteredContracts.length === 0 && contracts.length > 0 ? 
                        "No contracts match the current filters." : 
                        "No contracts found."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedContracts.map((contract) => (
                    <TableRow key={contract.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleViewDetails(contract)}>
                      <TableCell className="font-mono text-blue-600">{contract.contract_number}</TableCell>
                      <TableCell className="font-medium">{contract.title}</TableCell>
                      <TableCell>{getSupplierName(contract.supplier_id)}</TableCell>
                      <TableCell className="capitalize">{contract.contract_type?.replace('_', ' ')}</TableCell>
                      <TableCell>{formatCurrency(contract.value)}</TableCell>
                      <TableCell>{formatDate(contract.end_date)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig[contract.status]?.color}>
                          {statusConfig[contract.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(contract); }}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredContracts.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>

      <ContractDetailModal
        contract={viewingContract}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEdit}
        suppliers={suppliers}
      />
    </div>
  );
}