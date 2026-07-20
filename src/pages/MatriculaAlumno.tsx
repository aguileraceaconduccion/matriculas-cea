import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEnrollment } from '@/hooks/useEnrollment';
import type { AlumnoData, Solicitud } from '@/types/enrollment';
import { 
  CATEGORIAS_LICENCIA, TIPOS_DOCUMENTO, GENEROS, 
  ESTADOS_CIVILES, ESTRATOS, NIVELES_FORMACION 
} from '@/types/enrollment';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Car, FileText, Camera, Upload, Check, AlertTriangle, 
  ChevronRight, ChevronLeft, Loader2, Sparkles, X, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const MatriculaAlumno = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getSolicitudByToken, updateSolicitudEstado, submitAlumnoEnrollment, loading } = useEnrollment();

  // Estados de carga e inicialización
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Stepper
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Paso 1: Datos Ficha de Matrícula
  const [formData, setFormData] = useState<AlumnoData>({
    categoria: 'B1',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    tipo_documento: 'CC',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    genero: 'Masculino',
    estado_civil: 'Soltero/a',
    fecha_nacimiento: '',
    lugar_origen: '',
    estrato: '2',
    eps: '',
    nivel_formacion: 'Secundaria / Bachillerato',
    ocupacion: '',
    email_1: '',
    email_2: '',
    celular: '',
    telefono_fijo: '',
    direccion: '',
    contacto_emergencia: '',
    celular_emergencia: '',
    asesor: 'Cesar Aguilera',
    es_menor_edad: false,
    acudiente_nombre: '',
    acudiente_documento: '',
    acudiente_celular: ''
  });

  // Paso 2: Fotografía
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // Paso 3: Cédula
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  // Paso 4: Habeas Data
  const [habeasAccepted, setHabeasAccepted] = useState(false);
  const [studentSignature, setStudentSignature] = useState<string | null>(null);
  const [tutorSignature, setTutorSignature] = useState<string | null>(null);

  // Refs de Signature Pad
  const studentSigPad = useRef<SignatureCanvas>(null);
  const tutorSigPad = useRef<SignatureCanvas>(null);

  // Cargar solicitud al montar
  useEffect(() => {
    const fetchSolicitud = async () => {
      if (!token) return;
      try {
        const sol = await getSolicitudByToken(token);
        if (sol) {
          if (!['Solicitud enviada', 'Alumno diligenciando'].includes(sol.estado)) {
            setIsDone(true);
            setSolicitud(sol);
          } else {
            setSolicitud(sol);
            await updateSolicitudEstado(sol.id, 'Alumno diligenciando');
            setFormData(prev => ({
              ...prev,
              nombres: sol.nombre_alumno.split(' ')[0] || '',
              apellidos: sol.nombre_alumno.split(' ').slice(1).join(' ') || '',
              email_1: sol.email,
              celular: sol.celular,
              categoria: sol.categoria
            }));
          }
        } else {
          setInvalidToken(true);
        }
      } catch (err) {
        console.error('Error al cargar solicitud:', err);
        setInvalidToken(true);
      } finally {
        setInitializing(false);
      }
    };
    fetchSolicitud();
  }, [token]);

  // Calcular edad y activar menor de edad
  const handleBirthDateChange = (dateStr: string) => {
    setFormData(prev => {
      const birth = new Date(dateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      const esMenor = age < 18;
      return {
        ...prev,
        fecha_nacimiento: dateStr,
        es_menor_edad: esMenor
      };
    });
  };

  const handleNextStep = () => {
    // Validaciones por paso
    if (currentStep === 1) {
      if (
        !formData.nombres || 
        !formData.apellidos || 
        !formData.numero_documento || 
        !formData.fecha_nacimiento ||
        !formData.email_1 ||
        !formData.celular ||
        !formData.direccion ||
        !formData.contacto_emergencia ||
        !formData.celular_emergencia
      ) {
        toast({
          variant: 'destructive',
          title: 'Datos incompletos',
          description: 'Por favor complete todos los datos personales obligatorios.'
        });
        return;
      }
      if (formData.es_menor_edad) {
        if (!formData.acudiente_nombre || !formData.acudiente_documento || !formData.acudiente_celular) {
          toast({
            variant: 'destructive',
            title: 'Datos del Acudiente obligatorios',
            description: 'Por ser menor de edad, debe ingresar los datos de su acudiente.'
          });
          return;
        }
      }
    }

    if (currentStep === 2) {
      if (!fotoFile) {
        toast({
          variant: 'destructive',
          title: 'Fotografía obligatoria',
          description: 'Por favor capture o suba su fotografía para continuar.'
        });
        return;
      }
    }

    if (currentStep === 3) {
      if (!cedulaFile) {
        toast({
          variant: 'destructive',
          title: 'Cédula PDF obligatoria',
          description: 'Por favor cargue su documento de identidad en formato PDF.'
        });
        return;
      }
    }

    if (currentStep === 4) {
      if (!habeasAccepted) {
        toast({
          variant: 'destructive',
          title: 'Habeas Data obligatorio',
          description: 'Debe aceptar los términos de tratamiento de datos personales.'
        });
        return;
      }

      // Guardar firma estudiante
      try {
        if (studentSigPad.current && !studentSigPad.current.isEmpty()) {
          const stdSig = studentSigPad.current.getCanvas().toDataURL('image/png');
          setStudentSignature(stdSig);
        } else if (!studentSignature) {
          toast({
            variant: 'destructive',
            title: 'Firma obligatoria',
            description: 'El alumno debe firmar el documento.'
          });
          return;
        }
      } catch (e) {
        console.error("Error capturando firma del estudiante", e);
      }

      // Guardar firma acudiente si aplica
      if (formData.es_menor_edad) {
        try {
          if (tutorSigPad.current && !tutorSigPad.current.isEmpty()) {
            const tutSig = tutorSigPad.current.getCanvas().toDataURL('image/png');
            setTutorSignature(tutSig);
          } else if (!tutorSignature) {
            toast({
              variant: 'destructive',
              title: 'Firma del Acudiente obligatoria',
              description: 'Por ser menor de edad, su acudiente también debe firmar.'
            });
            return;
          }
        } catch (e) {
          console.error("Error capturando firma del acudiente", e);
        }
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const clearStudentSignature = () => {
    studentSigPad.current?.clear();
    setStudentSignature(null);
  };

  const clearTutorSignature = () => {
    tutorSigPad.current?.clear();
    setTutorSignature(null);
  };

  const handleSubmit = async () => {
    if (!solicitud || !fotoFile || !cedulaFile || !studentSignature) return;

    try {
      toast({
        title: 'Guardando expediente...',
        description: 'Estamos subiendo sus documentos. Por favor espere.'
      });

      await submitAlumnoEnrollment(
        solicitud,
        formData,
        fotoFile,
        cedulaFile,
        studentSignature,
        formData.es_menor_edad ? tutorSignature || undefined : undefined
      );

      toast({
        title: 'Matrícula guardada con éxito',
        description: 'Tus documentos han sido registrados.'
      });

      setIsDone(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar matrícula',
        description: err.message
      });
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando enlace de matrícula...</p>
        </div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-rose-100 bg-rose-50/50">
          <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
          <CardTitle className="text-rose-950">Enlace No Válido</CardTitle>
          <CardDescription className="text-rose-900 mt-2">
            El enlace que has utilizado no existe o es incorrecto. Por favor, solicita un nuevo enlace a tu instructor.
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-green-100 bg-green-50/50">
          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white mb-4 shadow-md">
            <Check className="w-8 h-8" />
          </div>
          <CardTitle className="text-green-950 font-display">Matrícula Completada</CardTitle>
          <CardDescription className="text-green-900 mt-2">
            ¡Muchas gracias! Has diligenciado con éxito toda la información y cargado los soportes requeridos. 
            El instructor completará los pagos y enviará tu expediente a la academia.
          </CardDescription>
          <div className="mt-6">
            <p className="text-xs text-muted-foreground">Ya puedes cerrar esta pestaña de forma segura.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">Matrícula Digital</span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Paso {currentStep} de {totalSteps}</span>
        </div>
      </header>

      {/* Progreso */}
      <Progress value={(currentStep / totalSteps) * 100} className="rounded-none h-1 bg-muted" />

      {/* Contenido Principal */}
      <main className="container max-w-md mx-auto px-4 mt-6">
        
        {/* PASO 1: Datos Personales (Ficha) */}
        {currentStep === 1 && (
          <Card className="shadow-md border-muted-foreground/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Ficha de Matrícula
              </CardTitle>
              <CardDescription className="text-xs">
                Diligencie su información personal. Los campos con * son obligatorios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nombres *</Label>
                  <Input 
                    placeholder="Juan" 
                    value={formData.nombres}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombres: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Apellidos *</Label>
                  <Input 
                    placeholder="Pérez" 
                    value={formData.apellidos}
                    onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo Documento *</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none"
                    value={formData.tipo_documento}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_documento: e.target.value }))}
                  >
                    {TIPOS_DOCUMENTO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Identificación *</Label>
                  <Input 
                    type="number"
                    placeholder="12345678" 
                    value={formData.numero_documento}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_documento: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha Nacimiento *</Label>
                  <Input 
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Género *</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none"
                    value={formData.genero}
                    onChange={(e) => setFormData(prev => ({ ...prev, genero: e.target.value }))}
                  >
                    {GENEROS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección Acudiente si es menor de edad */}
              {formData.es_menor_edad && (
                <div className="bg-amber-50/70 border border-amber-200/60 p-3.5 rounded-xl space-y-3 mt-1 animate-pulse">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-700" /> Requiere Acudiente (Menor de 18 años)
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-amber-950">Nombre Completo del Acudiente *</Label>
                    <Input 
                      placeholder="Padre / Madre / Tutor"
                      value={formData.acudiente_nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, acudiente_nombre: e.target.value }))}
                      className="bg-card border-amber-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-amber-950">Cédula Acudiente *</Label>
                      <Input 
                        placeholder="Documento"
                        value={formData.acudiente_documento}
                        onChange={(e) => setFormData(prev => ({ ...prev, acudiente_documento: e.target.value }))}
                        className="bg-card border-amber-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-amber-950">Celular Acudiente *</Label>
                      <Input 
                        placeholder="Celular"
                        type="tel"
                        value={formData.acudiente_celular}
                        onChange={(e) => setFormData(prev => ({ ...prev, acudiente_celular: e.target.value }))}
                        className="bg-card border-amber-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Lugar de Origen</Label>
                  <Input 
                    placeholder="Bogotá" 
                    value={formData.lugar_origen}
                    onChange={(e) => setFormData(prev => ({ ...prev, lugar_origen: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estado Civil</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none"
                    value={formData.estado_civil}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado_civil: e.target.value }))}
                  >
                    {ESTADOS_CIVILES.map(ec => (
                      <option key={ec} value={ec}>{ec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Estrato *</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none"
                    value={formData.estrato}
                    onChange={(e) => setFormData(prev => ({ ...prev, estrato: e.target.value }))}
                  >
                    {ESTRATOS.map(es => (
                      <option key={es} value={es}>{es}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>EPS</Label>
                  <Input 
                    placeholder="Sanitas" 
                    value={formData.eps}
                    onChange={(e) => setFormData(prev => ({ ...prev, eps: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nivel de Formación</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none"
                    value={formData.nivel_formacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, nivel_formacion: e.target.value }))}
                  >
                    {NIVELES_FORMACION.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Ocupación</Label>
                  <Input 
                    placeholder="Estudiante / Empleado" 
                    value={formData.ocupacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, ocupacion: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Dirección de Residencia *</Label>
                <Input 
                  placeholder="Calle 123 # 45 - 67" 
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Celular *</Label>
                  <Input 
                    type="tel"
                    placeholder="3001234567" 
                    value={formData.celular}
                    onChange={(e) => setFormData(prev => ({ ...prev, celular: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono Fijo</Label>
                  <Input 
                    placeholder="6011234567" 
                    value={formData.telefono_fijo}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono_fijo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Correo Electrónico (Email 1) *</Label>
                <Input 
                  type="email"
                  placeholder="alumno@correo.com" 
                  value={formData.email_1}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_1: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Contacto de Emergencia *</Label>
                  <Input 
                    placeholder="Nombre Familiar" 
                    value={formData.contacto_emergencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, contacto_emergencia: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Celular Emergencia *</Label>
                  <Input 
                    type="tel"
                    placeholder="3101234567" 
                    value={formData.celular_emergencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, celular_emergencia: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Asesor Comercial</Label>
                <Input 
                  placeholder="Nombre Asesor" 
                  value={formData.asesor}
                  onChange={(e) => setFormData(prev => ({ ...prev, asesor: e.target.value }))}
                />
              </div>

            </CardContent>
          </Card>
        )}

        {/* PASO 2: Fotografía */}
        {currentStep === 2 && (
          <Card className="shadow-md border-muted-foreground/10 rounded-2xl text-center">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Fotografía Tipo Documento
              </CardTitle>
              <CardDescription className="text-xs">
                Suba o capture una foto de perfil limpia y con fondo blanco.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 py-4">
              
              {fotoPreview ? (
                <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-primary/20 shadow">
                  <img src={fotoPreview} alt="Foto Alumno" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto bg-muted rounded-full flex flex-col items-center justify-center border-4 border-dashed border-muted-foreground/20 text-muted-foreground">
                  <Camera className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-[10px]">Sin fotografía cargada</span>
                </div>
              )}

              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                {/* Botón para cámara nativa del celular */}
                <label className="flex items-center justify-center gap-2 h-11 w-full bg-primary text-primary-foreground font-semibold rounded-xl cursor-pointer hover:bg-primary/95 shadow-sm text-xs transition-colors">
                  <Camera className="w-4 h-4" /> Tomar Foto con la Cámara
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="user" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFotoFile(file);
                        setFotoPreview(URL.createObjectURL(file));
                      }
                    }} 
                    className="hidden" 
                  />
                </label>
                
                {/* Botón para subir archivo desde galería */}
                <label className="flex items-center justify-center gap-2 h-11 w-full bg-secondary text-secondary-foreground font-semibold rounded-xl cursor-pointer hover:bg-secondary/90 text-xs transition-colors">
                  <Upload className="w-4 h-4" /> Seleccionar de la Galería
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFotoFile(file);
                        setFotoPreview(URL.createObjectURL(file));
                      }
                    }} 
                    className="hidden" 
                  />
                </label>
              </div>

              {fotoFile && (
                <p className="text-[10px] text-green-600 font-semibold">✓ Imagen lista para subir</p>
              )}

            </CardContent>
          </Card>
        )}

        {/* PASO 3: Documento de Identidad (PDF) */}
        {currentStep === 3 && (
          <Card className="shadow-md border-muted-foreground/10 rounded-2xl text-center">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Documento de Identidad (PDF)
              <CardTitle className="text-lg">Documento de Identidad</CardTitle>
              <CardDescription className="text-xs">
                Cargue su documento en formato PDF o tome fotos para generarlo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              
              <div className="flex gap-2 justify-center mb-4">
                <Button 
                  variant={uploadMode === 'pdf' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setUploadMode('pdf')}
                  className="w-1/2 text-[11px]"
                >
                  Subir PDF
                </Button>
                <Button 
                  variant={uploadMode === 'photo' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setUploadMode('photo')}
                  className="w-1/2 text-[11px]"
                >
                  Tomar Fotos
                </Button>
              </div>

              {uploadMode === 'photo' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-center block">Frente del Documento</Label>
                      <label className="flex flex-col items-center justify-center gap-2 h-24 w-full bg-muted/50 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:bg-muted text-xs transition-colors overflow-hidden relative">
                        {frontPhoto ? (
                          <img src={frontPhoto} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-primary/70" />
                            <span className="text-[10px] text-muted-foreground">Capturar</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          capture="environment"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) setFrontPhoto(await compressImage(file));
                          }} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-center block">Reverso del Documento</Label>
                      <label className="flex flex-col items-center justify-center gap-2 h-24 w-full bg-muted/50 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:bg-muted text-xs transition-colors overflow-hidden relative">
                        {backPhoto ? (
                          <img src={backPhoto} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-primary/70" />
                            <span className="text-[10px] text-muted-foreground">Capturar</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          capture="environment"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) setBackPhoto(await compressImage(file));
                          }} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                  <Button 
                    className="w-full text-xs" 
                    disabled={!frontPhoto || !backPhoto || isGeneratingPdf}
                    onClick={async () => {
                      if (frontPhoto && backPhoto) {
                        setIsGeneratingPdf(true);
                        try {
                          const pdfFile = await convertImagesToPdf(frontPhoto, backPhoto, `${formData.nombres} ${formData.apellidos}`);
                          setCedulaFile(pdfFile);
                          setUploadMode('pdf');
                          toast({ title: 'PDF Generado', description: 'Se ha creado el documento correctamente.' });
                        } catch (error) {
                          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
                        } finally {
                          setIsGeneratingPdf(false);
                        }
                      }
                    }}
                  >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Convertir a PDF
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-48 h-48 mx-auto bg-muted rounded-2xl flex flex-col items-center justify-center border-4 border-dashed border-muted-foreground/20 text-muted-foreground p-4">
                    {cedulaFile ? (
                      <>
                        <FileText className="w-12 h-12 text-primary mb-2" />
                        <span className="text-[10px] font-bold text-foreground truncate max-w-full">{cedulaFile.name}</span>
                        <span className="text-[9px] text-muted-foreground mt-1">{(cedulaFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-[10px]">Arrastra o selecciona el archivo PDF</span>
                      </>
                    )}
                  </div>
  
                  <div className="max-w-xs mx-auto">
                    <label className="flex items-center justify-center gap-2 h-11 w-full bg-primary text-primary-foreground font-semibold rounded-xl cursor-pointer hover:bg-primary/95 shadow-sm text-xs transition-colors">
                      <Upload className="w-4 h-4" /> Seleccionar Archivo PDF
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type !== 'application/pdf') {
                              toast({ variant: 'destructive', title: 'Formato incorrecto', description: 'Únicamente se aceptan archivos PDF.' });
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast({ variant: 'destructive', title: 'Archivo muy pesado', description: 'El archivo excede el tamaño máximo de 10 MB.' });
                              return;
                            }
                            setCedulaFile(file);
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </>
              )}

              {cedulaFile && (
                <p className="text-[10px] text-green-600 font-semibold">✓ Documento listo para subir</p>
              )}

            </CardContent>
          </Card>
        )}

        {/* PASO 4: Habeas Data y Firmas */}
        {currentStep === 4 && (
          <Card className="shadow-md border-muted-foreground/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tratamiento de Datos Personales</CardTitle>
              <CardDescription className="text-xs">
                Lea el texto legal y firme en el recuadro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              
              {/* Contenedor legal */}
              <div className="h-28 overflow-y-auto bg-muted p-2.5 rounded-lg border text-[10px] leading-relaxed text-muted-foreground">
                <p className="font-bold mb-1">AUTORIZACIÓN TRATAMIENTO DE DATOS PERSONALES (HABEAS DATA)</p>
                <p>De conformidad con la Ley 1581 de 2012 de Protección de Datos Personales, autorizo de manera libre, previa, expresa e informada a la Academia de Conducción para que recolecte, almacene, use, circule y suprima mis datos personales suministrados en el presente formulario, para la gestión de mi matrícula, procesos pedagógicos, certificaciones ante el RUNT y el Ministerio de Transporte, y el envío de comunicaciones informativas.</p>
                <p className="mt-1">Declaro que la información es verídica y que conozco mis derechos como titular de la información (conocer, actualizar, rectificar y suprimir mis datos de la base de datos de la academia).</p>
              </div>

              <div className="flex items-start space-x-2 pt-1">
                <Checkbox 
                  id="habeas" 
                  checked={habeasAccepted}
                  onCheckedChange={(checked) => setHabeasAccepted(!!checked)}
                  className="mt-0.5"
                />
                <Label htmlFor="habeas" className="text-[11px] leading-normal font-semibold cursor-pointer">
                  Acepto el tratamiento de mis datos personales de conformidad con la ley de Habeas Data *
                </Label>
              </div>

              {/* Firma Alumno */}
              <div className="space-y-1.5 border-t pt-3">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">Firma Digital del Alumno *</Label>
                  <Button variant="ghost" size="sm" onClick={clearStudentSignature} className="h-6 text-[10px] px-2 text-rose-600">
                    Limpiar
                  </Button>
                </div>
                <div className="border border-muted-foreground/20 rounded-xl overflow-hidden bg-white">
                  <SignatureCanvas 
                    ref={studentSigPad}
                    penColor="black"
                    canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                  />
                </div>
              </div>

              {/* Firma Acudiente si aplica */}
              {formData.es_menor_edad && (
                <div className="space-y-1.5 border-t pt-3 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-amber-900">Firma Digital del Acudiente *</Label>
                    <Button variant="ghost" size="sm" onClick={clearTutorSignature} className="h-6 text-[10px] px-2 text-rose-600">
                      Limpiar
                    </Button>
                  </div>
                  <div className="border border-amber-300 rounded-xl overflow-hidden bg-white">
                    <SignatureCanvas 
                      ref={tutorSigPad}
                      penColor="black"
                      canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                    />
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* PASO 5: Checklist & Enviar */}
        {currentStep === 5 && (
          <Card className="shadow-md border-muted-foreground/10 rounded-2xl">
            <CardHeader className="pb-3 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <CardTitle className="text-lg">Confirmar Matrícula</CardTitle>
              <CardDescription className="text-xs">
                Revise el checklist y finalice el proceso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              
              <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Datos Personales</span>
                  <Badge className="bg-green-100 text-green-700">Completado</Badge>
                </div>
                {formData.es_menor_edad && (
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">Datos del Acudiente</span>
                    <Badge className="bg-green-100 text-green-700">Completado</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Fotografía de perfil</span>
                  <Badge className="bg-green-100 text-green-700">Listo</Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Cédula Identidad (PDF)</span>
                  <Badge className="bg-green-100 text-green-700">Listo</Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Habeas Data firmado</span>
                  <Badge className="bg-green-100 text-green-700">Listo</Badge>
                </div>
                {formData.es_menor_edad && (
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">Firma Acudiente</span>
                    <Badge className="bg-green-100 text-green-700">Listo</Badge>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-blue-900 leading-normal">
                Al hacer clic en "Finalizar Matrícula", se generará automáticamente tu Ficha de Matrícula y el documento firmado de Habeas Data, organizando tu expediente para la firma e inspección del instructor.
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full py-5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Generando documentos...
                  </>
                ) : (
                  'Finalizar Matrícula'
                )}
              </Button>

            </CardContent>
          </Card>
        )}

        {/* Botones de Navegación Stepper */}
        {!isDone && (
          <div className="flex justify-between items-center mt-5 max-w-md mx-auto">
            {currentStep > 1 ? (
              <Button variant="outline" size="sm" onClick={handlePrevStep} className="rounded-xl h-10 px-4 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Atrás
              </Button>
            ) : (
              <div />
            )}
            
            {currentStep < totalSteps ? (
              <Button size="sm" onClick={handleNextStep} className="rounded-xl h-10 px-4 flex items-center gap-1 ml-auto">
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default MatriculaAlumno;
