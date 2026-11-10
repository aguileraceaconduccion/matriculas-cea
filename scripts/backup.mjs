// Respaldo de SOLO LECTURA de los datos de Supabase.
// Uso:  node scripts/backup.mjs
// No escribe ni modifica nada en Supabase: solo hace SELECT y descargas.
// Para tablas protegidas por RLS (configuracion_correo, historial_envios) puede
// definir BACKUP_EMAIL y BACKUP_PASSWORD (usuario instructor) como variables de entorno.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function loadEnv() {
  const env = {};
  const file = path.resolve('.env');
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve('backups', `datos_${stamp}`);
fs.mkdirSync(path.join(outDir, 'tablas'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'storage'), { recursive: true });

const manifest = { fecha: new Date().toISOString(), url, tablas: {}, storage: { ok: 0, fallidos: [] }, avisos: [] };

if (process.env.BACKUP_EMAIL && process.env.BACKUP_PASSWORD) {
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.BACKUP_EMAIL,
    password: process.env.BACKUP_PASSWORD,
  });
  if (error) manifest.avisos.push(`No se pudo iniciar sesión como instructor: ${error.message}`);
  else manifest.avisos.push('Respaldo hecho con sesión de instructor.');
} else {
  manifest.avisos.push('Respaldo hecho sin sesión: las tablas solo visibles al instructor pueden salir vacías.');
}

const TABLAS = ['usuarios', 'solicitudes', 'alumnos', 'acudientes', 'documentos', 'configuracion_correo', 'historial_envios'];
const PAGE = 1000;
const documentos = [];

for (const tabla of TABLAS) {
  const rows = [];
  let error = null;
  for (let from = 0; ; from += PAGE) {
    const { data, error: err } = await supabase.from(tabla).select('*').range(from, from + PAGE - 1);
    if (err) { error = err.message; break; }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  fs.writeFileSync(path.join(outDir, 'tablas', `${tabla}.json`), JSON.stringify(rows, null, 2), 'utf8');
  manifest.tablas[tabla] = { filas: rows.length, error };
  if (tabla === 'documentos') documentos.push(...rows);
  console.log(`${tabla}: ${rows.length} filas${error ? '  (ERROR: ' + error + ')' : ''}`);
}

// Archivos del bucket "expedientes", según las rutas registradas en la tabla documentos
for (const doc of documentos) {
  const dest = path.join(outDir, 'storage', ...doc.storage_path.split('/'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const { data, error } = await supabase.storage.from('expedientes').download(doc.storage_path);
  if (error || !data) {
    manifest.storage.fallidos.push({ path: doc.storage_path, error: error?.message ?? 'sin datos' });
    continue;
  }
  fs.writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
  manifest.storage.ok++;
}
console.log(`storage: ${manifest.storage.ok} archivos descargados, ${manifest.storage.fallidos.length} fallidos`);

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Respaldo en:', outDir);
