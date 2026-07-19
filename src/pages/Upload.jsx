import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import { PurchaseOrder } from "@/api/entities";
import { Invoice } from "@/api/entities";
import { GoodsReceipt } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { Department } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { Equipment } from "@/api/entities";
import { FinishedGood } from "@/api/entities";
import { IssuedItem } from "@/api/entities";
import { Notification } from "@/api/entities";
import { updateBudgetOnInvoice } from "@/api/functions";
import DataConfirmationForm from "../components/upload/DataConfirmationForm";
import SupplierDecisionModal from "../components/upload/SupplierDecisionModal";
import { Upload, FileText, AlertCircle, Check, Loader2, Wand2, FileQuestion, FileImage, FileSpreadsheet, ExternalLink } from "lucide-react";
import { createPageUrl } from "@/utils";
import { normalizeLineItemsForDocument, toNumber } from "@/lib/procurementData";

// Enhanced utility function for robust supplier name comparison
const normalizeSupplierName = (name) => {
  if (typeof name !== 'string' || !name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Remove ALL whitespace
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
};

// Enhanced schemas matching your actual document formats
const EXTRACTION_SCHEMAS = {
  purchase_order: {
    type: "object",
    properties: {
      po_number: { type: "string" },
      supplier_name: { type: "string" },
      supplier_address: { type: "string" },
      ship_to_name: { type: "string" },
      ship_to_address: { type: "string" },
      order_date: { type: "string", format: "date" },
      date_required: { type: "string", format: "date" },
      ship_via: { type: "string" },
      routing: { type: "string" },
      payment_terms: { type: "string" },
      requisition_no: { type: "string" },
      purpose_project: { type: "string" },
      line_items: { 
        type: "array", 
        items: { 
          type: "object", 
          properties: { 
            quantity_ordered: { type: "number" },
            quantity_received: { type: "number" },
            unit: { type: "string" },
            stock_number: { type: "string" },
            description: { type: "string" }, 
            unit_price: { type: "number" }, 
            total_price: { type: "number" }
          } 
        } 
      },
      total_amount: { type: "number" },
      requested_by: { type: "string" },
      certified_by: { type: "string" },
      approved_by: { type: "string" },
      notes: { type: "string" }
    },
  },
  invoice: {
    type: "object",
    properties: {
      invoice_number: { type: "string" },
      purchase_order_number: { type: "string" },
      supplier_name: { type: "string" },
      supplier_address: { type: "string" },
      supplier_email: { type: "string" },
      supplier_phone: { type: "string" },
      invoice_date: { type: "string", format: "date" },
      due_date: { type: "string", format: "date" },
      payment_terms: { type: "string" },
      line_items: { 
        type: "array", 
        items: { 
          type: "object", 
          properties: { 
            item_number: { type: "string" },
            description: { type: "string" }, 
            quantity: { type: "number" }, 
            unit_price: { type: "number" }, 
            total_price: { type: "number" } 
          } 
        } 
      },
      subtotal: { type: "number" },
      tax_amount: { type: "number" },
      total_amount: { type: "number" },
    },
  },
  goods_receipt: {
    type: "object",
    properties: {
      receipt_number: { type: "string" },
      purchase_order_number: { type: "string" },
      supplier_name: { type: "string" },
      supplier_address: { type: "string" },
      received_date: { type: "string", format: "date" },
      received_by: { type: "string" },
      delivery_note: { type: "string" },
      line_items: { 
        type: "array", 
        items: { 
          type: "object", 
          properties: { 
            description: { type: "string" }, 
            ordered_quantity: { type: "number" }, 
            received_quantity: { type: "number" },
            condition: { type: "string", enum: ["good", "damaged", "defective"] }
          } 
        } 
      },
    },
  }
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const ACCEPTED_FILE_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg";

const isExtractionUnavailableError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || error?.details?.code || "").toLowerCase();
  return (
    error?.status === 429 ||
    code === "insufficient_quota" ||
    code === "rate_limit_exceeded" ||
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("rate limit") ||
    message.includes("openai_api_key") ||
    message.includes("smart document extraction is not configured")
  );
};

const getExtractionUnavailableMessage = (error) => {
  const message = error?.message || "Smart document extraction is not available right now.";
  if (String(error?.code || error?.details?.code || "").toLowerCase() === "insufficient_quota") {
    return "Automatic extraction is paused because the connected OpenAI account has exceeded its current quota. The source document was saved, and you can continue with manual verification below.";
  }
  return `${message} The source document was saved, and you can continue with manual verification below.`;
};

