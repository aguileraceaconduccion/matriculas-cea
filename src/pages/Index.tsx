import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnrollment } from '@/hooks/useEnrollment';
import type { Solicitud } from '@/types/enrollment';
import { supabase } from '@/integrations/supabase/client';
import { 
  Car, LogOut, Plus, Search, Mail, Phone, Calendar, 
  CheckCircle, Clock, AlertCircle, FileText, Send, 
  Share2, Copy, Settings, ArrowLeft, Loader2, Upload, FileCheck, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter 
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { 
    loading: enrollmentLoading, getSolicitudes, createSolicitud, 
    getAlumnoDetails, uploadInstructorPayments, sendExpedienteEmail, deleteSolicitud
  } = useEnrollment();
  const { toast } = useToast();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todos');

  // Modales e interactivos
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newCelular, setNewCelular] = useState('');
  const [newCorreo, setNewCorreo] = useState('');
  const [newCategoria, setNewCategoria] = useState('B1');
  const [generatedLink, setGeneratedLink] = useState('');
  const [justCreated, setJustCreated] = useState<Solicitud | null>(null);

  // Detalle de solicitud
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [alumnoDetails, setAlumnoDetails] = useState<any>(null);
  const [pagoPinFile, setPagoPinFile] = useState<File | null>(null);
  const [pagoTeoriaFile, setPagoTeoriaFile] = useState<File | null>(null);
  const [pagoPinPreview, setPagoPinPreview] = useState<string | null>(null);
  const [pagoTeoriaPreview, setPagoTeoriaPreview] = useState<string | null>(null);

  // Configuración de correo
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configId, setConfigId] = useState('');
  const [correoRemitente, setCorreoRemitente] = useState('');
  const [correosDestino, setCorreosDestino] = useState('');
  const [asuntoTemplate, setAsuntoTemplate] = useState('');
  const [mensajeTemplate, setMensajeTemplate] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Seguridad Ágil
  const [isAgileLocked, setIsAgileLocked] = useState(localStorage.getItem('agile_auth') !== 'true');
  const [agilePassword, setAgilePassword] = useState('');

  const loadData = async () => {
    try {
      const data = await getSolicitudes();
      setSolicitudes(data || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar datos',
        description: err.message
      });
    }
  };

  // Cargar datos al inicio
  useEffect(() => {
    if (!isAgileLocked) {
      loadData();
    }
  }, [isAgileLocked]);

  const handleAgileLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (agilePassword === 'DrivingSec2026*') {
      setIsAgileLocked(false);
      localStorage.setItem('agile_auth', 'true');
      toast({
        title: 'Acceso Concedido',
        description: 'Bienvenido al panel de administración.'
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Clave incorrecta',
        description: 'La clave maestra ingresada no es válida.'
      });
    }
  };

  const handleAgileLogout = () => {
    setIsAgileLocked(true);
    setAgilePassword('');
    localStorage.removeItem('agile_auth');
  };

  if (isAgileLocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl border-0 rounded-2xl overflow-hidden">
          <div className="bg-primary h-2 w-full" />
          <CardHeader className="text-center pb-4 pt-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
              <Car className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-display font-bold text-slate-800">Acceso Privado</CardTitle>
            <CardDescription>
              Ingrese la clave maestra de seguridad para entrar al sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAgileLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Clave maestra..."
                  value={agilePassword}
                  onChange={(e) => setAgilePassword(e.target.value)}
                  className="rounded-xl h-12 text-center text-lg"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full rounded-xl h-12 font-bold text-base">
                Ingresar al Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cargar configuración de correo
  const loadEmailConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_correo')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfigId(data.id);
        setCorreoRemitente(data.correo_remitente);
        setCorreosDestino(data.correos_destino);
        setAsuntoTemplate(data.asunto_template);
        setMensajeTemplate(data.mensaje_template);
      }
    } catch (err: any) {
      console.error('Error al cargar config de correo:', err);
    }
  };

  const handleOpenConfig = async () => {
    await loadEmailConfig();
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const dbData = {
        correo_remitente: correoRemitente,
        correos_destino: correosDestino,
        asunto_template: asuntoTemplate,
        mensaje_template: mensajeTemplate
      };

      let error = null;
      if (configId) {
        const { error: err } = await supabase
          .from('configuracion_correo')
          .update(dbData)
          .eq('id', configId);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('configuracion_correo')
          .insert(dbData);
        error = err;
      }

      if (error) throw error;

      toast({
        title: 'Configuración guardada',
        description: 'Las plantillas de correo han sido actualizadas.'
      });
      setIsConfigOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeleteSolicitud = async (id: string, nombre: string) => {
    if (window.confirm(`¿Está seguro que desea eliminar a ${nombre} y todos sus documentos de forma permanente?`)) {
      try {
        await deleteSolicitud(id);
        toast({
          title: 'Registro eliminado',
          description: `El expediente de ${nombre} ha sido eliminado.`,
        });
        if (selectedSolicitud?.id === id) {
          setSelectedSolicitud(null);
        }
        loadData();
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar',
          description: err.message,
        });
      }
    }
  };

  const handleCreateSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newCelular || !newCorreo) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor diligencie todos los campos requeridos.'
      });
      return;
    }

    try {
      const solicitud = await createSolicitud(newNombre, newCorreo, newCelular, newCategoria);
      const link = `${window.location.origin}/matricula/${solicitud.codigo_unico}`;
      setGeneratedLink(link);
      setJustCreated(solicitud);
      
      toast({
        title: 'Solicitud creada con éxito',
        description: 'Se ha generado el enlace para el alumno.'
      });
      
      // Limpiar y recargar
      setNewNombre('');
      setNewCelular('');
      setNewCorreo('');
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al crear solicitud',
        description: err.message
      });
    }
  };

  const handleSelectSolicitud = async (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud);
    setAlumnoDetails(null);
    setPagoPinFile(null);
    setPagoTeoriaFile(null);
    setPagoPinPreview(null);
    setPagoTeoriaPreview(null);

    try {
      const details = await getAlumnoDetails(solicitud.id);
      setAlumnoDetails(details);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar detalles',
        description: err.message
      });
    }
  };

  const handleUploadPayments = async () => {
    if (!selectedSolicitud || !alumnoDetails) return;
    try {
      await uploadInstructorPayments(
        alumnoDetails.alumno.id,
        selectedSolicitud.id,
        selectedSolicitud.nombre_alumno,
        pagoPinFile,
        pagoTeoriaFile
      );

      toast({
        title: 'Comprobantes subidos',
        description: 'Los pagos han sido guardados correctamente.'
      });

      // Recargar detalles y dashboard
      const details = await getAlumnoDetails(selectedSolicitud.id);
      setAlumnoDetails(details);
      loadData();

      setPagoPinFile(null);
      setPagoTeoriaFile(null);
      setPagoPinPreview(null);
      setPagoTeoriaPreview(null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al subir pagos',
        description: err.message
      });
    }
  };

  const handleSendEmail = async () => {
    if (!selectedSolicitud || !alumnoDetails) return;
    try {
      toast({
        title: 'Generando y enviando expediente...',
        description: 'Esto tomará unos segundos. Por favor espere.'
      });

      await sendExpedienteEmail(alumnoDetails.alumno.id, selectedSolicitud.id);

      toast({
        title: 'Expediente enviado',
        description: 'El correo electrónico ha sido despachado con éxito.'
      });

      // Recargar detalles y dashboard
      const details = await getAlumnoDetails(selectedSolicitud.id);
      setAlumnoDetails(details);
      
      // Actualizar la solicitud seleccionada localmente para ver el estado 'Enviado a academia'
      setSelectedSolicitud({
        ...selectedSolicitud,
        estado: 'Enviado a academia'
      });
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error en el envío',
        description: err.message
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Enlace copiado',
      description: 'El enlace se ha copiado al portapapeles.'
    });
  };

  const shareWhatsApp = (nombre: string, celular: string, link: string) => {
    const text = encodeURIComponent(`Hola ${nombre}, por favor ingresa a este enlace para diligenciar tu Ficha de Matrícula y Habeas Data para la Academia de Conducción:\n\n${link}`);
    window.open(`https://api.whatsapp.com/send?phone=57${celular}&text=${text}`, '_blank');
  };

  // Filtrado de solicitudes
  const filteredSolicitudes = solicitudes.filter(sol => {
    const matchesSearch = 
      sol.nombre_alumno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sol.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sol.celular.includes(searchTerm) ||
      sol.codigo_unico.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'todos') return matchesSearch;
    if (activeTab === 'enviadas') return matchesSearch && sol.estado === 'Enviado a academia';
    if (activeTab === 'completas') return matchesSearch && sol.estado === 'Completo';
    if (activeTab === 'pendientes_pago') return matchesSearch && sol.estado === 'Pendiente pagos instructor';
    if (activeTab === 'diligenciando') return matchesSearch && sol.estado === 'Alumno diligenciando';
    if (activeTab === 'solicitadas') return matchesSearch && sol.estado === 'Solicitud enviada';

    return matchesSearch;
  });

  // Conteo de estados
  const countState = (state: string) => solicitudes.filter(s => s.estado === state).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Driving Enrolamiento</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenConfig} className="hidden sm:flex gap-2 rounded-xl">
              <Settings className="w-4 h-4" /> Configuración
            </Button>
            <Button variant="ghost" size="icon" onClick={handleAgileLogout} title="Bloquear Panel">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-lg mx-auto px-4 mt-6">
        
        {/* Estadísticas rápidas scrollable horizontal */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          <Card className="flex-shrink-0 w-32 border-l-4 border-l-blue-500 bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Solicitadas</p>
              <p className="text-2xl font-bold mt-1">{countState('Solicitud enviada') + countState('Alumno diligenciando')}</p>
            </CardContent>
          </Card>
          <Card className="flex-shrink-0 w-32 border-l-4 border-l-amber-500 bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Falta Pago</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{countState('Pendiente pagos instructor')}</p>
            </CardContent>
          </Card>
          <Card className="flex-shrink-0 w-32 border-l-4 border-l-green-500 bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Completas</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{countState('Completo')}</p>
            </CardContent>
          </Card>
          <Card className="flex-shrink-0 w-32 border-l-4 border-l-slate-400 bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Enviadas</p>
              <p className="text-2xl font-bold mt-1 text-slate-500">{countState('Enviado a academia')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Buscador */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Buscar por nombre, cédula, celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 w-full bg-card shadow-sm border-muted-foreground/20 rounded-xl"
          />
        </div>

        {/* Tabs de Filtro */}
        <div className="flex gap-2 overflow-x-auto py-4 no-scrollbar">
          <Button 
            variant={activeTab === 'todos' ? 'default' : 'secondary'} 
            size="sm"
            onClick={() => setActiveTab('todos')}
            className="rounded-full flex-shrink-0"
          >
            Todos
          </Button>
          <Button 
            variant={activeTab === 'pendientes_pago' ? 'default' : 'secondary'} 
            size="sm"
            onClick={() => setActiveTab('pendientes_pago')}
            className="rounded-full flex-shrink-0"
          >
            Falta Pago ({countState('Pendiente pagos instructor')})
          </Button>
          <Button 
            variant={activeTab === 'completas' ? 'default' : 'secondary'} 
            size="sm"
            onClick={() => setActiveTab('completas')}
            className="rounded-full flex-shrink-0"
          >
            Completas ({countState('Completo')})
          </Button>
          <Button 
            variant={activeTab === 'enviadas' ? 'default' : 'secondary'} 
            size="sm"
            onClick={() => setActiveTab('enviadas')}
            className="rounded-full flex-shrink-0"
          >
            Enviadas ({countState('Enviado a academia')})
          </Button>
        </div>

        {/* Lista de Solicitudes */}
        <div className="space-y-3 mt-1">
          {filteredSolicitudes.length > 0 ? (
            filteredSolicitudes.map((sol) => (
              <Card 
                key={sol.id} 
                className="overflow-hidden hover:border-primary/50 transition-colors shadow-sm cursor-pointer"
                onClick={() => handleSelectSolicitud(sol)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground line-clamp-1">{sol.nombre_alumno}</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {sol.categoria}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(sol.created_at).toLocaleDateString('es-CO')}</span>
                      <span className="font-mono bg-muted px-1.5 rounded text-[10px]">{sol.codigo_unico}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      {sol.estado === 'Solicitud enviada' && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">Enviada</Badge>
                      )}
                      {sol.estado === 'Alumno diligenciando' && (
                        <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-50 border-sky-200">Diligenciando</Badge>
                      )}
                      {sol.estado === 'Pendiente pagos instructor' && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 animate-pulse">Falta Pago</Badge>
                      )}
                      {sol.estado === 'Completo' && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Completa</Badge>
                      )}
                      {sol.estado === 'Enviado a academia' && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-300">Enviado</Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSolicitud(sol.id, sol.nombre_alumno);
                      }}
                      title="Eliminar Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-dashed p-6">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No se encontraron solicitudes</p>
              <p className="text-xs text-muted-foreground mt-1">Intente cambiar el filtro o el término de búsqueda.</p>
            </div>
          )}
        </div>

        {/* Botón flotante para Nueva Matrícula */}
        <div className="fixed bottom-6 right-6">
          <Button 
            onClick={() => {
              setGeneratedLink('');
              setJustCreated(null);
              setIsCreateOpen(true);
            }} 
            className="rounded-full w-14 h-14 shadow-lg flex items-center justify-center p-0"
            title="Nueva Matrícula"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

      </main>

      {/* DIALOG: Nueva Matrícula */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl w-[92%] mx-auto">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Matrícula</DialogTitle>
            <DialogDescription>
              Ingrese los datos iniciales para generar el enlace del alumno.
            </DialogDescription>
          </DialogHeader>

          {!generatedLink ? (
            <form onSubmit={handleCreateSolicitud} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="newNombre">Nombre Completo del Alumno</Label>
                <Input 
                  id="newNombre" 
                  placeholder="Juan Pérez" 
                  value={newNombre} 
                  onChange={(e) => setNewNombre(e.target.value)} 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newCelular">Celular</Label>
                  <Input 
                    id="newCelular" 
                    type="tel"
                    placeholder="3001234567" 
                    value={newCelular} 
                    onChange={(e) => setNewCelular(e.target.value)} 
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newCategoria">Categoría</Label>
                  <select 
                    id="newCategoria"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newCategoria} 
                    onChange={(e) => setNewCategoria(e.target.value)}
                  >
                    <option value="A2">A2 (Moto)</option>
                    <option value="B1">B1 (Carro)</option>
                    <option value="C1">C1 (Público)</option>
                    <option value="C2">C2 (Camión)</option>
                    <option value="A2 y B1">A2 y B1</option>
                    <option value="A2 y C2">A2 y C2</option>
                    <option value="A2 y C1">A2 y C1</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newCorreo">Correo Electrónico</Label>
                <Input 
                  id="newCorreo" 
                  type="email"
                  placeholder="alumno@correo.com" 
                  value={newCorreo} 
                  onChange={(e) => setNewCorreo(e.target.value)} 
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={enrollmentLoading}>
                  {enrollmentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Generar Enlace
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 py-4 text-center">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-primary">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Enlace generado con éxito</p>
                <p className="text-xs text-muted-foreground mt-0.5">Código único: <strong className="font-mono text-foreground">{justCreated?.codigo_unico}</strong></p>
              </div>

              <div className="flex items-center gap-2 bg-muted p-2 rounded-lg mt-2">
                <p className="text-xs font-mono break-all text-left flex-1 line-clamp-1">{generatedLink}</p>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedLink)} className="h-8 w-8">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => justCreated && shareWhatsApp(justCreated.nombre_alumno, justCreated.celular, generatedLink)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs"
                >
                  <Share2 className="w-4 h-4 text-green-600" />
                  WhatsApp
                </Button>
                <Button 
                  onClick={() => setIsCreateOpen(false)}
                  className="w-full text-xs"
                >
                  Listo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SHEET: Detalle de Matrícula (Revisión y pagos) */}
      <Sheet open={!!selectedSolicitud} onOpenChange={() => setSelectedSolicitud(null)}>
        <SheetContent side="right" className="w-[92%] sm:max-w-md overflow-y-auto px-4 pb-8">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg">Revisar Matrícula</SheetTitle>
            <SheetDescription className="text-xs">
              Detalle del expediente y checklist del alumno.
            </SheetDescription>
          </SheetHeader>

          {selectedSolicitud && (
            <div className="space-y-5 pt-4">
              
              {/* Resumen del Alumno */}
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Estudiante</h3>
                <div className="bg-muted/40 p-3 rounded-lg space-y-1 text-xs">
                  <p className="font-semibold text-foreground text-sm">{selectedSolicitud.nombre_alumno}</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground mt-1"><Mail className="w-3.5 h-3.5" /> {selectedSolicitud.email}</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {selectedSolicitud.celular}</p>
                  <p className="mt-1">Categoría: <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{selectedSolicitud.categoria}</Badge></p>
                </div>
              </div>

              {/* Checklist Visual */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground">Checklist del Expediente</h3>
                
                {enrollmentLoading && !alumnoDetails ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Helper para obtener URL del documento */}
                    {(() => {
                      const getDocUrl = (tipo: string) => {
                        const doc = alumnoDetails?.documentos.find((d: any) => d.tipo === tipo);
                        return doc ? supabase.storage.from('expedientes').getPublicUrl(doc.storage_path).data.publicUrl : '#';
                      };

                      const renderDocStatus = (tipo: string) => {
                        const exists = alumnoDetails?.documentos.some((d: any) => d.tipo === tipo);
                        if (exists) {
                          return (
                            <a href={getDocUrl(tipo)} target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                              <Search className="w-3 h-3" /> Ver archivo
                            </a>
                          );
                        }
                        return <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">✗ Pendiente</Badge>;
                      };

                      return (
                        <>
                          {/* Items Alumno */}
                          <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                            <span className="text-muted-foreground">Ficha de Matrícula (.docx)</span>
                            {renderDocStatus('ficha_matricula')}
                          </div>
                          
                          <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                            <span className="text-muted-foreground">Habeas Data firmado (.pdf)</span>
                            {renderDocStatus('habeas_data')}
                          </div>

                          <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                            <span className="text-muted-foreground">Fotografía del Alumno</span>
                            {renderDocStatus('foto')}
                          </div>

                          <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                            <span className="text-muted-foreground">Cédula Identidad (PDF)</span>
                            {renderDocStatus('cedula_pdf')}
                          </div>

                          {/* Items Instructor */}
                          <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                            <span className="text-muted-foreground">Comprobante Pago PIN</span>
                            {renderDocStatus('pago_pin')}
                          </div>

                          <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                            <span className="text-muted-foreground">Comprobante Pago Teoría</span>
                            {renderDocStatus('pago_teoria')}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Subida de Pagos (Instructor) */}
              {alumnoDetails && (
                <div className="space-y-3 border-t pt-3">
                  <h3 className="text-sm font-bold text-foreground">Soportes de Pago (Instructor)</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Pago PIN */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Pago PIN</Label>
                      {alumnoDetails.documentos.some((d: any) => d.tipo === 'pago_pin') ? (
                        <div className="h-20 bg-muted/30 rounded border border-dashed flex items-center justify-center text-[10px] text-green-600 font-semibold">
                          <FileCheck className="w-5 h-5 mr-1" /> Cargado
                        </div>
                      ) : (
                        <label className="h-20 bg-card rounded border border-dashed border-muted-foreground/30 hover:border-primary flex flex-col items-center justify-center cursor-pointer p-2 text-center transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Subir Pago PIN</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPagoPinFile(file);
                                setPagoPinPreview(URL.createObjectURL(file));
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                      )}
                      {pagoPinPreview && (
                        <p className="text-[9px] text-amber-600 truncate mt-0.5">Listo: {pagoPinFile?.name}</p>
                      )}
                    </div>

                    {/* Pago Teoría */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Pago Teoría</Label>
                      {alumnoDetails.documentos.some((d: any) => d.tipo === 'pago_teoria') ? (
                        <div className="h-20 bg-muted/30 rounded border border-dashed flex items-center justify-center text-[10px] text-green-600 font-semibold">
                          <FileCheck className="w-5 h-5 mr-1" /> Cargado
                        </div>
                      ) : (
                        <label className="h-20 bg-card rounded border border-dashed border-muted-foreground/30 hover:border-primary flex flex-col items-center justify-center cursor-pointer p-2 text-center transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Subir Pago Teoría</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPagoTeoriaFile(file);
                                setPagoTeoriaPreview(URL.createObjectURL(file));
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                      )}
                      {pagoTeoriaPreview && (
                        <p className="text-[9px] text-amber-600 truncate mt-0.5">Listo: {pagoTeoriaFile?.name}</p>
                      )}
                    </div>
                  </div>

                  {(pagoPinFile || pagoTeoriaFile) && (
                    <Button 
                      size="sm" 
                      onClick={handleUploadPayments} 
                      className="w-full mt-1 text-xs" 
                      disabled={enrollmentLoading}
                    >
                      {enrollmentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                      Guardar Comprobantes de Pago
                    </Button>
                  )}
                </div>
              )}

              {/* Botón de Enviar Expediente */}
              {alumnoDetails && (
                <div className="border-t pt-4 space-y-2">
                  {selectedSolicitud.estado === 'Completo' ? (
                    <Button 
                      onClick={handleSendEmail} 
                      className="w-full py-5 text-sm rounded-xl font-bold flex items-center justify-center gap-1.5 shadow"
                      disabled={enrollmentLoading}
                    >
                      {enrollmentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4" />}
                      ENVIAR EXPEDIENTE A ACADEMIA
                    </Button>
                  ) : selectedSolicitud.estado === 'Enviado a academia' ? (
                    <Button 
                      variant="outline"
                      onClick={handleSendEmail} 
                      className="w-full py-5 text-sm rounded-xl font-semibold border-primary text-primary flex items-center justify-center gap-1.5"
                      disabled={enrollmentLoading}
                    >
                      {enrollmentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4" />}
                      REENVIAR EXPEDIENTE
                    </Button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-2.5 rounded-lg flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>El checklist de documentos no está completo. El alumno debe finalizar su registro y el instructor cargar los soportes de pago antes de enviar a la academia.</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          <SheetFooter className="mt-6 border-t pt-4">
            <Button variant="ghost" onClick={() => setSelectedSolicitud(null)} className="w-full">Cerrar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* DIALOG: Configuración de Correo */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-md rounded-2xl w-[92%] mx-auto overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Configuración de Correo</DialogTitle>
            <DialogDescription className="text-xs">
              Modifique los destinatarios y plantillas para el envío de expedientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Correo Remitente</Label>
              <Input 
                value={correoRemitente} 
                onChange={(e) => setCorreoRemitente(e.target.value)} 
                placeholder="augustoaguilera80@gmail.com"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Correos Destinatarios (Separados por comas)</Label>
              <Input 
                value={correosDestino} 
                onChange={(e) => setCorreosDestino(e.target.value)} 
                placeholder="Drivingmatriculas23@hotmail.com"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Asunto del Correo (Template)</Label>
              <Input 
                value={asuntoTemplate} 
                onChange={(e) => setAsuntoTemplate(e.target.value)} 
                placeholder="Enrolamiento de {NombreAlumno} {TipoDocumento} {NumeroDocumento} {Categoria}"
              />
              <span className="text-[9px] text-muted-foreground block">Keywords: {"{NombreAlumno}"}, {"{TipoDocumento}"}, {"{NumeroDocumento}"}, {"{Categoria}"}</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mensaje del Correo (Template)</Label>
              <Textarea 
                value={mensajeTemplate} 
                onChange={(e) => setMensajeTemplate(e.target.value)} 
                placeholder="Cordial saludo..."
                rows={5}
                className="resize-none text-xs"
              />
              <span className="text-[9px] text-muted-foreground block">Keywords: {"{NombreAlumno}"}, {"{TipoDocumento}"}, {"{NumeroDocumento}"}, {"{Categoria}"}</span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
              {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
