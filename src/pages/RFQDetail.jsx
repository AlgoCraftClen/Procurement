
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RFQ } from '@/api/entities';
import { Supplier } from '@/api/entities';
import { RFQResponse } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import RFQForm from "../components/rfqs/RFQForm";
import RFQResponseForm from '../components/rfqs/RFQResponseForm';
import RFQComparisonTable from "../components/rfqs/RFQComparisonTable";

export default function RFQDetailPage() {
  const navigate = useNavigate();
  const { id: paramId } = useParams(); // Using useParams for route ID
  const [rfq, setRfq] = useState(null);
  const [responses, setResponses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use paramId directly, no need for useMemo with URLSearchParams if using route params
  const rfqId = paramId;

  useEffect(() => {
    if (rfqId) {
      loadRFQDetails();
    } else {
      setLoading(false);
    }
    loadSuppliers();
  }, [rfqId]);

  const loadRFQDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [rfqData, responseData] = await Promise.all([
        RFQ.get(rfqId),
        RFQResponse.filter({ rfq_id: rfqId }),
      ]);
      setRfq(rfqData);
      setResponses(responseData);
    } catch (error) {
      console.error("Failed to load RFQ details:", error);
      // Optionally handle error, e.g., redirect or show message
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  const loadSuppliers = async () => {
    try {
      const supplierData = await Supplier.list();
      setSuppliers(supplierData);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    }
  };

  const handleSave = async (data) => {
    let savedRfq;
    try {
      if (rfqId) {
        savedRfq = await RFQ.update(rfqId, data);
      } else {
        const newRfqData = {
          ...data,
          rfq_number: `RFQ-${Date.now()}`, // Simple placeholder, consider a more robust ID generation
        };
        savedRfq = await RFQ.create(newRfqData);
      }
      navigate(createPageUrl(`RFQDetail?id=${savedRfq.id}`)); // Navigating with query param for consistency with existing logic
    } catch (error) {
      console.error("Failed to save RFQ:", error);
      // Optionally show an error message to the user
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("RFQs"))}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {rfqId ? `RFQ Details: ${rfq?.rfq_number}` : "Create New RFQ"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rfqId ? "Edit RFQ" : "New RFQ Form"}</CardTitle>
        </CardHeader>
        <CardContent>
          <RFQForm rfq={rfq} suppliers={suppliers} onSave={handleSave} />
        </CardContent>
      </Card>

      {rfqId && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Responses & Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <RFQComparisonTable 
              rfq={rfq}
              responses={responses} 
              suppliers={suppliers}
              onUpdate={loadRFQDetails} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
