import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScanLine, Search, X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose, inventoryItems }) {
  const [scanInput, setScanInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleScan = () => {
    if (!scanInput.trim()) {
      setError('Please enter or scan a barcode');
      return;
    }

    const searchTerm = scanInput.trim().toLowerCase();
    const foundItem = inventoryItems.find(item => {
      const sku = item.sku?.toLowerCase() || '';
      const serial = item.serial_number?.toLowerCase() || '';
      const id = item.id?.toLowerCase() || '';
      
      return sku === searchTerm || serial === searchTerm || id === searchTerm;
    });

    if (foundItem) {
      onScan(foundItem);
      setScanInput('');
      setError('');
    } else {
      setError(`No item found with barcode: ${scanInput}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="w-5 h-5 text-blue-600" />
            Barcode Scanner
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Scan or type barcode (SKU, Serial #, or ID)..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleScan}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-slate-600">
          💡 Tip: Use a barcode scanner for faster input, or manually type the item's SKU, serial number, or ID
        </p>
      </CardContent>
    </Card>
  );
}