import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Upload, FileText, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploadStepProps {
  onSubmit: (file: File) => void;
  onBack: () => void;
}

export const DocumentUploadStep = ({ onSubmit, onBack }: DocumentUploadStepProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    }
  };

  const handleRemove = () => {
    setFile(null);
  };

  const handleSubmit = () => {
    if (file) {
      onSubmit(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto px-4"
    >
      <Card className="card-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Copia de Cédula</CardTitle>
          <CardDescription className="text-base">
            Sube una copia en PDF de tu documento de identidad por ambos lados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          {!file ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Upload className={cn(
                'w-12 h-12 mb-4 transition-colors',
                isDragOver ? 'text-primary' : 'text-muted-foreground'
              )} />
              <p className="text-lg font-medium mb-2">
                Arrastra tu archivo aquí
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar
              </p>
              <span className="px-4 py-2 bg-muted text-muted-foreground text-sm rounded-full">
                Solo archivos PDF
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Tips */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2 text-sm">Consejos:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Asegúrate de que ambos lados del documento sean legibles</li>
              <li>El archivo debe estar en formato PDF</li>
              <li>Tamaño máximo: 5 MB</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!file}
              className="group px-8"
            >
              Finalizar Inscripción
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
