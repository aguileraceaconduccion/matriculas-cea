import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AlumnoData, Solicitud } from '@/types/enrollment';
import { generateFichaMatriculaDocx, generateHabeasDataPDF } from '@/lib/documentGenerator';

export const useEnrollment = () => {
  const [loading, setLoading] = useState(false);

  // --- MÉTODOS DEL INSTRUCTOR ---

  // Obtener todas las solicitudes para el Dashboard
  const getSolicitudes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select('*')
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
      // Generar código único aleatorio de 8 caracteres
      const codigo_unico = Math.random().toString(36).substring(2, 10).toUpperCase();
      
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
        .maybeSingle();

      if (alumnoError) throw alumnoError;
      if (!alumno) return null;

      // 2. Obtener acudiente (si aplica)
      const { data: acudiente } = await supabase
        .from('acudientes')
        .select('*')
        .eq('alumno_id', alumno.id)
        .maybeSingle();

      // 3. Obtener documentos
      const { data: documentos } = await supabase
        .from('documentos')
        .select('*')
        .eq('alumno_id', alumno.id);

      return {
        alumno,
        acudiente,
        documentos: documentos || []
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

      // Crear bucket si no existe
      try {
        await supabase.storage.createBucket('expedientes', { public: false });
      } catch (e) {
        // Ignorar error si ya existe
      }

      const uploadedDocs = [];

      // 1. Cargar Pago PIN
      if (pagoPinFile) {
        const pinExt = pagoPinFile.name.split('.').pop() || 'jpg';
        const pinPath = `${alumnoId}/PagoPIN_${cleanName}.${pinExt}`;
        
        const { error: uploadPinErr } = await supabase.storage
          .from('expedientes')
          .upload(pinPath, pagoPinFile, { upsert: true });

        if (uploadPinErr) throw uploadPinErr;

        const { data: pinUrl } = supabase.storage.from('expedientes').getPublicUrl(pinPath);

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

        const { data: teorUrl } = supabase.storage.from('expedientes').getPublicUrl(teorPath);

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
      const { data, error } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('codigo_unico', token)
        .maybeSingle();

      if (error) throw error;
      return data as Solicitud | null;
    } catch (err) {
      console.error('Error al buscar solicitud por token:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estado de solicitud
  const updateSolicitudEstado = async (id: string, estado: Solicitud['estado']) => {
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({ estado })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    }
  };

  // Enviar los datos del Alumno (Guardado y Carga de archivos)
  const submitAlumnoEnrollment = async (
    solicitud: Solicitud,
    alumnoData: AlumnoData,
    fotoFile: File,
    cedulaPdfFile: File,
    studentSignatureUrl: string,
    tutorSignatureUrl?: string
  ) => {
    setLoading(true);
    try {
      const cleanName = `${alumnoData.nombres} ${alumnoData.apellidos}`.trim().replace(/[^a-zA-Z0-9]/g, '_');

      // Crear bucket expedientes si no existe
      try {
        await supabase.storage.createBucket('expedientes', { public: false });
      } catch (e) {
        // Ignorar
      }

      // 1. Insertar registro en alumnos
      const { data: newAlumno, error: insertAlumnoErr } = await supabase
        .from('alumnos')
        .insert({
          solicitud_id: solicitud.id,
          categoria: alumnoData.categoria,
          fecha_ingreso: alumnoData.fecha_ingreso,
          tipo_documento: alumnoData.tipo_documento,
          numero_documento: alumnoData.numero_documento,
          nombres: alumnoData.nombres,
          apellidos: alumnoData.apellidos,
          genero: alumnoData.genero,
          estado_civil: alumnoData.estado_civil,
          fecha_nacimiento: alumnoData.fecha_nacimiento,
          lugar_origen: alumnoData.lugar_origen,
          estrato: alumnoData.estrato,
          eps: alumnoData.eps,
          nivel_formacion: alumnoData.nivel_formacion,
          ocupacion: alumnoData.ocupacion,
          email_1: alumnoData.email_1,
          email_2: alumnoData.email_2 || null,
          celular: alumnoData.celular,
          telefono_fijo: alumnoData.telefono_fijo || null,
          direccion: alumnoData.direccion,
          contacto_emergencia: alumnoData.contacto_emergencia,
          celular_emergencia: alumnoData.celular_emergencia,
          asesor: alumnoData.asesor,
          es_menor_edad: alumnoData.es_menor_edad
        })
        .select()
        .single();

      if (insertAlumnoErr) throw insertAlumnoErr;
      const alumnoId = newAlumno.id;

      // 2. Si es menor de edad, cargar firma y datos de acudiente
      if (alumnoData.es_menor_edad && tutorSignatureUrl && alumnoData.acudiente_nombre) {
        // Convertir firma a Blob y subirla
        const parts = tutorSignatureUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const tutorSigBlob = new Blob([uInt8Array], { type: contentType });
        const tutorSigPath = `${alumnoId}/FirmaAcudiente_${cleanName}.png`;

        const { error: upTutorSigErr } = await supabase.storage
          .from('expedientes')
          .upload(tutorSigPath, tutorSigBlob, { contentType: 'image/png', upsert: true });

        if (upTutorSigErr) throw upTutorSigErr;

        const { data: publicTutorSig } = supabase.storage.from('expedientes').getPublicUrl(tutorSigPath);

        const { error: insertAcudienteErr } = await supabase
          .from('acudientes')
          .insert({
            alumno_id: alumnoId,
            nombre: alumnoData.acudiente_nombre,
            documento: alumnoData.acudiente_documento || '',
            celular: alumnoData.acudiente_celular || '',
            firma_url: publicTutorSig.publicUrl
          });

        if (insertAcudienteErr) throw insertAcudienteErr;
      }

      // 3. Subir Fotografía del estudiante
      const fotoExt = fotoFile.name.split('.').pop() || 'jpg';
      const fotoPath = `${alumnoId}/Foto_${cleanName}.${fotoExt}`;
      const { error: upFotoErr } = await supabase.storage
        .from('expedientes')
        .upload(fotoPath, fotoFile, { upsert: true });

      if (upFotoErr) throw upFotoErr;

      const { error: dbFotoErr } = await supabase.from('documentos').insert({
        alumno_id: alumnoId,
        tipo: 'foto',
        nombre_archivo: `Foto_${cleanName}.${fotoExt}`,
        storage_path: fotoPath
      });
      if (dbFotoErr) throw dbFotoErr;

      // 4. Subir Cédula en PDF
      const cedulaPath = `${alumnoId}/Cedula_${cleanName}.pdf`;
      const { error: upCedErr } = await supabase.storage
        .from('expedientes')
        .upload(cedulaPath, cedulaPdfFile, { contentType: 'application/pdf', upsert: true });

      if (upCedErr) throw upCedErr;

      const { error: dbCedErr } = await supabase.from('documentos').insert({
        alumno_id: alumnoId,
        tipo: 'cedula_pdf',
        nombre_archivo: `Cedula_${cleanName}.pdf`,
        storage_path: cedulaPath
      });
      if (dbCedErr) throw dbCedErr;

      // 5. Generar y Subir Habeas Data PDF
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

      const habeasPath = `${alumnoId}/HabeasData_${cleanName}.pdf`;
      const { error: upHabErr } = await supabase.storage
        .from('expedientes')
        .upload(habeasPath, habeasPdfFile, { contentType: 'application/pdf', upsert: true });

      if (upHabErr) throw upHabErr;

      const { error: dbHabErr } = await supabase.from('documentos').insert({
        alumno_id: alumnoId,
        tipo: 'habeas_data',
        nombre_archivo: `HabeasData_${cleanName}.pdf`,
        storage_path: habeasPath
      });
      if (dbHabErr) throw dbHabErr;

      // 6. Generar y Subir Ficha de Matrícula DOCX
      const fichaDocxFile = await generateFichaMatriculaDocx({
        ...alumnoData,
        // Incluimos campos de acudiente para docxtemplater
        acudiente_nombre: alumnoData.acudiente_nombre,
        acudiente_documento: alumnoData.acudiente_documento,
        acudiente_celular: alumnoData.acudiente_celular,
      });

      const fichaPath = `${alumnoId}/FichaMatricula_${cleanName}.docx`;
      const { error: upFicErr } = await supabase.storage
        .from('expedientes')
        .upload(fichaPath, fichaDocxFile, { 
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true 
        });

      if (upFicErr) throw upFicErr;

      const { error: dbFicErr } = await supabase.from('documentos').insert({
        alumno_id: alumnoId,
        tipo: 'ficha_matricula',
        nombre_archivo: `FichaMatricula_${cleanName}.docx`,
        storage_path: fichaPath
      });
      if (dbFicErr) throw dbFicErr;

      // 7. Actualizar el estado de la solicitud
      const { error: updateSolErr } = await supabase
        .from('solicitudes')
        .update({ estado: 'Pendiente pagos instructor' })
        .eq('id', solicitud.id);

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

      if (error) throw error;

      // Actualizar estado de solicitud
      await supabase
        .from('solicitudes')
        .update({ estado: 'Enviado a academia' })
        .eq('id', solicitudId);

      return data;
    } catch (err) {
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
