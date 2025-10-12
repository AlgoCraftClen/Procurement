import React, { useState, useEffect, useCallback } from "react";
import { FinishedGood } from "@/api/entities";
import { Location } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Filter, Search, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FinishedGoodForm from "./FinishedGoodForm";
import FinishedGoodDetailModal from "./FinishedGoodDetailModal";
import { format } from "date-fns";
import Pagination from "../shared/Pagination";

export default function FinishedGoodsTab() {
  const [goods, setGoods] = useState([]);
  const [filteredGoods, setFilteredGoods] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGood, setSelectedGood] = useState(null);
  const [viewingGood, setViewingGood] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    location: 'all'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [goodsData, locationsData] = await Promise.all([
      FinishedGood.list("-created_date"),
      Location.list()
    ]);
    setGoods(goodsData);
    setLocations(locationsData.filter(loc => loc.is_active) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = useCallback(() => {
    let filtered = [...goods];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.product_name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.batch_number.toLowerCase().includes(searchLower)
      );
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(item => item.location_id === filters.location);
    }

    setFilteredGoods(filtered);
    setCurrentPage(1);
  }, [goods, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      location: 'all'
    });
  };

  const getLocationName = (id) => locations.find(l => l.id === id)?.location_name || 'N/A';

  const handleEdit = (good) => {
    setSelectedGood(good);
    setIsFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedGood(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (good) => {
    setViewingGood(good);
    setIsDetailModalOpen(true);
  };
  
  const handleDelete = async (id) => {
    await FinishedGood.delete(id);
    await loadData();
    const newTotalPages = Math.ceil(goods.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
    } else if (newTotalPages === 0) {
        setCurrentPage(1);
    }
  };

  const handleFormSubmit = async (data) => {
    if (selectedGood) {
      await FinishedGood.update(selectedGood.id, data);
    } else {
      await FinishedGood.create(data);
    }
    await loadData();
    setCurrentPage(1); 
    setIsFormOpen(false);
  };
  
  const paginatedGoods = filteredGoods.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredGoods.length / ITEMS_PER_PAGE);

  return (
    <>
      <Card className="mt-4 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Finished Goods Stock</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild><Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />Add Finished Good</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{selectedGood ? "Edit Finished Good" : "Add New Finished Good"}</DialogTitle></DialogHeader>
                  <FinishedGoodForm good={selectedGood} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
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
            {(filters.search || filters.location !== 'all') && (
              <div className="mt-2 text-sm text-slate-600">
                Showing {filteredGoods.length} of {goods.length} products
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead>Product Name</TableHead><TableHead>SKU</TableHead><TableHead>Batch #</TableHead>
                <TableHead>Quantity</TableHead><TableHead>Expiry Date</TableHead><TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : paginatedGoods.length === 0 ? (
                   <TableRow><TableCell colSpan={7} className="text-center p-8 text-slate-500">
                     {filteredGoods.length === 0 && goods.length > 0 ? 
                       "No products match the current filters." : 
                       "No finished goods found."
                     }
                   </TableCell></TableRow>
                ) : (
                  paginatedGoods.map(item => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleViewDetails(item)}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell>{item.quantity} {item.unit_of_measure}</TableCell>
                          <TableCell>{item.expiry_date ? format(new Date(item.expiry_date), 'MMM d, yyyy') : 'N/A'}</TableCell>
                          <TableCell>{getLocationName(item.location_id)}</TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleEdit(item)}}><Pencil className="w-4 h-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleDelete(item.id)}}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </TableCell>
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
           <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredGoods.length}
              itemsPerPage={ITEMS_PER_PAGE}
          />
        </CardContent>
      </Card>
      <FinishedGoodDetailModal
        good={viewingGood}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </>
  );
}