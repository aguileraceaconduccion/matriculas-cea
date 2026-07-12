import { motion } from 'framer-motion';
import { Check, FileText, PenTool, Upload, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrollmentStep } from '@/types/enrollment';

interface EnrollmentStepperProps {
  currentStep: EnrollmentStep;
}

const steps = [
  { id: 'form', label: 'Datos Personales', icon: FileText },
  { id: 'signature', label: 'Firma Digital', icon: PenTool },
  { id: 'upload', label: 'Documentos', icon: Upload },
  { id: 'complete', label: 'Confirmación', icon: Send },
] as const;

export const EnrollmentStepper = ({ currentStep }: EnrollmentStepperProps) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/30',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </motion.div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center hidden sm:block',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="w-12 sm:w-24 h-1 mx-2 sm:mx-4 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-primary"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
