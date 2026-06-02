'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { KNOWLEDGE_PRESETS, type KnowledgePreset } from '@/types';
import { useUploadDocument } from '@/hooks/useQueries';

const PRESET_LABELS: Record<KnowledgePreset, string> = {
  research_paper: 'Research paper',
  clinical_guideline: 'Clinical guideline',
  case_report: 'Case report',
};

export function KnowledgeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<KnowledgePreset>('research_paper');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are accepted.');
      return;
    }
    setFile(f);
  };

  const handleUpload = () => {
    if (!file) return;
    upload.mutate(
      { file, preset },
      {
        onSuccess: (result) => {
          toast.success(
            result.deduped
              ? 'Identical content is already in the knowledge base — skipped.'
              : `Uploaded "${file.name}" — processing started.`,
          );
          clearFile();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed.'),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <CardTitle>Upload document</CardTitle>
        </div>
        <CardDescription>
          Add a PDF to the knowledge base. It is parsed, chunked, embedded, and indexed automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag a PDF here, or click to browse (max 50MB)
              </p>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="preset">Document type</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as KnowledgePreset)}>
            <SelectTrigger id="preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KNOWLEDGE_PRESETS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRESET_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleUpload} disabled={!file || upload.isPending} className="w-full">
          {upload.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload &amp; index
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
