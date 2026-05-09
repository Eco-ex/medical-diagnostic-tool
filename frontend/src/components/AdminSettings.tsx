import { useState } from 'react';
import { useUpdateOpenAiApiKey, useGetOpenAiApiKey } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Key, Loader2, CheckCircle, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function AdminSettings() {
  const [openAiKey, setOpenAiKey] = useState('');
  
  const { data: keyInfo, isLoading: configLoading } = useGetOpenAiApiKey();
  const updateOpenAiKey = useUpdateOpenAiApiKey();
  const hasKey = !!keyInfo?.hasKey;
  const maskedKey = keyInfo?.openAiApiKey ?? '';

  const handleUpdateOpenAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openAiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!openAiKey.startsWith('sk-')) {
      toast.error('Invalid API key format. OpenAI API keys should start with "sk-"');
      return;
    }

    try {
      await updateOpenAiKey.mutateAsync(openAiKey);
      toast.success('OpenAI API key updated successfully');
      setOpenAiKey('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update OpenAI API key';
      toast.error(errorMessage);
      console.error('OpenAI key update error:', error);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Manage OpenAI API configuration for AI-powered treatment analysis</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          Only administrators can view or modify these settings. The API key is masked when fetched and only the
          last four characters are shown. To rotate the key, paste a new value below and submit.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>OpenAI API Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the OpenAI API key for AI-powered treatment analysis. The system uses OpenAI's GPT models to analyze
            treatment options based on patient data and scientific literature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Current Configuration Display */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold">Current Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">OpenAI API Key:</span>
                    <div className="mt-1 font-mono text-xs bg-background px-2 py-1 rounded border">
                      {hasKey ? maskedKey : 'Not configured'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {hasKey ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">API key is configured</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                        <span className="text-amber-600">API key not configured - AI features will not work</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* OpenAI API Key Configuration */}
              <form onSubmit={handleUpdateOpenAiKey} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    disabled={updateOpenAiKey.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your OpenAI API key (starts with "sk-"). It will be stored in the backend's settings file.
                  </p>
                </div>
                <Button type="submit" disabled={updateOpenAiKey.isPending || !openAiKey.trim()}>
                  {updateOpenAiKey.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update API Key
                    </>
                  )}
                </Button>
              </form>

              <Separator />

              {/* Configuration Guide */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Configuration Guide</AlertTitle>
                <AlertDescription className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-2">How to Configure OpenAI:</p>
                    <ol className="list-inside list-decimal space-y-1.5 text-sm">
                      <li>
                        Log in to your{' '}
                        <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          OpenAI Platform
                        </a>
                      </li>
                      <li>Navigate to API Keys section in your account settings</li>
                      <li>Create a new API key (starts with "sk-") or copy an existing one</li>
                      <li>Paste the API key in the field above and click Update API Key</li>
                      <li>Test the configuration by performing a treatment analysis in the patient dashboard</li>
                    </ol>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">Required API Permissions:</p>
                    <ul className="list-inside list-disc space-y-1.5 text-sm">
                      <li>Your OpenAI API key must have access to GPT models (GPT-4 or GPT-3.5-turbo recommended)</li>
                      <li>Ensure your OpenAI account has sufficient credits or an active billing plan</li>
                      <li>The API key should have permissions for chat completions endpoint</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Common Issues and Solutions:</p>
                    <ul className="list-inside list-disc space-y-1.5 text-sm">
                      <li>
                        <strong>Authentication Failed (401/403):</strong> Verify your API key is correct and hasn't been revoked. 
                        Check that you're using the correct key for your OpenAI account.
                      </li>
                      <li>
                        <strong>API Key Not Configured:</strong> Ensure you've entered and saved a valid OpenAI API key in this settings panel.
                      </li>
                      <li>
                        <strong>Network Timeout:</strong> The Internet Computer's HTTP outcall system has timeout limits. If requests consistently timeout, 
                        the backend may need optimization or the OpenAI service may be experiencing delays. Try simpler queries or contact your administrator.
                      </li>
                      <li>
                        <strong>Invalid Request (400):</strong> The query format may be incorrect. This typically indicates a backend JSON formatting issue. 
                        The backend must properly escape special characters and format valid JSON for the OpenAI API.
                      </li>
                      <li>
                        <strong>Rate Limits (429):</strong> OpenAI has rate limits based on your plan. Consider upgrading if you 
                        experience frequent rate limit errors.
                      </li>
                      <li>
                        <strong>Service Errors (500+):</strong> These are typically temporary issues with OpenAI's infrastructure. 
                        Check{' '}
                        <a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          status.openai.com
                        </a>{' '}
                        for service status.
                      </li>
                      <li>
                        <strong>Insufficient Credits:</strong> Ensure your OpenAI account has sufficient credits or an active billing plan.
                      </li>
                      <li>
                        <strong>JSON Formatting Errors:</strong> If you see JSON parsing errors, the backend needs to properly 
                        serialize JSON payloads using a JSON library rather than string concatenation. Contact your system administrator.
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button variant="link" className="h-auto p-0 justify-start" asChild>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        OpenAI Platform - Manage API Keys
                      </a>
                    </Button>
                    <Button variant="link" className="h-auto p-0 justify-start" asChild>
                      <a href="https://platform.openai.com/docs/api-reference/chat" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        OpenAI Chat Completions API Documentation
                      </a>
                    </Button>
                    <Button variant="link" className="h-auto p-0 justify-start" asChild>
                      <a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        OpenAI Service Status
                      </a>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
