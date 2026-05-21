/* ══════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════ */
const DEDUCIBLES = [0, 5, 10];
const PLAZOS     = [12, 24, 36, 48];

let CATALOGO = [];

const API_BASE = window.NUBUX_API || '';

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
let rowCount = 0;
let solicitudId = null;
let tablaEnEdicion = false;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  solicitudId = params.get('id') || null;

  document.getElementById('p-fecha').value = fechaTexto();

  try {
    const r = await fetch('vehiculos.json');
    const data = await r.json();
    CATALOGO = data.vehiculos.map(v => `${v.marca} ${v.modelo}`);
  } catch (e) {
    console.warn('No se pudo cargar vehiculos.json:', e.message);
  }

  // Recalcular todas las filas cuando cambia el valor UF
  document.getElementById('inp-valoruf').addEventListener('input', recalcAll);

  if (solicitudId) {
    setStatus(`Cargando solicitud #${solicitudId}…`, 'warn');
    await cargarSolicitud(solicitudId);
  } else {
    setStatus('Sin solicitud vinculada', '');
    for (let i = 0; i < 4; i++) agregarFila();
    renderVista();
  }
});

window.addEventListener('beforeprint', () => {
  if (tablaEnEdicion) guardarTabla();
});

/* ══════════════════════════════════════════
   INTEGRACIÓN NUBUX
══════════════════════════════════════════ */
async function cargarSolicitud(id) {
  try {
    const r = await fetch(`${API_BASE}/solicitudes/${id}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    aplicarDatos(data);
    renderVista();
    setStatus(`Solicitud #${id} cargada`, 'ok');
  } catch (e) {
    console.warn('API no disponible:', e.message);
    setStatus('API no disponible', 'warn');
    for (let i = 0; i < 4; i++) agregarFila();
    renderVista();
  }
}

function aplicarDatos(data) {
  document.getElementById('p-dest').value =
    data.empresa ?? data.cliente ?? data.razon_social ?? '';

  const items = data.vehiculos ?? data.items ?? [];
  if (items.length === 0) { agregarFila(); return; }

  items.forEach(v => agregarFila({
    cantidad : v.cantidad        ?? 1,
    modelo   : v.modelo ?? v.nombre ?? '',
    deducible: v.deducible       ?? 5,
    kms      : v.kms_promedio ?? v.kms ?? 3000,
    plazo    : v.plazo           ?? 36,
    tarifa   : v.tarifa          ?? '',
  }));
}

/* ══════════════════════════════════════════
   TOGGLE TABLA
══════════════════════════════════════════ */
function toggleTabla() {
  if (tablaEnEdicion) guardarTabla();
  else abrirEditor();
}

function abrirEditor() {
  tablaEnEdicion = true;
  document.getElementById('tabla-vista').style.display  = 'none';
  document.getElementById('tabla-editor').style.display = 'block';
  document.getElementById('tabla-sec').classList.add('editando');
  const btn = document.getElementById('btn-toggle');
  btn.textContent = '← Cerrar editor';
  btn.classList.remove('save');
}

function guardarTabla() {
  const filas = leerFilas();

  if (filas.length > 0) {
    const kmsEl   = document.getElementById('p-kms');
    const plazoEl = document.getElementById('p-plazo');
    if (kmsEl)   kmsEl.textContent   = Number(filas[0].kms).toLocaleString('es-CL');
    if (plazoEl) plazoEl.textContent = filas[0].plazo;
  }

  renderVista();
  tablaEnEdicion = false;
  document.getElementById('tabla-vista').style.display  = 'block';
  document.getElementById('tabla-editor').style.display = 'none';
  document.getElementById('tabla-sec').classList.remove('editando');
  const btn = document.getElementById('btn-toggle');
  btn.textContent = '✎ Editar tabla';
  btn.classList.remove('save');
}

/* ══════════════════════════════════════════
   CÁLCULO DINÁMICO DE PRECIOS
══════════════════════════════════════════ */
function getValorUF() {
  return parseFloat(document.getElementById('inp-valoruf')?.value) || 0;
}

function calcRow(tr) {
  const g = c => tr.querySelector(`[data-c="${c}"]`)?.value ?? '';
  const tarifaUF  = parseFloat(g('tarifa').replace(',', '.')) || 0;
  const kms       = parseInt(g('kms'))   || 0;
  const plazo     = parseInt(g('plazo')) || 0;
  const vUF       = getValorUF();

  const clpEl = tr.querySelector('.tc-clp');
  const kmEl  = tr.querySelector('.tc-km');
  const totEl = tr.querySelector('.tc-tot');
  if (!clpEl) return;

  if (tarifaUF > 0 && vUF > 0) {
    const tarifaCLP  = tarifaUF * vUF;
    const kmsTotales = kms * plazo;
    const precioPorKm = kms > 0 ? tarifaCLP / kms : 0;

    clpEl.textContent = '$' + Math.round(tarifaCLP).toLocaleString('es-CL');
    kmEl.textContent  = kms > 0
      ? '$' + Math.round(precioPorKm).toLocaleString('es-CL') + '/km'
      : '';
    if (totEl) totEl.textContent = kmsTotales > 0
      ? kmsTotales.toLocaleString('es-CL') + ' km tot.'
      : '';
  } else {
    clpEl.textContent = '—';
    if (kmEl)  kmEl.textContent  = '';
    if (totEl) totEl.textContent = '';
  }
}

function recalcAll() {
  document.querySelectorAll('#tbody-edit tr').forEach(calcRow);
}

/* ══════════════════════════════════════════
   RENDER TABLA VISTA
══════════════════════════════════════════ */
function renderVista() {
  const filas = leerFilas();
  const vUF   = getValorUF();
  const tbody = document.getElementById('tbody-vista');
  tbody.innerHTML = '';

  if (filas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.cssText = 'text-align:center; color:#aaa; padding:18px; font-style:italic; font-size:12px;';
    td.textContent = 'Sin vehículos. Clic en "Editar tabla" para agregar.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const grupos = [];
  filas.forEach(f => {
    const last = grupos[grupos.length - 1];
    if (last && last.cant === f.cantidad) last.items.push(f);
    else grupos.push({ cant: f.cantidad, items: [f] });
  });

  grupos.forEach(g => {
    g.items.forEach((item, i) => {
      const tr = document.createElement('tr');

      if (i === 0) {
        const tdC = document.createElement('td');
        tdC.className = 'td-cant';
        tdC.textContent = g.cant;
        tdC.rowSpan = g.items.length;
        if (g.items.length > 1) tdC.style.verticalAlign = 'middle';
        tr.appendChild(tdC);
      }

      const tdM = document.createElement('td'); tdM.className = 'td-mod'; tdM.textContent = item.modelo;
      const tdD = document.createElement('td'); tdD.textContent = item.deducible;
      const tdK = document.createElement('td'); tdK.textContent = Number(item.kms).toLocaleString('es-CL');
      const tdP = document.createElement('td'); tdP.textContent = item.plazo;

      // Tarifa UF
      const tdUF = document.createElement('td'); tdUF.style.fontWeight = '700';
      // Tarifa $ (precio final calculado)
      const tdCLP = document.createElement('td'); tdCLP.style.fontWeight = '700';

      if (item.tarifa !== '') {
        const n = parseFloat(item.tarifa.replace(',', '.'));
        if (!isNaN(n)) {
          tdUF.textContent = n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
          if (vUF > 0) {
            tdCLP.textContent = '$' + Math.round(n * vUF).toLocaleString('es-CL');
            tdCLP.style.color = '#1e2d47';
          } else {
            tdCLP.textContent = '—';
            tdCLP.style.color = '#aaa';
          }
        } else {
          tdUF.textContent  = item.tarifa;
          tdCLP.textContent = '—';
          tdCLP.style.color = '#aaa';
        }
      } else {
        tdUF.textContent  = '—';
        tdUF.style.color  = '#aaa';
        tdCLP.textContent = '—';
        tdCLP.style.color = '#aaa';
      }

      tr.append(tdM, tdD, tdK, tdP, tdUF, tdCLP);
      tbody.appendChild(tr);
    });
  });
}

/* ══════════════════════════════════════════
   AUTOCOMPLETE VEHÍCULOS
══════════════════════════════════════════ */
function mkModeloAutocomplete(defaultVal = '') {
  const wrap = document.createElement('div');
  wrap.className = 'ac-wrap';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Buscar vehículo…';
  input.value = defaultVal;
  input.dataset.c = 'modelo';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const list = document.createElement('div');
  list.className = 'ac-list';

  wrap.appendChild(input);
  wrap.appendChild(list);

  let activeIdx = -1;
  let items = [];

  function renderList(q) {
    const query = q.toLowerCase().trim();
    items = query === ''
      ? CATALOGO.slice(0, 40)
      : CATALOGO.filter(v => v.toLowerCase().includes(query)).slice(0, 60);

    list.innerHTML = '';
    activeIdx = -1;

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ac-empty';
      empty.textContent = 'Sin resultados';
      list.appendChild(empty);
    } else {
      items.forEach((nombre, idx) => {
        const item = document.createElement('div');
        item.className = 'ac-item';
        if (query) {
          const lo = nombre.toLowerCase();
          const start = lo.indexOf(query);
          if (start >= 0) {
            item.innerHTML =
              escHtml(nombre.slice(0, start)) +
              '<mark>' + escHtml(nombre.slice(start, start + query.length)) + '</mark>' +
              escHtml(nombre.slice(start + query.length));
          } else {
            item.textContent = nombre;
          }
        } else {
          item.textContent = nombre;
        }
        item.addEventListener('mousedown', e => { e.preventDefault(); selectItem(idx); });
        list.appendChild(item);
      });
    }
    list.classList.add('visible');
  }

  function selectItem(idx) {
    if (idx >= 0 && idx < items.length) input.value = items[idx];
    closeList();
  }

  function closeList() {
    list.classList.remove('visible');
    list.innerHTML = '';
    activeIdx = -1;
    items = [];
  }

  function setActive(idx) {
    const els = list.querySelectorAll('.ac-item');
    els.forEach(el => el.classList.remove('active'));
    if (idx >= 0 && idx < els.length) {
      els[idx].classList.add('active');
      els[idx].scrollIntoView({ block: 'nearest' });
    }
    activeIdx = idx;
  }

  input.addEventListener('focus', () => renderList(input.value));
  input.addEventListener('input', () => renderList(input.value));
  input.addEventListener('blur', () => setTimeout(closeList, 150));
  input.addEventListener('keydown', e => {
    if (!list.classList.contains('visible')) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') renderList(input.value);
      return;
    }
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(activeIdx - 1, -1)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (activeIdx >= 0) selectItem(activeIdx); else closeList(); }
    else if (e.key === 'Escape')    { closeList(); }
  });

  return wrap;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ══════════════════════════════════════════
   AGREGAR FILA (tabla editor)
