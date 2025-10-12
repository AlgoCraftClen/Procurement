import React, { useState, useEffect, useCallback } from "react";
import { RawMaterial } from "@/api/entities";
import { Supplier } from "@/api/entities"; 
import { Location } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, AlertTriangle, Filter, Search, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RawMaterialForm from "./RawMaterialForm";
import RawMaterialDetailModal from "./RawMaterialDetailModal";
import Pagination from "../shared/Pagination";

export default function RawMaterialsTab() {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    stockLevel: 'all',
    supplier: 'all',
    location: 'all'
  });
  
  const ITEMS_PER_PAGE = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1); 
    const [materialsData, suppliersData, locationsData] = await Promise.all([
      RawMaterial.list("-created_date"),
      Supplier.list(),
      Location.list()
    ]);
    setMaterials(materialsData);
    setSuppliers(suppliersData);
    setLocations(locationsData.filter(loc => loc.is_active) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = useCallback(() => {
    let filtered = [...materials];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(material => 
        material.material_name.toLowerCase().includes(searchLower) ||
        material.sku.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(material => material.category === filters.category);
    }

    // Stock level filter
    if (filters.stockLevel !== 'all') {
      filtered = filtered.filter(material => {
        const isLowStock = material.current_quantity <= material.minimum_stock;
        if (filters.stockLevel === 'low') return isLowStock;
        if (filters.stockLevel === 'normal') return !isLowStock;
        return true;
      });
    }

    // Supplier filter
    if (filters.supplier !== 'all') {
      filtered = filtered.filter(material => material.supplier_id === filters.supplier);
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(material => material.location_id === filters.location);
    }

    setFilteredMaterials(filtered);
    setCurrentPage(1);
  }, [materials, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      stockLevel: 'all',
      supplier: 'all',
      location: 'all'
    });
  };
  
  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.company_name || 'N/A';
  const getLocationName = (id) => locations.find(l => l.id === id)?.location_name || 'N/A';

  const handleEdit = (material) => {
    setSelectedMaterial(material);
    setIsFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedMaterial(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (material) => {
    setViewingMaterial(material);
    setIsDetailModalOpen(true);
  };
  
  const handleDelete = async (id) => {
      await RawMaterial.delete(id);
      await loadData();
  };

  const handleFormSubmit = async (data) => {
    if (selectedMaterial) {
      await RawMaterial.update(selectedMaterial.id, data);
    } else {
      await RawMaterial.create(data);
    }
    await loadData();
    setIsFormOpen(false);
  };
  
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);

  // Get unique categories for filter dropdown
  const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))];

  return (
    <>
      <Card className="mt-4 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Raw Materials Stock</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                  <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />Add Material</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>{selectedMaterial ? "Edit Raw Material" : "Add New Raw Material"}</DialogTitle>
                  </DialogHeader>
                  <RawMaterialForm
                      material={selectedMaterial}
                      suppliers={suppliers}
                      onSubmit={handleFormSubmit}
                      onCancel={() => setIsFormOpen(false)}
                  />
              </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-500" />
              <h3 className="font-medium text-slate-700">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search materials..."
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
                value={filters.stockLevel} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, stockLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Stock Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="normal">Normal Stock</SelectItem>
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
                value={filters.location} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>{location.location_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
            {(filters.search || filters.category !== 'all' || filters.stockLevel !== 'all' || filters.supplier !== 'all' || filters.location !== 'all') && (
              <div className="mt-2 text-sm text-slate-600">
                Showing {filteredMaterials.length} of {materials.length} materials
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Material Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : paginatedMaterials.length === 0 ? (
                   <TableRow><TableCell colSpan={7} className="text-center p-8 text-slate-500">
                     {filteredMaterials.length === 0 && materials.length > 0 ? 
                       "No materials match the current filters." : 
                       "No raw materials found."
                     }
                   </TableCell></TableRow>
                ) : (
                  paginatedMaterials.map(item => {
                      const isLowStock = item.current_quantity <= item.minimum_stock;
                      return (
                          <TableRow 
                            key={item.id} 
                            className={`${isLowStock ? 'bg-orange-50' : ''} cursor-pointer hover:bg-slate-50`} 
                            onClick={() => handleViewDetails(item)}
                          >
                              <TableCell className="font-medium">{item.material_name}</TableCell>
                              <TableCell>{item.sku}</TableCell>
                              <TableCell>{item.current_quantity} {item.unit_of_measure}</TableCell>
                              <TableCell>
                                  {isLowStock ? (
                                      <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1"/>Low Stock</Badge>
                                  ) : (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>
                                  )}
                              </TableCell>
                              <TableCell>{getSupplierName(item.supplier_id)}</TableCell>
                              <TableCell>{getLocationName(item.location_id)}</TableCell>
                              <TableCell className="text-right">
                                 <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleEdit(item)}}><Pencil className="w-4 h-4" /></Button>
                                 <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleDelete(item.id)}}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                              </TableCell>
                          </TableRow>
                      )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredMaterials.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </CardContent>
      </Card>
      <RawMaterialDetailModal 
        material={viewingMaterial}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </>
  );
}