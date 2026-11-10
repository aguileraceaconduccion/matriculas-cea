import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AlumnoData, Solicitud } from '@/types/enrollment';
import { generateFichaMatriculaDocx, generateHabeasDataPDF, fichaMatriculaFileName } from '@/lib/documentGenerator';

// Código único de 16 caracteres generado con el generador criptográfico del navegador
// (alfabeto de 32 símbolos sin caracteres ambiguos, sin sesgo de módulo).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateSecureCode = (length = 16) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
};

// Convierte un data URL (firma del canvas) en Blob
const dataUrlToBlob = (dataUrl: string) => {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
};

export const useEnrollment = () => {
  const [loading, setLoading] = useState(false);

  // --- MÉTODOS DEL INSTRUCTOR ---

  // Obtener todas las solicitudes para el Dashboard
  const getSolicitudes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select('*, alumnos(tipo_documento, numero_documento)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Solicitud[];
    } catch (err) {
      console.error('Error al obtener solicitudes:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Crear una nueva solicitud de matrícula
  const createSolicitud = async (
    nombre_alumno: string,
    email: string,
    celular: string,
    categoria: string
  ) => {
    setLoading(true);
    try {
      const codigo_unico = generateSecureCode();
      
      const { data, error } = await supabase
        .from('solicitudes')
        .insert({
          codigo_unico,
          nombre_alumno,
          email,
          celular,
          categoria,
          estado: 'Solicitud enviada'
        })
        .select()
        .single();

      if (error) throw error;
      return data as Solicitud;
    } catch (err) {
      console.error('Error al crear solicitud:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Obtener los detalles completos de un alumno (para revisión del instructor)
  const getAlumnoDetails = async (solicitudId: string) => {
    setLoading(true);
    try {
      // 1. Obtener alumno
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumnos')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (alumnoError) throw alumnoError;
      if (!alumno) return null;

      // 2. Obtener acudiente (si aplica)
      const { data: acudiente } = await supabase
        .from('acudientes')
        .select('*')
        .eq('alumno_id', alumno.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Obtener documentos
      const { data: documentos } = await supabase
        .from('documentos')
        .select('*')
        .eq('alumno_id', alumno.id);

      // El bucket es privado: se generan enlaces firmados que caducan en 1 hora
      const docs = documentos || [];
      const urlByPath = new Map<string, string>();
      if (docs.length > 0) {
        const { data: signed } = await supabase.storage
          .from('expedientes')
          .createSignedUrls(docs.map(d => d.storage_path), 3600);
        signed?.forEach(s => {
          if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
        });
      }

      return {
        alumno,
        acudiente,
        documentos: docs.map(d => ({ ...d, signed_url: urlByPath.get(d.storage_path) ?? null }))
      };
    } catch (err) {
      console.error('Error al obtener detalles del alumno:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cargar soportes de pagos por el instructor
  const uploadInstructorPayments = async (
    alumnoId: string,
    solicitudId: string,
    nombreAlumno: string,
    pagoPinFile: File | null,
    pagoTeoriaFile: File | null
  ) => {
    setLoading(true);
    try {
      const cleanName = nombreAlumno.replace(/[^a-zA-Z0-9]/g, '_');

      const uploadedDocs = [];

      // 1. Cargar Pago PIN
      if (pagoPinFile) {
        const pinExt = pagoPinFile.name.split('.').pop() || 'jpg';
        const pinPath = `${alumnoId}/PagoPIN_${cleanName}.${pinExt}`;
        
        const { error: uploadPinErr } = await supabase.storage
          .from('expedientes')
          .upload(pinPath, pagoPinFile, { upsert: true });

        if (uploadPinErr) throw uploadPinErr;

        const { error: dbPinErr } = await supabase.from('documentos').insert({
          alumno_id: alumnoId,
          tipo: 'pago_pin',
          nombre_archivo: `PagoPIN_${cleanName}.${pinExt}`,
          storage_path: pinPath
        });

        if (dbPinErr) throw dbPinErr;
        uploadedDocs.push('pago_pin');
      }

      // 2. Cargar Pago Teoría
      if (pagoTeoriaFile) {
        const teorExt = pagoTeoriaFile.name.split('.').pop() || 'jpg';
        const teorPath = `${alumnoId}/PagoTeoria_${cleanName}.${teorExt}`;
        
        const { error: uploadTeorErr } = await supabase.storage
          .from('expedientes')
          .upload(teorPath, pagoTeoriaFile, { upsert: true });

        if (uploadTeorErr) throw uploadTeorErr;

        const { error: dbTeorErr } = await supabase.from('documentos').insert({
          alumno_id: alumnoId,
          tipo: 'pago_teoria',
          nombre_archivo: `PagoTeoria_${cleanName}.${teorExt}`,
          storage_path: teorPath
        });

        if (dbTeorErr) throw dbTeorErr;
        uploadedDocs.push('pago_teoria');
      }

      // 3. Validar si ya están todos los documentos para pasar a estado Completo
      // Verificamos los documentos existentes
      const { data: docs } = await supabase
        .from('documentos')
        .select('tipo')
        .eq('alumno_id', alumnoId);

      const docTypes = docs?.map(d => d.tipo) || [];
      const hasFoto = docTypes.includes('foto');
      const hasCedula = docTypes.includes('cedula_pdf');
      const hasHabeas = docTypes.includes('habeas_data');
      const hasFicha = docTypes.includes('ficha_matricula');
      
      const hasAll = hasFoto && hasCedula && hasHabeas && hasFicha && 
                     (docTypes.includes('pago_pin') || uploadedDocs.includes('pago_pin')) && 
                     (docTypes.includes('pago_teoria') || uploadedDocs.includes('pago_teoria'));

      // Actualizar estado de solicitud
      const { error: stateError } = await supabase
        .from('solicitudes')
        .update({ estado: hasAll ? 'Completo' : 'Pendiente pagos instructor' })
        .eq('id', solicitudId);

      if (stateError) throw stateError;

      return { success: true };
    } catch (err) {
      console.error('Error al subir comprobantes de pago:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- MÉTODOS DEL ALUMNO ---

  // Obtener solicitud por código de token
  const getSolicitudByToken = async (token: string) => {
    setLoading(true);
    try {
      // Función RPC: valida el código en el servidor y marca "Alumno diligenciando"
      const { data, error } = await supabase.rpc('abrir_solicitud', { p_codigo: token });

      if (error) throw error;
      return (data as unknown as Solicitud | null) ?? null;
    } catch (err) {
      console.error('Error al buscar solicitud por token:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estado de solicitud
  const updateSolicitudEstado = async (id: string, estado: Solicitud['estado']) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ estado })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enviar los datos del Alumno (Guardado y Carga de archivos)
  const submitAlumnoEnrollment = async (
    solicitud: Solicitud,
    alumnoData: AlumnoData,
    fotoFile: File,
    cedulaPdfFile: File,
    studentSignatureUrl: string,
    tutorSignatureUrl?: string,
    licenciaPdfFile?: File
  ) => {
    setLoading(true);
    try {
      const cleanName = `${alumnoData.nombres} ${alumnoData.apellidos}`.trim().replace(/[^a-zA-Z0-9]/g, '_');

      // Todo el flujo del alumno usa funciones RPC validadas por el servidor con el código único.
      // Los archivos se guardan con su nombre limpio; solo si ya existe uno igual (reintento del alumno)
      // se le antepone una marca de tiempo para no chocar con el archivo previo.
      const codigo = solicitud.codigo_unico;
      const upload = async (alumnoId: string, fileName: string, body: Blob | File, contentType: string) => {
        for (const path of [`${alumnoId}/${fileName}`, `${alumnoId}/${Date.now()}_${fileName}`]) {
          const { error } = await supabase.storage
            .from('expedientes')
            .upload(path, body, { contentType, upsert: false });
          if (!error) return path;
          const duplicado = (error as any).statusCode === '409' || /already exists|duplicate/i.test(error.message);
          if (!duplicado) throw error;
        }
        throw new Error('No se pudo subir el archivo');
      };
      const registrarDocumento = async (alumnoId: string, tipo: string, nombre: string, path: string) => {
        const { error } = await supabase.rpc('registrar_documento', {
          p_codigo: codigo,
          p_alumno: alumnoId,
          p_tipo: tipo,
          p_nombre: nombre,
          p_path: path,
        });
        if (error) throw error;
      };

      // 1. Registrar (o actualizar si es un reintento) al alumno
      const { acudiente_nombre, acudiente_documento, acudiente_celular, ...alumnoRow } = alumnoData;
      const { data: alumnoIdData, error: insertAlumnoErr } = await supabase.rpc('registrar_matricula', {
        p_codigo: codigo,
        p_alumno: alumnoRow as unknown as Record<string, never>,
      });
      if (insertAlumnoErr) throw insertAlumnoErr;
      const alumnoId = alumnoIdData as unknown as string;

      // 2. Si es menor de edad, subir la firma y registrar al acudiente
      if (alumnoData.es_menor_edad && tutorSignatureUrl && acudiente_nombre) {
        const tutorSigPath = await upload(
          alumnoId, `FirmaAcudiente_${cleanName}.png`, dataUrlToBlob(tutorSignatureUrl), 'image/png'
        );

        const { error: insertAcudienteErr } = await supabase.rpc('registrar_acudiente', {
          p_codigo: codigo,
          p_alumno: alumnoId,
          p_nombre: acudiente_nombre,
          p_documento: acudiente_documento || '',
          p_celular: acudiente_celular || '',
          p_firma_path: tutorSigPath,
        });
        if (insertAcudienteErr) throw insertAcudienteErr;
      }

      // 3. Fotografía del estudiante
      const fotoExt = fotoFile.name.split('.').pop() || 'jpg';
      const fotoNombre = `Foto_${cleanName}.${fotoExt}`;
      const fotoPath = await upload(alumnoId, fotoNombre, fotoFile, fotoFile.type || 'image/jpeg');
      await registrarDocumento(alumnoId, 'foto', fotoNombre, fotoPath);

      // 4. Cédula en PDF
      const cedulaNombre = `Cedula_${cleanName}.pdf`;
      const cedulaPath = await upload(alumnoId, cedulaNombre, cedulaPdfFile, 'application/pdf');
      await registrarDocumento(alumnoId, 'cedula_pdf', cedulaNombre, cedulaPath);

      // 4.5. Licencia de conducción en PDF (si aplica)
      if (licenciaPdfFile) {
        const licenciaNombre = `Licencia_${cleanName}.pdf`;
        const licenciaPath = await upload(alumnoId, licenciaNombre, licenciaPdfFile, 'application/pdf');
        await registrarDocumento(alumnoId, 'licencia_pdf', licenciaNombre, licenciaPath);
      }

      // 5. Generar y subir Habeas Data PDF
      const habeasPdfFile = await generateHabeasDataPDF({
        studentName: `${alumnoData.nombres} ${alumnoData.apellidos}`.trim(),
        documentType: alumnoData.tipo_documento,
        documentNumber: alumnoData.numero_documento,
        signatureDataUrl: studentSignatureUrl,
        isMinor: alumnoData.es_menor_edad,
        tutorName: alumnoData.acudiente_nombre,
        tutorDocument: alumnoData.acudiente_documento,
        tutorSignatureDataUrl: tutorSignatureUrl
      });
      const habeasNombre = `HabeasData_${cleanName}.pdf`;
      const habeasPath = await upload(alumnoId, habeasNombre, habeasPdfFile, 'application/pdf');
      await registrarDocumento(alumnoId, 'habeas_data', habeasNombre, habeasPath);

      // 6. Generar y subir Ficha de Matrícula DOCX
      const fichaDocxFile = await generateFichaMatriculaDocx({
        ...alumnoData,
        acudiente_nombre: alumnoData.acudiente_nombre,
        acudiente_documento: alumnoData.acudiente_documento,
        acudiente_celular: alumnoData.acudiente_celular,
      });
      const fichaNombre = fichaMatriculaFileName(alumnoData.nombres, alumnoData.apellidos);
      const fichaPath = await upload(
        alumnoId,
        fichaNombre,
        fichaDocxFile,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      await registrarDocumento(alumnoId, 'ficha_matricula', fichaNombre, fichaPath);

      // 7. Cerrar el diligenciamiento (el servidor verifica que estén los documentos obligatorios)
      const { error: updateSolErr } = await supabase.rpc('finalizar_matricula', {
        p_codigo: codigo,
        p_alumno: alumnoId,
      });
      if (updateSolErr) throw updateSolErr;

      return { success: true, alumnoId };
    } catch (err) {
      console.error('Error al diligenciar matrícula:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- ENVÍO DE CORREOS ---

  // Invocar la Edge Function de envío de correo
  const sendExpedienteEmail = async (alumnoId: string, solicitudId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-enrollment-email', {
        body: { alumnoId, solicitudId }
      });

      if (error) {
        let exactError = error.message;
        try {
          // Attempt to extract the real JSON error from the Edge Function context
          const contextObj = (error as any).context;
          if (contextObj) {
            const bodyStr = await contextObj.text();
            const bodyJson = JSON.parse(bodyStr);
            if (bodyJson.error) exactError = bodyJson.error;
          }
        } catch (e) {
          console.error("No se pudo extraer el error detallado", e);
        }
        throw new Error(`Edge Function: ${exactError}`);
      }

      // Actualizar estado de solicitud
      await supabase
        .from('solicitudes')
        .update({ estado: 'Enviado a academia' })
        .eq('id', solicitudId);

      return data;
    } catch (err: any) {
      console.error('Error enviando expediente a academia:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar Solicitud y todos sus datos/archivos
  const deleteSolicitud = async (solicitudId: string) => {
    setLoading(true);
    try {
      // 1. Obtener el alumno para saber qué archivos borrar
      const { data: alumno } = await supabase
        .from('alumnos')
        .select('id')
        .eq('solicitud_id', solicitudId)
        .maybeSingle();

      if (alumno) {
        // 2. Obtener los documentos
        const { data: documentos } = await supabase
          .from('documentos')
          .select('storage_path')
          .eq('alumno_id', alumno.id);

        // 3. Borrar archivos del storage si existen
        if (documentos && documentos.length > 0) {
          const paths = documentos.map(d => d.storage_path);
          await supabase.storage.from('expedientes').remove(paths);
        }

        // 4. Borrar acudiente, documentos y alumno de la BD (si no hay CASCADE)
        await supabase.from('documentos').delete().eq('alumno_id', alumno.id);
        await supabase.from('acudientes').delete().eq('alumno_id', alumno.id);
        await supabase.from('alumnos').delete().eq('id', alumno.id);
      }

      // 5. Finalmente borrar la solicitud
      const { error } = await supabase.from('solicitudes').delete().eq('id', solicitudId);
      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error al eliminar solicitud:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getSolicitudes,
    createSolicitud,
    getAlumnoDetails,
    uploadInstructorPayments,
    getSolicitudByToken,
    updateSolicitudEstado,
    submitAlumnoEnrollment,
    sendExpedienteEmail,
    deleteSolicitud
  };
};
