const elements = {
  refreshButton: document.querySelector('#refreshButton'),
  refreshNote: document.querySelector('#refreshNote'),
  flash: document.querySelector('#flash'),
  overallStatus: document.querySelector('#overallStatus'),
  n8nServiceRow: document.querySelector('#n8nServiceRow'),
  n8nStatus: document.querySelector('#n8nStatus'),
  n8nReplicas: document.querySelector('#n8nReplicas'),
  n8nConcurrency: document.querySelector('#n8nConcurrency'),
  postgresServiceRow: document.querySelector('#postgresServiceRow'),
  postgresStatus: document.querySelector('#postgresStatus'),
  postgresNote: document.querySelector('#postgresNote'),
  queueNew: document.querySelector('#queueNew'),
  queueRunning: document.querySelector('#queueRunning'),
  currentConcurrency: document.querySelector('#currentConcurrency'),
  stopButton: document.querySelector('#stopButton'),
  startButton: document.querySelector('#startButton'),
  cleanButton: document.querySelector('#cleanButton'),
  concurrencyOptions: document.querySelector('#concurrencyOptions'),
  operationPanel: document.querySelector('#operationPanel'),
  operationDescription: document.querySelector('#operationDescription'),
  operationIdLabel: document.querySelector('#operationIdLabel'),
  progressList: document.querySelector('#progressList'),
  historyBody: document.querySelector('#historyBody'),
  dialog: document.querySelector('#confirmDialog'),
  dialogTitle: document.querySelector('#dialogTitle'),
  dialogBody: document.querySelector('#dialogBody'),
  dialogClose: document.querySelector('#dialogClose'),
  dialogCancel: document.querySelector('#dialogCancel'),
  dialogConfirm: document.querySelector('#dialogConfirm'),
};

const state = {
  status: null,
  maintenanceActive: false,
  operationId: null,
  pendingAction: null,
  progressTimer: null,
};

const actionNames = {
  stop: 'Detener n8n',
  start: 'Iniciar n8n',
  clean: 'Limpiar cola',
  concurrency: 'Concurrencia',
};

function formatNumber(value) {
  return new Intl.NumberFormat('es-CL').format(Number(value) || 0);
}

function statusLabel(status) {
  const labels = {
    running: 'ONLINE',
    stopped: 'OFFLINE',
    transitioning: 'EN TRANSICIÓN',
    error: 'ERROR',
    connected: 'CONECTADO',
  };
  return labels[status] || 'VERIFICANDO';
}

function serviceState(status) {
  return ['running', 'stopped', 'transitioning', 'error', 'connected'].includes(status) ? status : 'unknown';
}

function setText(element, value) {
  element.textContent = value;
}

function showFlash(message, type = 'success') {
  setText(elements.flash, message);
  elements.flash.dataset.type = type;
  elements.flash.hidden = false;
  window.clearTimeout(showFlash.timeout);
  showFlash.timeout = window.setTimeout(() => {
    elements.flash.hidden = true;
  }, 8000);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({ success: false, error: 'The server returned an invalid response' }));
  if (!response.ok) {
    const error = new Error(payload.error || 'Request failed');
    error.payload = payload;
    throw error;
  }
  return payload;
}

function renderStatus(status) {
  state.status = status;
  const n8n = status.n8n;
  const postgres = status.postgres;

  elements.n8nServiceRow.dataset.status = serviceState(n8n.status);
  setText(elements.n8nStatus, statusLabel(n8n.status));
  setText(elements.n8nReplicas, `${n8n.runningReplicas}/${n8n.desiredReplicas}`);
  setText(elements.n8nConcurrency, n8n.concurrency ?? 'No definida');
  setText(elements.currentConcurrency, n8n.concurrency ?? 'No definida');

  elements.postgresServiceRow.dataset.status = serviceState(postgres.status);
  setText(elements.postgresStatus, statusLabel(postgres.status));
  setText(elements.postgresNote, postgres.status === 'connected'
    ? 'Conectado a la base de ejecuciones de n8n'
    : 'Conexión a PostgreSQL no disponible');

  setText(elements.queueNew, formatNumber(status.queue.new));
  setText(elements.queueRunning, formatNumber(status.queue.running));

  const overall = n8n.status === 'running' && postgres.status === 'connected'
    ? 'ESTADO NORMAL'
    : (n8n.status === 'transitioning' ? 'MANTENIMIENTO' : 'REQUIERE ATENCIÓN');
  setText(elements.overallStatus, overall);

  renderControls();
}

