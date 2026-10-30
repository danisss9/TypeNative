// Benchmark: Node.js vs TypeNative for the yaml CLI, both converting YAML to
// JSON (`yaml --json`).
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then measures:
//   (a) per-call latency: complete process runs (spawn to exit) on a small
//       docker-compose.yml, the kind of file a script or hook converts once;
//   (b) throughput: one run on about 10 MB of generated Kubernetes-style
//       manifests (Deployments, Services and ConfigMaps in one stream).
// Runs alternate Node and native, so drift on the machine hits both alike.
// Both runtimes' JSON must be identical, or the benchmark stops.
//
// Usage:  node bench.mjs [runs=30] [throughputRuns=5] [megabytes=10]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exePath = path.join(cache, process.platform === 'win32' ? 'yaml.exe' : 'yaml');
const runs = Number(process.argv[2] ?? '30') || 30;
const throughputRuns = Number(process.argv[3] ?? '5') || 5;
const megabytes = Number(process.argv[4] ?? '10') || 10;

const COMPOSE = `# A small web app: reverse proxy, API, worker, database and cache
services:
  proxy:
    image: nginx:1.27-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - certs:/etc/letsencrypt
    depends_on: [api]
    restart: unless-stopped
  api:
    build:
      context: ./api
      args:
        NODE_ENV: production
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
      REDIS_URL: redis://cache:6379/0
      LOG_LEVEL: info
      WORKERS: 4
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_started }
  worker:
    build: ./api
    command: node dist/worker.js
    environment: &worker-env
      QUEUE: default
      CONCURRENCY: 8
    deploy:
      replicas: 2
      resources:
        limits: { cpus: "0.50", memory: 512M }
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: pg_isready -U app
      interval: 10s
  cache:
    image: redis:7-alpine
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
volumes:
  pgdata: {}
  certs: {}
`;

// Deterministic pseudo-random numbers (a fixed-seed LCG): the same manifests
// on every run and every machine
let seed = 42;
function rand(n) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
}

const APPS = ['checkout', 'catalog', 'payments', 'search', 'auth', 'billing', 'notifications', 'inventory'];
const TEAMS = ['core', 'growth', 'platform', 'data'];

function deployment(name, i) {
  const team = TEAMS[rand(TEAMS.length)];
  const env = Array.from({ length: 6 }, (_, k) => `            - name: FEATURE_${k}_ENABLED\n              value: "${rand(2) === 1}"`).join('\n');
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${team}
  labels:
    app.kubernetes.io/name: ${name}
    app.kubernetes.io/part-of: shop
    team: ${team}
  annotations:
    deployment.kubernetes.io/revision: "${1 + rand(40)}"
spec:
  replicas: ${1 + rand(12)}
  selector:
    matchLabels:
      app.kubernetes.io/name: ${name}
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 25%, maxUnavailable: 0 }
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ${name}
        version: v${1 + rand(5)}.${rand(20)}.${rand(100)}
    spec:
      serviceAccountName: ${name}
      containers:
        - name: app
          image: registry.example.com/shop/${name}:${(i * 7919).toString(16)}
          imagePullPolicy: IfNotPresent
          ports:
            - { name: http, containerPort: 8080, protocol: TCP }
            - { name: metrics, containerPort: 9090, protocol: TCP }
          args: ["--port=8080", "--log-format=json", "--shutdown-grace=${10 + rand(50)}s"]
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef: { fieldPath: metadata.name }
${env}
          resources:
            requests: { cpu: ${50 + rand(450)}m, memory: ${64 + rand(448)}Mi }
            limits: { cpu: "${1 + rand(3)}", memory: ${512 + rand(1536)}Mi }
          readinessProbe:
            httpGet: { path: /ready, port: http }
            initialDelaySeconds: ${rand(15)}
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /healthz, port: http }
            failureThreshold: 3
`;
}

function service(name, team) {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${team}
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: ${name}
  ports:
    - name: http
      port: 80
      targetPort: http
`;
}

function configMap(name, team) {
  const lines = Array.from({ length: 8 }, (_, k) => `    key_${k} = ${rand(100000) / 100}`).join('\n');
  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-config
  namespace: ${team}
data:
  LOG_LEVEL: ${['debug', 'info', 'warn'][rand(3)]}
  TIMEOUT_MS: "${100 * (1 + rand(50))}"
  app.properties: |
${lines}
`;
}

function manifests(bytes) {
  const docs = [];
  let size = 0;
  for (let i = 0; size < bytes; i++) {
    const name = `${APPS[i % APPS.length]}-${i}`;
    const team = TEAMS[i % TEAMS.length];
    for (const doc of [deployment(name, i), service(name, team), configMap(name, team)]) {
      docs.push(doc);
      size += doc.length + 4;
    }
  }
  return docs.join('---\n');
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(12);
}

function runOnce(command, args, input) {
  const t0 = performance.now();
  const result = spawnSync(command, args, { cwd: here, input, maxBuffer: 1 << 30 });
  const elapsed = performance.now() - t0;
  if (result.status !== 0) {
    console.error(`run failed: ${command} ${args.join(' ')}\n${result.stderr}`);
    process.exit(1);
  }
  return { elapsed, stdout: result.stdout };
}

// Alternating Node and native runs; the two outputs must match
function timeBoth(input, count) {
  const node = [];
  const native = [];
  for (let i = 0; i < count; i++) {
    const a = runOnce(process.execPath, ['main.ts', '--json'], input);
    const b = runOnce(exePath, ['--json'], input);
    if (!a.stdout.equals(b.stdout)) {
      console.error('Node and native JSON differ');
      process.exit(1);
    }
    node.push(a.elapsed);
    native.push(b.elapsed);
  }
  return [stats(node), stats(native)];
}

function table(nodeStats, nativeStats, extra = () => '') {
  console.log(`| Runtime    | min          | median       | mean         | max          |${extra('head')}`);
  console.log(`|------------|--------------|--------------|--------------|--------------|${extra('rule')}`);
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |${extra(nodeStats)}`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |${extra(nativeStats)}`);
}

// 1. Compile the CLI to a native binary.
fs.mkdirSync(cache, { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', exePath], { cwd: here, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Per-call latency on a small docker-compose.yml.
const compose = Buffer.from(COMPOSE);
console.log(`\n(a) \`yaml --json < docker-compose.yml\` (${compose.length} bytes), ${runs} runs each (full process: spawn -> exit):\n`);
const [nodeCall, nativeCall] = timeBoth(compose, runs);
table(nodeCall, nativeCall);
console.log(`\nTypeNative is ${(nodeCall.median / nativeCall.median).toFixed(1)}x faster per call (median).`);

// 3. Throughput on generated Kubernetes manifests.
const big = Buffer.from(manifests(megabytes * 1024 * 1024));
const mb = big.length / (1024 * 1024);
console.log(`\n(b) \`yaml --json < manifests.yaml\` (${mb.toFixed(1)} MB, ${big.toString().split('\n---\n').length} documents), ${throughputRuns} runs each:\n`);
const [nodeBig, nativeBig] = timeBoth(big, throughputRuns);
table(nodeBig, nativeBig, (s) => (s === 'head' ? ' MB/s (median) |' : s === 'rule' ? '---------------|' : ` ${(mb / (s.median / 1000)).toFixed(2).padStart(13)} |`));
const ratio = nodeBig.median / nativeBig.median;
console.log(`\nTypeNative is ${ratio >= 1 ? `${ratio.toFixed(1)}x faster` : `${(1 / ratio).toFixed(1)}x slower`} on throughput (median).`);
