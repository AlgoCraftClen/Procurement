import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Printer, QrCode } from 'lucide-react';
import { generateBarcode } from '@/api/functions';

const LABEL_SIZES = [
  {
    id: 'small',
    name: 'Small (1" x 2")',
    width: '2in',
    height: '1in',
    description: 'Best for small tools, screws, small parts',
    qrSize: '0.7in',
    fontSize: '8pt',
    showDescription: false
  },
  {
    id: 'medium',
    name: 'Medium (2" x 4")',
    width: '4in',
    height: '2in',
    description: 'Standard size for equipment, boxes',
    qrSize: '1.3in',
    fontSize: '10pt',
    showDescription: true
  },
  {
    id: 'large',
    name: 'Large (4" x 6")',
    width: '6in',
    height: '4in',
    description: 'Heavy-duty asset tags for large equipment',
    qrSize: '2in',
    fontSize: '12pt',
    showDescription: true
  }
];

export default function LabelGenerator({ isOpen, onClose, item, itemType }) {
  const [selectedSize, setSelectedSize] = useState('medium');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [barcodeUrl, setBarcodeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generateBarcodes = useCallback(async () => {
    setLoading(true);
    try {
      let identifier = '';
      let itemName = '';
      
      if (itemType === 'equipment') {
        identifier = item.serial_number || item.id;
        itemName = item.equipment_name;
      } else if (itemType === 'raw_material') {
        identifier = item.sku || item.id;
        itemName = item.material_name;
      } else if (itemType === 'finished_good') {
        identifier = item.sku || item.id;
        itemName = item.product_name;
      }

      const qrContent = `${window.location.origin}?item=${itemType}&id=${item.id}`;
      const qrResult = await generateBarcode({ content: qrContent, type: 'qr' });
      setQrCodeUrl(qrResult.data.barcode_url);

      const barcodeResult = await generateBarcode({ content: identifier, type: '1d' });
      setBarcodeUrl(barcodeResult.data.barcode_url);

    } catch (error) {
      console.error('Failed to generate barcodes:', error);
    } finally {
      setLoading(false);
    }
  }, [item, itemType]);

  useEffect(() => {
    if (isOpen && item) {
      generateBarcodes();
    }
  }, [isOpen, item, generateBarcodes]);

  const handlePrint = () => {
    window.print();
  };

  const selectedTemplate = LABEL_SIZES.find(s => s.id === selectedSize);

  const getLabelContent = () => {
    if (!item || !selectedTemplate) return null;

    let identifier = '';
    let itemName = '';
    let description = '';

    if (itemType === 'equipment') {
      identifier = item.serial_number || item.id.substring(0, 10);
      itemName = item.equipment_name;
      description = `Category: ${item.category || 'N/A'}`;
    } else if (itemType === 'raw_material') {
      identifier = item.sku || item.id.substring(0, 10);
      itemName = item.material_name;
      description = `SKU: ${item.sku} | Qty: ${item.current_quantity} ${item.unit_of_measure}`;
    } else if (itemType === 'finished_good') {
      identifier = item.sku || item.id.substring(0, 10);
      itemName = item.product_name;
      description = `Batch: ${item.batch_number || 'N/A'}`;
    }

    return (
      <div
        style={{
          width: selectedTemplate.width,
          height: selectedTemplate.height,
          border: '2px solid #000',
          padding: '0.2in',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: 'white'
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '0.1in' }}>
          <div style={{ fontSize: selectedTemplate.fontSize, fontWeight: 'bold' }}>Tobolar Procurement</div>
          <div style={{ fontSize: `${parseInt(selectedTemplate.fontSize) - 2}pt` }}>Asset Tag</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingTop: '0.1in' }}>
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              style={{ width: selectedTemplate.qrSize, height: selectedTemplate.qrSize }}
            />
          )}
          <div style={{ flex: 1, textAlign: 'center', paddingLeft: '0.1in' }}>
            <div style={{ fontSize: `${parseInt(selectedTemplate.fontSize) + 4}pt`, fontWeight: 'bold', marginBottom: '0.05in' }}>
              {identifier}
            </div>
            <div style={{ fontSize: selectedTemplate.fontSize }}>{itemName}</div>
            {selectedTemplate.showDescription && (
              <div style={{ fontSize: `${parseInt(selectedTemplate.fontSize) - 2}pt`, color: '#666', marginTop: '0.05in' }}>
                {description}
              </div>
            )}
          </div>
        </div>

        {barcodeUrl && (
          <div style={{ borderTop: '1px solid #000', paddingTop: '0.05in', textAlign: 'center' }}>
            <img
              src={barcodeUrl}
              alt="Barcode"
              style={{ height: '0.4in', maxWidth: '100%' }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Generate Asset Label</DialogTitle>
          <DialogDescription>
            Select a label size and print the barcode label for this item
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="ml-4">Generating barcodes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">1. Select Label Size</h3>
              <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                {LABEL_SIZES.map((size) => (
                  <div key={size.id} className="flex items-start space-x-3 mb-3">
                    <RadioGroupItem value={size.id} id={size.id} />
                    <Label htmlFor={size.id} className="cursor-pointer flex-1">
                      <div className="font-medium">{size.name}</div>
                      <div className="text-sm text-slate-500">{size.description}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h3 className="font-semibold mb-4">2. Preview & Print</h3>
              <Card>
                <CardContent className="p-6 flex justify-center items-center bg-slate-50">
                  <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                    {getLabelContent()}
                  </div>
                </CardContent>
              </Card>
              <Button onClick={handlePrint} className="w-full mt-4">
                <Printer className="w-4 h-4 mr-2" />
                Print Label
              </Button>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [style*="width: ${selectedTemplate?.width}"] {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
              transform: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