function renderControls() {
  const isBusy = state.maintenanceActive || state.status?.maintenanceActive;
  const n8nStatus = state.status?.n8n?.status;
  const dockerAvailable = Boolean(state.status) && n8nStatus !== 'error';
  const databaseAvailable = state.status?.postgres?.status === 'connected';

  elements.refreshButton.disabled = state.maintenanceActive;
  elements.stopButton.disabled = isBusy || !dockerAvailable || n8nStatus === 'stopped';
  elements.startButton.disabled = isBusy || !dockerAvailable || n8nStatus === 'running';
  elements.cleanButton.disabled = isBusy || !databaseAvailable;

  for (const button of elements.concurrencyOptions.querySelectorAll('button')) {
    const value = Number(button.dataset.concurrency);
    button.disabled = isBusy || !Number.isInteger(state.status?.n8n?.concurrency);
    button.setAttribute('aria-pressed', String(value === state.status?.n8n?.concurrency));
  }
}

function setRefreshTime() {
  setText(elements.refreshNote, `Estado actualizado ${new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date())}`);
}

async function loadStatus({ silent = false } = {}) {
  try {
    const status = await request('/api/status');
    renderStatus(status);
    setRefreshTime();
    return status;
  } catch (error) {
    if (!silent) showFlash(error.message, 'error');
    throw error;
  }
}

function createCell(value, result) {
  const cell = document.createElement('td');
  cell.textContent = value;
  if (result) cell.dataset.result = result;
  return cell;
}

function formatHistoryTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}

async function loadHistory() {
  try {
    const { operations } = await request('/api/history');
    elements.historyBody.replaceChildren();
    if (!operations.length) {
      const row = document.createElement('tr');
      const cell = createCell('No hay operaciones administrativas en esta sesión.');
      cell.colSpan = 4;
      cell.className = 'empty-row';
      row.append(cell);
      elements.historyBody.append(row);
      return;
    }
    for (const operation of operations) {
      const row = document.createElement('tr');
      row.append(
        createCell(formatHistoryTime(operation.at)),
        createCell(actionNames[operation.action] || operation.action),
        createCell(operation.result, operation.result),
        createCell(operation.detail),
      );
      elements.historyBody.append(row);
    }
  } catch (error) {
    showFlash(error.message, 'error');
  }
}

function addParagraph(text, className = '') {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  if (className) paragraph.className = className;
  elements.dialogBody.append(paragraph);
}

function createCleanOption({ value, label, count }) {
  const option = document.createElement('label');
  option.className = 'clean-option';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'clean-scope';
  input.value = value;

  const copy = document.createElement('span');
  copy.className = 'clean-option-copy';
  const title = document.createElement('strong');
  title.textContent = label;
  const detail = document.createElement('span');
  detail.textContent = count;
  copy.append(title, detail);
  option.append(input, copy);
  return option;
}

function selectedCleanStatuses(value) {
  if (value === 'new') return ['new'];
  if (value === 'running') return ['running'];
  if (value === 'both') return ['new', 'running'];
  return [];
}

