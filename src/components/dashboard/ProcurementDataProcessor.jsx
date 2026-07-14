import { Invoice } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

export class ProcurementDataProcessor {
  constructor() {
    this.suppliers = [];
  }

  async loadSuppliers() {
    try {
      this.suppliers = await Supplier.list();
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      this.suppliers = [];
    }
  }

  // Optimized: Fetch invoices with date range filter if possible
  async fetchInvoiceData(startDate, endDate) {
    try {
      // Fetch all invoices, then filter locally for the reporting date range.
      // but we immediately filter them, so at least we're not doing unnecessary processing
      const allInvoices = await Invoice.list('-invoice_date');
      
      // Filter by date range client-side (unavoidable with current SDK)
      const filtered = allInvoices.filter(invoice => {
        if (!invoice.invoice_date) return false;
        const invoiceDate = new Date(invoice.invoice_date);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });

      console.log(`[ProcurementAnalysis] Filtered ${filtered.length} invoices from ${allInvoices.length} total (date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')})`);
      
      return filtered;
    } catch (error) {
      console.error("Failed to fetch invoice data:", error);
      return [];
    }
  }

  filterInvoicesBySupplierType(invoices, supplierType) {
    if (supplierType === 'all') return invoices;

    return invoices.filter(invoice => {
      const supplier = this.suppliers.find(s => s.id === invoice.supplier_id);
      if (!supplier) return false;
      return supplier.supplier_type === supplierType;
    });
  }

  generateMonthlySpendingData(invoices, startDate, endDate) {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    const monthlyData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= monthStart && invDate <= monthEnd;
      });

      const spending = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      return {
        name: format(month, 'MMM yyyy'),
        spending: spending
      };
    });

    return monthlyData;
  }

  getAnalysisStats(invoices) {
    const totalSpent = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const uniqueSuppliers = new Set(invoices.map(inv => inv.supplier_id)).size;

    return {
      totalInvoices: invoices.length,
      totalSpent: totalSpent,
      uniqueSuppliers: uniqueSuppliers
    };
  }

  getSupplierTypeLabel(supplierType) {
    const labels = {
      'all': 'All Suppliers',
      'local': 'Local Suppliers',
      'international': 'International Suppliers'
    };
    return labels[supplierType] || 'All Suppliers';
  }
}