const createManualInitialData = (type) => {
  const today = new Date().toISOString().split("T")[0];

  if (type === "purchase_order") {
    return {
      po_number: "",
      supplier_id: "",
      supplier_name: "",
      supplier_address: "",
      order_date: today,
      date_required: "",
      payment_terms: "",
      requisition_no: "",
      purpose_project: "",
      status: "draft",
      line_items: normalizeLineItemsForDocument(type, [{
        quantity_ordered: 1,
        quantity_received: 0,
        unit: "EA",
        stock_number: "",
        description: "",
        unit_price: 0,
        total_price: 0
      }]),
      total_amount: 0,
      notes: ""
    };
  }

  if (type === "invoice") {
    return {
      invoice_number: "",
      purchase_order_number: "",
      supplier_id: "",
      supplier_name: "",
      supplier_address: "",
      invoice_date: today,
      due_date: "",
      payment_terms: "",
      status: "pending",
      line_items: normalizeLineItemsForDocument(type, [{
        description: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0
      }]),
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0
    };
  }

  return {
    receipt_number: "",
    purchase_order_number: "",
    supplier_id: "",
    supplier_name: "",
    supplier_address: "",
    received_date: today,
    received_by: "",
    delivery_note: "",
    status: "received",
    line_items: normalizeLineItemsForDocument(type, [{
      description: "",
      ordered_quantity: 1,
      received_quantity: 1,
      unit: "EA",
      condition: "good",
      notes: ""
    }])
  };
};

