/**
 * GitHub Webhook Auto-Deploy para Switch User
 *
 * Recebe webhooks do GitHub e faz deploy automático do projeto.
 */

import http from 'http';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração
const CONFIG = {
  port: process.env.WEBHOOK_PORT || 3007,
  secret: process.env.WEBHOOK_SECRET || '',
  branch: 'main',
  repoPath: __dirname,
  distPath: join(__dirname, 'dist')
};

// Logger com timestamp
function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[SUCCESS]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m'
  };
  console.log(`${timestamp} ${prefix[level] || '[LOG]'} ${message}`);
}

// Valida assinatura HMAC do GitHub
function validateSignature(payload, signature) {
  if (!CONFIG.secret) {
    log('warn', 'WEBHOOK_SECRET não configurado - pulando validação');
    return true;
  }

  if (!signature) {
    log('error', 'Assinatura não fornecida');
    return false;
  }

  const hmac = crypto.createHmac('sha256', CONFIG.secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Executa comando e retorna output
function runCommand(command, cwd = CONFIG.repoPath) {
  log('info', `Executando: ${command}`);
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout: 120000 // 2 minutos
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.message };
  }
}

// Processo de deploy
function deploy() {
  log('info', '=== Iniciando deploy ===');

  const steps = [
    { name: 'Git fetch', cmd: 'git fetch origin' },
    { name: 'Git reset', cmd: `git reset --hard origin/${CONFIG.branch}` },
    { name: 'Git clean', cmd: 'git clean -fd --exclude=webhook-deploy.js --exclude=.env.webhook --exclude=node_modules' },
    { name: 'Criar dist', cmd: `mkdir -p ${CONFIG.distPath}` },
    { name: 'Build', cmd: 'npx esbuild src/index.js --bundle --minify --format=iife --global-name=UIInjector --outfile=dist/ui-injector.min.js' }
  ];

  for (const step of steps) {
    const result = runCommand(step.cmd);
    if (!result.success) {
      log('error', `Falha em "${step.name}": ${result.output}`);
      return false;
    }
    log('success', `${step.name}: OK`);
  }

  log('success', '=== Deploy concluído com sucesso! ===');
  return true;
}

// Handler HTTP
function handleRequest(req, res) {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'switch-user-webhook' }));
    return;
  }

  // Apenas POST /webhook
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      // Validar assinatura
      const signature = req.headers['x-hub-signature-256'];
      if (!validateSignature(body, signature)) {
        log('error', 'Assinatura inválida');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }

      const payload = JSON.parse(body);

      // Verificar se é push para branch correta
      const ref = payload.ref || '';
      if (!ref.endsWith(`/${CONFIG.branch}`)) {
        log('info', `Push ignorado: branch ${ref} (esperado: ${CONFIG.branch})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Ignored: wrong branch' }));
        return;
      }

      log('info', `Webhook recebido: push para ${CONFIG.branch}`);
      log('info', `Commit: ${payload.head_commit?.message || 'N/A'}`);

      // Responder imediatamente
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Deploy started' }));

      // Executar deploy em background
      setImmediate(() => {
        deploy();
      });

    } catch (error) {
      log('error', `Erro ao processar webhook: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
  });
}

// Iniciar servidor
const server = http.createServer(handleRequest);

server.listen(CONFIG.port, '127.0.0.1', () => {
  log('info', '=========================================');
  log('info', '  Switch User - Webhook Auto-Deploy');
  log('info', '=========================================');
  log('info', `Servidor rodando em http://127.0.0.1:${CONFIG.port}`);
  log('info', `Branch monitorada: ${CONFIG.branch}`);
  log('info', `Secret configurado: ${CONFIG.secret ? 'Sim' : 'Não'}`);
  log('info', '=========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'SIGTERM recebido, encerrando...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  log('info', 'SIGINT recebido, encerrando...');
  server.close(() => process.exit(0));
});