function openConfirmation(action, value) {
  if (state.maintenanceActive) return;
  state.pendingAction = { action, value };
  elements.dialogBody.replaceChildren();
  elements.dialogConfirm.disabled = false;

  if (action === 'clean') {
    elements.dialogTitle.textContent = 'Limpiar cola';
    addParagraph('Selecciona qué ejecuciones quieres cancelar:');
    const choices = document.createElement('fieldset');
    choices.className = 'clean-options';
    choices.setAttribute('aria-label', 'Cola que se limpiará');
    choices.append(
      createCleanOption({
        value: 'new',
        label: 'Solo NEW',
        count: `${formatNumber(state.status?.queue?.new)} ejecuciones pendientes`,
      }),
      createCleanOption({
        value: 'running',
        label: 'Solo RUNNING',
        count: `${formatNumber(state.status?.queue?.running)} ejecuciones en curso`,
      }),
      createCleanOption({
        value: 'both',
        label: 'NEW y RUNNING',
        count: `${formatNumber((state.status?.queue?.new || 0) + (state.status?.queue?.running || 0))} ejecuciones en total`,
      }),
    );
    choices.addEventListener('change', (event) => {
      const statuses = selectedCleanStatuses(event.target.value);
      state.pendingAction = { action: 'clean', value: statuses };
      elements.dialogConfirm.disabled = statuses.length === 0;
    });
    elements.dialogBody.append(choices);
    addParagraph('n8n será detenido temporalmente mientras se modifica la cola. Las colas no seleccionadas no se modificarán.');
    addParagraph('Esta operación no se puede deshacer.', 'warning');
    elements.dialogConfirm.textContent = 'Confirmar limpieza';
    elements.dialogConfirm.disabled = true;
  } else if (action === 'stop') {
    elements.dialogTitle.textContent = 'Detener n8n';
    addParagraph('El servicio n8n se ajustará a 0 réplicas. Las ejecuciones nuevas no se procesarán hasta iniciarlo nuevamente.');
    addParagraph('Confirma solo si deseas pausar el servicio.', 'warning');
    elements.dialogConfirm.textContent = 'Detener n8n';
  } else if (action === 'start') {
    elements.dialogTitle.textContent = 'Iniciar n8n';
    addParagraph('El servicio n8n se ajustará a 1 réplica y la aplicación esperará a que quede activo.');
    elements.dialogConfirm.textContent = 'Iniciar n8n';
  } else if (action === 'concurrency') {
    elements.dialogTitle.textContent = 'Cambiar concurrencia';
    addParagraph(`Cambiar concurrencia de ${state.status?.n8n?.concurrency} a ${value}.`);
    addParagraph('n8n será detenido temporalmente, actualizado y luego iniciado.');
    elements.dialogConfirm.textContent = 'Aplicar';
  }

  elements.dialogConfirm.className = action === 'clean' || action === 'stop'
    ? 'button button-danger'
    : 'button button-secondary';
  elements.dialog.showModal();
  if (action === 'clean') elements.dialogBody.querySelector('input[name="clean-scope"]')?.focus();
  else elements.dialogConfirm.focus();
}

function closeDialog() {
  state.pendingAction = null;
  elements.dialogConfirm.disabled = false;
  if (elements.dialog.open) elements.dialog.close();
}

function renderProgress(operation) {
  elements.operationPanel.hidden = false;
  setText(elements.operationDescription, `${actionNames[operation.action] || operation.action} ${operation.status === 'running' ? 'en curso' : operation.status}`);
  setText(elements.operationIdLabel, operation.operationId);
  elements.progressList.replaceChildren();

  for (const step of operation.steps) {
    const item = document.createElement('li');
    item.dataset.state = step.status;
    const marker = document.createElement('span');
    marker.className = 'step-mark';
    marker.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'step-label';
    label.textContent = step.label;
    const detail = document.createElement('span');
    detail.className = 'step-detail';
    detail.textContent = step.detail || (step.status === 'active' ? 'Procesando…' : '');
    item.append(marker, label, detail);
    elements.progressList.append(item);
  }
}