export default function SmartUploadPage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('initial');
  const [documentType, setDocumentType] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [pendingSupplierName, setPendingSupplierName] = useState('');
  const [resolvedSupplierId, setResolvedSupplierId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [inventoryData, setInventoryData] = useState({ rawMaterials: [], equipment: [], finishedGoods: [] });

  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setError(null);
    setStep('initial');
    setDocumentType(null);
    setExtractedData(null);
    setFileUrl(null);
    setUploadedFileInfo(null);
    setShowSupplierModal(false);
    setPendingSupplierName('');
    setResolvedSupplierId(null);
    setIsDragOver(false);
    setDepartments([]);
    setInventoryData({ rawMaterials: [], equipment: [], finishedGoods: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = (selectedFile) => {
    let isValid = false;
    let mimeType = selectedFile.type;
    
    if (selectedFile.name.toLowerCase().endsWith('.jpg') && mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }
    
    if (ALLOWED_MIME_TYPES.includes(mimeType)) {
      isValid = true;
    } else {
      const extension = selectedFile.name.toLowerCase().split('.').pop();
      if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'].includes(extension)) {
        isValid = true;
      }
    }
    
    if (isValid) {
      setError(null);
      return true;
    } else {
      setError("Unsupported file type. Please upload a PDF, Word, Excel, PowerPoint, or image file (PNG, JPG, JPEG).");
      return false;
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) {
      setError("No files were dropped.");
      setFile(null);
      return;
    }

    if (droppedFiles.length > 1) {
      setError("Please drop only one file at a time.");
      setFile(null);
      return;
    }

    const droppedFile = droppedFiles[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
    } else {
      setFile(null);
    }
  };
  
  const processDocument = async () => {
    if (!file) return;

    // ===== CRITICAL FIX: Load all data FIRST and store in local variables =====
    let supplierData = [];
    let poData = [];
    let departmentData = [];
    let rawMaterialsData = [];
    let equipmentData = [];
    let finishedGoodsData = [];

    try {
      console.log('[Upload] ========== STARTING DOCUMENT PROCESSING ==========');
      console.log('[Upload] Step 1: Loading suppliers, POs, and departments...');
      
      [supplierData, poData, departmentData, rawMaterialsData, equipmentData, finishedGoodsData] = await Promise.all([
        Supplier.list(),
        PurchaseOrder.list(),
        Department.list(),
        RawMaterial.list(),
        Equipment.list(),
        FinishedGood.list()
      ]);
      
      console.log('[Upload] ✅ Data loaded successfully:');
      console.log('[Upload]    - Suppliers:', supplierData?.length || 0);
      console.log('[Upload]    - Purchase Orders:', poData?.length || 0);
      console.log('[Upload]    - Departments:', departmentData?.length || 0);
      console.log('[Upload]    - Raw materials:', rawMaterialsData?.length || 0);
      console.log('[Upload]    - Equipment:', equipmentData?.length || 0);
      console.log('[Upload]    - Finished goods:', finishedGoodsData?.length || 0);
      
      // Debug: Log all supplier names
      console.log('[Upload] 📋 All suppliers in database:');
      supplierData?.forEach(s => {
        const normalized = normalizeSupplierName(s.company_name);
        console.log(`[Upload]    - "${s.company_name}" → normalized: "${normalized}"`);
      });
      
      // Update state for use in confirmation form
      setSuppliers(supplierData);
      setPurchaseOrders(poData);
      setDepartments(departmentData || []);
      setInventoryData({
        rawMaterials: rawMaterialsData || [],
        equipment: equipmentData || [],
        finishedGoods: finishedGoodsData || []
      });
      
    } catch (e) {
      console.error("[Upload] ❌ Failed to load initial data:", e);
      setError("Failed to load supplier, purchase order, or department data. Please try again.");
      setStep('initial');
      return;
    }

    // ===== Step 2: Upload File =====
    setStep('uploading');
    setError(null);
    let uploadedFileUrl;
    
    console.log('[Upload] Step 2: Uploading file...');
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const uploadResult = await UploadFile({ file });
        uploadedFileUrl = uploadResult.file_url;
        setFileUrl(uploadedFileUrl);
        setUploadedFileInfo(uploadResult);
        console.log('[Upload] ✅ File uploaded successfully');
        break;
      } catch (e) {
        console.error(`[Upload] Upload attempt ${attempt} failed:`, e);
        
        const isTransientError = e.message && (
          e.message.includes('DatabaseTimeout') ||
          e.message.includes('too_many_connections') ||
          e.message.includes('500') ||
          e.message.includes('502') ||
          e.message.includes('503') ||
          e.message.includes('504')
        );
        
        if (isTransientError) {
          if (attempt < maxRetries) {
            setError(`Server busy (attempt ${attempt}/${maxRetries}). Retrying in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          } else {
            setError("Server is currently overloaded. Please try again in a few minutes.");
            setStep('initial');
            return;
          }
        } else {
          setError(`Failed to upload the file: ${e.message || 'Unknown error'}. Please try again.`);
          setStep('initial');
          return;
        }
      }
    }

    // ===== Step 3: Classify Document =====
    setStep('classifying');
    console.log('[Upload] Step 3: Classifying document type...');
    
    let docType;
    try {
      const classificationResult = await InvokeLLM({
        prompt: `You are an expert document classifier specializing in procurement documents. Analyze this document image EXTREMELY CAREFULLY and determine its type with MAXIMUM ACCURACY.

**CRITICAL INSTRUCTIONS:**
1. Read the ENTIRE document thoroughly - check headers, footers, tables, and all text
2. Look for PRIMARY PURPOSE indicators, not just keywords
3. Use the STRONGEST signals to make your determination
4. If you see multiple potential types, choose based on the DOMINANT purpose

**DOCUMENT TYPE DEFINITIONS & KEY INDICATORS:**

📋 **INVOICE** - A bill requesting payment for delivered goods/services:
   PRIMARY INDICATORS (any of these strongly suggest invoice):
   - Large header text saying "INVOICE" or "BILL"
   - "Invoice Number" or "Invoice #" field prominently displayed
   - "Amount Due", "Total Due", "Balance Due", or "Please Remit" sections
   - "Payment Terms" with due dates (e.g., "Net 30", "Due upon receipt")
   - Bank account details or "Remit To" payment address
   - Past tense language: "delivered", "provided", "completed"
   - Line items with actual charges for work done or goods delivered
   
   SECONDARY INDICATORS:
   - Reference to a PO number (invoices often cite the original PO)
   - "Date", "Invoice Date", or "Bill Date"
   - Tax calculations (Sales Tax, VAT, etc.)
   - Supplier contact info at the TOP (sender)
   - Customer info in "Bill To" section

🛒 **PURCHASE ORDER** - A buyer's request to purchase goods/services (future transaction):
   PRIMARY INDICATORS (any of these strongly suggest PO):
   - Large header text saying "PURCHASE ORDER" or "P.O."
   - "PO Number" or "Order Number" prominently displayed
   - "Ship To" address (where goods should be delivered)
   - "Date Required" or "Expected Delivery Date"
   - "Vendor" or "TO:" field (recipient of the order)
   - Future tense language: "please ship", "order for", "requesting"
   - Approval signatures from BUYER organization (Approved By, Authorized By)
   
   SECONDARY INDICATORS:
   - "Requisition Number"
   - Shipping method (Ship Via, FOB terms)
   - Payment terms FROM buyer's perspective
   - Line items listing what is being ORDERED (not yet received)
   - Buyer's letterhead at TOP

📦 **GOODS RECEIPT** - Confirmation that goods were physically received:
   PRIMARY INDICATORS (any of these strongly suggest goods receipt):
   - Header saying "GOODS RECEIPT", "DELIVERY NOTE", "PACKING SLIP", or "RECEIVING REPORT"
   - "Received Date" and "Received By" fields
   - "Delivery Note Number" or "Receipt Number"
   - Comparison columns: "Ordered Qty" vs "Received Qty"
   - Condition notes: checkboxes or fields for "Good", "Damaged", "Defective"
   - Receiver's signature or stamp
   
   SECONDARY INDICATORS:
   - Reference to PO number
   - No pricing information (or pricing is secondary)
   - Focus on physical quantities and condition
   - Warehouse or receiving dock location

**DECISION MAKING PROCESS:**
1. First, scan for the largest/boldest header text - what does it say?
2. Look for the most prominent NUMBER field - is it "Invoice #", "PO #", or "Receipt #"?
3. Check for payment language - "Amount Due" = Invoice, "Please Ship" = PO, "Received By" = Receipt
4. Verify with 2-3 secondary indicators to confirm
5. If still uncertain, choose based on the PRIMARY PURPOSE of the document

**OUTPUT FORMAT:**
Respond with:
- document_type: One of ["purchase_order", "invoice", "goods_receipt", "unknown"]
- confidence: 0-100 (be honest - if truly unsure, say so)
- reasoning: Brief explanation of your classification (cite specific indicators you found)

**IMPORTANT:** Only return "unknown" if the document is genuinely ambiguous or not procurement-related (e.g., a personal letter, advertisement, etc.). Most business documents can be classified if you look carefully!`,
        file_urls: [uploadedFileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string", enum: ["purchase_order", "invoice", "goods_receipt", "unknown"] },
            confidence: { type: "number", minimum: 0, maximum: 100 },
            reasoning: { type: "string" }
          }
        }
      });
      
      console.log('[Upload] Classification result:', classificationResult);
      
      docType = classificationResult.document_type;
      
      if (docType === 'unknown' || classificationResult.confidence < 60) {
        setError(
          `Document type could not be determined with sufficient confidence.\n\n` +
          `AI Analysis: ${classificationResult.reasoning}\n` +
          `Confidence: ${classificationResult.confidence}%\n\n` +
          `Tips for better recognition:\n` +
          `- Ensure the document is a clear, high-resolution scan\n` +
          `- Make sure it's a Purchase Order, Invoice, or Goods Receipt\n` +
          `- Check that key headers and numbers are clearly visible\n` +
          `- Avoid heavily handwritten or stylized documents`
        );
        setStep('initial');
        return;
      }
      
      if (!EXTRACTION_SCHEMAS[docType]) {
        setError(`Recognized document type "${docType}" but no extraction schema available.`);
        setStep('initial');
        return;
      }
      
      setDocumentType(docType);
      console.log('[Upload] ✅ Document classified as:', docType);

    } catch (e) {
      console.error("[Upload] ❌ Classification error:", e);
      if (isExtractionUnavailableError(e)) {
        setError(getExtractionUnavailableMessage(e));
        setStep('manual_review');
        return;
      }
      setError(`Failed to classify document: ${e.message || 'Unknown error'}`);
      setStep('initial');
      return;
    }

    // ===== Step 4: Extract Data =====
    setStep('extracting');
    console.log('[Upload] Step 4: Extracting data from document...');
    
    const extractionPrompts = {
      purchase_order: `Extract ALL information from this Purchase Order with MAXIMUM ACCURACY. This is a formal order document.

**EXTRACTION GUIDELINES:**
1. Read EVERY field carefully, including small text
2. For line items, extract EVERY row in the items table
3. For dates, use YYYY-MM-DD format (e.g., "October 2, 2025" → "2025-10-02")
4. For numbers, provide ONLY numeric values without currency symbols (e.g., "$2,399.99" → 2399.99)
5. If a field is blank or not present, leave it empty/null

**WHAT TO EXTRACT:**
- **PO Number**: Look for "PO #", "Order #", "No:", or similar
- **Supplier Info**: From "TO:" or "Vendor" section (name and full address)
- **Ship To Info**: From "SHIP TO:" section (name and full address)
- **Order Date**: Look for "DATE", "Order Date"
- **Date Required**: Look for "DATE REQUIRED", "Delivery Date", "Expected By"
- **Ship Via**: Shipping method (e.g., "USPS", "FedEx", "UPS")
- **Payment Terms**: Look for "TERMS" (e.g., "30 Days", "Upon Receipt", "Net 15")
- **Requisition No**: If present
- **Purpose/Project**: Look for notes, "For:", or project descriptions
- **Line Items**: Extract EVERY row with:
  * quantity_ordered
  * unit (EA, BOX, etc.)
  * stock_number (if any)
  * description (full text)
  * unit_price (numeric only)
  * total_price (numeric only)
- **Total Amount**: Final total at bottom
- **Signatures**: "Requested By", "Certified By", "Approved By" names

**CRITICAL:** Do NOT skip any line items. Extract ALL rows from the items table.`,

      invoice: `Extract ALL information from this Invoice with MAXIMUM ACCURACY. This is a payment request document.

**EXTRACTION GUIDELINES:**
1. Read EVERY field carefully, including headers, footers, and small text
2. Extract EVERY line item from the items/charges table
3. For dates, use YYYY-MM-DD format (e.g., "Thursday, October 2, 2025" → "2025-10-02")
4. For numbers, provide ONLY numeric values without currency symbols or commas (e.g., "$2,399.99" → 2399.99)
5. If a field is not present on the document, leave it empty/null
6. Pay special attention to TOTALS section at the bottom

**WHAT TO EXTRACT:**
- **Invoice Number**: Look for "INVOICE #", "TICKET-REG", "Invoice No", or similar prominent number
- **PO Number**: May be referenced as "PO NUMBER", "ORDER #", "REF" (if present)
- **Supplier Info**: Company name, address, phone, email from TOP/HEADER of invoice (the seller)
- **Invoice Date**: Look for "DATE", "Invoice Date", specific date near header
- **Due Date**: Look for "DUE DATE", "Payment Due", or calculate from payment terms
- **Payment Terms**: e.g., "Upon Receipt", "Net 30", "Due on Receipt"
- **Line Items**: Extract EVERY row from the items table with:
  * item_number (if present, e.g., "876121")
  * description (full product/service description)
  * quantity (numeric)
  * unit_price (price per item, numeric only)
  * total_price (line total, numeric only)
- **Subtotal**: Amount before tax (numeric)
- **Tax Amount**: Sales tax or VAT amount (numeric, may be $0.00)
- **Total Amount**: Final amount due - THIS IS CRITICAL (often labeled "TOTAL", "AMOUNT DUE", "Amt Due")

**CRITICAL:** 
- Extract ALL line items, don't skip any rows
- The "Total Amount" is the most important field - usually at the bottom in large text
- Double-check all monetary values are extracted as numbers only`,

      goods_receipt: `Extract ALL information from this Goods Receipt/Delivery Note with MAXIMUM ACCURACY.

**EXTRACTION GUIDELINES:**
1. This document confirms physical receipt of goods
2. Extract EVERY line item received
3. Pay attention to quantity comparisons (ordered vs received)
4. Note any condition issues (damaged, defective items)
5. For dates, use YYYY-MM-DD format

**WHAT TO EXTRACT:**
- **Receipt Number**: "Receipt #", "Delivery Note #", "Packing Slip #"
- **PO Number**: Referenced purchase order number
- **Supplier Info**: Sender name and address
- **Received Date**: When goods were physically received
- **Received By**: Person who signed for/received the goods
- **Delivery Note**: Carrier's delivery reference
- **Line Items**: Extract EVERY row with:
  * description
  * ordered_quantity
  * received_quantity
  * condition ("good", "damaged", or "defective")
  * notes (any special comments about that item)

**CRITICAL:** Note any discrepancies between ordered and received quantities.`
    };

    try {
      const extractionResult = await InvokeLLM({
        prompt: extractionPrompts[docType],
        file_urls: [uploadedFileUrl],
        response_json_schema: EXTRACTION_SCHEMAS[docType],
      });

      console.log('[Upload] ✅ Data extracted successfully:', extractionResult);

      if (extractionResult) {
        const extractedInfo = {
          ...extractionResult,
          line_items: normalizeLineItemsForDocument(docType, extractionResult.line_items || [])
        };
        setExtractedData(extractedInfo);
        
        // ===== CRITICAL FIX: Use supplierData (local variable) instead of suppliers (state) =====
        if (extractedInfo.supplier_name) {
          const normalizedExtractedName = normalizeSupplierName(extractedInfo.supplier_name);
          
          console.log('[Upload] 🔍 ========== SUPPLIER MATCHING PROCESS ==========');
          console.log('[Upload] 📄 Extracted supplier name:', extractedInfo.supplier_name);
          console.log('[Upload] 🔄 Normalized extracted name:', normalizedExtractedName);
          console.log('[Upload] 📊 Searching through', supplierData.length, 'suppliers');
          
          // Find matching supplier using the LOCAL supplierData variable (not state)
          const existingSupplier = supplierData.find(s => {
            if (!s.company_name) return false;
            const normalizedDbName = normalizeSupplierName(s.company_name);
            const isMatch = normalizedDbName === normalizedExtractedName;
            
            console.log(`[Upload]   "${s.company_name}" (${normalizedDbName}) vs "${extractedInfo.supplier_name}" (${normalizedExtractedName}) → ${isMatch ? '✅ MATCH!' : '❌ no match'}`);
            
            return isMatch;
          });
          
          if (existingSupplier) {
            console.log('[Upload] ✅ ========== MATCH FOUND ==========');
            console.log('[Upload] 🎯 Matched supplier:', existingSupplier.company_name);
            console.log('[Upload] 🆔 Supplier ID:', existingSupplier.id);
            setResolvedSupplierId(existingSupplier.id);
            setStep('confirming');
          } else {
            console.log('[Upload] ❌ ========== NO MATCH FOUND ==========');
            console.log('[Upload] 🚨 No existing supplier matches:', extractedInfo.supplier_name);
            console.log('[Upload] 💡 Showing supplier decision modal to user...');
            setPendingSupplierName(extractedInfo.supplier_name);
            setShowSupplierModal(true);
            setStep('confirming');
          }
        } else {
          console.log('[Upload] ⚠️ No supplier name extracted from document');
          setStep('confirming');
        }
      } else {
        setError(`Failed to extract data from the document. The AI returned no results.`);
        setStep('initial');
      }

    } catch (e) {
      console.error("[Upload] ❌ Extraction error:", e);
      
      if (isExtractionUnavailableError(e)) {
        setError(getExtractionUnavailableMessage(e));
        setStep('manual_review');
        return;
      }

      if (e.message && e.message.includes('unsupported image')) {
        setError("The image format is not supported. Please convert to PNG or ensure your JPG file is valid.");
      } else if (e.message && e.message.includes('too_many_connections')) {
        setError("Server is currently busy. Please try again in a few minutes.");
      } else {
        setError(`An error occurred while processing the document: ${e.message || 'Unknown error'}. Please ensure the document is clear and readable, then try again.`);
      }
      setStep('initial');
    }
  };

  const handleSupplierCreate = async (supplierData) => {
    try {
      const newSupplier = await Supplier.create(supplierData);
      setResolvedSupplierId(newSupplier.id);
      setSuppliers(prev => [...prev, newSupplier]);
      setShowSupplierModal(false);
    } catch (e) {
      console.error("Failed to create supplier:", e);
      setError("Failed to create new supplier. Please try again.");
    }
  };

  const handleSupplierSelect = (supplier) => {
    setResolvedSupplierId(supplier.id);
    setShowSupplierModal(false);
  };

  const handleSupplierSkip = () => {
    setResolvedSupplierId(null);
    setShowSupplierModal(false);
  };

  const startManualVerification = (type) => {
    setDocumentType(type);
    setExtractedData(createManualInitialData(type));
    setResolvedSupplierId(null);
    setPendingSupplierName('');
    setShowSupplierModal(false);
    setError(null);
    setStep('confirming');
  };

  const getInventoryEntity = (itemType) => {
    if (itemType === 'raw_material') return RawMaterial;
    if (itemType === 'equipment') return Equipment;
    if (itemType === 'finished_good') return FinishedGood;
    return null;
  };

  const getInventoryCollection = (itemType) => {
    if (itemType === 'raw_material') return inventoryData.rawMaterials || [];
    if (itemType === 'equipment') return inventoryData.equipment || [];
    if (itemType === 'finished_good') return inventoryData.finishedGoods || [];
    return [];
  };

  const getInventoryName = (itemType, item) => {
    if (!item) return '';
    if (itemType === 'raw_material') return item.material_name || item.item_name || item.name || '';
    if (itemType === 'equipment') return item.equipment_name || item.item_name || item.name || '';
    if (itemType === 'finished_good') return item.product_name || item.item_name || item.name || '';
    return item.item_name || item.name || '';
  };

  const createInventoryRecord = async (assignment, lineItem) => {
    const entity = getInventoryEntity(assignment.itemType);
    if (!entity) return null;

    const baseName = lineItem.description || assignment.itemDescription || 'Uploaded item';
    const unit = lineItem.unit_of_measure || lineItem.unit || 'units';

    if (assignment.itemType === 'raw_material') {
      return entity.create({
        material_name: baseName,
        sku: lineItem.stock_number || lineItem.item_number || `RM-${Date.now()}`,
        category: lineItem.category || 'Uploaded Document',
        current_quantity: 0,
        unit_of_measure: unit,
        unit_cost: toNumber(lineItem.unit_price, 0),
        supplier_id: resolvedSupplierId || null,
        department_id: assignment.assignToDepartment || null,
        notes: `Created during ${documentType.replace('_', ' ')} verification.`
      });
    }

    if (assignment.itemType === 'equipment') {
      return entity.create({
        equipment_name: baseName,
        asset_tag: lineItem.stock_number || lineItem.item_number || `EQ-${Date.now()}`,
        serial_number: lineItem.serial_number || '',
        category: lineItem.category || 'Uploaded Document',
        status: 'idle',
        location: assignment.assignToDepartment || '',
        purchase_price: toNumber(lineItem.total_price || lineItem.unit_price, 0),
        supplier_id: resolvedSupplierId || null,
        notes: `Created during ${documentType.replace('_', ' ')} verification.`
      });
    }

    return entity.create({
      product_name: baseName,
      sku: lineItem.stock_number || lineItem.item_number || `FG-${Date.now()}`,
      batch_number: '',
      quantity: 0,
      unit_of_measure: unit,
      cost_per_unit: toNumber(lineItem.unit_price, 0),
      notes: `Created during ${documentType.replace('_', ' ')} verification.`
    });
  };

  const updateInventoryQuantity = async (assignment, inventoryItem, lineItem) => {
    if (!inventoryItem || !assignment.receiveToInventory) return inventoryItem;

    const quantityToAdd = toNumber(assignment.stockQuantity, 0);
    if (quantityToAdd <= 0) return inventoryItem;

    if (assignment.itemType === 'raw_material') {
      return RawMaterial.update(inventoryItem.id, {
        current_quantity: toNumber(inventoryItem.current_quantity, 0) + quantityToAdd,
        unit_of_measure: inventoryItem.unit_of_measure || lineItem.unit_of_measure || lineItem.unit || 'units',
        unit_cost: toNumber(lineItem.unit_price, inventoryItem.unit_cost || 0),
        department_id: assignment.assignToDepartment || inventoryItem.department_id || null
      });
    }

    if (assignment.itemType === 'finished_good') {
      return FinishedGood.update(inventoryItem.id, {
        quantity: toNumber(inventoryItem.quantity, 0) + quantityToAdd,
        unit_of_measure: inventoryItem.unit_of_measure || lineItem.unit_of_measure || lineItem.unit || 'units',
        cost_per_unit: toNumber(lineItem.unit_price, inventoryItem.cost_per_unit || 0)
      });
    }

    if (assignment.itemType === 'equipment') {
      return Equipment.update(inventoryItem.id, {
        status: assignment.issueNow ? 'in_use' : 'idle',
        location: assignment.assignToDepartment || inventoryItem.location || ''
      });
    }

    return inventoryItem;
  };

  const applyInventoryAssignments = async (finalData) => {
    const assignments = finalData.assignments || [];
    if (!assignments.length) return finalData.line_items || [];

    const updatedLineItems = (finalData.line_items || []).map(item => ({ ...item }));

    for (const assignment of assignments) {
      const lineItem = finalData.line_items?.[assignment.itemIndex];
      if (!lineItem || !assignment.itemType || assignment.itemType === 'none') continue;

      let inventoryItem = null;
      if (assignment.itemId && assignment.itemId !== 'create_new') {
        inventoryItem = getInventoryCollection(assignment.itemType).find(item => item.id === assignment.itemId) || null;
      } else if (assignment.itemId === 'create_new') {
        inventoryItem = await createInventoryRecord(assignment, lineItem);
      }

      if (inventoryItem) {
        inventoryItem = await updateInventoryQuantity(assignment, inventoryItem, lineItem);
        if (updatedLineItems[assignment.itemIndex]) {
          updatedLineItems[assignment.itemIndex] = {
            ...updatedLineItems[assignment.itemIndex],
            item_type: assignment.itemType,
            item_id: inventoryItem.id,
            department_id: assignment.assignToDepartment || updatedLineItems[assignment.itemIndex].department_id || null,
            distribution_status: 'reviewed',
            receive_to_inventory: !!assignment.receiveToInventory
          };
        }
      }

      if (assignment.issueNow && toNumber(assignment.assignQuantity, 0) > 0 && assignment.assignToEmployee) {
        const issueQuantity = toNumber(assignment.assignQuantity, 0);
        const unit = lineItem.unit_of_measure || lineItem.unit || inventoryItem?.unit_of_measure || 'units';

        await IssuedItem.create({
          item_type: assignment.itemType,
          item_id: inventoryItem?.id || null,
          item_name: getInventoryName(assignment.itemType, inventoryItem) || lineItem.description,
          sku_or_serial: inventoryItem?.sku || inventoryItem?.asset_tag || inventoryItem?.serial_number || lineItem.stock_number || 'N/A',
          quantity_issued: issueQuantity,
          unit_of_measure: unit,
          issued_to_employee: assignment.assignToEmployee,
          issued_to_department: assignment.assignToDepartment || '',
          issue_date: new Date().toISOString().split('T')[0],
          expected_return_date: assignment.expectedReturnDate || null,
          status: 'issued',
          purpose: assignment.purpose || `Issued during ${documentType.replace('_', ' ')} verification`,
          notes: `Auto-issued during document upload verification: ${documentType}`,
          issued_by: 'Smart Upload Verification'
        });

        if (inventoryItem && assignment.itemType === 'raw_material') {
          await RawMaterial.update(inventoryItem.id, {
            current_quantity: Math.max(0, toNumber(inventoryItem.current_quantity, 0) - issueQuantity)
          });
        } else if (inventoryItem && assignment.itemType === 'finished_good') {
          await FinishedGood.update(inventoryItem.id, {
            quantity: Math.max(0, toNumber(inventoryItem.quantity, 0) - issueQuantity)
          });
        } else if (inventoryItem && assignment.itemType === 'equipment') {
          await Equipment.update(inventoryItem.id, { status: 'in_use' });
        }
      }
    }

    return updatedLineItems;
  };
  
  const handleSave = async (finalData) => {
    setStep('saving');
    setError(null);
    
    try {
        const supplierId = resolvedSupplierId || finalData.supplier_id || null;

        const assignments = finalData.assignments || [];
        const documentData = { ...finalData };
        delete documentData.assignments;

        const poId = documentData.purchase_order_id || null;

        const dataToCreate = {
            ...documentData,
            supplier_id: supplierId,
            purchase_order_id: poId,
            file_url: fileUrl,
        };

        if (documentType === 'invoice' && supplierId) {
            delete dataToCreate.supplier_name;
            delete dataToCreate.supplier_address;
        }
        delete dataToCreate.supplier_email;
        delete dataToCreate.supplier_phone;
        delete dataToCreate.purchase_order_number;

        let savedRecord;
        if (documentType === 'purchase_order') {
            savedRecord = await PurchaseOrder.create(dataToCreate);
        } else if (documentType === 'invoice') {
            savedRecord = await Invoice.create(dataToCreate);
        } else if (documentType === 'goods_receipt') {
            savedRecord = await GoodsReceipt.create(dataToCreate);
        } else {
            throw new Error(`Unknown document type: ${documentType}`);
        }

        if (!savedRecord) {
            throw new Error('Failed to create record - no data returned');
        }

        try {
            if (documentType === 'invoice') {
                await updateBudgetOnInvoice({ 
                    invoiceId: savedRecord.id, 
                    oldStatus: null,
                    newStatus: savedRecord.status 
                });

                if (finalData.amountMismatchWarning) {
                    await Notification.create({
                        recipient_id: 'admin',
                        type: 'alert',
                        title: 'Invoice-PO Amount Mismatch',
                        message: `Invoice ${savedRecord.invoice_number} amount (${savedRecord.total_amount}) differs significantly from PO amount. Please review.`,
                        action_url: createPageUrl(`Invoices?highlight=${savedRecord.id}`)
                    });
                }
            }
        } catch (postSaveError) {
            console.error("Post-save actions failed:", postSaveError);
        }

        if (assignments.length > 0) {
            try {
              const distributedLineItems = await applyInventoryAssignments({
                ...finalData,
                line_items: documentData.line_items || []
              });

              if (distributedLineItems?.length) {
                const updatePayload = { line_items: distributedLineItems };
                if (documentType === 'purchase_order') {
                  await PurchaseOrder.update(savedRecord.id, updatePayload);
                } else if (documentType === 'invoice') {
                  await Invoice.update(savedRecord.id, updatePayload);
                } else if (documentType === 'goods_receipt') {
                  await GoodsReceipt.update(savedRecord.id, updatePayload);
                }
              }
            } catch (assignmentError) {
              console.error("Inventory distribution or issuing failed:", assignmentError);
              await Notification.create({
                recipient_id: 'admin',
                type: 'alert',
                title: 'Document saved, inventory distribution needs review',
                message: `The ${documentType.replace('_', ' ')} was saved, but one or more inventory distribution actions failed: ${assignmentError.message}`,
                action_url: createPageUrl("Inventory")
              });
            }
        }

        setStep('success');
        
    } catch (e) {
        console.error("Save error:", e);
        const errorMessage = e.message || 'Unknown error occurred';
        setError(`Failed to save the record: ${errorMessage}. Please check the data and try again.`);
        setStep('confirming');
    }
  };

  const UploadCard = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-500" />
          Smart Document Upload
        </CardTitle>
        <CardDescription>Upload a Purchase Order, Invoice, or Goods Receipt. The document is saved first; automatic extraction will run when the document service is configured.</CardDescription>
      </CardHeader>
      <CardContent>
         <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
            <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_EXTENSIONS} onChange={handleFileSelect} className="hidden" />
            
            {!file ? (
              <div>
                <div className="flex justify-center space-x-4 mb-4 text-slate-400">
                  <FileText className="w-10 h-10" />
                  <FileImage className="w-10 h-10" />
                  <FileSpreadsheet className="w-10 h-10" />
                </div>
                <p className={`text-lg font-medium mb-2 ${isDragOver ? 'text-blue-700' : 'text-slate-900'}`}>
                  {isDragOver ? 'Drop your document here' : 'Drop your document here or click to browse'}
                </p>
                <p className="text-sm text-slate-500 mb-4">Supports PDF, Word, Excel, PowerPoint, and images (PNG, JPG, JPEG)</p>
                <p className="text-xs text-slate-400 mb-4">
                  Tip: For best results, use clear, high-resolution scans with visible headers and numbers
                </p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Browse Files</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-medium text-slate-900">{file.name}</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={processDocument}>Upload Document</Button>
                  <Button variant="outline" onClick={resetState}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
      </CardContent>
    </Card>
  );

  const ProcessingIndicator = ({ step }) => {
      const messages = {
          uploading: "Uploading file...",
          classifying: "Checking document extraction availability...",
          extracting: "Extracting all data fields, line items, and details from the document...",
      };
      return (
          <div className="text-center p-16 border-2 border-dashed rounded-lg">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin mb-4"/>
              <p className="text-lg font-medium text-slate-900">{messages[step]}</p>
              <p className="text-sm text-slate-500">The app keeps the source document before attempting extraction.</p>
          </div>
      )
  };

  const ManualReviewCard = () => (
    <Card className="mb-6 border-blue-200 bg-blue-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <FileQuestion className="h-5 w-5 text-blue-600" />
          Document saved. Continue with manual verification.
        </CardTitle>
        <CardDescription>
          Automatic extraction is unavailable right now, but the uploaded source document is available for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-white p-4">
          <p className="font-medium text-slate-900">{uploadedFileInfo?.file_name || file?.name || "Uploaded document"}</p>
          <p className="mt-1 text-sm text-slate-600">
            {uploadedFileInfo?.storage_path
              ? "Stored in Supabase Storage."
              : "Stored for this browser session because Supabase storage is not configured locally."}
          </p>
          {fileUrl && (
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Document
              </a>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Button onClick={() => startManualVerification("purchase_order")}>
            Verify as Purchase Order
          </Button>
          <Button variant="outline" onClick={() => startManualVerification("invoice")}>
            Verify as Invoice
          </Button>
          <Button variant="outline" onClick={() => startManualVerification("goods_receipt")}>
            Verify as Goods Receipt
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={resetState}>Upload another document</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {step === 'success' && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {documentType === 'purchase_order' ? 'Purchase Order' : documentType === 'invoice' ? 'Invoice' : 'Goods Receipt'} processed and saved successfully! {resolvedSupplierId ? 'Supplier information has been linked.' : ''}
            <Button variant="link" onClick={resetState} className="ml-2">Upload another document</Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {(step === 'initial' || (step === 'confirming' && error)) && <UploadCard />}
      
      {['uploading', 'classifying', 'extracting'].includes(step) && <ProcessingIndicator step={step} />}

      {step === 'manual_review' && <ManualReviewCard />}

      {step === 'confirming' && !error && (
        <DataConfirmationForm 
          documentType={documentType}
          initialData={extractedData}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          departments={departments}
          inventoryData={inventoryData}
          onSave={handleSave}
          onCancel={resetState}
          isSaving={step === 'saving'}
        />
      )}

      <SupplierDecisionModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        supplierName={pendingSupplierName}
        existingSuppliers={suppliers}
        onCreateNew={handleSupplierCreate}
        onSelectExisting={handleSupplierSelect}
        onSkip={handleSupplierSkip}
      />
    </div>
  );
}
