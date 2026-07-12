import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Mail, Calendar, MessageCircle } from 'lucide-react';

interface CompletionStepProps {
  onGoToDashboard: () => void;
}

export const CompletionStep = ({ onGoToDashboard }: CompletionStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto px-4"
    >
      <Card className="card-elevated text-center overflow-hidden">
        {/* Success Animation */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mx-auto w-24 h-24 bg-primary rounded-full flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
            </motion.div>
          </motion.div>
        </div>

        <CardContent className="py-8 space-y-6">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-display font-bold mb-2"
            >
              ¡Inscripción Completada!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground"
            >
              Tu documentación ha sido enviada correctamente a nuestro equipo.
            </motion.p>
          </div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid gap-4 text-left"
          >
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Confirmación por Email</p>
                <p className="text-sm text-muted-foreground">
                  Recibirás un correo con los documentos firmados y la confirmación de tu matrícula.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Calendar className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Agenda tus Clases</p>
                <p className="text-sm text-muted-foreground">
                  Ya puedes programar tus clases teóricas y prácticas desde tu panel de alumno.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <MessageCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Soporte en WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  Si tienes dudas, contáctanos al +57 322 222 3610.
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="pt-4"
          >
            <Button
              size="lg"
              onClick={onGoToDashboard}
              className="w-full sm:w-auto px-8"
            >
              Ir a Mi Panel de Alumno
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
