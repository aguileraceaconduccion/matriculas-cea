export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          nombre?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedSchema: "auth"
          }
        ]
      }
      solicitudes: {
        Row: {
          id: string
          codigo_unico: string
          nombre_alumno: string
          email: string
          celular: string
          categoria: string
          estado: 'Solicitud enviada' | 'Alumno diligenciando' | 'Pendiente pagos instructor' | 'Completo' | 'Enviado a academia' | 'Aprobado' | 'Rechazado'
          created_at: string
        }
        Insert: {
          id?: string
          codigo_unico: string
          nombre_alumno: string
          email: string
          celular: string
          categoria: string
          estado?: 'Solicitud enviada' | 'Alumno diligenciando' | 'Pendiente pagos instructor' | 'Completo' | 'Enviado a academia' | 'Aprobado' | 'Rechazado'
          created_at?: string
        }
        Update: {
          id?: string
          codigo_unico?: string
          nombre_alumno?: string
          email?: string
          celular?: string
          categoria?: string
          estado?: 'Solicitud enviada' | 'Alumno diligenciando' | 'Pendiente pagos instructor' | 'Completo' | 'Enviado a academia' | 'Aprobado' | 'Rechazado'
          created_at?: string
        }
        Relationships: []
      }
      alumnos: {
        Row: {
          id: string
          solicitud_id: string | null
          categoria: string | null
          fecha_ingreso: string | null
          tipo_documento: string | null
          numero_documento: string | null
          nombres: string | null
          apellidos: string | null
          genero: string | null
          estado_civil: string | null
          fecha_nacimiento: string | null
          lugar_origin: string | null // Keep PRD spelling: lugar_origen
          lugar_origen: string | null
          estrato: string | null
          eps: string | null
          nivel_formacion: string | null
          ocupacion: string | null
          email_1: string | null
          email_2: string | null
          celular: string | null
          telefono_fijo: string | null
          direccion: string | null
          contacto_emergencia: string | null
          celular_emergencia: string | null
          asesor: string | null
          es_menor_edad: boolean
          created_at: string
        }
        Insert: {
          id?: string
          solicitud_id?: string | null
          categoria?: string | null
          fecha_ingreso?: string | null
          tipo_documento?: string | null
          numero_documento?: string | null
          nombres?: string | null
          apellidos?: string | null
          genero?: string | null
          estado_civil?: string | null
          fecha_nacimiento?: string | null
          lugar_origen?: string | null
          estrato?: string | null
          eps?: string | null
          nivel_formacion?: string | null
          ocupacion?: string | null
          email_1?: string | null
          email_2?: string | null
          celular?: string | null
          telefono_fijo?: string | null
          direccion?: string | null
          contacto_emergencia?: string | null
          celular_emergencia?: string | null
          asesor?: string | null
          es_menor_edad?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          solicitud_id?: string | null
          categoria?: string | null
          fecha_ingreso?: string | null
          tipo_documento?: string | null
          numero_documento?: string | null
          nombres?: string | null
          apellidos?: string | null
          genero?: string | null
          estado_civil?: string | null
          fecha_nacimiento?: string | null
          lugar_origen?: string | null
          estrato?: string | null
          eps?: string | null
          nivel_formacion?: string | null
          ocupacion?: string | null
          email_1?: string | null
          email_2?: string | null
          celular?: string | null
          telefono_fijo?: string | null
          direccion?: string | null
          contacto_emergencia?: string | null
          celular_emergencia?: string | null
          asesor?: string | null
          es_menor_edad?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            referencedRelation: "solicitudes"
            referencedSchema: "public"
          }
        ]
      }
      acudientes: {
        Row: {
          id: string
          alumno_id: string | null
          nombre: string
          documento: string
          celular: string
          firma_url: string
          created_at: string
        }
        Insert: {
          id?: string
          alumno_id?: string | null
          nombre: string
          documento: string
          celular: string
          firma_url: string
          created_at?: string
        }
        Update: {
          id?: string
          alumno_id?: string | null
          nombre?: string
          documento?: string
          celular?: string
          firma_url?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acudientes_alumno_id_fkey"
            columns: ["alumno_id"]
            referencedRelation: "alumnos"
            referencedSchema: "public"
          }
        ]
      }
      documentos: {
        Row: {
          id: string
          alumno_id: string | null
          tipo: 'foto' | 'cedula_pdf' | 'pago_pin' | 'pago_teoria' | 'ficha_matricula' | 'habeas_data'
          nombre_archivo: string
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          alumno_id?: string | null
          tipo: 'foto' | 'cedula_pdf' | 'pago_pin' | 'pago_teoria' | 'ficha_matricula' | 'habeas_data'
          nombre_archivo: string
          storage_path: string
          created_at?: string
        }
        Update: {
          id?: string
          alumno_id?: string | null
          tipo?: 'foto' | 'cedula_pdf' | 'pago_pin' | 'pago_teoria' | 'ficha_matricula' | 'habeas_data'
          nombre_archivo?: string
          storage_path?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_alumno_id_fkey"
            columns: ["alumno_id"]
            referencedRelation: "alumnos"
            referencedSchema: "public"
          }
        ]
      }
      configuracion_correo: {
        Row: {
          id: string
          correo_remitente: string
          correos_destino: string
          asunto_template: string
          mensaje_template: string
          created_at: string
        }
        Insert: {
          id?: string
          correo_remitente?: string
          correos_destino?: string
          asunto_template: string
          mensaje_template: string
          created_at?: string
        }
        Update: {
          id?: string
          correo_remitente?: string
          correos_destino?: string
          asunto_template?: string
          mensaje_template?: string
          created_at?: string
        }
        Relationships: []
      }
      historial_envios: {
        Row: {
          id: string
          alumno_id: string | null
          fecha_envio: string
          destinatarios: string
          estado: string
          created_at: string
        }
        Insert: {
          id?: string
          alumno_id?: string | null
          fecha_envio?: string
          destinatarios: string
          estado: string
          created_at?: string
        }
        Update: {
          id?: string
          alumno_id?: string | null
          fecha_envio?: string
          destinatarios?: string
          estado?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_envios_alumno_id_fkey"
            columns: ["alumno_id"]
            referencedRelation: "alumnos"
            referencedSchema: "public"
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
