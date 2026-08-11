import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EnrollmentEmailRequest {
  alumnoId: string;
  solicitudId: string;
}

serve(async (req: Request) => {
  // Preflight check
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "re_123456789"; // Fallback to avoid crash if not set during build

    // Declare outside try to use in catch
    let reqBody: EnrollmentEmailRequest | null = null;
    
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Supabase environment variables are not configured");
      }

      const resend = new Resend(RESEND_API_KEY);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Parse request body
      reqBody = await req.json();
      if (!reqBody || !reqBody.alumnoId || !reqBody.solicitudId) {
        throw new Error("alumnoId and solicitudId are required");
      }
      
      const { alumnoId, solicitudId } = reqBody;

    // 1. Fetch Alumno Data
    const { data: alumno, error: alumnoErr } = await supabase
      .from("alumnos")
      .select("*")
      .eq("id", alumnoId)
      .single();

    if (alumnoErr || !alumno) {
      throw new Error(`Could not fetch alumno: ${alumnoErr?.message || "Not found"}`);
    }

    // 2. Fetch Solicitud Data
    const { data: solicitud, error: solErr } = await supabase
      .from("solicitudes")
      .select("*")
      .eq("id", solicitudId)
      .single();

    if (solErr || !solicitud) {
      throw new Error(`Could not fetch solicitud: ${solErr?.message || "Not found"}`);
    }

    // 3. Fetch Acudiente (if minor)
    let acudiente = null;
    if (alumno.es_menor_edad) {
      const { data: acud } = await supabase
        .from("acudientes")
        .select("*")
        .eq("alumno_id", alumnoId)
        .maybeSingle();
      acudiente = acud;
    }

    // 4. Fetch Email Config
    const { data: config } = await supabase
      .from("configuracion_correo")
      .select("*")
      .limit(1)
      .maybeSingle();

    const senderEmail = config?.correo_remitente || "augustoaguilera80@gmail.com";
    const destEmailsRaw = config?.correos_destino || "Drivingmatriculas23@hotmail.com";
    const subjectTemplate = config?.asunto_template || "Matricula de {NombreAlumno} - Categoria {Categoria} - ID: {NumeroDocumento}";
    const messageTemplate = config?.mensaje_template || "Cordial saludo,\n\nAdjunto se envían los documentos de enrolamiento de {NombreAlumno} para la categoría {Categoria}.\n\nAtentamente,\nMatrícula Digital CEA";

    // Split emails by comma and clean spaces
    const recipientEmails = destEmailsRaw
      .split(",")
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipientEmails.length === 0) {
      recipientEmails.push("Drivingmatriculas23@hotmail.com");
    }

    const studentFullName = `${alumno.nombres} ${alumno.apellidos}`.trim();

    // Replace variables in templates
    const replaceVars = (text: string) => {
      return text
        .replace(/{NombreAlumno}/g, studentFullName)
        .replace(/{TipoDocumento}/g, alumno.tipo_documento || "CC")
        .replace(/{NumeroDocumento}/g, alumno.numero_documento || "")
        .replace(/{Categoria}/g, alumno.categoria || "");
    };

    const emailSubject = replaceVars(subjectTemplate);
    const emailTextBody = replaceVars(messageTemplate);

    // Build rich email HTML body
    const emailHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: #1e3a8a; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">🚗 Expediente de Matrícula Digital</h1>
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 25px; border-radius: 0 0 10px 10px; background-color: #fafafa;">
          <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #4b5563;">${emailTextBody}</p>

          <h3 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-top: 25px;">Datos del Estudiante</h3>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 15px;">
            <tr style="background-color: #f3f4f6;"><td style="padding: 8px; font-weight: bold; width: 40%;">Nombre Completo:</td><td style="padding: 8px;">${studentFullName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Documento:</td><td style="padding: 8px;">${alumno.tipo_documento} ${alumno.numero_documento}</td></tr>
            <tr style="background-color: #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Fecha Nacimiento:</td><td style="padding: 8px;">${alumno.fecha_nacimiento || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Celular:</td><td style="padding: 8px;">${alumno.celular}</td></tr>
            <tr style="background-color: #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${alumno.email_1}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Dirección:</td><td style="padding: 8px;">${alumno.direccion || "N/A"}</td></tr>
            <tr style="background-color: #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Categoría Solicitada:</td><td style="padding: 8px;"><span style="background-color: #1e3a8a; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${alumno.categoria}</span></td></tr>
          </table>

          ${
            alumno.es_menor_edad && acudiente
              ? `
            <h3 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-top: 20px;">Datos del Acudiente</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 15px;">
              <tr style="background-color: #fef3c7;"><td style="padding: 8px; font-weight: bold; width: 40%;">Nombre Acudiente:</td><td style="padding: 8px;">${acudiente.nombre}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Cédula Acudiente:</td><td style="padding: 8px;">${acudiente.documento}</td></tr>
              <tr style="background-color: #fef3c7;"><td style="padding: 8px; font-weight: bold;">Celular Acudiente:</td><td style="padding: 8px;">${acudiente.celular}</td></tr>
            </table>
            `
              : ""
          }

          <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; text-align: center; color: #9ca3af;">
            Este es un correo automático generado por el portal de Enrolamiento CEA.
          </div>
        </div>
      </div>
    `;

    // 5. Fetch and download attachments from DB & Storage
    const { data: documentos, error: docsErr } = await supabase
      .from("documentos")
      .select("*")
      .eq("alumno_id", alumnoId);

    const attachments = [];

    if (!docsErr && documentos) {
      for (const doc of documentos) {
        try {
          const { data: fileBlob, error: downloadErr } = await supabase.storage
            .from("expedientes")
            .download(doc.storage_path);

          if (downloadErr) {
            console.error(`Error downloading ${doc.nombre_archivo}:`, downloadErr.message);
            continue;
          }

          const arrayBuffer = await fileBlob.arrayBuffer();
          attachments.push({
            filename: doc.nombre_archivo,
            content: new Uint8Array(arrayBuffer),
          });
        } catch (downloadEx) {
          console.error(`Exception downloading ${doc.nombre_archivo}:`, downloadEx);
        }
      }
    }

    // 6. Send email using Resend
    console.log(`Sending email from: ${senderEmail} to ${recipientEmails.join(", ")}`);
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: `CEA Enrolamiento <onboarding@resend.dev>`, // Resend requires sending from verified domain or onboarding@resend.dev in sandbox
      to: recipientEmails,
      replyTo: senderEmail,
      subject: emailSubject,
      html: emailHtmlBody,
      attachments: attachments,
    });

    if (emailError) {
      console.error("Resend API error:", emailError);
      throw new Error(`Resend Error: ${emailError.message}`);
    }

    console.log("Email sent successfully. Resend ID:", emailResponse?.id);

    // 7. Insert entry to history
    await supabase.from("historial_envios").insert({
      alumno_id: alumnoId,
      destinatarios: recipientEmails.join(", "),
      estado: "Enviado exitosamente"
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in Edge Function:", error.message);
    
    // Log error to history if possible
    if (reqBody && reqBody.alumnoId) {
      try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        await supabase.from("historial_envios").insert({
          alumno_id: reqBody.alumnoId,
          destinatarios: "N/A",
          estado: `Error: ${error.message}`
        });
      } catch (logEx) {
        console.error("Failed to write fail history:", logEx);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
