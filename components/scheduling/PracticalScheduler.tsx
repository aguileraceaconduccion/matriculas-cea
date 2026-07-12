import { useState, useEffect } from 'react';
import { format, getDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnrollment } from '@/hooks/useEnrollment';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, Clock, Car, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PracticalSchedulerProps {
  onBack: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

// Helper to format hours
const formatTime = (hour: number) => {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayH = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayH}:00 ${ampm}`;
};

// Generates 2-hour blocks based on the day of the week
const getPracticalSlots = (date?: Date): TimeSlot[] => {
  if (!date) return [];
  const day = getDay(date);
  if (day === 0) return []; // Sunday
  
  // Base 2-hour schedule
  let scheduleHours = [7, 9, 11, 14, 16, 18]; // Lunes a Viernes (ends at 20:00 / 8pm)
  
  if (day === 6) {
    // Sábado: termina a las 6pm (18:00)
    scheduleHours = [7, 9, 11, 14, 16]; 
  }

  return scheduleHours.map(hour => {
    const endHour = hour + 2;
    return {
      start: `${hour.toString().padStart(2, '0')}:00`,
      end: `${endHour.toString().padStart(2, '0')}:00`,
      label: `${formatTime(hour)} - ${formatTime(endHour)}`,
    };
  });
};

const CATEGORIES = ['A2', 'B1', 'C1', 'C2', 'C3', 'A2+B1', 'B1+C1'];

export const PracticalScheduler = ({ onBack }: PracticalSchedulerProps) => {
  const { user } = useAuth();
  const { enrollment } = useEnrollment();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [categoria, setCategoria] = useState(enrollment?.categoria || '');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Fetch booked slots for selected date
  useEffect(() => {
    if (!selectedDate) return;
    const fetchBooked = async () => {
      const { data } = await supabase
        .from('practical_bookings')
        .select('hora_inicio')
        .eq('fecha', format(selectedDate, 'yyyy-MM-dd'))
        .eq('status', 'confirmed');
      setBookedSlots(data?.map((b: any) => b.hora_inicio) || []);
    };
    fetchBooked();
    setSelectedSlots([]);
  }, [selectedDate]);

  const isDateDisabled = (date: Date) => {
    const day = getDay(date);
    // Disable Sunday (0) and past dates
    return day === 0 || startOfDay(date) < startOfDay(new Date());
  };

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
    let errorOccurred = false;
    let successfulBookings = 0;

    for (const slot of selectedSlots) {
      const bookingData = {
        user_id: user.id,
        nombres_completos: `${enrollment?.nombres_completos || ''} ${enrollment?.apellidos_completos || ''}`.trim(),
        tipo_documento: enrollment?.tipo_documento || '',
        numero_identificacion: enrollment?.numero_identificacion || '',
        categoria,
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        hora_inicio: slot.start + ':00',
        hora_fin: slot.end + ':00',
        notas: notas || null,
      };

      const { data: insertedBooking, error } = await supabase
        .from('practical_bookings')
        .insert(bookingData)
        .select('id')
        .single();

      if (error) {
        errorOccurred = true;
        if (error.code === '23505') {
          toast({ variant: 'destructive', title: 'Horario no disponible', description: `Varios bloques no están disponibles. Se reservaron ${successfulBookings}.` });
        }
        break;
      } else {
        successfulBookings++;
        // Sync to Google Calendar (non-blocking)
        if (insertedBooking?.id) {
          console.log(`Iniciando sincronización con Google Calendar para ID: ${insertedBooking.id}...`);
          supabase.functions.invoke('sync-google-calendar', {
            body: { bookingId: insertedBooking.id, action: 'create' },
          }).then(({ data, error }) => {
            if (error) console.error('Error en invoke de calendario:', error);
            else console.log('Resultado de sincronización:', data);
          }).catch(err => console.error('Fallo crítico en sincronización:', err));
        }
      }
    }

    setSubmitting(false);

    if (errorOccurred && successfulBookings === 0) {
       toast({ variant: 'destructive', title: 'Error', description: 'No se pudo agendar la clase. Revisa si ya está ocupada.' });
    } else {
      setSuccess(true);
      toast({
        title: '¡Clases prácticas agendadas!',
        description: `${format(selectedDate, 'EEEE d MMMM', { locale: es })} - ${successfulBookings} bloques`,
      });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSuccess(false); onBack(); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Car className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">Clase Agendada</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold mb-2">¡Clases Prácticas Agendadas!</h2>
          <p className="text-muted-foreground mb-2">
            {selectedDate && format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
          <div className="text-lg font-semibold text-primary mb-8 flex flex-col items-center">
            {selectedSlots.map(slot => (
               <span key={slot.start}>{slot.label}</span>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setSuccess(false); setSelectedDate(undefined); setSelectedSlots([]); setNotas(''); }}>
              Agendar otra clase
            </Button>
            <Button variant="outline" onClick={() => { setSuccess(false); onBack(); }}>
              Volver al panel
            </Button>
          </div>
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
          <Car className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-lg">Agendar Clase Práctica</span>
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
              <CardDescription>Lun-Sáb: 6am-6pm · Domingos: cerrado</CardDescription>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getPracticalSlots(selectedDate).map(slot => {
                      const isBooked = bookedSlots.includes(slot.start + ':00');
                      const isSelected = selectedSlots.some(s => s.start === slot.start);
                      return (
                        <Button
                          key={slot.start}
                          variant={isSelected ? 'default' : 'outline'}
                          className={cn(
                            'h-auto py-3 text-sm',
                            isBooked && 'opacity-50 cursor-not-allowed'
                          )}
                          disabled={isBooked}
                          onClick={() => toggleSlot(slot)}
                        >
                          {slot.label}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Notes */}
          {selectedSlots.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Notas (opcional)</CardTitle>
                  <CardDescription>Añade cualquier información para estas sesiones</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: necesito reforzar parqueo..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Submit */}
          <Button
            className="w-full h-12 text-base"
            disabled={!selectedDate || selectedSlots.length === 0 || !categoria || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Agendando...
              </>
            ) : (
              'Confirmar Clases Prácticas'
            )}
          </Button>
        </motion.div>
      </main>
    </div>
  );
};
