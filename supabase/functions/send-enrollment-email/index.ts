import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";

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
        .replace(/{nombres}/g, alumno.nombres || "")
        .replace(/{apellidos}/g, alumno.apellidos || "")
        .replace(/{TipoDocumento}/g, alumno.tipo_documento || "CC")
        .replace(/{tipo_documento}/g, alumno.tipo_documento || "CC")
        .replace(/{NumeroDocumento}/g, alumno.numero_documento || "")
        .replace(/{numero_documento}/g, alumno.numero_documento || "")
        .replace(/{Categoria}/g, alumno.categoria || "")
        .replace(/{categoria}/g, alumno.categoria || "");
    };

    const emailSubject = replaceVars(subjectTemplate);
    const emailTextBody = replaceVars(messageTemplate);

    // Build rich email HTML body
    const emailHtmlBody = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        <p style="white-space: pre-wrap; margin: 0;">${emailTextBody}</p>
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
            content: Buffer.from(arrayBuffer),
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
