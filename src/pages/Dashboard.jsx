
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  Activity,
  Wrench,
  PackageCheck,
  Loader2,
  ShoppingCart,
  CheckSquare,
  Banknote,
  Hourglass,
  FileSignature,
  Plus,
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Supplier } from "@/api/entities";
import { RFQ } from "@/api/entities";
import { PurchaseOrder } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { Equipment } from "@/api/entities";
import { FinishedGood } from "@/api/entities";
import { IssuedItem } from "@/api/entities";
import { Invoice } from "@/api/entities";
import { Contract } from "@/api/entities";
import { User } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, FunnelChart, Funnel, LabelList, Cell, PieChart, Pie } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProcurementAnalysis from "../components/dashboard/ProcurementAnalysis";
import { generateInvitationCode } from "@/api/functions";

const StatCardSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  change,
  description,
  onClick,
  isClickable = false,
  alertLevel = null,
  tooltip,
  trend = null
}) => {
  const getTrendIcon = () => {
    if (trend > 0) return <ArrowUp className="w-3 h-3 text-green-600" />;
    if (trend < 0) return <ArrowDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-500";
  };

  const getCardStyle = () => {
    let baseStyle = "transition-all duration-200 relative";

    if (isClickable) {
      baseStyle += " cursor-pointer hover:shadow-lg hover:scale-[1.01] transform";
    }

    if (alertLevel === 'critical') {
      baseStyle += " ring-2 ring-red-200 border-red-200";
    } else if (alertLevel === 'warning') {
      baseStyle += " ring-2 ring-yellow-200 border-yellow-200";
    }

    return baseStyle;
  };

  const cardContent = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={getCardStyle()} onClick={isClickable ? onClick : undefined}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-600">{title}</p>
                    {alertLevel && (
                      <Badge variant={alertLevel === 'critical' ? 'destructive' : 'warning'} className="h-4 px-1 text-xs">
                        {alertLevel === 'critical' ? '!' : 'Warning'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    {trend !== null && (
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span>{Math.abs(trend)}%</span>
                      </div>
                    )}
                  </div>
                  {change && (
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      {change > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      {Math.abs(change)}% from last month
                    </p>
                  )}
                  {description && (
                    <p className="text-xs text-slate-500">{description}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full relative ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                  {isClickable && (
                    <ExternalLink className="w-3 h-3 absolute -top-1 -right-1 text-slate-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return cardContent;
};


export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState({
    totalSuppliers: 0,
    activePOs: 0,
    openPOValue: 0,
    lowStockItems: 0,
    totalInventoryValue: 0,
    totalSpend: 0,
    pendingPayments: 0,
    activeContracts: 0,
    inventoryBreakdown: [],
    supplierPerformance: [],
    equipmentStatus: [],
    poLifecycle: [],
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');

  const navigate = useNavigate();

  const handleCardClick = (destination) => {
    if (destination === 'inventory-low-stock') {
      navigate(createPageUrl('Inventory'));
    } else if (destination === 'suppliers') {
      navigate(createPageUrl('Suppliers'));
    } else if (destination === 'purchase-orders') {
      navigate(createPageUrl('PurchaseOrders'));
    } else if (destination === 'invoices') {
      navigate(createPageUrl('Invoices'));
    } else if (destination === 'contracts') {
      navigate(createPageUrl('Contracts'));
    } else {
      navigate(createPageUrl(destination));
    }
  };

  // Modified: loadDashboardData with improved performance and pending payments calculation
  const loadDashboardData = useCallback(async () => {
    try {
      // Use Promise.all for parallel fetching, but with optimized queries
      const [
        suppliers,
        rfqs, // Only fetch sent RFQs for quick stats (if needed later)
        rawMaterials, // Need full list for low stock calculation
        equipment, // Need full list for status breakdown
        finishedGoods, // Need full list for inventory value
        purchaseOrders, // Need full list for status filtering and value calc
        invoices, // Keep sort for recent activities & full list for pending/paid
        contracts, // Only fetch active contracts
      ] = await Promise.all([
        Supplier.list(), // Keep full list for now (typically manageable count)
        RFQ.filter({ status: 'sent' }), // Optimized: fetch only 'sent' RFQs
        RawMaterial.list(),
        Equipment.list(),
        FinishedGood.list(),
        PurchaseOrder.list(),
        Invoice.list('-created_date'), // Force fresh data with sorting
        Contract.filter({ status: 'active' }), // Optimized: fetch only 'active' contracts
      ]);

      const lowStock = rawMaterials.filter((item) =>
        item.current_quantity <= item.minimum_stock
      );

      const totalValue = [
        ...rawMaterials.map((item) => (item.current_quantity || 0) * (item.unit_cost || 0)),
        ...equipment.map((item) => item.purchase_cost || 0),
        ...finishedGoods.map((item) => (item.quantity || 0) * (item.cost_per_unit || 0))
      ].reduce((sum, value) => sum + value, 0);

      const inventoryBreakdown = [
        { name: 'Raw Materials', value: rawMaterials.reduce((sum, item) => sum + (item.current_quantity || 0) * (item.unit_cost || 0), 0), color: '#3b82f6' },
        { name: 'Equipment', value: equipment.reduce((sum, item) => sum + (item.purchase_cost || 0), 0), color: '#8b5cf6' },
        { name: 'Finished Goods', value: finishedGoods.reduce((sum, item) => sum + (item.quantity || 0) * (item.cost_per_unit || 0), 0), color: '#10b981' }
      ].filter(item => item.value > 0);

      const poLifecycleData = [
        { name: 'Draft', value: purchaseOrders.filter(p => p.status === 'draft').length, fill: '#94a3b8' },
        { name: 'Sent', value: purchaseOrders.filter(p => p.status === 'sent' || p.status === 'confirmed').length, fill: '#60a5fa' },
        { name: 'Receiving', value: purchaseOrders.filter(p => p.status === 'partially_received').length, fill: '#facc15' },
        { name: 'Completed', value: purchaseOrders.filter(p => p.status === 'completed').length, fill: '#4ade80' },
      ].filter(item => item.value > 0);

      // Debug logging for pending payments calculation
      console.log('[Dashboard] Total invoices loaded:', invoices.length);

      const pendingInvoices = invoices.filter(inv => {
        const isPending = inv.status === 'approved' || inv.status === 'received' || inv.status === 'pending';
        if (isPending) {
          console.log(`[Dashboard] Pending invoice: ${inv.invoice_number} - Status: ${inv.status} - Amount: $${inv.total_amount}`);
        }
        return isPending;
      });

      console.log('[Dashboard] Pending invoices found:', pendingInvoices.length);

      // Enhanced: Improved pending payments calculation with debug logging
      const pendingPayments = pendingInvoices.reduce((sum, inv) => {
        const amount = inv.total_amount || 0;
        console.log(`[Dashboard] Adding pending amount: $${amount} from invoice ${inv.invoice_number}`);
        return sum + amount;
      }, 0);

      console.log('[Dashboard] Total pending payments calculated:', pendingPayments);

      // Total spend should only include actually paid invoices
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalSpend = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      console.log('[Dashboard] Paid invoices:', paidInvoices.length, 'Total spend:', totalSpend);

      const openPOValue = purchaseOrders
        .filter(po => !['completed', 'cancelled'].includes(po.status))
        .reduce((sum, po) => sum + (po.total_amount || 0), 0);

      // contracts are already filtered to 'active' status in the Promise.all call
      // so activeContracts is simply the length of the 'contracts' array
      const activeContracts = contracts.length;


      setDashboardData({
        totalSuppliers: suppliers.length,
        activePOs: purchaseOrders.filter(p => !['completed', 'cancelled', 'draft'].includes(p.status)).length,
        openPOValue: openPOValue,
        lowStockItems: lowStock.length,
        totalInventoryValue: totalValue,
        totalSpend: totalSpend,
        pendingPayments: pendingPayments,
        activeContracts: activeContracts,
        inventoryBreakdown,
        poLifecycle: poLifecycleData,
        equipmentStatus: [
          { name: 'In Use', value: equipment.filter((e) => e.status === 'in_use').length },
          { name: 'Idle', value: equipment.filter((e) => e.status === 'idle').length },
          { name: 'Maintenance', value: equipment.filter((e) => e.status === 'maintenance').length },
        ],
        recentActivities: [
          ...purchaseOrders.slice(0, 5).map((po) => ({
            id: po.id,
            type: 'purchase_order',
            title: `PO ${po.po_number} status: ${po.status}`,
            date: po.updated_date,
            status: po.status
          })),
          ...suppliers.slice(0, 3).map((supplier) => ({
            id: supplier.id,
            type: 'supplier',
            title: `Supplier ${supplier.company_name} added`,
            date: supplier.created_date,
            status: supplier.validation_status
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, []);

  // Modified: Consolidate data loading and user fetching into a single useEffect
  // to ensure overall loading state is managed correctly.
  useEffect(() => {
    const loadAllInitialData = async () => {
      setLoading(true); // Start overall loading indicator
      setUserLoading(true); // Start user loading indicator

      try {
        await Promise.all([
          loadDashboardData(), // This will update dashboardData state internally
          (async () => { // Self-executing async function to fetch user data
            try {
              const currentUser = await User.me();
              console.log("[DASHBOARD] User loaded:", currentUser); // Debug log
              setUser(currentUser);
            } catch (error) {
              console.log("User not logged in or failed to fetch user.", error);
              setUser(null); // user will remain null, which is correct for non-logged-in or error state
            } finally {
              setUserLoading(false); // Stop user loading indicator
            }
          })()
        ]);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false); // Stop overall loading indicator after all fetches (or attempts) are complete
      }
    };

    loadAllInitialData();
  }, [loadDashboardData]); // Dependency on loadDashboardData useCallback

  // Add effect to refresh dashboard when user navigates back to it (window gains focus)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Dashboard] Window focused, refreshing data...');
      loadDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboardData]);

  // Add periodic refresh every 2 minutes to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[Dashboard] Periodic refresh...');
      loadDashboardData();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0.00';
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generateExecutiveReport = async () => {
    setGeneratingReport(true);
    
    try {
      // Step 1: Prepare comprehensive report data
      console.log('[Executive Report] Step 1: Preparing report data...');
      const reportData = {
        // Financial Metrics
        totalSpend: dashboardData.totalSpend,
        totalSpendFormatted: formatCurrency(dashboardData.totalSpend),
        pendingPayments: dashboardData.pendingPayments,
        pendingPaymentsFormatted: formatCurrency(dashboardData.pendingPayments),
        openPOValue: dashboardData.openPOValue,
        openPOValueFormatted: formatCurrency(dashboardData.openPOValue),
        
        // Procurement Metrics
        totalSuppliers: dashboardData.totalSuppliers,
        activePOs: dashboardData.activePOs,
        activeContracts: dashboardData.activeContracts,
        
        // Inventory & Asset Metrics
        totalInventoryValue: dashboardData.totalInventoryValue,
        totalInventoryValueFormatted: formatCurrency(dashboardData.totalInventoryValue),
        lowStockItems: dashboardData.lowStockItems,
        inventoryBreakdown: dashboardData.inventoryBreakdown,
        equipmentStatus: dashboardData.equipmentStatus,
        
        // Calculated Metrics
        totalCommittedCapital: dashboardData.totalSpend + dashboardData.pendingPayments + dashboardData.openPOValue,
        totalCommittedCapitalFormatted: formatCurrency(dashboardData.totalSpend + dashboardData.pendingPayments + dashboardData.openPOValue)
      };
      
      console.log('[Executive Report] Report data prepared:', reportData);

      // Step 2: Generate AI analysis with chart data
      console.log('[Executive Report] Step 2: Calling LLM for analysis...');
      const result = await InvokeLLM({
        prompt: `You are generating a comprehensive Executive Procurement & Inventory Report for management.

PROCUREMENT DATA:
- Total Spend (Paid Invoices): ${reportData.totalSpendFormatted}
- Pending Payments (Approved Invoices): ${reportData.pendingPaymentsFormatted}
- Open Purchase Order Value: ${reportData.openPOValueFormatted}
- Total Committed Capital: ${reportData.totalCommittedCapitalFormatted}
- Total Suppliers: ${reportData.totalSuppliers}
- Active Purchase Orders: ${reportData.activePOs}
- Active Contracts: ${reportData.activeContracts}

INVENTORY & ASSET DATA:
- Total Inventory Value: ${reportData.totalInventoryValueFormatted}
- Low Stock Items (Critical): ${reportData.lowStockItems}
- Inventory Breakdown: ${JSON.stringify(reportData.inventoryBreakdown)}
- Equipment Status: ${JSON.stringify(reportData.equipmentStatus)}

INSTRUCTIONS:
1. Provide a concise executive summary covering BOTH procurement operations AND inventory/asset management
2. Identify 4-6 key insights that span both procurement efficiency and inventory health
3. Provide 3-5 actionable recommendations for improving procurement processes AND inventory management
4. List 3-5 immediate action items for management to address
5. Highlight any critical risk alerts related to spending, inventory shortages, or asset utilization
6. Generate chart data for 3-4 key visualizations that would best illustrate the report insights

For charts, use this format:
- Each data point should have "name" (string) and "value" (number) properties
- Example: [{"name": "Raw Materials", "value": 362.96}, {"name": "Equipment", "value": 5294.99}]

Focus on:
- Financial health and capital efficiency
- Supplier relationship management
- Inventory adequacy and potential stockouts
- Asset utilization and equipment status
- Operational risks and opportunities`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            key_insights: { 
              type: "array", 
              items: { type: "string" },
              description: "4-6 key insights covering procurement and inventory"
            },
            recommendations: { 
              type: "array", 
              items: { type: "string" },
              description: "3-5 strategic recommendations"
            },
            action_items: { 
              type: "array", 
              items: { type: "string" },
              description: "3-5 immediate action items"
            },
            risk_alerts: { 
              type: "array", 
              items: { type: "string" },
              description: "Critical risks requiring attention"
            },
            charts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string", enum: ["bar", "pie", "line"] },
                  data: { 
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "number" }
                      },
                      required: ["name", "value"]
                    }
                  },
                  description: { type: "string" }
                },
                required: ["title", "type", "data", "description"]
              },
              description: "Chart data for visualizations"
            }
          },
          required: ["executive_summary", "key_insights", "recommendations", "action_items", "risk_alerts", "charts"]
        }
      });

      console.log('[Executive Report] Step 3: LLM analysis complete');

      // Step 3: Store report data and navigate to visual report page
      console.log('[Executive Report] Step 4: Preparing visual report...');
      
      // Store the complete report data in sessionStorage for the visual report page
      const completeReportData = {
        generatedDate: new Date().toISOString(),
        rawData: reportData,
        analysis: result,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('executive_report_data', JSON.stringify(completeReportData));
      
      console.log('[Executive Report] Navigating to visual report page...');
      navigate(createPageUrl('ExecutiveReport'));
      
    } catch (error) {
      console.error('[Executive Report] Error during generation:', error);
      
      // Detailed error handling
      let errorMessage = 'Failed to generate executive report. ';
      
      if (error.message && error.message.includes('network')) {
        errorMessage += 'Network error - please check your connection and try again.';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage += 'Request timed out - the AI service may be busy. Please try again.';
      } else if (error.response) {
        errorMessage += `Server error: ${error.response.status}. Please try again later.`;
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      alert(errorMessage);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Add debug logging to the generate function
  const generateNewInvitationCode = async () => {
    if (generatingCode) return;

    console.log("[DASHBOARD] Current user when generating:", user); // Debug log
    console.log("[DASHBOARD] User role:", user?.role); // Debug log

    setGeneratingCode(true);
    setGeneratedCode(null);

    try {
      console.log("[DASHBOARD] Generating new invitation code...");
      const result = await generateInvitationCode({ count: 1 });

      console.log("[DASHBOARD] Generation result:", result);

      if (result.data && result.data.success && result.data.generated_codes && result.data.generated_codes.length > 0) {
        const newCode = result.data.generated_codes[0];
        setGeneratedCode(newCode.code);
        console.log(`[DASHBOARD] Generated code: ${newCode.code}, expires at: ${newCode.expires_at}`);

        // Auto-hiding the code after 10 minutes for security (matching the actual expiry)
        setTimeout(() => {
          console.log("[DASHBOARD] Auto-hiding expired code from UI");
          setGeneratedCode(null);
        }, 600000); // 600,000 milliseconds = 10 minutes
      } else {
        console.error("[DASHBOARD] Invalid response format:", result);
        alert(result.data?.error || "Failed to generate access code. Please try again.");
      }
    } catch (error) {
      console.error('[DASHBOARD] Error generating invitation code:', error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to generate access code";
      alert(`Error: ${errorMessage}`);
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      // You could add a toast notification here if available
      console.log("[DASHBOARD] Code copied to clipboard");
    } catch (error) {
      console.error("[DASHBOARD] Failed to copy code:", error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const filteredActivities = dashboardData.recentActivities.filter(activity => {
    if (activityFilter === 'all') return true;
    return activity.type === activityFilter;
  });

  if (loading || userLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        {/* Skeleton for Generated Code Display */}
        {user && user.role === 'admin' && ( // This condition still applies to the skeleton as per outline
          <Skeleton className="h-28 w-full" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[370px] w-full" />
          <Skeleton className="h-[370px] w-full" />
        </div>
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  console.log("[DASHBOARD] Rendering with user:", user); // Debug log
  console.log("[DASHBOARD] User is admin?", user && user.role === 'admin'); // Debug log

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Procurement Dashboard</h1>
          <p className="text-slate-600">Overview of your procurement and inventory operations</p>
        </div>
        <div className="flex gap-3">
          {/* Admin-only Generate Invitation Code button with enhanced logging */}
          {user && user.role === 'admin' ? (
            <Button
              onClick={generateNewInvitationCode}
              disabled={generatingCode}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              {generatingCode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Access Code
                </>
              )}
            </Button>
          ) : (
            /* Debug: Show why button is hidden */
            user && !userLoading && (
              <div className="text-xs text-gray-500 flex items-center h-10 px-4 py-2 border rounded-md bg-gray-50">
                User role: {user.role || 'undefined'} (Access Code generation requires 'admin' role)
              </div>
            )
          )}

          <Button onClick={generateExecutiveReport} disabled={generatingReport}>
            {generatingReport ?
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
              <FileText className="w-4 h-4 mr-2" />
            }
            Generate Executive Report
          </Button>
        </div>
      </div>

      {/* Generated Code Display - Admin Only */}
      {user && user.role === 'admin' && generatedCode && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">New Access Code Generated</p>
                <p className="text-2xl font-mono font-bold text-green-900 mt-1 tracking-wider">{generatedCode}</p>
                <p className="text-xs text-green-600 mt-1">
                  Code expires in 10 minutes - Share this with the new user immediately
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCodeToClipboard}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Copy Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Key Metrics with improved UX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total Committed Spend"
          value={formatCurrency(dashboardData.totalSpend)}
          icon={Banknote}
          color="text-green-600"
          description="All paid invoices (actual spend)"
          onClick={() => handleCardClick('invoices')}
          isClickable={true}
          tooltip="Total value of all paid invoices representing actual procurement spend. Click to view all invoices."
          trend={12}
        />

        <StatCard
          title="Pending Payments"
          value={formatCurrency(dashboardData.pendingPayments)}
          icon={Hourglass}
          color="text-yellow-600"
          description="Approved & received invoices awaiting payment"
          onClick={() => handleCardClick('invoices')}
          isClickable={true}
          tooltip="Invoices that are approved/received but not yet paid. Click to view payment queue."
          alertLevel={dashboardData.pendingPayments > 50000 ? 'warning' : null}
        />

        <StatCard
          title="Open PO Value"
          value={formatCurrency(dashboardData.openPOValue)}
          icon={TrendingUp}
          color="text-purple-600"
          description="Value of active purchase orders"
          onClick={() => handleCardClick('purchase-orders')}
          isClickable={true}
          tooltip="Total value of purchase orders that are not yet completed or cancelled. Click to view open POs."
          trend={-5}
        />

        <StatCard
          title="Low Stock Items"
          value={dashboardData.lowStockItems}
          icon={AlertTriangle}
          color="text-orange-600"
          description="Items below minimum stock"
          onClick={() => handleCardClick('inventory-low-stock')}
          isClickable={true}
          alertLevel={dashboardData.lowStockItems > 0 ? 'critical' : null}
          tooltip={`${dashboardData.lowStockItems} items are below minimum stock levels and need immediate attention. Click to view low stock items.`}
        />

        <StatCard
          title="Total Suppliers"
          value={dashboardData.totalSuppliers}
          icon={Building2}
          color="text-blue-600"
          description="Active supplier network"
          onClick={() => handleCardClick('suppliers')}
          isClickable={true}
          tooltip="Total number of suppliers in your network. Click to manage suppliers."
          trend={8}
        />

        <StatCard
          title="Active Purchase Orders"
          value={dashboardData.activePOs}
          icon={ShoppingCart}
          color="text-indigo-600"
          description="Orders in progress"
          onClick={() => handleCardClick('purchase-orders')}
          isClickable={true}
          tooltip="Purchase orders that are sent, confirmed, or partially received. Click to view active POs."
        />

        <StatCard
          title="Active Contracts"
          value={dashboardData.activeContracts}
          icon={FileSignature}
          color="text-cyan-600"
          description="Ongoing agreements"
          onClick={() => handleCardClick('contracts')}
          isClickable={true}
          tooltip="Currently active contracts with suppliers. Click to view contracts."
          trend={2}
        />

        <StatCard
          title="Total Inventory Value"
          value={formatCurrency(dashboardData.totalInventoryValue)}
          icon={Package}
          color="text-pink-600"
          description="Value of all stock items"
          onClick={() => handleCardClick('Inventory')}
          isClickable={true}
          tooltip="Combined value of all raw materials, equipment, and finished goods in inventory. Click to view inventory details."
          trend={-3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              PO Lifecycle Funnel
            </CardTitle>
            <CardDescription>Visualizes the flow of purchase orders through their stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <RechartsTooltip />
                <Funnel
                  dataKey="value"
                  data={dashboardData.poLifecycle}
                  isAnimationActive
                >
                  <LabelList
                    position="center"
                    fill="#fff"
                    stroke="none"
                    dataKey="value"
                    formatter={(value) => `${value}`}
                    className="font-bold text-lg"
                  />
                   <LabelList
                    position="right"
                    dataKey="name"
                    fill="#334155"
                    offset={10}
                    className="text-sm font-medium"
                   />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Inventory Value Breakdown
            </CardTitle>
            <CardDescription>Total Value: {formatCurrency(dashboardData.totalInventoryValue)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dashboardData.inventoryBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `$${value/1000}k`} />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}/>
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {dashboardData.inventoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(value) => formatCurrency(value)} className="text-sm font-medium" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Section */}
      <ProcurementAnalysis />

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Recent Activities
            </CardTitle>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter activities..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredActivities.length > 0 ?
            <div className="space-y-3">
              {filteredActivities.map((activity, index) =>
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'purchase_order' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                      {activity.type === 'purchase_order' ?
                        <FileText className="w-4 h-4 text-purple-600" /> :
                        <Building2 className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{activity.title}</p>
                      <p className="text-sm text-slate-500">
                        {activity.date ? format(new Date(activity.date), 'MMM d, yyyy HH:mm') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.status}
                  </Badge>
                </div>
              )}
            </div> :
            <p className="text-slate-500 text-center py-8">No activities match the selected filter.</p>
          }
        </CardContent>
      </Card>
    </div>
  );
}
