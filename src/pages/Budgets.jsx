import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Loader2, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  X
} from 'lucide-react';
import { Budget } from '@/api/entities';
import { Department } from '@/api/entities';
import { User } from '@/api/entities';
import BudgetFormModal from '../components/budgets/BudgetFormModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: TrendingUp },
  overspent: { label: 'Overspent', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  frozen: { label: 'Frozen', color: 'bg-blue-100 text-blue-800', icon: Shield },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: Shield }
};

const scopeConfig = {
  Local: { label: 'Local', color: 'bg-teal-100 text-teal-800' },
  International: { label: 'International', color: 'bg-purple-100 text-purple-800' },
  Global: { label: 'Global', color: 'bg-blue-100 text-blue-800' }
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([]);
  const [filteredBudgets, setFilteredBudgets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [user, setUser] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    fiscalYear: 'all',
    category: 'all',
    geographicScope: 'all',
    status: 'all'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [budgetsData, departmentsData, currentUser] = await Promise.all([
        Budget.list('-created_date'),
        Department.list(),
        User.me()
      ]);
      
      setBudgets(budgetsData || []);
      setDepartments(departmentsData || []);
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...budgets];

    if (filters.fiscalYear !== 'all') {
      filtered = filtered.filter(budget => budget.fiscal_year === filters.fiscalYear);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(budget => budget.category === filters.category);
    }

    if (filters.geographicScope !== 'all') {
      filtered = filtered.filter(budget => budget.geographic_scope === filters.geographicScope);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(budget => budget.status === filters.status);
    }

    setFilteredBudgets(filtered);
  }, [budgets, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      fiscalYear: 'all',
      category: 'all',
      geographicScope: 'all',
      status: 'all'
    });
  };

  const handleSave = async (budgetData) => {
    try {
      if (selectedBudget) {
        await Budget.update(selectedBudget.id, budgetData);
      } else {
        await Budget.create(budgetData);
      }
      await loadData();
      setIsFormOpen(false);
      setSelectedBudget(null);
    } catch (error) {
      console.error('Failed to save budget:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  const handleEdit = (budget) => {
    setSelectedBudget(budget);
    setIsFormOpen(true);
  };

  const handleDelete = async (budgetId) => {
    if (window.confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      try {
        await Budget.delete(budgetId);
        await loadData();
      } catch (error) {
        console.error('Failed to delete budget:', error);
        alert('Failed to delete budget. Please try again.');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getUsagePercentage = (allocated, spent, committed) => {
    if (!allocated || allocated === 0) return 0;
    return Math.min(100, ((spent + committed) / allocated) * 100);
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept ? dept.name : 'Unknown Department';
  };

  // Get unique values for filters
  const uniqueFiscalYears = [...new Set(budgets.map(b => b.fiscal_year))].sort();
  const uniqueCategories = [...new Set(budgets.map(b => b.category))].sort();
  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access Denied. Only administrators can view and manage budgets.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Management</h1>
          <p className="text-slate-600">Track and manage departmental budgets with local/international segmentation</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedBudget(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </DialogTrigger>
          <BudgetFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSave={handleSave}
            budget={selectedBudget}
            departments={departments}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <div className="p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-medium text-slate-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select 
            value={filters.fiscalYear} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, fiscalYear: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fiscal Years</SelectItem>
              {uniqueFiscalYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            value={filters.geographicScope} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, geographicScope: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="International">International</SelectItem>
              <SelectItem value="Global">Global</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.status} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overspent">Overspent</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
        {hasActiveFilters && (
          <div className="mt-2 text-sm text-slate-600">
            Showing {filteredBudgets.length} of {budgets.length} budgets
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Committed</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center p-8 text-slate-500">
                        {budgets.length === 0 ? 
                          "No budgets found. Create your first budget to get started." :
                          "No budgets match the current filters."
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBudgets.map((budget) => {
                      const StatusIcon = statusConfig[budget.status]?.icon || TrendingUp;
                      const usagePercentage = getUsagePercentage(
                        budget.allocated_amount, 
                        budget.spent_amount, 
                        budget.committed_amount
                      );
                      
                      return (
                        <TableRow key={budget.id}>
                          <TableCell className="font-medium">{budget.fiscal_year}</TableCell>
                          <TableCell>{getDepartmentName(budget.department_id)}</TableCell>
                          <TableCell>{budget.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={scopeConfig[budget.geographic_scope]?.color}>
                              {scopeConfig[budget.geographic_scope]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(budget.allocated_amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.committed_amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.spent_amount)}</TableCell>
                          <TableCell className={budget.available_amount < 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatCurrency(budget.available_amount)}
                          </TableCell>
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={usagePercentage} 
                                className="flex-1" 
                                indicatorClassName={usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'}
                              />
                              <span className="text-xs text-slate-500 w-10">
                                {Math.round(usagePercentage)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusConfig[budget.status]?.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[budget.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEdit(budget)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleDelete(budget.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}