'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Key, CheckCircle, ExternalLink, Info, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { getStoredAnthropicKey, setStoredAnthropicKey } from '../lib/api';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 11) return '****';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

export default function AdminSettings() {
  const [storedKey, setStoredKey] = useState<string>(() => getStoredAnthropicKey());
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onStorage = () => setStoredKey(getStoredAnthropicKey());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const hasKey = storedKey.length > 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error('Please enter an API key');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      toast.error('Invalid API key format. Anthropic keys start with "sk-ant-".');
      return;
    }
    setStoredAnthropicKey(trimmed);
    setStoredKey(trimmed);
    setDraft('');
    toast.success('Anthropic API key saved for this session');
  };

  const handleClear = () => {
    setStoredAnthropicKey('');
    setStoredKey('');
    toast.success('Anthropic API key cleared');
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">
          Configure your Anthropic API key for AI-powered treatment analysis.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>How your key is stored</AlertTitle>
        <AlertDescription>
          Your API key is kept in this browser tab&apos;s session storage and forwarded only when you
          run a treatment analysis. It is never persisted on the server. Closing this tab clears it.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Anthropic API Configuration</CardTitle>
          </div>
          <CardDescription>
            Paste your Anthropic key below. The system uses it to call Anthropic&apos;s Messages API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold">Current Configuration</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Anthropic API Key:</span>
                <div className="mt-1 font-mono text-xs bg-background px-2 py-1 rounded border">
                  {hasKey ? maskKey(storedKey) : 'Not configured'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {hasKey ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">API key is configured for this session</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-600">
                      API key not configured &mdash; AI features will not work
                    </span>
                  </>
                )}
              </div>
              {hasKey && (
                <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
                  <Trash2 className="h-3 w-3" />
                  Clear key
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <Input
                id="anthropic-key"
                type="password"
                placeholder="sk-ant-..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your Anthropic API key (starts with &quot;sk-ant-&quot;). It is saved only in this
                browser tab.
              </p>
            </div>
            <Button type="submit" disabled={!draft.trim()}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Save key
            </Button>
          </form>

          <Separator />

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Where to get a key</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                Generate a key at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  console.anthropic.com/settings/keys
                </a>
                . The key needs access to the Messages API and an active billing plan.
              </p>
              <Button variant="link" className="h-auto p-0 justify-start" asChild>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Anthropic Console
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
