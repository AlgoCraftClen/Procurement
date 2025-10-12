
import React, { useState } from "react";
import { RFQ } from "@/api/entities";
import { RFQResponse } from "@/api/entities";
import { PurchaseOrder } from "@/api/entities"; // New import as per outline
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Award, Star, ThumbsUp, Loader2 } from "lucide-react";
import RFQResponseForm from "./RFQResponseForm";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const calculateWeightedScore = (response) => {
    const cost = response.total_cost || 0;
    const quality = response.quality_score || 0; // 1-10
    const shipping = response.shipping_time || 0; // in days
    
    // This is a naive scoring model. A real one would be more complex.
    // Lower cost is better. Let's normalize against a baseline. Assume baseline cost is RFQ value.
    const costScore = Math.max(0, 100 - ((cost / 5000) * 100)); // Arbitrary baseline
    const qualityScore = quality * 10; // scale 1-10 to 0-100
    const shippingScore = Math.max(0, 100 - (shipping * 5)); // 20 days = 0 score
    
    const weightedScore = (costScore * 0.4) + (qualityScore * 0.3) + (shippingScore * 0.2); // Payment terms (10%) not included yet
    return Math.round(weightedScore);
};

export default function RFQComparisonTable({ rfq, responses, suppliers, onUpdate }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [awardingId, setAwardingId] = useState(null);
  const navigate = useNavigate();

  const getSupplierName = (id) => {
    return suppliers.find(s => s.id === id)?.company_name || "Unknown Supplier";
  };
  
  const handleEditResponse = (response) => {
    setSelectedResponse(response);
    setIsFormOpen(true);
  };
  
  const handleNewResponse = () => {
    setSelectedResponse(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    const score = calculateWeightedScore(data);
    const dataToSave = { ...data, rfq_id: rfq.id, weighted_score: score };

    if (selectedResponse) {
      await RFQResponse.update(selectedResponse.id, dataToSave);
    } else {
      await RFQResponse.create(dataToSave);
    }
    setIsFormOpen(false);
    onUpdate();
  };

  const handleAward = async (response) => {
    setAwardingId(response.id);
    try {
        await RFQ.update(rfq.id, {
            status: 'awarded',
            selected_supplier: response.supplier_id,
            selection_reasoning: `Awarded based on response with weighted score of ${response.weighted_score}.`
        });
        
        // Navigate to Purchase Orders page which will trigger the modal
        navigate(createPageUrl(`PurchaseOrders?action=create_po&fromRFQ=${rfq.id}&winningResponseId=${response.id}`));
    } catch (error) {
        console.error("Failed to award RFQ:", error);
    } finally {
        setAwardingId(null);
    }
  };
  
  const sortedResponses = [...responses].sort((a,b) => (b.weighted_score || 0) - (a.weighted_score || 0));

  return (
    <div className="space-y-4">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleNewResponse}><Plus className="w-4 h-4 mr-2" /> Add Response</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedResponse ? "Edit Response" : "Add New Response"}</DialogTitle>
          </DialogHeader>
          <RFQResponseForm
            response={selectedResponse}
            suppliers={suppliers}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Supplier</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Shipping (days)</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Weighted Score</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResponses.map(res => (
              <TableRow key={res.id} className={rfq.selected_supplier === res.supplier_id ? 'bg-green-50' : ''}>
                <TableCell className="font-medium">{getSupplierName(res.supplier_id)}</TableCell>
                <TableCell>${res.total_cost?.toLocaleString()}</TableCell>
                <TableCell>{res.shipping_time}</TableCell>
                <TableCell>{res.quality_score}/10</TableCell>
                <TableCell className="font-bold text-blue-600 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500"/>
                    {res.weighted_score}
                </TableCell>
                <TableCell>
                  {rfq.status === 'awarded' ? (
                     rfq.selected_supplier === res.supplier_id ? (
                        <span className="flex items-center gap-2 text-green-600 font-semibold">
                          <ThumbsUp className="w-4 h-4"/> Awarded
                        </span>
                     ) : (
                        <span className="text-slate-500">Not selected</span>
                     )
                  ) : (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditResponse(res)}>Edit</Button>
                        <Button size="sm" onClick={() => handleAward(res)} disabled={awardingId === res.id}>
                            {awardingId === res.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Award className="w-4 h-4 mr-1"/>}
                            Award
                        </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
             {responses.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center p-8 text-slate-500">
                        No supplier responses recorded yet.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
