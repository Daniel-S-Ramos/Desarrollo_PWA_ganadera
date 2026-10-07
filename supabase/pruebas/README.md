# supabase/pruebas

Pruebas de integración que se ejecutan contra la base de datos real del servicio. No dejan
datos: todo lo que insertan se revierte al terminar.

| Archivo | Prueba | Uso |
|---|---|---|
| `pi-01-esquema.sql` | PI-01 · Esquema remoto | `npm run prueba:pi-01` |
| `pi-02-gancho-token.sql` | PI-02 · Gancho de token de acceso | `npm run prueba:pi-02` |