══════════════════════════════════════════ */
function agregarFila(d = {}) {
  const id    = ++rowCount;
  const tbody = document.getElementById('tbody-edit');
  const tr    = document.createElement('tr');
  tr.dataset.id = id;

  const inCant = mk('input', { type: 'number', min: 1, value: d.cantidad ?? 1 });
  inCant.dataset.c = 'cant';

  const acMod = mkModeloAutocomplete(d.modelo ?? '');

  const selDed = mkSelect(DEDUCIBLES.map(v => ({ v, t: `${v} UF` })), d.deducible ?? 5);
  selDed.dataset.c = 'ded';

  const inKms = mk('input', { type: 'number', min: 100, step: 100, value: d.kms ?? 3000 });
  inKms.dataset.c = 'kms';

  const selPlazo = mkSelect(PLAZOS.map(v => ({ v, t: `${v} m.` })), d.plazo ?? 36);
  selPlazo.dataset.c = 'plazo';

  // Tarifa en UF (editable)
  const inTarifa = mk('input', { type: 'text', inputMode: 'decimal', placeholder: '0,0', value: d.tarifa ?? '' });
  inTarifa.dataset.c = 'tarifa';
  inTarifa.className = 'f-tarifa';

  // Bloque de cálculo (read-only, auto-actualizado)
  const divCalc = document.createElement('div');
  divCalc.className = 'tarifa-calc';
  divCalc.innerHTML = '<span class="tc-clp">—</span><span class="tc-km"></span><span class="tc-tot"></span>';

  const tdTarifa = wrapTd('c-tarifa', inTarifa);
  const tdCalc   = wrapTd('c-tarifa-clp', divCalc);

  const btnRm = document.createElement('button');
  btnRm.className = 'btn-rm';
  btnRm.title = 'Eliminar fila';
  btnRm.innerHTML = '&#x2715;';
  btnRm.onclick = () => tr.remove();

  tr.append(
    wrapTd('c-cant',   inCant),
    wrapTd('c-modelo', acMod),
    wrapTd('c-ded',    selDed),
    wrapTd('c-kms',    inKms),
    wrapTd('c-plazo',  selPlazo),
    tdTarifa,
    tdCalc,
    wrapTd('c-act',    btnRm)
  );

  tbody.appendChild(tr);

  // Listeners para recalcular en tiempo real
  const recalc = () => calcRow(tr);
  inTarifa.addEventListener('input', recalc);
  inKms.addEventListener('input', recalc);
  selPlazo.addEventListener('change', recalc);

  // Calcular si ya viene con datos
  if (d.tarifa) setTimeout(() => calcRow(tr), 0);
}

