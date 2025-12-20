import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DragDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  fileName?: string;
  id: string;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export function DragDropZone({
  onFileSelect,
  accept = '.csv',
  fileName,
  id,
  acceptedTypes = ['.csv'],
  maxSizeMB = 10,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File too large. Max size: ${maxSizeMB}MB`;
    }

    return null;
  }, [acceptedTypes, maxSizeMB]);

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setDragError(error);
      return;
    }
    setDragError(null);
    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) {
      setDragError('Drop detected but no file received');
      return;
    }

    if (files.length > 1) {
      setDragError('Please drop only one file');
      return;
    }

    handleFile(files[0]);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/25 bg-background hover:border-primary/50 hover:bg-muted/50',
          dragError && 'border-destructive bg-destructive/5'
        )}
      >
        <Upload className={cn(
          'w-8 h-8 mx-auto mb-2 transition-colors',
          isDragging ? 'text-primary' : 'text-muted-foreground'
        )} />
        <p className="text-sm text-muted-foreground mb-3">
          {fileName ? (
            <span className="flex items-center justify-center gap-2 text-foreground font-medium">
              <FileText className="w-4 h-4" />
              {fileName}
            </span>
          ) : isDragging ? (
            <span className="text-primary font-medium">Drop file here...</span>
          ) : (
            <>
              <span className="font-medium">Drag & drop</span> a file here, or click to browse
            </>
          )}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          id={id}
        />
        <Button size="sm" variant="outline" type="button" onClick={(e) => e.stopPropagation()}>
          <label htmlFor={id} className="cursor-pointer">
            Choose File
          </label>
        </Button>
      </div>

      {dragError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {dragError}
        </div>
      )}
    </div>
  );
}
