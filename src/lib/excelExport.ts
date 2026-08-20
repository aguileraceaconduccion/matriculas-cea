import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export const exportEnrollmentBackupToExcel = async () => {
  // 1. Obtener todas las solicitudes con alumnos, acudientes y documentos asociados
  const { data: solicitudes, error } = await supabase
    .from('solicitudes')
    .select(`
      *,
      alumnos (
        *,
        acudientes (*),
        documentos (*)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error al consultar la base de datos: ${error.message}`);
  }

  if (!solicitudes || solicitudes.length === 0) {
    throw new Error('No hay registros de solicitudes para exportar.');
  }

  const baseUrl = window.location.href.split('#')[0].replace(/\/$/, '');

  // 2. Mapear los datos a filas legibles para Excel
  const excelRows = solicitudes.map((sol: any, index: number) => {
    const alumno = sol.alumnos && sol.alumnos.length > 0 ? sol.alumnos[0] : null;
    const acudiente = alumno?.acudientes && alumno.acudientes.length > 0 ? alumno.acudientes[0] : null;
    const docs = alumno?.documentos || [];

    const getDocUrl = (tipo: string) => {
      const doc = docs.find((d: any) => d.tipo === tipo);
      if (!doc || !doc.storage_path) return '';
      const { data } = supabase.storage.from('expedientes').getPublicUrl(doc.storage_path);
      return data?.publicUrl || '';
    };

    // Separar nombres y apellidos si alumno no está creado
    let nombres = alumno?.nombres || '';
    let apellidos = alumno?.apellidos || '';
    if (!nombres && sol.nombre_alumno) {
      if (sol.nombre_alumno.includes('  ')) {
        const parts = sol.nombre_alumno.split('  ');
        nombres = parts[0] || '';
        apellidos = parts[1] || '';
      } else {
        nombres = sol.nombre_alumno.split(' ')[0] || '';
        apellidos = sol.nombre_alumno.split(' ').slice(1).join(' ') || '';
      }
    }

    return {
      'No.': index + 1,
      'Código Único': sol.codigo_unico || '',
      'Estado': sol.estado === 'Solicitud enviada' ? 'Recibida' : (sol.estado || ''),
      'Fecha Creación': sol.created_at ? new Date(sol.created_at).toLocaleDateString('es-CO') : '',
      'Categoría': sol.categoria || alumno?.categoria || '',
      
      // Datos Personales
      'Tipo Documento': alumno?.tipo_documento || 'CC',
      'Número Documento': alumno?.numero_documento || '',
      'Nombres': nombres,
      'Apellidos': apellidos,
      'Género': alumno?.genero || '',
      'Estado Civil': alumno?.estado_civil || '',
      'Fecha Nacimiento': alumno?.fecha_nacimiento || '',
      'Lugar de Origen': alumno?.lugar_origen || '',
      'Estrato': alumno?.estrato || '',
      'EPS': alumno?.eps || '',
      'Nivel de Formación': alumno?.nivel_formacion || '',
      'Ocupación': alumno?.ocupacion || '',
      'Celular': sol.celular || alumno?.celular || '',
      'Teléfono Fijo': alumno?.telefono_fijo || '',
      'Correo Electrónico': alumno?.email_1 || sol.email || '',
      'Correo Secundario': alumno?.email_2 || '',
      'Dirección de Residencia': alumno?.direccion || '',
      'Contacto de Emergencia': alumno?.contacto_emergencia || '',
      'Celular de Emergencia': alumno?.celular_emergencia || '',
      'Asesor': alumno?.asesor || 'Cesar Aguilera',
      'Es Menor de Edad': alumno?.es_menor_edad ? 'SÍ' : 'NO',
      
      // Datos Acudiente (si aplica)
      'Nombre Acudiente': acudiente?.nombre || '',
      'Documento Acudiente': acudiente?.documento || '',
      'Celular Acudiente': acudiente?.celular || '',
      'Link Firma Acudiente': acudiente?.firma_url || '',

      // Links a Documentos
      'Link Enlace Alumno (Web)': `${baseUrl}#/matricula/${sol.codigo_unico}`,
      'Link Foto Alumno': getDocUrl('foto'),
      'Link Cédula PDF': getDocUrl('cedula_pdf'),
      'Link Licencia PDF': getDocUrl('licencia_pdf'),
      'Link Ficha Matrícula (.docx)': getDocUrl('ficha_matricula'),
      'Link Habeas Data Firmado (.pdf)': getDocUrl('habeas_data'),
      'Link Pago PIN': getDocUrl('pago_pin'),
      'Link Pago Teoría': getDocUrl('pago_teoria')
    };
  });

  // 3. Crear Workbook y Worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelRows);

  // Ajustar anchos de columnas automáticamente
  const colWidths = Object.keys(excelRows[0] || {}).map(key => {
    const maxLen = Math.max(
      key.length,
      ...excelRows.map(row => String((row as any)[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrículas y Documentos');

  // 4. Descargar archivo Excel
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Respaldo_Matriculas_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
  return { success: true, count: excelRows.length, fileName };
};
