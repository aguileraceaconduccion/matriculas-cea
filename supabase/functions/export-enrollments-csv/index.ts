import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://mvxhqoftjkccqgfcyecc.supabase.co";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obtener todas las solicitudes con alumnos, acudientes y documentos
    const { data: solicitudes, error } = await supabase
      .from("solicitudes")
      .select(`
        *,
        alumnos (
          *,
          acudientes (*),
          documentos (*)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const headers = [
      "No",
      "Codigo Unico",
      "Estado",
      "Fecha Creacion",
      "Categoria",
      "Tipo Documento",
      "Numero Documento",
      "Nombres",
      "Apellidos",
      "Genero",
      "Estado Civil",
      "Fecha Nacimiento",
      "Lugar de Origen",
      "Estrato",
      "EPS",
      "Nivel Formacion",
      "Ocupacion",
      "Celular",
      "Telefono Fijo",
      "Correo Principal",
      "Correo Secundario",
      "Direccion",
      "Contacto Emergencia",
      "Celular Emergencia",
      "Asesor",
      "Es Menor de Edad",
      "Nombre Acudiente",
      "Documento Acudiente",
      "Celular Acudiente",
      "Link Firma Acudiente",
      "Link Enlace Alumno Web",
      "Link Foto",
      "Link Cedula PDF",
      "Link Licencia PDF",
      "Link Ficha Matricula DOCX",
      "Link Habeas Data PDF",
      "Link Pago PIN",
      "Link Pago Teoria"
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const rows: string[] = [];
    rows.push(headers.map(escapeCsv).join(","));

    (solicitudes || []).forEach((sol: any, index: number) => {
      const alumno = sol.alumnos && sol.alumnos.length > 0 ? sol.alumnos[0] : null;
      const acudiente = alumno?.acudientes && alumno.acudientes.length > 0 ? alumno.acudientes[0] : null;
      const docs = alumno?.documentos || [];

      const getDocUrl = (tipo: string) => {
        const doc = docs.find((d: any) => d.tipo === tipo);
        if (!doc || !doc.storage_path) return "";
        const { data } = supabase.storage.from("expedientes").getPublicUrl(doc.storage_path);
        return data?.publicUrl || "";
      };

      let nombres = alumno?.nombres || "";
      let apellidos = alumno?.apellidos || "";
      if (!nombres && sol.nombre_alumno) {
        if (sol.nombre_alumno.includes("  ")) {
          const parts = sol.nombre_alumno.split("  ");
          nombres = parts[0] || "";
          apellidos = parts[1] || "";
        } else {
          nombres = sol.nombre_alumno.split(" ")[0] || "";
          apellidos = sol.nombre_alumno.split(" ").slice(1).join(" ") || "";
        }
      }

      const estadoTexto = sol.estado === "Solicitud enviada" ? "Recibida" : (sol.estado || "");
      const fechaCreacion = sol.created_at ? new Date(sol.created_at).toLocaleDateString("es-CO") : "";

      const rowValues = [
        index + 1,
        sol.codigo_unico || "",
        estadoTexto,
        fechaCreacion,
        sol.categoria || alumno?.categoria || "",
        alumno?.tipo_documento || "CC",
        alumno?.numero_documento || "",
        nombres,
        apellidos,
        alumno?.genero || "",
        alumno?.estado_civil || "",
        alumno?.fecha_nacimiento || "",
        alumno?.lugar_origen || "",
        alumno?.estrato || "",
        alumno?.eps || "",
        alumno?.nivel_formacion || "",
        alumno?.ocupacion || "",
        sol.celular || alumno?.celular || "",
        alumno?.telefono_fijo || "",
        alumno?.email_1 || sol.email || "",
        alumno?.email_2 || "",
        alumno?.direccion || "",
        alumno?.contacto_emergencia || "",
        alumno?.celular_emergencia || "",
        alumno?.asesor || "Cesar Aguilera",
        alumno?.es_menor_edad ? "SI" : "NO",
        acudiente?.nombre || "",
        acudiente?.documento || "",
        acudiente?.celular || "",
        acudiente?.firma_url || "",
        `https://augustoaguilera80-source.github.io/matriculas-cea/#/matricula/${sol.codigo_unico}`,
        getDocUrl("foto"),
        getDocUrl("cedula_pdf"),
        getDocUrl("licencia_pdf"),
        getDocUrl("ficha_matricula"),
        getDocUrl("habeas_data"),
        getDocUrl("pago_pin"),
        getDocUrl("pago_teoria")
      ];

      rows.push(rowValues.map(escapeCsv).join(","));
    });

    const csvContent = "\uFEFF" + rows.join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "inline; filename=matriculas.csv",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
