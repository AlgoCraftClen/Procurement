import React, { useState, useEffect, useCallback } from "react";
import { Department } from "@/api/entities";
import { Location } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, MapPin, Filter } from "lucide-react";
import DepartmentFormModal from "../components/departments/DepartmentFormModal";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [locationFilter, setLocationFilter] = useState('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [userData, departmentData, locationData] = await Promise.all([
        User.me(),
        Department.list(),
        Location.list()
      ]);
      setUser(userData);
      setDepartments(departmentData || []);
      setLocations(locationData || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getLocationName = (locationId) => {
    if (!locationId) return 'No Location';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.location_name : 'Unknown Location';
  };

  const handleSave = async (data) => {
    if (selectedDepartment) {
      await Department.update(selectedDepartment.id, data);
    } else {
      await Department.create(data);
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleEdit = (dept) => {
    setSelectedDepartment(dept);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedDepartment(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      await Department.delete(id);
      loadData();
    }
  };

  const filteredDepartments = locationFilter === 'all' 
    ? departments 
    : departments.filter(dept => dept.location_id === locationFilter);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page. Please contact an administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Departments & Cost Centers</CardTitle>
              <CardDescription>Manage location-specific departments across all plants.</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Location Filter */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-500" />
              <h3 className="font-medium text-slate-700">Filter by Plant Location</h3>
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.filter(loc => loc.is_active).map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.location_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locationFilter !== 'all' && (
              <p className="text-sm text-slate-600 mt-2">
                Showing {filteredDepartments.length} of {departments.length} departments
              </p>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Plant Location</TableHead>
                <TableHead>Manager Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>{getLocationName(dept.location_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{dept.manager_email || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(dept)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(dept.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredDepartments.length === 0 && (
            <p className="text-center py-8 text-slate-500">
              {locationFilter === 'all' 
                ? "No departments found. Get started by adding one." 
                : "No departments found for the selected location."}
            </p>
          )}
        </CardContent>
      </Card>
      <DepartmentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        department={selectedDepartment}
      />
    </div>
  );
}