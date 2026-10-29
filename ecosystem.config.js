// PM2 process file for the fpl-xi monorepo: two apps, one server.
//
//   fpl-api  FastAPI (backend/)          → 127.0.0.1:8011, public at https://example.com/fpl
//   fpl-web  built SPA (frontend/dist)   → 127.0.0.1:3011, public at https://example.com/fantasy-league/
//
// First run:   pm2 start ecosystem.config.js && pm2 save && pm2 startup
// Deploy:      make deploy   (= build both, then pm2 reload ecosystem.config.js --update-env && pm2 save)
// Logs:        pm2 logs fpl-api   |   pm2 logs fpl-web   (rotate with pm2-logrotate)
//
// Config comes from backend/.env (see backend/.env.example); real env vars win over it.
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');

/** Minimal KEY=VALUE parser for backend/.env — no dependency, comments/blank lines ignored. */
function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const backendEnv = { ...loadEnv(path.join(backendDir, '.env')), ...process.env };

/** The backend venv's Python: FPL_PYTHON overrides; else backend/.venv (Linux or Windows layout). */
function python() {
  if (process.env.FPL_PYTHON) return process.env.FPL_PYTHON;
  const candidates = [
    path.join(backendDir, '.venv', 'bin', 'python'),
    path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

module.exports = {
  apps: [
    {
      name: 'fpl-api',
      cwd: backendDir,
      // `python -m api` reads API_HOST/API_PORT; exec the venv's Python directly.
      script: python(),
      args: '-m api',
      interpreter: 'none',
      instances: 1, // the FPL cache is in-process: more workers = more calls to FPL
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      kill_timeout: 8000, // let uvicorn finish in-flight requests
      env: {
        PYTHONUNBUFFERED: '1',
        API_HOST: backendEnv.API_HOST ?? '127.0.0.1',
        API_PORT: backendEnv.API_PORT ?? '8011',
        FPL_API_PREFIX: backendEnv.FPL_API_PREFIX ?? '/fpl',
        CORS_ORIGINS: backendEnv.CORS_ORIGINS ?? 'http://localhost:3011',
        ...(backendEnv.FPL_XI_PROCESSED_DIR && { FPL_XI_PROCESSED_DIR: backendEnv.FPL_XI_PROCESSED_DIR }),
        ...(backendEnv.APP_VERSION && { APP_VERSION: backendEnv.APP_VERSION }),
        ...(backendEnv.ANTHROPIC_API_KEY && { ANTHROPIC_API_KEY: backendEnv.ANTHROPIC_API_KEY }),
      },
      out_file: path.join(root, 'logs', 'fpl-api.out.log'),
      error_file: path.join(root, 'logs', 'fpl-api.err.log'),
      time: true,
    },
    {
      name: 'fpl-web',
      cwd: frontendDir,
      // Zero-dependency static server for dist/ under /fantasy-league/ (why not `serve`: see server.mjs).
      script: 'server.mjs',
      // Two cluster workers: `pm2 reload` restarts them one at a time → zero-downtime deploys.
      instances: 2,
      exec_mode: 'cluster',
      wait_ready: true, // server.mjs sends 'ready' once listening
      listen_timeout: 8000,
      kill_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: process.env.WEB_PORT ?? '3011',
        BASE_PATH: '/fantasy-league/',
      },
      out_file: path.join(root, 'logs', 'fpl-web.out.log'),
      error_file: path.join(root, 'logs', 'fpl-web.err.log'),
      time: true,
    },
  ],
};
