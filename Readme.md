# App de Cotización — S-Sur Rent a Car

Herramienta interna para generar cotizaciones de leasing operativo. Se integra con Nubux: el operador recibe un link con `?id=XXX`, completa los datos, y exporta el documento como PDF.

## Flujo

1. Nubux redirige al operador a `/?id=XXX`
2. La app carga los datos de la solicitud desde la API de Nubux
3. **Vista Editar** — el operador revisa y ajusta vehículos, tarifas, plazos y deducibles
4. **Vista Preview** — documento A4 listo para imprimir, fiel al formato oficial
5. "Exportar PDF" → imprime / guarda como PDF

Si la API no responde, carga datos mock para desarrollo.

## Estructura

```
├── public/
│   └── index.html       # App completa (single-file, sin build step)
├── docs/                # Referencias: PDF modelo, xlsx de unidades, reglas
├── vercel.json          # Deploy: sirve public/ en la raíz
├── AVANCE.md            # Estado del proyecto y próximos pasos
└── reglas.md            # Flujo general
```

## Deploy

El proyecto está configurado para Vercel. Conectar el repositorio desde vercel.com y hacer deploy sin configuración adicional.

## Pendiente

- Conectar API de Nubux (`API_BASE` en `index.html`)
- Adaptar `aplicarDatos()` al shape real del JSON de Nubux
- Reemplazar catálogo de vehículos hardcodeado con datos reales (`docs/LISTADO UNIDADES RAC.xlsx`)
- Envío de cotización de vuelta a Nubux (función `notificarNubux()` ya escrita, solo descomentar)
