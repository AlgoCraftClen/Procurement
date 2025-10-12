import { useState, useEffect, useCallback } from "react";
import { Invoice } from "@/api/entities";
import { PurchaseOrder } from "@/api/entities";
import { Supplier } from "@/api/entities";

export function useInvoiceData() {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [invoicesData, suppliersData, posData] = await Promise.all([
        Invoice.list("-created_date"),
        Supplier.list(),
        PurchaseOrder.list()
      ]);
      
      setInvoices(invoicesData || []);
      setSuppliers(suppliersData || []);
      setPurchaseOrders(posData || []);
    } catch (err) {
      console.error("Error loading invoice data:", err);
      setError("Failed to load invoice data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInvoice = useCallback(async (id, data) => {
    // Perform backend update and return the result, but don't update local state here.
    const updatedInvoice = await Invoice.update(id, data);
    return updatedInvoice;
  }, []);

  const createInvoice = useCallback(async (data) => {
    // Perform backend creation and return the result, but don't update local state here.
    const newInvoice = await Invoice.create(data);
    return newInvoice;
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    // Perform backend deletion
    await Invoice.delete(id);
    return true;
  }, []);

  const refreshData = useCallback(() => {
    return loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    invoices,
    setInvoices, // Expose setInvoices to allow the page to manage its own state
    suppliers,
    purchaseOrders,
    loading,
    error,
    refreshData,
    updateInvoice,
    createInvoice,
    deleteInvoice
  };
}