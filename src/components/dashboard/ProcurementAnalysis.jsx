import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarIcon, Loader2, Search, Wand2, Lightbulb, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SupplierTypeFilter from './SupplierTypeFilter';
import { ProcurementDataProcessor } from './ProcurementDataProcessor';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded-lg shadow-lg">
        <p className="label font-bold">{`${label}`}</p>
        <p className="intro text-blue-600">{`Committed: $${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

const MarkdownText = ({ text }) => (
  <div className="text-sm leading-relaxed space-y-2">
    {String(text || "").split("\n").filter(Boolean).map((line, index) => {
      const cleanLine = line.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "");
      const isListItem = /^[-*]\s+/.test(cleanLine) || /^\d+\.\s+/.test(cleanLine);
      return (
        <p key={index} className={isListItem ? "pl-4 break-words" : "break-words"}>
          {cleanLine}
        </p>
      );
    })}
  </div>
);

export default function ProcurementAnalysis() {
  const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
  const [endDate, setEndDate] = useState(new Date());
  const [supplierType, setSupplierType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [insights, setInsights] = useState("");
  const [analysisStats, setAnalysisStats] = useState(null);

  const dataProcessor = new ProcurementDataProcessor();

  const handleAnalysis = async () => {
    setLoading(true);
    setAnalysisData(null);
    setInsights("");
    setAnalysisStats(null);

    try {
      // Load suppliers first
      await dataProcessor.loadSuppliers();

      // Fetch and filter invoice data
      const dateFilteredInvoices = await dataProcessor.fetchInvoiceData(startDate, endDate);
      const filteredInvoices = dataProcessor.filterInvoicesBySupplierType(dateFilteredInvoices, supplierType);

      // Generate monthly spending data
      const monthlySpending = dataProcessor.generateMonthlySpendingData(filteredInvoices, startDate, endDate);
      setAnalysisData(monthlySpending);

      // Get analysis statistics
      const stats = dataProcessor.getAnalysisStats(filteredInvoices);
      setAnalysisStats(stats);

      // Generate local insights without a paid API call
      await generateInsights(monthlySpending, supplierType, stats);

    } catch (error) {
      console.error("Analysis failed:", error);
      setInsights("Failed to generate analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async (monthlyData, selectedSupplierType, stats) => {
    try {
      const supplierTypeLabel = dataProcessor.getSupplierTypeLabel(selectedSupplierType);
      const sortedBySpend = [...monthlyData].sort((a, b) => (b.spending || 0) - (a.spending || 0));
      const highest = sortedBySpend[0] || { name: "N/A", spending: 0 };
      const lowest = [...monthlyData].filter((entry) => (entry.spending || 0) > 0).sort((a, b) => a.spending - b.spending)[0] || { name: "N/A", spending: 0 };
      const recent = monthlyData.slice(-3);
      const averageRecent = recent.length
        ? recent.reduce((sum, entry) => sum + (entry.spending || 0), 0) / recent.length
        : 0;

      setInsights([
        `Summary: ${supplierTypeLabel} committed spend totals $${stats.totalSpent.toLocaleString()} across ${stats.totalInvoices} invoice(s) and ${stats.uniqueSuppliers} supplier(s).`,
        `Highest month: ${highest.name} at $${Number(highest.spending || 0).toLocaleString()}.`,
        `Lowest active month: ${lowest.name} at $${Number(lowest.spending || 0).toLocaleString()}.`,
        `Simple forecast: recent monthly average is about $${Math.round(averageRecent).toLocaleString()} if the current pattern continues.`,
        `Recommendation: review high-spend months against approved purchase orders and confirm recurring supplier commitments before adding new spend.`
      ].join("\n"));
    } catch (error) {
      console.error("Insight generation failed:", error);
      setInsights("Local analysis could not be generated. The spending chart and summary metrics are still available for review.");
    }
  };

  const getAnalysisTitle = () => {
    const typeLabels = {
      'all': 'All Suppliers',
      'local': 'Local Suppliers', 
      'international': 'International Suppliers'
    };
    return `${typeLabels[supplierType]} - Procurement Commitments`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" />
          Procurement Analysis
        </CardTitle>
        <CardDescription>
          Analyze procurement commitments by supplier type and date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-center gap-4 p-4 border rounded-lg bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">From:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[180px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "LLL dd, y") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > endDate || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">To:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[180px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "LLL dd, y") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <SupplierTypeFilter
            value={supplierType}
            onChange={setSupplierType}
            disabled={loading}
          />
          
          <Button onClick={handleAnalysis} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Analyze Period
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="ml-4 text-slate-600">Analyzing data and generating insights...</p>
          </div>
        )}

        {analysisData && (
          <div className="space-y-6">
            {/* Analysis Summary Stats */}
            {analysisStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{analysisStats.totalInvoices}</p>
                    <p className="text-sm text-slate-600">Total Invoices</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">${analysisStats.totalSpent.toLocaleString()}</p>
                    <p className="text-sm text-slate-600">Total Committed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{analysisStats.uniqueSuppliers}</p>
                    <p className="text-sm text-slate-600">Unique Suppliers</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Monthly Spending Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500"/>
                  {getAnalysisTitle()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analysisData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value/1000)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="spending" fill="#2563eb" name="Committed Spending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Local Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" /> 
                  Local Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights ? (
                  <div className="prose prose-sm prose-slate max-w-none bg-slate-50 p-4 rounded-lg border break-words overflow-hidden">
                    <MarkdownText text={insights} />
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Click "Analyze Period" to generate local insights for the selected date range and supplier type.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {!loading && !analysisData && (
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium text-slate-900">Ready for Analysis</h3>
            <p className="text-slate-500 mt-1">Select date range, supplier type, and click "Analyze Period" to begin.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
