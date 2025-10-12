
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import { Upload, FileText, AlertCircle, Check, Loader2, Wand2, FileImage, Users } from "lucide-react";
import RequisitionReviewForm from "./RequisitionReviewForm";

export default function RequisitionUpload({ suppliers, onRFQCreated, onCancel }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('initial'); // initial, uploading, processing, reviewing, creating, success
  const [extractedRequisition, setExtractedRequisition] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setError(null);
    setStep('initial');
    setExtractedRequisition(null);
    setFileUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFullCancel = () => {
    resetState();
    if(onCancel) onCancel();
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a PDF, JPEG, JPG, or PNG file.");
        setFile(null);
      }
    }
  };

  const processRequisition = async () => {
    if (!file) return;

    // 1. Upload File
    setStep('uploading');
    setError(null);
    let uploadedFileUrl;
    try {
      const uploadResult = await UploadFile({ file });
      uploadedFileUrl = uploadResult.file_url;
      setFileUrl(uploadedFileUrl);
    } catch (e) {
      setError("Failed to upload the file. Please try again.");
      setStep('initial');
      return;
    }

    // 2. Process Requisition with Advanced OCR and Parsing
    setStep('processing');
    try {
      const processingResult = await InvokeLLM({
        prompt: `Analyze this requisition form document (which may contain handwritten text) and extract all relevant procurement information. 
        
        Please identify and extract:
        1. Requester information (name, department, date)
        2. All requested materials/items with their specifications
        3. Quantities needed for each item
        4. Any priority levels or urgency indicators
        5. Requested delivery dates or timeframes
        6. Any special instructions or notes
        7. Budget codes or cost centers if mentioned
        
        Parse handwritten text carefully and make reasonable interpretations where text is unclear. 
        For materials, try to standardize names (e.g. "steel bars" vs "steel rods" should be consistent).
        Convert any measurements to standard units where possible.
        
        Structure the output as a procurement requisition with clear line items.`,
        file_urls: [uploadedFileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            requester_info: {
              type: "object", 
              properties: {
                name: { type: "string" },
                department: { type: "string" },
                email: { type: "string" },
                request_date: { type: "string", format: "date" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
              }
            },
            requested_delivery: { type: "string", format: "date" },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material_name: { type: "string" },
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  specifications: { type: "string" },
                  estimated_cost: { type: "number" },
                  category: { type: "string", enum: ["raw_material", "equipment", "supplies", "services", "other"] }
                }
              }
            },
            special_instructions: { type: "string" },
            budget_code: { type: "string" },
            total_estimated_value: { type: "number" }
          }
        }
      });

      if (processingResult && processingResult.line_items && processingResult.line_items.length > 0) {
        // Transform the extracted data into RFQ format
        const rfqData = {
          title: `Requisition from ${processingResult.requester_info?.department || 'Unknown Department'} - ${processingResult.requester_info?.name || 'Unknown Requester'}`,
          description: `Processed from requisition form. ${processingResult.special_instructions || ''}`,
          total_value: processingResult.total_estimated_value || 0,
          due_date: calculateDueDate(processingResult.requested_delivery),
          line_items: processingResult.line_items.map(item => ({
            description: item.material_name || item.description,
            quantity: item.quantity || 1,
            unit: item.unit || 'units',
            specifications: `${item.description || ''} ${item.specifications || ''}`.trim(),
            category: item.category || 'other'
          })),
          requester_info: processingResult.requester_info,
          budget_code: processingResult.budget_code,
          suggested_suppliers: suggestSuppliers(processingResult.line_items, suppliers)
        };

        setExtractedRequisition(rfqData);
        setStep('reviewing');
      } else {
        setError("Could not extract material items from the requisition. Please ensure the document contains clear item information and try again.");
        setStep('initial');
      }

    } catch (e) {
      console.error("Processing error:", e);
      setError("An error occurred while processing the requisition. Please check the document quality and try again.");
      setStep('initial');
    }
  };

  const calculateDueDate = (requestedDelivery) => {
    if (requestedDelivery) {
      // Set RFQ due date to be 1 week before requested delivery
      const deliveryDate = new Date(requestedDelivery);
      deliveryDate.setDate(deliveryDate.getDate() - 7);
      return deliveryDate.toISOString().split('T')[0];
    } else {
      // Default to 2 weeks from today
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 14);
      return defaultDue.toISOString().split('T')[0];
    }
  };

  const suggestSuppliers = (lineItems, availableSuppliers) => {
    const suggestions = [];
    
    lineItems.forEach(item => {
      const category = item.category || 'other';
      const matchingSuppliers = availableSuppliers.filter(supplier => 
        supplier.category && supplier.category.toLowerCase().includes(category.toLowerCase())
      );
      suggestions.push(...matchingSuppliers.map(s => s.id));
    });

    // Remove duplicates and return top 5
    return [...new Set(suggestions)].slice(0, 5);
  };

  const handleRFQSave = async (finalRFQData) => {
    setStep('creating');
    try {
      await onRFQCreated(finalRFQData);
      setStep('success');
    } catch (e) {
      setError("Failed to create RFQ. Please try again.");
      setStep('reviewing');
    }
  };

  const UploadCard = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-500" />
          Smart Requisition Processing
        </CardTitle>
        <CardDescription>
          Upload a requisition form (handwritten or printed) and we'll automatically extract the materials 
          and create an RFQ for you. Supports PDF, JPG, PNG formats.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-purple-300 hover:border-purple-400">
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".pdf,.jpg,.jpeg,.png" 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          
          {!file ? (
            <div>
              <div className="flex justify-center space-x-4 mb-4">
                <FileText className="w-8 h-8 text-purple-400" />
                <FileImage className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-lg font-medium text-slate-900 mb-2">Drop your requisition here or click to browse</p>
              <p className="text-sm text-slate-500 mb-4">
                Supports handwritten forms, printed documents, scanned images
              </p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <p className="font-medium text-slate-900">{file.name}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={processRequisition} className="bg-purple-600 hover:bg-purple-700">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Process Requisition
                </Button>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const ProcessingIndicator = ({ step }) => {
    const messages = {
      uploading: "Uploading requisition form...",
      processing: "Reading handwriting and extracting materials (this may take a moment)...",
      creating: "Creating RFQ from requisition data..."
    };
    
    return (
      <div className="text-center p-16 border-2 border-dashed rounded-lg border-purple-300">
        <Loader2 className="w-12 h-12 text-purple-500 mx-auto animate-spin mb-4"/>
        <p className="text-lg font-medium text-slate-900">{messages[step]}</p>
        <p className="text-sm text-slate-500">AI is processing your document. Please wait...</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {step === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            RFQ created successfully!
            <Button variant="link" onClick={onCancel} className="ml-2">
              Done
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'initial' && <UploadCard />}
      
      {['uploading', 'processing', 'creating'].includes(step) && <ProcessingIndicator step={step} />}

      {step === 'reviewing' && extractedRequisition && (
        <RequisitionReviewForm
          requisitionData={extractedRequisition}
          suppliers={suppliers}
          onSave={handleRFQSave}
          onCancel={handleFullCancel}
          originalFileUrl={fileUrl}
        />
      )}
    </div>
  );
}
