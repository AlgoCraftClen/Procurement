import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Trash2, Search } from 'lucide-react';
import { identifyDuplicateInvoices } from '@/api/functions';
import { cleanupDuplicateInvoices } from '@/api/functions';

export default function DataCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [cleanupResult, setCleanupResult] = useState(null);

  const identifyDuplicates = async () => {
    setLoading(true);
    try {
      const result = await identifyDuplicateInvoices();
      setDuplicates(result.data.duplicates || []);
      setCleanupResult(null);
    } catch (error) {
      console.error('Error identifying duplicates:', error);
      alert('Failed to identify duplicates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!window.confirm('Are you sure you want to delete ALL duplicate invoices? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await cleanupDuplicateInvoices({ confirm_cleanup: true });
      setCleanupResult(result.data);
      setDuplicates([]); // Clear the duplicates since they're now cleaned up
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      alert('Failed to cleanup duplicates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Cleanup</h1>
        <p className="text-slate-600">Identify and clean up duplicate invoices in the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Identify Duplicate Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={identifyDuplicates} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Scan for Duplicates
            </Button>

            {duplicates.length > 0 && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {duplicates.length} sets of duplicate invoices affecting data integrity.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-medium mb-3">Duplicate Invoice Sets:</h3>
                  {duplicates.map((duplicate, index) => (
                    <div key={index} className="border-b pb-2 mb-2 last:border-b-0">
                      <p className="font-medium">Invoice #{duplicate.invoice_number}</p>
                      <p className="text-sm text-slate-600">
                        {duplicate.total_count} copies found - Keeping original from {new Date(duplicate.original.created_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-red-600">
                        Will delete {duplicate.duplicates_to_delete.length} duplicates
                      </p>
                    </div>
                  ))}
                </div>

                <Button onClick={cleanupDuplicates} variant="destructive" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete All Duplicates
                </Button>
              </div>
            )}

            {duplicates.length === 0 && !loading && (
              <Alert>
                <AlertDescription>
                  Click "Scan for Duplicates" to check for duplicate invoices in the system.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {cleanupResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Cleanup Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              Successfully deleted {cleanupResult.total_deleted} duplicate invoices.
              Your data is now clean and consistent.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
