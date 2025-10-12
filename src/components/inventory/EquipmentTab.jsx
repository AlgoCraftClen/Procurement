import React, { useState, useEffect, useCallback } from "react";
import { Equipment } from "@/api/entities";
import { EquipmentLog } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { Location } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, LogIn, LogOut, Filter, Search, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EquipmentForm from "./EquipmentForm";
import EquipmentLogModal from "./EquipmentLogModal";
import EquipmentDetailModal from "./EquipmentDetailModal";
import Pagination from "../shared/Pagination";

const statusConfig = {
  in_use: { label: "In Use", color: "bg-blue-100 text-blue-800" },
  idle: { label: "Idle", color: "bg-green-100 text-green-800" },
  maintenance: { label: "Maintenance", color: "bg-yellow-100 text-yellow-800" },
  out_of_service: { label: "Out of Service", color: "bg-red-100 text-red-800" },
};

export default function EquipmentTab() {
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [viewingEquipment, setViewingEquipment] = useState(null);
  const [logAction, setLogAction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    location: 'all'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [equipmentData, suppliersData, locationsData, userData] = await Promise.all([
        Equipment.list("-created_date"),
        Supplier.list(),
        Location.list(),
        User.me()
      ]);
      setEquipment(equipmentData);
      setSuppliers(suppliersData);
      setLocations(locationsData.filter(loc => loc.is_active) || []);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
      setCurrentPage(1); 
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = useCallback(() => {
    let filtered = [...equipment];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.equipment_name.toLowerCase().includes(searchLower) ||
        item.serial_number.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(item => item.location_id === filters.location);
    }

    setFilteredEquipment(filtered);
    setCurrentPage(1);
  }, [equipment, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      location: 'all'
    });
  };

  const getLocationName = (id) => locations.find(l => l.id === id)?.location_name || 'N/A';

  const handleEdit = (item) => {
    setSelectedEquipment(item);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedEquipment(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (item) => {
    setViewingEquipment(item);
    setIsDetailModalOpen(true);
  };
  
  const handleDelete = async (id) => {
      await Equipment.delete(id);
      await loadData();
  };

  const handleFormSubmit = async (data) => {
    if (selectedEquipment) {
      await Equipment.update(selectedEquipment.id, data);
    } else {
      await Equipment.create(data);
    }
    await loadData();
    setIsFormOpen(false);
  };
  
  const openLogModal = (item, action) => {
    setSelectedEquipment(item);
    setLogAction(action);
    setIsLogOpen(true);
  };
  
  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE);

  return (
    <>
      <Card className="mt-4 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Equipment Inventory</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild><Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />Add Equipment</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{selectedEquipment ? "Edit Equipment" : "Add New Equipment"}</DialogTitle></DialogHeader>
                  <EquipmentForm equipment={selectedEquipment} suppliers={suppliers} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search equipment..."
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
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
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
            {(filters.search || filters.status !== 'all' || filters.location !== 'all') && (
              <div className="mt-2 text-sm text-slate-600">
                Showing {filteredEquipment.length} of {equipment.length} equipment
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead>Name</TableHead><TableHead>Serial #</TableHead><TableHead>Status</TableHead>
                <TableHead>Current User</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : paginatedEquipment.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center p-8 text-slate-500">
                    {filteredEquipment.length === 0 && equipment.length > 0 ? 
                      "No equipment matches the current filters." : 
                      "No equipment found."
                    }
                  </TableCell></TableRow>
                ) : (
                  paginatedEquipment.map(item => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleViewDetails(item)}>
                      <TableCell className="font-medium">{item.equipment_name}</TableCell>
                      <TableCell>{item.serial_number}</TableCell>
                      <TableCell><Badge variant="secondary" className={statusConfig[item.status]?.color}>{statusConfig[item.status]?.label}</Badge></TableCell>
                      <TableCell>{item.current_user || 'N/A'}</TableCell>
                      <TableCell>{getLocationName(item.location_id)}</TableCell>
                      <TableCell className="text-right space-x-1">
                          {item.status === 'idle' && <Button size="sm" onClick={(e) => {e.stopPropagation(); openLogModal(item, 'checked_out')}}><LogIn className="w-4 h-4 mr-1"/>Check Out</Button>}
                          {item.status === 'in_use' && <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); openLogModal(item, 'checked_in')}}><LogOut className="w-4 h-4 mr-1"/>Check In</Button>}
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
              totalItems={filteredEquipment.length}
              itemsPerPage={ITEMS_PER_PAGE}
          />
          <EquipmentLogModal 
              isOpen={isLogOpen} 
              setIsOpen={setIsLogOpen}
              equipment={selectedEquipment} 
              action={logAction}
              user={currentUser}
              onLogSuccess={loadData}
          />
        </CardContent>
      </Card>
      <EquipmentDetailModal
        equipment={viewingEquipment}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </>
  );
}