# Proyecto: App de Cotización S-Sur Rent a Car

## Estado actual: v1 funcional — listo para prueba local

---

## Qué se construyó

### Archivo principal: `cotizacion.html`
Single-file app (sin framework, sin build step). Se abre directo en el browser.

**Flujo completo implementado:**
1. Nubux presiona botón → redirige a `cotizacion.html?id=XXX`
2. App hace `GET {API_BASE}/solicitudes/XXX` para precargar datos
3. Si la API no responde → carga datos mock del PDF modelo (para desarrollo)
4. **Vista 1 (Editar):** tabla editable con todos los campos de la cotización
5. Botón "Confirmar cotización →"
6. **Vista 2 (Preview):** documento A4 listo para imprimir, fiel al PDF modelo
7. Botón "Exportar PDF" → `window.print()` con CSS que oculta controles

### Reglas de negocio aplicadas (según `docs/reglas_cotizacion.md`)
| Campo         | Tipo              | Opciones                    |
|---------------|-------------------|-----------------------------|
| Deducible     | Select — FIJO     | 0 UF / 5 UF / 10 UF        |
| Plazo         | Select — FIJO     | 12 / 24 / 36 / 48 meses     |
| Kms promedio  | Input libre       | Variable por cliente        |
| Tarifa Neta   | Input libre (UF)  | Variable, se ingresa manual |

---

## Cómo probar ahora mismo
1. Abrir `cotizacion.html` en el browser (doble clic o drag al browser)
2. Aparece la Vista 1 con datos mock del PDF modelo
3. Editar filas, cambiar valores, agregar/eliminar filas
4. Clic en "Confirmar cotización →" → aparece Vista 2 (preview A4)
5. Los campos con línea punteada (fecha, destinatario, analista) son editables en preview
6. Clic en "Exportar PDF" → diálogo de impresión del browser → Guardar como PDF

---

## Lo que FALTA hacer (por orden de prioridad)

### 1. Conectar con Nubux (BLOQUEANTE para producción)
**Qué hay que hacer:**
- Confirmar con el equipo de Nubux cuál es la URL del endpoint
- Confirmar el shape JSON que devuelven al hacer `GET /solicitudes/{id}`
- Adaptar la función `aplicarDatos()` en `cotizacion.html` (línea ~105) al shape real
- Definir si el endpoint necesita autenticación (Bearer token, API key, etc.)
- Agregar el token/header en `cargarSolicitud()` cuando se sepa

**Qué preguntar a Nubux:**
- ¿Cuál es la URL base de su API?
- ¿Qué datos vienen en la solicitud? (cliente, empresa, vehículos, cantidades)
- ¿Necesita auth? ¿Cómo?
- ¿Quieren recibir la cotización de vuelta? Si sí: ¿qué formato esperan en el POST?
- ¿El redirect incluye algo más además del `?id=`? (token, firma, etc.)

**En el código**, buscar `TODO` y `API_BASE`:
```js
// cotizacion.html, cerca del inicio del script:
const API_BASE = window.NUBUX_API || ''; // Poner la URL real acá
```

### 2. Enviar cotización de vuelta a Nubux
Función `notificarNubux()` ya está escrita pero comentada.
- Descomentar en `exportarPDF()` cuando se confirme el endpoint de destino
- Actualmente hace un POST con: solicitudId, fecha, destinatario, analista, items[], timestamp

### 3. Catálogo de vehículos real
- `docs/LISTADO UNIDADES RAC.xlsx` tiene el listado real de unidades RAC
- Hay que convertirlo a JSON o leerlo desde un endpoint y reemplazar el array `CATALOGO` en el script
- Por ahora el datalist (autocompletar del modelo) usa una lista manual hardcodeada

### 4. Imagen del banner (opcional, cosmético)
- El header rojo tiene un placeholder vacío a la izquierda (donde va la foto del auto en el PDF original)
- Si tienen la imagen del banner, se puede agregar como `background-image` en `.hdr-car`

### 5. Deploy / hosting
- Decidir dónde vive la app (servidor propio, Vercel, Netlify, etc.)
- Si es solo HTML estático → cualquier hosting sirve
- Si va a tener backend (para guardar cotizaciones, autenticar, etc.) → ver con el equipo

### 6. Mejoras UX opcionales (para después)
- Validación más estricta antes de confirmar (campos vacíos, tarifa en formato válido)
- Guardar borrador en `localStorage` para no perder datos si se recarga
- Modo de edición de las condiciones del texto (para casos especiales)
- Número de cotización autogenerado en el header del documento

---

## Estructura de archivos
```
prespuesto_tecnom/
├── cotizacion.html          ← APP PRINCIPAL (todo en un archivo)
├── AVANCE.md                ← Este archivo
├── reglas.md                ← Flujo general (referencia)
└── docs/
    ├── 08.10.2025 COTIZACION MODELO.pdf   ← PDF de referencia visual
    ├── FORMATO COTIZACION SSUR (1).docx   ← Formato Word de referencia
    ├── LISTADO UNIDADES RAC.xlsx          ← Catálogo de vehículos (pendiente integrar)
    ├── reglas_cotizacion.md               ← Reglas de negocio de tarifas
    └── Solicitud Crm TECNOM (1) (1).pdf   ← Ejemplo de solicitud de CRM
```

---

## Para retomar el proyecto
1. Leer este archivo
2. Revisar `docs/reglas_cotizacion.md` para refrescar las reglas de negocio
3. La siguiente acción concreta es el punto **1. Conectar con Nubux** de arriba
4. Con Claude Code: abrir este directorio y decir algo como _"seguimos con el proyecto de cotización, conectemos la API de Nubux"_
