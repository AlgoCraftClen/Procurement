
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Printer, ArrowLeft, FileText, BarChart3, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { createPageUrl } from "@/utils";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$0.00';
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ChartRenderer = ({ chart, index }) => {
  if (!chart || !chart.type || !chart.data) return null;

  const renderChart = () => {
    switch(chart.type) {
      case 'bar':
        return (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="value" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie 
              data={chart.data} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              outerRadius={100}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
            >
              {chart.data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        );
      
      case 'line':
        return (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={COLORS[index % COLORS.length]} 
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        );
      
      default:
        return <p className="text-slate-500">Unsupported chart type: {chart.type}</p>;
    }
  };

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          {chart.title}
        </CardTitle>
        {chart.description && (
          <CardDescription>{chart.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default function ExecutiveReportPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('executive_report_data');
      if (!storedData) {
        console.error('[ExecutiveReport] No report data found');
        navigate(createPageUrl('Dashboard'));
        return;
      }

      const parsedData = JSON.parse(storedData);
      
      // Add safety check: ensure analysis and charts exist
      if (!parsedData.analysis) {
        console.error('[ExecutiveReport] No analysis data in report');
        navigate(createPageUrl('Dashboard'));
        return;
      }
      
      // Ensure charts array exists, even if empty
      if (!parsedData.analysis.charts) {
        parsedData.analysis.charts = [];
      }
      
      setReportData(parsedData);
      setLoading(false);
    } catch (error) {
      console.error('[ExecutiveReport] Error loading report:', error);
      navigate(createPageUrl('Dashboard'));
    }
  }, [navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    if (!reportData) return;

    const { rawData, analysis } = reportData;
    
    // Ensure all analysis arrays are safe to map over
    const keyInsights = analysis.key_insights || [];
    const recommendations = analysis.recommendations || [];
    const actionItems = analysis.action_items || [];
    const riskAlerts = analysis.risk_alerts || [];

    const reportContent = `
═══════════════════════════════════════════════════════════════════
    EXECUTIVE PROCUREMENT & INVENTORY REPORT
    Generated: ${format(new Date(reportData.generatedDate), 'PPP')}
═══════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
${analysis.executive_summary}

───────────────────────────────────────────────────────────────────
KEY INSIGHTS
───────────────────────────────────────────────────────────────────
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n\n')}

───────────────────────────────────────────────────────────────────
STRATEGIC RECOMMENDATIONS
───────────────────────────────────────────────────────────────────
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n\n')}

───────────────────────────────────────────────────────────────────
IMMEDIATE ACTION ITEMS
───────────────────────────────────────────────────────────────────
${actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n\n')}

───────────────────────────────────────────────────────────────────
⚠️  RISK ALERTS
───────────────────────────────────────────────────────────────────
${riskAlerts.map((alert, i) => `${i + 1}. ${alert}`).join('\n\n')}

═══════════════════════════════════════════════════════════════════
FINANCIAL OVERVIEW
═══════════════════════════════════════════════════════════════════
• Total Committed Spend (Paid Invoices):      ${rawData.totalSpendFormatted}
• Pending Payments (Approved Invoices):       ${rawData.pendingPaymentsFormatted}
• Open Purchase Order Value:                  ${rawData.openPOValueFormatted}
• Total Committed Capital:                    ${rawData.totalCommittedCapitalFormatted}

═══════════════════════════════════════════════════════════════════
INVENTORY & ASSET OVERVIEW
═══════════════════════════════════════════════════════════════════
• Total Inventory Value:                      ${rawData.totalInventoryValueFormatted}
• Low Stock Items (Requires Attention):       ${rawData.lowStockItems}
• Inventory Categories:
${rawData.inventoryBreakdown.map(item => `  - ${item.name}: ${formatCurrency(item.value)}`).join('\n')}

• Equipment Status Summary:
${rawData.equipmentStatus.map(item => `  - ${item.name}: ${item.value} units`).join('\n')}

═══════════════════════════════════════════════════════════════════
OPERATIONAL METRICS
═══════════════════════════════════════════════════════════════════
• Total Suppliers in Network:                 ${rawData.totalSuppliers}
• Active Purchase Orders:                     ${rawData.activePOs}
• Active Contracts:                           ${rawData.activeContracts}

═══════════════════════════════════════════════════════════════════
END OF REPORT
═══════════════════════════════════════════════════════════════════
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-report-${format(new Date(reportData.generatedDate), 'yyyy-MM-dd-HHmm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading report...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No report data available. Please generate a report from the Dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { rawData, analysis, generatedDate } = reportData;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Print-hidden action bar */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownloadText}>
              <Download className="w-4 h-4 mr-2" />
              Download Text
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white print:break-inside-avoid">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-white">Executive Procurement & Inventory Report</CardTitle>
                <CardDescription className="text-blue-100 mt-2">
                  Generated: {format(new Date(generatedDate), 'PPP')}
                </CardDescription>
              </div>
              <FileText className="w-16 h-16 text-blue-200" />
            </div>
          </CardHeader>
        </Card>

        {/* Executive Summary */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{analysis.executive_summary}</p>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:break-inside-avoid">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-blue-600">{rawData.totalCommittedCapitalFormatted}</p>
              <p className="text-sm text-slate-600 mt-1">Total Committed Capital</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-green-600">{rawData.totalInventoryValueFormatted}</p>
              <p className="text-sm text-slate-600 mt-1">Total Inventory Value</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-orange-600">{rawData.lowStockItems}</p>
              <p className="text-sm text-slate-600 mt-1">Low Stock Alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Only render if charts exist and have data */}
        {analysis.charts && analysis.charts.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Data Visualizations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.charts.map((chart, index) => (
                <ChartRenderer key={index} chart={chart} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Key Insights */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.key_insights && analysis.key_insights.map((insight, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-slate-700 leading-relaxed">{insight}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Strategic Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations && analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-slate-700 leading-relaxed">{rec}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Immediate Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.action_items && analysis.action_items.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-slate-700 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Risk Alerts */}
        <Card className="border-red-200 bg-red-50 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.risk_alerts && analysis.risk_alerts.map((alert, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-red-800 leading-relaxed">{alert}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Detailed Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Financial Overview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Committed Spend:</span>
                    <span className="font-medium">{rawData.totalSpendFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pending Payments:</span>
                    <span className="font-medium">{rawData.pendingPaymentsFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Open PO Value:</span>
                    <span className="font-medium">{rawData.openPOValueFormatted}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Operational Metrics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Suppliers:</span>
                    <span className="font-medium">{rawData.totalSuppliers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Active Purchase Orders:</span>
                    <span className="font-medium">{rawData.activePOs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Active Contracts:</span>
                    <span className="font-medium">{rawData.activeContracts}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