async function pollOperation(operationId) {
  try {
    const operation = await request(`/api/operations/${encodeURIComponent(operationId)}`);
    renderProgress(operation);
    return operation;
  } catch (error) {
    if (error.payload?.status !== 404) return null;
    return null;
  }
}

function endpointFor(action) {
  if (action === 'stop') return '/api/n8n/stop';
  if (action === 'start') return '/api/n8n/start';
  if (action === 'clean') return '/api/queue/clean';
  return '/api/n8n/concurrency';
}

async function executePendingAction() {
  const pending = state.pendingAction;
  if (!pending || state.maintenanceActive) return;
  closeDialog();

  const operationId = crypto.randomUUID();
  state.maintenanceActive = true;
  state.operationId = operationId;
  renderControls();
  elements.operationPanel.hidden = false;
  setText(elements.operationDescription, `${actionNames[pending.action]} en espera`);
  setText(elements.operationIdLabel, operationId);
  elements.progressList.replaceChildren();

  state.progressTimer = window.setInterval(() => pollOperation(operationId), 1500);
  const options = {
    method: 'POST',
    headers: { 'X-Operation-Id': operationId },
    ...(pending.action === 'concurrency' ? { body: JSON.stringify({ value: pending.value }) } : {}),
    ...(pending.action === 'clean' ? { body: JSON.stringify({ statuses: pending.value }) } : {}),
  };

  try {
    const result = await request(endpointFor(pending.action), options);
    await pollOperation(operationId);
    if (pending.action === 'clean') {
      const scope = result.selectedStatuses.map((status) => status.toUpperCase()).join(' + ');
      showFlash(`Limpieza ${scope} completada: ${formatNumber(result.canceled)} ejecución(es) canceladas.`, 'success');
    } else if (pending.action === 'concurrency') {
      showFlash(result.unchanged ? `La concurrencia ya es ${result.concurrency}.` : `Concurrencia cambiada a ${result.concurrency}.`, 'success');
    } else {
      showFlash(`${actionNames[pending.action]} completado.`, 'success');
    }
  } catch (error) {
    await pollOperation(operationId);
    const context = error.payload?.details?.cleanupSucceeded
      ? ' La limpieza fue exitosa, pero n8n requiere atención inmediata.'
      : '';
    showFlash(`${error.message}${context}`, 'error');
  } finally {
    window.clearInterval(state.progressTimer);
    state.progressTimer = null;
    state.maintenanceActive = false;
    state.operationId = null;
    renderControls();
    await Promise.allSettled([loadStatus({ silent: true }), loadHistory()]);
  }
}

elements.refreshButton.addEventListener('click', async () => {
  elements.refreshButton.disabled = true;
  try {
    await Promise.all([loadStatus(), loadHistory()]);
  } finally {
    renderControls();
  }
});

elements.stopButton.addEventListener('click', () => openConfirmation('stop'));
elements.startButton.addEventListener('click', () => openConfirmation('start'));
elements.cleanButton.addEventListener('click', async () => {
  try {
    await loadStatus({ silent: true });
  } catch {
    // The action remains disabled if the prerequisite state could not be read.
  }
  if (state.status?.postgres?.status === 'connected') openConfirmation('clean');
});

elements.concurrencyOptions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-concurrency]');
  if (!button || button.disabled) return;
  const value = Number(button.dataset.concurrency);
  if (value !== state.status?.n8n?.concurrency) openConfirmation('concurrency', value);
});

elements.dialogCancel.addEventListener('click', closeDialog);
elements.dialogClose.addEventListener('click', closeDialog);
elements.dialogConfirm.addEventListener('click', executePendingAction);
elements.dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDialog();
});

window.setInterval(() => {
  if (!state.maintenanceActive) {
    loadStatus({ silent: true }).catch(() => {});
  }
}, 5000);

Promise.allSettled([loadStatus(), loadHistory()]);