/* ══════════════════════════════════════════
   LEER FILAS
══════════════════════════════════════════ */
function leerFilas() {
  return Array.from(document.querySelectorAll('#tbody-edit tr')).map(tr => {
    const g = c => tr.querySelector(`[data-c="${c}"]`)?.value ?? '';
    return {
      cantidad : parseInt(g('cant'))  || 1,
      modelo   : g('modelo').trim(),
      deducible: parseFloat(g('ded')),
      kms      : parseInt(g('kms'))   || 3000,
      plazo    : parseInt(g('plazo')),
      tarifa   : g('tarifa').trim(),
    };
  });
}

/* ══════════════════════════════════════════
   EXPORTAR PDF
══════════════════════════════════════════ */
function exportarPDF() {
  window.print();
}

/* ══════════════════════════════════════════
   ENVIAR COTIZACIÓN
══════════════════════════════════════════ */
const ENDPOINT_ENVIO = '';

async function enviarCotizacion() {
  if (!ENDPOINT_ENVIO) {
    alert('Endpoint de envío no configurado aún.');
    return;
  }

  if (tablaEnEdicion) guardarTabla();

  const filas = leerFilas();
  if (filas.length === 0) {
    alert('No hay vehículos en la cotización. Agregue al menos uno antes de enviar.');
    return;
  }

  const btn = document.getElementById('btn-enviar');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  setStatus('Enviando cotización…', 'warn');

  const vUF = getValorUF();
  const payload = {
    solicitudId  : solicitudId,
    fecha        : document.getElementById('p-fecha').value,
    destinatario : document.getElementById('p-dest').value,
    analista     : document.getElementById('p-analista').value,
    valorUF      : vUF,
    contacto: {
      web     : document.getElementById('hdr-web').textContent.trim(),
      telefono: document.getElementById('hdr-tel').textContent.trim(),
      social  : document.getElementById('hdr-social').textContent.trim(),
    },
    items     : filas.map(f => ({
      ...f,
      tarifa_clp: vUF > 0 ? Math.round(parseFloat(f.tarifa.replace(',','.')) * vUF) : null,
    })),
    timestamp : new Date().toISOString(),
  };

  try {
    const r = await fetch(ENDPOINT_ENVIO, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    setStatus('Cotización enviada ✓', 'ok');
    btn.textContent = '✉ Enviar';
    btn.disabled = false;
  } catch (e) {
    console.error('Error al enviar:', e.message);
    setStatus('Error al enviar — ver consola', 'warn');
    btn.textContent = '✉ Enviar';
    btn.disabled = false;
    alert(`No se pudo enviar la cotización.\n${e.message}`);
  }
}

/* ══════════════════════════════════════════
   RESET DOCUMENTO
══════════════════════════════════════════ */
function resetDoc() {
  if (!confirm('¿Restablecer el documento a los valores por defecto?')) return;

  document.getElementById('p-fecha').value    = fechaTexto();
  document.getElementById('p-dest').value     = '';
  document.getElementById('p-analista').value = 'Michelle Aguero';
  document.getElementById('p-cargo').textContent      = 'Analista RAC';
  document.getElementById('p-empresa').textContent    = 'S-Sur Ltda.';
  document.getElementById('p-sres').textContent       = 'Sres.';
  document.getElementById('p-presente').textContent   = 'Presente:';
  document.getElementById('p-consideracion').textContent = 'De nuestra consideración:';
  document.getElementById('p-despedida').textContent  = 'Atenta a cualquier consulta, le saluda atentamente,';
  document.getElementById('p-intro').innerHTML =
    'En respuesta a lo solicitado, tenemos el agrado de informar nuestras tarifas <u><strong>referenciales</strong></u> de leasing operativo por los vehículos requeridos';
  document.getElementById('hdr-web').textContent    = 'www.ssurrentacar.cl';
  document.getElementById('hdr-tel').textContent    = '600 600 4004';
  document.getElementById('hdr-social').textContent = 'ssurrentacar';
  document.getElementById('inp-valoruf').value = '';

  document.getElementById('tbody-edit').innerHTML = '';
  rowCount = 0;

  if (tablaEnEdicion) {
    tablaEnEdicion = false;
    document.getElementById('tabla-sec').classList.remove('editando');
    document.getElementById('tabla-editor').style.display = 'none';
    document.getElementById('tabla-vista').style.display  = 'block';
    document.getElementById('btn-toggle').textContent = '✎ Editar tabla';
  }

  for (let i = 0; i < 4; i++) agregarFila();
  renderVista();
  setStatus('Documento restablecido', '');
}

/* ══════════════════════════════════════════
   NOTIFICAR NUBUX (placeholder)
══════════════════════════════════════════ */
async function notificarNubux(id, filas) {
  if (!id || !API_BASE) return;
  try {
    await fetch(`${API_BASE}/solicitudes/${id}/cotizacion`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        solicitudId : id,
        fecha       : document.getElementById('p-fecha').value,
        destinatario: document.getElementById('p-dest').value,
        analista    : document.getElementById('p-analista').value,
        items       : filas,
        timestamp   : new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn('No se pudo notificar a Nubux:', e.message);
  }
}

/* ══════════════════════════════════════════
   HELPERS DOM
══════════════════════════════════════════ */
function mk(tag, attrs = {}) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'inputMode') el.inputMode = v;
    else el[k] = v;
  });
  return el;
}

function mkSelect(opciones, defVal) {
  const sel = document.createElement('select');
  opciones.forEach(({ v, t }) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    if (v == defVal) o.selected = true;
    sel.appendChild(o);
  });
  return sel;
}

function wrapTd(cls, child) {
  const td = document.createElement('td');
  td.className = cls;
  td.appendChild(child);
  return td;
}

function setStatus(msg, tipo) {
  const el = document.getElementById('status-bar');
  el.textContent = msg;
  el.className = tipo || '';
}

function fechaTexto() {
  const d = new Date();
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `Puerto Montt, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}
