export interface AlumnoData {
  categoria: string;
  fecha_ingreso: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  genero: string;
  estado_civil: string;
  fecha_nacimiento: string;
  lugar_origen: string;
  estrato: string;
  eps: string;
  nivel_formacion: string;
  ocupacion: string;
  email_1: string;
  email_2?: string;
  celular: string;
  telefono_fijo?: string;
  direccion: string;
  contacto_emergencia: string;
  celular_emergencia: string;
  asesor: string;
  es_menor_edad: boolean;
  
  // Acudiente si aplica
  acudiente_nombre?: string;
  acudiente_documento?: string;
  acudiente_celular?: string;
}

export interface Solicitud {
  id: string;
  codigo_unico: string;
  nombre_alumno: string;
  email: string;
  celular: string;
  categoria: string;
  estado: 'Solicitud enviada' | 'Alumno diligenciando' | 'Pendiente pagos instructor' | 'Completo' | 'Enviado a academia' | 'Aprobado' | 'Rechazado';
  created_at: string;
}

export const CATEGORIAS_LICENCIA = [
  { value: 'A1', label: 'A1 - Motocicletas < 125 cc' },
  { value: 'A2', label: 'A2 - Motocicletas > 125 cc' },
  { value: 'B1', label: 'B1 - Automóviles y camionetas particulares' },
  { value: 'B2', label: 'B2 - Buses y camiones particulares' },
  { value: 'C1', label: 'C1 - Automóviles y camionetas públicas' },
  { value: 'C2', label: 'C2 - Buses y camiones públicos' },
  { value: 'A2 y B1', label: 'A2 y B1 - Moto y Automóvil particular' },
  { value: 'A2 y C2', label: 'A2 y C2 - Moto y Camión público' },
  { value: 'A2 y C1', label: 'A2 y C1 - Moto y Automóvil público' },
] as const;

export const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'CC - Cédula de Ciudadanía' },
  { value: 'TI', label: 'TI - Tarjeta de Identidad' },
  { value: 'CE', label: 'CE - Cédula de Extranjería' },
  { value: 'PPT', label: 'PPT - Permiso por Protección Temporal' },
  { value: 'PAS', label: 'PAS - Pasaporte' },
] as const;

export const GENEROS = ['Masculino', 'Femenino', 'Otro'] as const;

export const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Unión Libre', 'Divorciado/a', 'Viudo/a'] as const;

export const ESTRATOS = ['1', '2', '3', '4', '5', '6'] as const;

export const NIVELES_FORMACION = [
  'Primaria',
  'Secundaria / Bachillerato',
  'Técnico',
  'Tecnológico',
  'Profesional',
  'Posgrado (Especialización, Maestría, Doctorado)',
] as const;
