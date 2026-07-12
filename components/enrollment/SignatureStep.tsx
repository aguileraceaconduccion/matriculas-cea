import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, RotateCcw, PenTool } from 'lucide-react';

interface SignatureStepProps {
  onSubmit: (signature: string) => void;
  onBack: () => void;
}

export const SignatureStep = ({ onSubmit, onBack }: SignatureStepProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
  };

  const handleSubmit = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      onSubmit(dataUrl);
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
            <PenTool className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Firma Digital</CardTitle>
          <CardDescription className="text-base">
            Tu firma será incorporada automáticamente en la Ficha de Matrícula y el documento de Habeas Data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Signature Area */}
          <div className="border-2 border-dashed border-primary/30 rounded-lg overflow-hidden bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair',
                style: { width: '100%', height: '256px' },
              }}
              backgroundColor="white"
              penColor="#0d9488"
              onEnd={handleEnd}
            />
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground text-center">
            Firma con el dedo o el mouse dentro del recuadro. Asegúrate de que sea legible.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Limpiar Firma
            </Button>
          </div>

          {/* Legal Notice */}
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-2">Al firmar, autorizas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>El tratamiento de tus datos personales según la Ley 1581 de 2012</li>
              <li>La inscripción en el CONSORCIO SISTEMA INTEGRADO DE GESTIÓN Y SEGURIDAD CEAS-CIAS</li>
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
              disabled={isEmpty}
              className="group px-8"
            >
              Continuar
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
