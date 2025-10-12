import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateInvitationCode } from '@/api/functions';

export default function InvitationCodeEntry({ onAccessGranted }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter an invitation code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log("[CODE ENTRY] Submitting code:", code.trim().toUpperCase());
      const response = await validateInvitationCode({ code: code.trim() });
      
      console.log("[CODE ENTRY] Validation response:", response);
      
      if (response.data && response.data.success) {
        setSuccess(response.data.message || 'Access granted! Welcome to the app.');
        console.log("[CODE ENTRY] Access granted, calling onAccessGranted");
        
        // Small delay to show success message before redirecting
        setTimeout(() => {
          onAccessGranted();
        }, 1500);
      } else {
        const errorMsg = response.data?.error || 'Failed to validate code.';
        setError(errorMsg);
        console.error("[CODE ENTRY] Validation failed:", errorMsg);
      }
    } catch (err) {
      console.error('[CODE ENTRY] Code validation error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Only allow alphanumeric
    if (value.length <= 10) { // Limit to 10 characters
      setCode(value);
      if (error) setError(''); // Clear error when user types
      if (success) setSuccess(''); // Clear success when user types
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <CardTitle className="text-2xl font-bold text-slate-900">Enter Invitation Code</CardTitle>
          <CardDescription className="text-slate-600">
            You need a valid access code to use the Tobolar Procurement Platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="invitation-code"
                placeholder="ENTER-CODE"
                value={code}
                onChange={handleCodeChange}
                disabled={loading || success}
                className="text-center text-lg py-6 tracking-widest font-mono uppercase"
                autoComplete="off"
                maxLength={10}
              />
              <p className="text-xs text-slate-500 text-center mt-2">
                Enter the 10-character code provided by your administrator
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading || !code.trim() || success}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Access Granted!
                </>
              ) : (
                'Grant Access'
              )}
            </Button>
          </form>
          
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-slate-500">
              Don't have a code? Contact your administrator to get access.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Access codes expire 10 minutes after generation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}