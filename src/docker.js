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
    const runningReplicas = tasks.filter((task) => task.Status?.State === 'running').length;
    let status = 'transitioning';
    if (desiredReplicas === 0 && runningReplicas === 0) status = 'stopped';
    if (desiredReplicas > 0 && desiredReplicas === runningReplicas) status = 'running';

    return {
      service: this.serviceName,
      desiredReplicas,
      runningReplicas,
      status,
      concurrency: readConcurrency(data),
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

module.exports = { N8nService, DockerServiceError };
