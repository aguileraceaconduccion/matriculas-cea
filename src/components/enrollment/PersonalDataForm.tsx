import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, User, Mail, Phone, MapPin, Briefcase, Heart } from 'lucide-react';
import { CATEGORIAS, TIPOS_DOCUMENTO, GENEROS, ESTADOS_CIVILES, ESTRATOS, NIVELES_FORMACION } from '@/types/enrollment';
import type { EnrollmentData } from '@/types/enrollment';

const formSchema = z.object({
  categoria: z.string().min(1, 'Selecciona una categoría'),
  fechaIngreso: z.string().min(1, 'Fecha requerida'),
  tipoDocumento: z.string().min(1, 'Selecciona tipo de documento'),
  numeroIdentificacion: z.string().min(5, 'Número de identificación inválido'),
  nombresCompletos: z.string().min(2, 'Ingresa tus nombres'),
  apellidosCompletos: z.string().min(2, 'Ingresa tus apellidos'),
  genero: z.string().min(1, 'Selecciona género'),
  estadoCivil: z.string().min(1, 'Selecciona estado civil'),
  fechaNacimiento: z.string().min(1, 'Fecha de nacimiento requerida'),
  lugarOrigen: z.string().min(2, 'Ingresa lugar de origen'),
  estrato: z.string().min(1, 'Selecciona estrato'),
  regimenSalud: z.string().min(2, 'Ingresa EPS'),
  nivelFormacion: z.string().min(1, 'Selecciona nivel de formación'),
  ocupacion: z.string().min(2, 'Ingresa ocupación'),
  email1: z.string().email('Email inválido'),
  email2: z.string().email('Email inválido').optional().or(z.literal('')),
  celular: z.string().min(10, 'Celular inválido'),
  telefonoFijo: z.string().optional(),
  direccion: z.string().min(5, 'Dirección inválida'),
  contactoEmergencia: z.string().min(2, 'Nombre de contacto requerido'),
  celularEmergencia: z.string().min(10, 'Celular de emergencia inválido'),
  asesor: z.string().default('Cesar Aguilera'),
});

import { useToast } from '@/hooks/use-toast';

interface FormSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const FormSection = ({ title, icon: Icon, children }: FormSectionProps) => (
  <Card className="card-elevated">
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-2">
      {children}
    </CardContent>
  </Card>
);

interface PersonalDataFormProps {
  onSubmit: (data: Partial<EnrollmentData>) => void;
  initialData?: Partial<EnrollmentData>;
}

