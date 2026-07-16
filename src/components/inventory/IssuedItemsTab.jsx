import React, { useState, useEffect } from "react";
import { IssuedItem } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { Equipment } from "@/api/entities";
import { FinishedGood } from "@/api/entities";
import { Department } from "@/api/entities";
import { Location } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Package, Package2, RotateCcw, AlertCircle, Filter, Search, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import IssuedItemForm from "./IssuedItemForm";
import IssuedItemEditForm from "./IssuedItemEditForm";
import ReturnItemForm from "./ReturnItemForm";
import IssuedItemDetailModal from "./IssuedItemDetailModal";
import Pagination from "../shared/Pagination";

const statusConfig = {
  issued: { label: "Issued", color: "bg-blue-100 text-blue-800" },
  returned: { label: "Returned", color: "bg-green-100 text-green-800" },
  lost: { label: "Lost", color: "bg-red-100 text-red-800" },
  damaged: { label: "Damaged", color: "bg-orange-100 text-orange-800" },
};

export default function IssuedItemsTab() {
  const [issuedItems, setIssuedItems] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isReturnFormOpen, setIsReturnFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    itemType: 'all',
    department: 'all',
    location: 'all',
    employee: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [issuedData, rawMaterials, equipment, finishedGoods, departmentData, locationData] = await Promise.all([
      IssuedItem.list("-created_date"),
      RawMaterial.list(),
      Equipment.list(),
      FinishedGood.list(),
      Department.list(),
      Location.list()
    ]);

    setIssuedItems(issuedData);
    setDepartments(departmentData || []);
    setLocations(locationData.filter(loc => loc.is_active) || []);
    
    // Combine all inventory items for the issue form
    const allItems = [
      ...rawMaterials.map(item => ({ 
        ...item, 
        type: 'raw_material',
        display_name: `${item.material_name} (${item.sku})`,
        available_quantity: item.current_quantity
      })),
      ...equipment.map(item => ({ 
        ...item, 
        type: 'equipment',
        display_name: `${item.equipment_name} (${item.serial_number})`,
        available_quantity: item.status === 'idle' ? 1 : 0
      })),
      ...finishedGoods.map(item => ({ 
        ...item, 
        type: 'finished_good',
        display_name: `${item.product_name} (${item.sku})`,
        available_quantity: item.quantity
      }))
    ];
    
    setAllInventoryItems(allItems);
    setLoading(false);
  };

  // Helper function to get department name with location
  const getDepartmentNameWithLocation = (departmentId) => {
    if (!departmentId) return 'N/A';
    const dept = departments.find(d => d.id === departmentId);
    if (!dept) return 'Unknown';
    
    const location = locations.find(l => l.id === dept.location_id);
    const locationName = location ? location.location_name : 'Unknown Location';
    
    return `${dept.name} (${locationName})`;
  };

  const getLocationName = (locationId) => {
    if (!locationId) return 'N/A';
    const location = locations.find(l => l.id === locationId);
    return location ? location.location_name : 'Unknown';
  };

  const handleIssueItem = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setIsEditFormOpen(true);
  };

  const handleReturnItem = (item) => {
    setSelectedItem(item);
    setIsReturnFormOpen(true);
  };

  const handleViewDetails = (item) => {
    setViewingItem(item);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id) => {
    const itemToDelete = issuedItems.find(item => item.id === id);

    if (itemToDelete && itemToDelete.status === 'issued') {
      // If an active issue is deleted, revert the inventory status
      if (itemToDelete.item_type === 'equipment') {
        await Equipment.update(itemToDelete.item_id, { status: 'idle', current_user: null });
      } else if (itemToDelete.item_type === 'raw_material') {
        const material = await RawMaterial.get(itemToDelete.item_id);
        if (material) {
          await RawMaterial.update(itemToDelete.item_id, { current_quantity: material.current_quantity + itemToDelete.quantity_issued });
        }
      } else if (itemToDelete.item_type === 'finished_good') {
        const good = await FinishedGood.get(itemToDelete.item_id);
        if (good) {
          await FinishedGood.update(itemToDelete.item_id, { quantity: good.quantity + itemToDelete.quantity_issued });
        }
      }
    }

    await IssuedItem.delete(id);
    await loadData();
  };

  const handleFormSubmit = async (data) => {
    await IssuedItem.create(data);

    // Update the source inventory item
    if (data.item_type === 'equipment') {
      await Equipment.update(data.item_id, { status: 'in_use', current_user: data.issued_to_employee });
    } else if (data.item_type === 'raw_material') {
      const material = allInventoryItems.find(i => i.id === data.item_id);
      if (material) {
        await RawMaterial.update(data.item_id, { current_quantity: material.current_quantity - data.quantity_issued });
      }
    } else if (data.item_type === 'finished_good') {
      const good = allInventoryItems.find(i => i.id === data.item_id);
      if (good) {
        await FinishedGood.update(data.item_id, { quantity: good.quantity - data.quantity_issued });
      }
    }

    await loadData();
    setIsFormOpen(false);
  };

  const handleEditFormSubmit = async (data) => {
    await IssuedItem.update(selectedItem.id, data);
    await loadData();
    setIsEditFormOpen(false);
  };

  const handleReturnFormSubmit = async (data) => {
    await IssuedItem.update(selectedItem.id, data);

    // Update the source inventory item if returned
    if (data.status === 'returned') {
      if (selectedItem.item_type === 'equipment') {
        await Equipment.update(selectedItem.item_id, { status: 'idle', current_user: null });
      } else if (selectedItem.item_type === 'raw_material') {
        const material = allInventoryItems.find(i => i.id === selectedItem.item_id);
        if (material) {
          await RawMaterial.update(selectedItem.item_id, { current_quantity: material.current_quantity + selectedItem.quantity_issued });
        }
      } else if (selectedItem.item_type === 'finished_good') {
        const good = allInventoryItems.find(i => i.id === selectedItem.item_id);
        if (good) {
          await FinishedGood.update(selectedItem.item_id, { quantity: good.quantity + selectedItem.quantity_issued });
        }
      }
    }

    await loadData();
    setIsReturnFormOpen(false);
  };

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

  // Filter items based on current filters
  const filteredItems = issuedItems.filter(item => {
    const matchesSearch = !filters.search || 
      item.item_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.issued_to_employee.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.sku_or_serial.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === 'all' || item.status === filters.status;
    const matchesType = filters.itemType === 'all' || item.item_type === filters.itemType;
    const matchesDepartment = filters.department === 'all' || item.department_id === filters.department;
    const matchesLocation = filters.location === 'all' || item.location_id === filters.location;
    const matchesEmployee = filters.employee === 'all' || item.issued_to_employee === filters.employee;

    return matchesSearch && matchesStatus && matchesType && matchesDepartment && matchesLocation && matchesEmployee;
  });

  // Separate filtered items by category
  const activeItems = filteredItems.filter(item => item.status === 'issued');
  const returnedItems = filteredItems.filter(item => item.status === 'returned');
  const overdueItems = activeItems.filter(item => 
    item.expected_return_date && new Date(item.expected_return_date) < new Date()
  );

  // Get unique values for filter dropdowns
  const uniqueEmployees = [...new Set(issuedItems.map(item => item.issued_to_employee).filter(Boolean))];

  const renderTable = (items, type) => {
    const paginatedItems = items.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    const noDataMessage = `No ${type.replace('_', ' ')} issued items match the current filters`;
    let colSpan;
    if (type === 'active') colSpan = 8;
    else if (type === 'returned') colSpan = 7;
    else if (type === 'overdue') colSpan = 5;

    return (
      <div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              {type === 'active' && (
                <TableRow className="bg-slate-50">
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Department (Location)</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              )}
              {type === 'returned' && (
                <TableRow className="bg-slate-50">
                  <TableHead>Item</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Department (Location)</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              )}
              {type === 'overdue' && (
                <TableRow className="bg-slate-50">
                  <TableHead>Item</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Department (Location)</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center p-8 text-slate-500">
                    {noDataMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map(item => {
                  if (type === 'active') {
                    const isOverdue = item.expected_return_date && new Date(item.expected_return_date) < new Date();
                    return (
                      <TableRow 
                        key={item.id} 
                        className={`${isOverdue ? 'bg-red-50' : ''} cursor-pointer hover:bg-slate-50`}
                        onClick={() => handleViewDetails(item)}
                      >
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.item_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.quantity_issued} {item.unit_of_measure}</TableCell>
                        <TableCell>{item.issued_to_employee}</TableCell>
                        <TableCell>{getDepartmentNameWithLocation(item.department_id)}</TableCell>
                        <TableCell>{formatDate(item.issue_date)}</TableCell>
                        <TableCell>
                          {item.expected_return_date ? (
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(item.expected_return_date)}
                              {isOverdue && <AlertCircle className="w-4 h-4 inline ml-1" />}
                            </span>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => handleReturnItem(item)}>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Return
                            </Button>
                            <div className="flex rounded-md border border-slate-200 bg-white">
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} aria-label="Edit issued item">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="border-l border-slate-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(item.id)} aria-label="Delete issued item">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  if (type === 'returned') {
                    return (
                      <TableRow 
                        key={item.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleViewDetails(item)}
                      >
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.issued_to_employee}</TableCell>
                        <TableCell>{getDepartmentNameWithLocation(item.department_id)}</TableCell>
                        <TableCell>{formatDate(item.issue_date)}</TableCell>
                        <TableCell>{formatDate(item.actual_return_date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusConfig[item.status]?.color}>
                            {statusConfig[item.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <div className="flex rounded-md border border-slate-200 bg-white">
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} aria-label="Edit returned item">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="border-l border-slate-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(item.id)} aria-label="Delete returned item">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  if (type === 'overdue') {
                    const daysOverdue = Math.floor((new Date() - new Date(item.expected_return_date)) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow 
                        key={item.id} 
                        className="bg-red-50 cursor-pointer hover:bg-red-100"
                        onClick={() => handleViewDetails(item)}
                      >
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.issued_to_employee}</TableCell>
                        <TableCell>{getDepartmentNameWithLocation(item.department_id)}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {formatDate(item.expected_return_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{`${daysOverdue} days`}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => handleReturnItem(item)}>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Return
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleEditItem(item)} aria-label="Edit overdue issued item">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return null;
                })
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={items.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>
    );
  };

  return (
    <Card className="mt-4 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package2 className="w-5 h-5" />
          Issued Items Tracking
        </CardTitle>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleIssueItem}>
              <Plus className="w-4 h-4 mr-2" />
              Issue Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Item</DialogTitle>
            </DialogHeader>
            <IssuedItemForm
              inventoryItems={allInventoryItems}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <h3 className="font-medium text-slate-700">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.itemType} onValueChange={(value) => setFilters(prev => ({ ...prev, itemType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="finished_good">Finished Good</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} - {getLocationName(dept.location_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Plant Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.location_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', status: 'all', itemType: 'all', department: 'all', location: 'all', employee: 'all', dateRange: 'all' })}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Issues</p>
                  <p className="text-2xl font-bold text-blue-600">{activeItems.length}</p>
                </div>
                <Package2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Returned Items</p>
                  <p className="text-2xl font-bold text-green-600">{returnedItems.length}</p>
                </div>
                <RotateCcw className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Overdue Items</p>
                  <p className="text-2xl font-bold text-red-600">{overdueItems.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Items</p>
                  <p className="text-2xl font-bold text-slate-600">{filteredItems.length}</p>
                </div>
                <Package className="w-8 h-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active Issues ({activeItems.length})
            </TabsTrigger>
            <TabsTrigger value="returned">
              Returned Items ({returnedItems.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue Items ({overdueItems.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {renderTable(activeItems, 'active')}
          </TabsContent>

          <TabsContent value="returned">
            {renderTable(returnedItems, 'returned')}
          </TabsContent>

          <TabsContent value="overdue">
            {renderTable(overdueItems, 'overdue')}
          </TabsContent>
        </Tabs>

        {/* Edit Form Modal */}
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Issued Item</DialogTitle>
            </DialogHeader>
            <IssuedItemEditForm
              item={selectedItem}
              onSubmit={handleEditFormSubmit}
              onCancel={() => setIsEditFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Return Form Modal */}
        <Dialog open={isReturnFormOpen} onOpenChange={setIsReturnFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Item</DialogTitle>
            </DialogHeader>
            <ReturnItemForm
              item={selectedItem}
              onSubmit={handleReturnFormSubmit}
              onCancel={() => setIsReturnFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <IssuedItemDetailModal
          item={viewingItem}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
