# Guía de seguridad — qué hacer y en qué orden

Nada de esto borra datos. Los scripts solo agregan funciones y cambian **permisos** (políticas RLS).
El respaldo ya se hizo en `backups/` (tablas en JSON + todos los archivos del bucket + zip del código).

> ⚠️ `backups/` contiene datos personales reales (cédulas, firmas, menores de edad).
> Guárdelo en un lugar seguro y no lo suba a GitHub (ya está en `.gitignore`).

## Orden de ejecución (importante)

### 1. Respaldo propio de Supabase (recomendado además del local)
Dashboard de Supabase → **Database → Backups** (o `supabase db dump` si usa la CLI).
Las tablas `usuarios` no se pudieron respaldar sin sesión (están protegidas); no contienen datos de alumnos.

### 2. Crear la cuenta del instructor
Dashboard → **Authentication → Users → Add user** (correo + contraseña **fuerte**, marcar *Auto Confirm*).
Luego **Authentication → Providers → Email → desactivar "Allow new users to sign up"** para que nadie más pueda registrarse.

### 3. Ejecutar `01_funciones_y_admin.sql` (SQL Editor)
Es aditivo: el sitio actual sigue funcionando exactamente igual después de ejecutarlo.

### 4. Registrar al instructor como administrador (SQL Editor)
```sql
insert into public.administradores (user_id)
select id from auth.users where lower(email) = lower('CORREO_DEL_INSTRUCTOR')
on conflict do nothing;

select * from public.administradores;   -- debe mostrar 1 fila
```

### 5. Desplegar la nueva versión de la aplicación
Publique el código de este proyecto (push a `main` → GitHub Pages).
Entre a `…/#/auth`, inicie sesión con el correo del instructor y compruebe que ve las solicitudes.

### 6. Desplegar la Edge Function actualizada
```bash
supabase functions deploy send-enrollment-email
```
Secretos necesarios: `RESEND_API_KEY` (ya **no** hay valor por defecto) y, opcional, `ALLOWED_ORIGINS`
(p. ej. `https://SU-USUARIO.github.io`).

### 7. Probar antes de cerrar
- Instructor: crear una solicitud, copiar el enlace.
- Alumno (ventana privada): abrir el enlace y completar una matrícula de prueba hasta el final.
- Instructor: ver los archivos (enlaces temporales), subir pagos, "Enviar a academia".

### 8. Ejecutar `02_bloqueo_rls.sql` (cierra el acceso público)
Aborta solo si no hay administradores. Al terminar, la última consulta debe listar únicamente políticas `seg_*`.
Revise también que no queden políticas abiertas en `storage.objects` de otros buckets.

## Cómo revertir el paso 8 (si algo falla)
Los datos no se tocan, así que revertir es solo devolver permisos. En el SQL Editor:
```sql
-- Reabre temporalmente (INSEGURO, solo para emergencias):
create policy emergencia_alumnos on public.alumnos for all using (true);
create policy emergencia_solicitudes on public.solicitudes for all using (true);
create policy emergencia_acudientes on public.acudientes for all using (true);
create policy emergencia_documentos on public.documentos for all using (true);
grant select, insert, update, delete on public.alumnos, public.solicitudes,
      public.acudientes, public.documentos to anon;
update storage.buckets set public = true where id = 'expedientes';
```
Y publique de nuevo la versión anterior desde `backups/codigo_*.zip`.

## Restaurar datos desde el respaldo
Cada tabla está en `backups/datos_*/tablas/<tabla>.json` y los archivos en `backups/datos_*/storage/<alumno_id>/…`.
Se pueden volver a cargar con `insert` / la API o con *Table editor → Import*.

## Qué cambió y por qué
| Antes | Ahora |
|---|---|
| Clave maestra escrita en el JS público | Login real con Supabase Auth + rol verificado en el servidor (`es_admin()`) |
| Cualquiera podía registrarse (`signUp`) y quedaba como instructor | Sin registro público; solo quienes estén en `administradores` |
| Tablas con `USING (true)` (lectura/escritura/borrado públicos) | Solo el instructor accede; el alumno solo usa funciones RPC con su código |
| Código de acceso de 8 caracteres con `Math.random()` | 16 caracteres con `crypto.getRandomValues` (los antiguos siguen funcionando) |
| Bucket con URLs públicas | Bucket privado, enlaces firmados de 1 hora para el instructor |
| Edge Function abierta a cualquiera con dos UUID | Exige sesión de instructor; sin clave de Resend por defecto; HTML escapado |
| Reintentos del alumno creaban alumnos duplicados | `registrar_matricula` reutiliza el registro de la misma solicitud |

## Pendiente / recomendado (no automatizable desde aquí)
- `supabase_schema.sql` y `migrations/20260616…` son el esquema **antiguo** con políticas abiertas: no los vuelva a ejecutar en otra base sin aplicar luego 01 y 02.
- Resend en modo prueba (`onboarding@resend.dev`) solo entrega a la cuenta dueña de la API key: verifique un dominio propio para producción.
- En el respaldo hay 51 alumnos para 43 solicitudes: 4 solicitudes tienen más de un alumno (reintentos antiguos). No se tocaron; conviene depurarlos manualmente.
- Active MFA para la cuenta del instructor y rote contraseñas si alguna vez se compartió la clave maestra.