export const PersonalDataForm = ({ onSubmit, initialData }: PersonalDataFormProps) => {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoria: initialData?.categoria || '',
      fechaIngreso: initialData?.fechaIngreso || new Date().toISOString().split('T')[0],
      tipoDocumento: initialData?.tipoDocumento || '',
      numeroIdentificacion: initialData?.numeroIdentificacion || '',
      nombresCompletos: initialData?.nombresCompletos || '',
      apellidosCompletos: initialData?.apellidosCompletos || '',
      genero: initialData?.genero || '',
      estadoCivil: initialData?.estadoCivil || '',
      fechaNacimiento: initialData?.fechaNacimiento || '',
      lugarOrigen: initialData?.lugarOrigen || '',
      estrato: initialData?.estrato || '',
      regimenSalud: initialData?.regimenSalud || '',
      nivelFormacion: initialData?.nivelFormacion || '',
      ocupacion: initialData?.ocupacion || '',
      email1: initialData?.email1 || '',
      email2: initialData?.email2 || '',
      celular: initialData?.celular || '',
      telefonoFijo: initialData?.telefonoFijo || '',
      direccion: initialData?.direccion || '',
      contactoEmergencia: initialData?.contactoEmergencia || '',
      celularEmergencia: initialData?.celularEmergencia || '',
      asesor: initialData?.asesor || 'Cesar Aguilera',
    },
  });

  const handleSubmit = form.handleSubmit(
    (data) => {
      console.log("Formulario válido, enviando datos:", data);
      onSubmit(data);
    },
    (errors) => {
      console.error("Errores de validación en el formulario:", errors);
      const firstError = Object.values(errors)[0]?.message;
      const fieldName = Object.keys(errors)[0];
      
      alert(`Falta un campo o es incorrecto: ${fieldName}\n\nDetalle: ${firstError}`);
      
      toast({
        variant: "destructive",
        title: "Revisa los campos",
        description: firstError as string || "Por favor, completa todos los campos requeridos correctamente.",
      });
    }
  );

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="space-y-6 max-w-4xl mx-auto px-4"
    >
      {/* Categoría y Fecha */}
      <FormSection title="Información de Matrícula" icon={Briefcase}>
        <div className="space-y-2">
          <Label>Categoría *</Label>
          <Select onValueChange={(v) => form.setValue('categoria', v)} defaultValue={form.getValues('categoria')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.categoria && (
            <p className="text-sm text-destructive">{form.formState.errors.categoria.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Fecha de Ingreso *</Label>
          <Input type="date" {...form.register('fechaIngreso')} />
        </div>
        <div className="space-y-2">
          <Label>Asesor</Label>
          <Input {...form.register('asesor')} disabled className="bg-muted" />
        </div>
      </FormSection>

      {/* Identificación */}
      <FormSection title="Identificación" icon={User}>
        <div className="space-y-2">
          <Label>Tipo de Documento *</Label>
          <Select onValueChange={(v) => form.setValue('tipoDocumento', v)} defaultValue={form.getValues('tipoDocumento')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Número de Identificación *</Label>
          <Input {...form.register('numeroIdentificacion')} placeholder="1234567890" />
        </div>
        <div className="space-y-2">
          <Label>Nombres Completos *</Label>
          <Input {...form.register('nombresCompletos')} placeholder="Juan Carlos" />
        </div>
        <div className="space-y-2">
          <Label>Apellidos Completos *</Label>
          <Input {...form.register('apellidosCompletos')} placeholder="García Pérez" />
        </div>
        <div className="space-y-2">
          <Label>Género *</Label>
          <Select onValueChange={(v) => form.setValue('genero', v)} defaultValue={form.getValues('genero')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona género" />
            </SelectTrigger>
            <SelectContent>
              {GENEROS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Estado Civil *</Label>
          <Select onValueChange={(v) => form.setValue('estadoCivil', v)} defaultValue={form.getValues('estadoCivil')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona estado civil" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_CIVILES.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fecha de Nacimiento *</Label>
          <Input type="date" {...form.register('fechaNacimiento')} />
        </div>
        <div className="space-y-2">
          <Label>Lugar de Origen *</Label>
          <Input {...form.register('lugarOrigen')} placeholder="Bogotá, Colombia" />
        </div>
      </FormSection>

      {/* Información Socioeconómica */}
      <FormSection title="Información Socioeconómica" icon={Heart}>
        <div className="space-y-2">
          <Label>Estrato *</Label>
          <Select onValueChange={(v) => form.setValue('estrato', v)} defaultValue={form.getValues('estrato')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona estrato" />
            </SelectTrigger>
            <SelectContent>
              {ESTRATOS.map((e) => (
                <SelectItem key={e} value={e}>Estrato {e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Régimen de Salud (EPS) *</Label>
          <Input {...form.register('regimenSalud')} placeholder="Nombre de EPS" />
        </div>
        <div className="space-y-2">
          <Label>Nivel de Formación *</Label>
          <Select onValueChange={(v) => form.setValue('nivelFormacion', v)} defaultValue={form.getValues('nivelFormacion')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona nivel" />
            </SelectTrigger>
            <SelectContent>
              {NIVELES_FORMACION.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ocupación *</Label>
          <Input {...form.register('ocupacion')} placeholder="Empleado, Estudiante, etc." />
        </div>
      </FormSection>

      {/* Contacto */}
      <FormSection title="Información de Contacto" icon={Mail}>
        <div className="space-y-2">
          <Label>Email Principal *</Label>
          <Input type="email" {...form.register('email1')} placeholder="correo@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <Label>Email Secundario</Label>
          <Input type="email" {...form.register('email2')} placeholder="correo2@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <Label>Celular *</Label>
          <Input {...form.register('celular')} placeholder="3001234567" />
        </div>
        <div className="space-y-2">
          <Label>Teléfono Fijo</Label>
          <Input {...form.register('telefonoFijo')} placeholder="6011234567" />
        </div>
      </FormSection>

      {/* Dirección */}
      <FormSection title="Ubicación" icon={MapPin}>
        <div className="space-y-2 sm:col-span-2">
          <Label>Dirección *</Label>
          <Input {...form.register('direccion')} placeholder="Calle 123 #45-67, Ciudad" />
        </div>
      </FormSection>

      {/* Contacto de Emergencia */}
      <FormSection title="Contacto de Emergencia" icon={Phone}>
        <div className="space-y-2">
          <Label>Nombre del Contacto *</Label>
          <Input {...form.register('contactoEmergencia')} placeholder="Nombre completo" />
        </div>
        <div className="space-y-2">
          <Label>Celular de Emergencia *</Label>
          <Input {...form.register('celularEmergencia')} placeholder="3001234567" />
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex justify-end pt-4 pb-20">
        <Button 
          type="button" 
          onClick={handleSubmit}
          size="lg" 
          className="group px-8 relative z-20"
        >
          Continuar a Firma Digital
          <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </motion.form>
  );
};
