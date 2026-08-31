const Docker = require('dockerode');
const { setTimeout: sleep } = require('node:timers/promises');

class DockerServiceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DockerServiceError';
    this.details = details;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readEnvironmentVariable(environment, name) {
  const prefix = `${name}=`;
  const entry = (environment || []).find((item) => item.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function readConcurrency(service) {
  const environment = service.Spec?.TaskTemplate?.ContainerSpec?.Env || [];
  const raw = readEnvironmentVariable(environment, 'N8N_CONCURRENCY_PRODUCTION_LIMIT');
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function taskRecency(task) {
  const createdAt = Date.parse(task.CreatedAt || '');
  if (Number.isFinite(createdAt)) return createdAt;
  const version = Number(task.Version?.Index);
  if (Number.isFinite(version)) return version;
  const updatedAt = Date.parse(task.UpdatedAt || '');
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

function currentTasks(tasks) {
  const latestBySlot = new Map();
  for (const task of tasks || []) {
    const slot = task.Slot ?? task.NodeID ?? task.ID;
    const current = latestBySlot.get(slot);
    if (!current || taskRecency(task) > taskRecency(current)) latestBySlot.set(slot, task);
  }
  return [...latestBySlot.values()];
}

function taskState(task) {
  return task?.Status?.State || 'unknown';
}

function taskDiagnostic(task) {
  if (!task) return null;
  const diagnostic = { taskState: taskState(task) };
  if (task.Status?.Message) diagnostic.message = task.Status.Message;
  if (task.Status?.Err) diagnostic.error = task.Status.Err;
  if (task.Status?.ContainerStatus?.ExitCode !== undefined) {
    diagnostic.exitCode = task.Status.ContainerStatus.ExitCode;
  }
  return diagnostic;
}

function classifyServiceTasks(desiredReplicas, tasks) {
  const relevantTasks = currentTasks(tasks);
  const runningReplicas = relevantTasks.filter((task) => taskState(task) === 'running').length;
  const states = relevantTasks.map(taskState);
  const transitionalStates = new Set(['new', 'pending', 'assigned', 'accepted', 'preparing', 'ready', 'starting']);
  const errorStates = new Set(['failed', 'rejected', 'orphaned']);

  if (desiredReplicas === 0) {
    return {
      status: runningReplicas > 0 ? 'stopping' : 'offline',
      runningReplicas,
      taskState: runningReplicas > 0 ? 'running' : (states[0] || 'shutdown'),
      diagnostic: null,
    };
  }

  if (runningReplicas === desiredReplicas) {
    return { status: 'online', runningReplicas, taskState: 'running', diagnostic: null };
  }

  if (runningReplicas > desiredReplicas) {
    return { status: 'stopping', runningReplicas, taskState: 'running', diagnostic: null };
  }

  const transitionalTask = relevantTasks.find((task) => transitionalStates.has(taskState(task)));
  if (transitionalTask || relevantTasks.length === 0) {
    return {
      status: 'starting',
      runningReplicas,
      taskState: transitionalTask ? taskState(transitionalTask) : 'pending',
      diagnostic: null,
    };
  }

  const failedTask = relevantTasks.find((task) => errorStates.has(taskState(task)));
  if (failedTask) {
    return {
      status: 'error',
      runningReplicas,
      taskState: taskState(failedTask),
      diagnostic: taskDiagnostic(failedTask),
    };
  }

  return {
    status: 'starting',
    runningReplicas,
    taskState: states[0] || 'pending',
    diagnostic: null,
  };
}

class N8nService {
  constructor(config) {
    this.serviceName = config.n8nService;
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async inspect() {
    // The Docker API accepts a service name. This is intentionally never a container ID.
    const service = this.docker.getService(this.serviceName);
    const data = await service.inspect();
    if (data.Spec?.Name !== this.serviceName) {
      throw new DockerServiceError('The resolved Docker service does not match N8N_SERVICE');
    }
    if (!data.Spec?.Mode?.Replicated) {
      throw new DockerServiceError('N8N_SERVICE must be a replicated Docker Swarm service');
    }
    return { service, data };
  }

  async getStatus() {
    const [{ data }, tasks] = await Promise.all([
      this.inspect(),
      this.docker.listTasks({
        filters: JSON.stringify({ service: [this.serviceName] }),
      }),
    ]);

    const desiredReplicas = Number(data.Spec.Mode.Replicated.Replicas) || 0;
    const classified = classifyServiceTasks(desiredReplicas, tasks);

    return {
      service: this.serviceName,
      desiredReplicas,
      runningReplicas: classified.runningReplicas,
      status: classified.status,
      taskState: classified.taskState,
      concurrency: readConcurrency(data),
      ...(classified.diagnostic ? { diagnostic: classified.diagnostic } : {}),
    };
  }

  async updateSpec(mutator) {
    const { service, data } = await this.inspect();
    const spec = clone(data.Spec);
    mutator(spec);

    // dockerode passes _query to the Docker API query string and _body as JSON.
    // Docker requires the current service version to reject conflicting writes.
    await service.update({
      _query: { version: data.Version.Index },
      _body: spec,
    });
  }

  async scaleTo(replicas) {
    if (!Number.isInteger(replicas) || replicas < 0) {
      throw new DockerServiceError('Replica count must be a non-negative integer');
    }
    await this.updateSpec((spec) => {
      if (!spec.Mode?.Replicated) {
        throw new DockerServiceError('N8N_SERVICE is not configured in replicated mode');
      }
      spec.Mode.Replicated.Replicas = replicas;
    });
  }

  async waitForReplicas(expectedDesired, expectedRunning, timeoutSeconds) {
    const deadline = Date.now() + timeoutSeconds * 1000;
    let latest;

    do {
      latest = await this.getStatus();
      if (
        latest.desiredReplicas === expectedDesired
        && latest.runningReplicas === expectedRunning
      ) {
        return latest;
      }
      if (Date.now() >= deadline) break;
      await sleep(1000);
    } while (Date.now() < deadline);

    throw new DockerServiceError(
      `Timed out waiting for n8n replicas to reach ${expectedRunning}/${expectedDesired}`,
      { latest },
    );
  }

  async setConcurrency(value) {
    await this.updateSpec((spec) => {
      const containerSpec = spec.TaskTemplate?.ContainerSpec;
      if (!containerSpec) {
        throw new DockerServiceError('The n8n service does not have a container specification');
      }
      const variableName = 'N8N_CONCURRENCY_PRODUCTION_LIMIT';
      const prefix = `${variableName}=`;
      const environment = Array.isArray(containerSpec.Env) ? [...containerSpec.Env] : [];
      const index = environment.findIndex((entry) => entry.startsWith(prefix));
      const replacement = `${variableName}=${value}`;
      if (index >= 0) environment[index] = replacement;
      else environment.push(replacement);
      containerSpec.Env = environment;
    });
  }

  async getConcurrency() {
    const { data } = await this.inspect();
    return readConcurrency(data);
  }
}

module.exports = {
  N8nService,
  DockerServiceError,
  classifyServiceTasks,
  currentTasks,
  readConcurrency,
};
