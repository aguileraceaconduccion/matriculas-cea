-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla: usuarios (Instructor)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Tabla: solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_unico TEXT NOT NULL UNIQUE,
    nombre_alumno TEXT NOT NULL,
    email TEXT NOT NULL,
    celular TEXT NOT NULL,
    categoria TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN (
        'Solicitud enviada',
        'Alumno diligenciando',
        'Pendiente pagos instructor',
        'Completo',
        'Enviado a academia',
        'Aprobado',
        'Rechazado'
    )),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Tabla: alumnos
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID REFERENCES public.solicitudes(id) ON DELETE CASCADE,
    categoria TEXT,
    fecha_ingreso DATE,
    tipo_documento TEXT,
    numero_documento TEXT,
    nombres TEXT,
    apellidos TEXT,
    genero TEXT,
    estado_civil TEXT,
    fecha_nacimiento DATE,
    lugar_origen TEXT,
    estrato TEXT,
    eps TEXT,
    nivel_formacion TEXT,
    ocupacion TEXT,
    email_1 TEXT,
    email_2 TEXT,
    celular TEXT,
    telefono_fijo TEXT,
    direccion TEXT,
    contacto_emergencia TEXT,
    celular_emergencia TEXT,
    asesor TEXT,
    es_menor_edad BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Tabla: acudientes
CREATE TABLE IF NOT EXISTS public.acudientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID REFERENCES public.alumnos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    documento TEXT NOT NULL,
    celular TEXT NOT NULL,
    firma_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Tabla: documentos
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID REFERENCES public.alumnos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN (
        'foto',
        'cedula_pdf',
        'pago_pin',
        'pago_teoria',
        'ficha_matricula',
        'habeas_data'
    )),
    nombre_archivo TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Tabla: configuracion_correo
CREATE TABLE IF NOT EXISTS public.configuracion_correo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_remitente TEXT NOT NULL DEFAULT 'augustoaguilera80@gmail.com',
    correos_destino TEXT NOT NULL DEFAULT 'Drivingmatriculas23@hotmail.com',
    asunto_template TEXT NOT NULL,
    mensaje_template TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. Tabla: historial_envios
CREATE TABLE IF NOT EXISTS public.historial_envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha_envio TIMESTAMPTZ DEFAULT now() NOT NULL,
    destinatarios TEXT NOT NULL,
    estado TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 9. Seed de configuración de correo (si no existe)
INSERT INTO public.configuracion_correo (asunto_template, mensaje_template)
VALUES (
    'Enrolamiento de {NombreAlumno} {TipoDocumento} {NumeroDocumento} {Categoria}',
    E'Cordial saludo,\n\nEnvío documentación, pago de pin y teoría de {NombreAlumno} {TipoDocumento} {NumeroDocumento} {Categoria}.\n\nMuchas gracias.'
) ON CONFLICT DO NOTHING;

-- 10. Trigger para sincronizar auth.users con la tabla public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'nombre');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acudientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_correo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_envios ENABLE ROW LEVEL SECURITY;

-- 12. Políticas RLS
-- Tabla: usuarios (Solo lectura de sí mismos)
CREATE POLICY "Permitir ver su propio usuario" ON public.usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Permitir actualizar su propio usuario" ON public.usuarios
    FOR UPDATE USING (auth.uid() = id);

-- Tabla: solicitudes (Acceso público para alumnos con código_único y completo para el instructor)
CREATE POLICY "Instructor gestiona solicitudes" ON public.solicitudes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura pública de solicitudes para alumnos" ON public.solicitudes
    FOR SELECT USING (true);

CREATE POLICY "Actualización pública de solicitudes para alumnos" ON public.solicitudes
    FOR UPDATE USING (true);

CREATE POLICY "Creación pública de solicitudes" ON public.solicitudes
    FOR INSERT WITH CHECK (true);

-- Tabla: alumnos (Acceso público para inserción/lectura y completo para instructor)
CREATE POLICY "Instructor gestiona alumnos" ON public.alumnos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Acceso público alumnos" ON public.alumnos
    FOR ALL USING (true);

-- Tabla: acudientes (Acceso público y completo para instructor)
CREATE POLICY "Instructor gestiona acudientes" ON public.acudientes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Acceso público acudientes" ON public.acudientes
    FOR ALL USING (true);

-- Tabla: documentos (Acceso público y completo para instructor)
CREATE POLICY "Instructor gestiona documentos" ON public.documentos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Acceso público documentos" ON public.documentos
    FOR ALL USING (true);

-- Tabla: configuracion_correo (Solo el instructor puede ver/editar)
CREATE POLICY "Instructor gestiona configuracion_correo" ON public.configuracion_correo
    FOR ALL USING (auth.role() = 'authenticated');

-- Tabla: historial_envios (Solo el instructor puede ver/crear)
CREATE POLICY "Instructor gestiona historial_envios" ON public.historial_envios
    FOR ALL USING (auth.role() = 'authenticated');
