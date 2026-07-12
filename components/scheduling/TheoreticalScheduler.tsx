import { useState, useEffect } from 'react';
import { format, addDays, getDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnrollment } from '@/hooks/useEnrollment';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, Clock, BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TheoreticalSchedulerProps {
  onBack: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

const WEEKDAY_SLOTS: TimeSlot[] = [
  { start: '06:00', end: '08:00', label: '6:00 AM - 8:00 AM' },
  { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '12:00', end: '14:00', label: '12:00 PM - 2:00 PM' },
  { start: '14:00', end: '16:00', label: '2:00 PM - 4:00 PM' },
  { start: '16:00', end: '18:00', label: '4:00 PM - 6:00 PM' },
  { start: '18:00', end: '20:00', label: '6:00 PM - 8:00 PM' },
];

const SUNDAY_SLOTS: TimeSlot[] = [
  { start: '06:30', end: '08:30', label: '6:30 AM - 8:30 AM' },
  { start: '08:30', end: '10:30', label: '8:30 AM - 10:30 AM' },
  { start: '10:30', end: '12:30', label: '10:30 AM - 12:30 PM' },
  { start: '12:30', end: '14:30', label: '12:30 PM - 2:30 PM' },
  { start: '14:30', end: '16:30', label: '2:30 PM - 4:30 PM' },
  { start: '16:30', end: '18:30', label: '4:30 PM - 6:30 PM' },
];

const CATEGORIES = ['A2', 'B1', 'C1', 'C2', 'C3', 'A2+B1', 'B1+C1'];

export const TheoreticalScheduler = ({ onBack }: TheoreticalSchedulerProps) => {
  const { user } = useAuth();
  const { enrollment } = useEnrollment();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [categoria, setCategoria] = useState(enrollment?.categoria || '');
  const [submitting, setSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Fetch booked slots for selected date
  useEffect(() => {
    if (!selectedDate) return;
    const fetchBooked = async () => {
      const { data } = await supabase
        .from('theoretical_bookings')
        .select('hora_inicio')
        .eq('fecha', format(selectedDate, 'yyyy-MM-dd'));
      setBookedSlots(data?.map((b: any) => b.hora_inicio) || []);
    };
    fetchBooked();
    setSelectedSlots([]);
  }, [selectedDate]);

  const getSlotsForDate = (date: Date): TimeSlot[] => {
    const day = getDay(date);
    if (day === 0) return SUNDAY_SLOTS; // Sunday
    if (day === 1) return []; // Monday - closed
    return WEEKDAY_SLOTS; // Tue-Sat
  };

  const isDateDisabled = (date: Date) => {
    const day = getDay(date);
    // Disable Monday (1) and past dates
    return day === 1 || startOfDay(date) < startOfDay(new Date());
  };

  const availableSlots = selectedDate ? getSlotsForDate(selectedDate) : [];

  const toggleSlot = (slot: TimeSlot) => {
    if (selectedSlots.find(s => s.start === slot.start)) {
      setSelectedSlots(selectedSlots.filter(s => s.start !== slot.start));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedDate || selectedSlots.length === 0 || !categoria) return;

    setSubmitting(true);
    
    const bookings = selectedSlots.map(slot => ({
      user_id: user.id,
      nombres_completos: enrollment?.nombres_completos || '',
      tipo_documento: enrollment?.tipo_documento || '',
      numero_identificacion: enrollment?.numero_identificacion || '',
      categoria,
      fecha: format(selectedDate, 'yyyy-MM-dd'),
      hora_inicio: slot.start + ':00',
      hora_fin: slot.end + ':00',
    }));

    const { error } = await supabase.from('theoretical_bookings').insert(bookings);
    setSubmitting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo agendar la clase. Intenta de nuevo.' });
    } else {
      setSuccess(true);
      toast({ title: '¡Clases agendadas!', description: `${format(selectedDate, 'EEEE d MMMM', { locale: es })} - ${selectedSlots.length} bloques` });
      
      // Auto-generate WhatsApp Link
      const dateStr = format(selectedDate, 'dd/MM/yyyy');
      const blocksStr = selectedSlots.map(s => s.label).join(', ');
      const fullName = `${enrollment?.nombres_completos || ''} ${enrollment?.apellidos_completos || ''}`.trim();
      const message = `Hola Aguilera CEA, soy ${fullName}. \nTipo Doc: ${enrollment?.tipo_documento || ''} \nNo. Doc: ${enrollment?.numero_identificacion || ''} \nAcabo de agendar mis clases TEÓRICAS (${categoria}) para el día ${dateStr} en los horarios: ${blocksStr}.`;
      const waLink = `https://wa.me/573222223610?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp automatically in a new tab
      window.open(waLink, '_blank');
    }
  };

  if (success) {
    const blocksStr = selectedSlots.map(s => s.label).join(', ');
    const fullName = `${enrollment?.nombres_completos || ''} ${enrollment?.apellidos_completos || ''}`.trim();
    const message = `Hola Aguilera CEA, soy ${fullName}. \nTipo Doc: ${enrollment?.tipo_documento || ''} \nNo. Doc: ${enrollment?.numero_identificacion || ''} \nAcabo de agendar mis clases TEÓRICAS (${categoria}) para el día ${selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''} en los horarios: ${blocksStr}.`;
    const waLink = `https://wa.me/573222223610?text=${encodeURIComponent(message)}`;

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSuccess(false); onBack(); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">Clases Agendadas</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold mb-2">¡Clases Teóricas Agendadas!</h2>
          <p className="text-muted-foreground mb-2">
            {selectedDate && format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
          <div className="text-lg font-semibold text-primary mb-8 flex flex-col items-center">
            {selectedSlots.map(slot => (
               <span key={slot.start}>{slot.label}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button onClick={() => { setSuccess(false); setSelectedDate(undefined); setSelectedSlots([]); }}>
              Agendar otro día
            </Button>
            <Button variant="outline" onClick={() => { setSuccess(false); onBack(); }}>
              Volver al panel
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">¿No se abrió WhatsApp? <a href={waLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">Haz clic aquí para enviar la confirmación</a></p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-lg">Agendar Clase Teórica</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Category */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Categoría</CardTitle>
              <CardDescription>Selecciona la categoría de tu licencia</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Fecha</CardTitle>
              <CardDescription>Mar-Sáb: 6am-6pm · Dom: 6:30am-3:30pm · Lunes: cerrado</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    locale={es}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Time Slots */}
          {selectedDate && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Horario
                  </CardTitle>
                  <CardDescription>Bloques de 2 horas disponibles</CardDescription>
                </CardHeader>
                <CardContent>
                  {availableSlots.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay clases disponibles este día</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {availableSlots.map(slot => {
                        const isSelected = selectedSlots.some(s => s.start === slot.start);
                        const isDisabled = false; // Never disabled for theory as per 100 capacity rule
                        
                        return (
                          <Button
                            key={slot.start}
                            variant={isSelected ? 'default' : 'outline'}
                            className={cn(
                              'h-auto py-3 text-sm'
                            )}
                            disabled={isDisabled}
                            onClick={() => toggleSlot(slot)}
                          >
                            {slot.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Subfooter */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4 sticky bottom-0 z-50">
        <Button 
          className="w-full h-12 text-lg font-bold" 
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedDate || selectedSlots.length === 0 || !categoria || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Agendando...
            </>
          ) : (
            'Confirmar Clase Teórica'
          )}
        </Button>
      </div>
    </div>
  );
};
