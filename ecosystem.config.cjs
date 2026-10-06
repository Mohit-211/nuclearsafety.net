// PM2 process file. Usage on the VPS (after `npm ci && npm run build`):
//   pm2 start ecosystem.config.cjs && pm2 save
// Keep a SINGLE instance: the login rate limiter and SCORM content access cache are in-memory.
module.exports = {
  apps: [
    {
      name: "scorm-platform",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100 -H 127.0.0.1",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      time: true,
    },
  ],
};
