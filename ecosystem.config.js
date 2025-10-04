module.exports = {
  apps: [
    {
      name: 'arix-api',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3988
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3988
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3988
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      restart_delay: 4000
    }
  ]
};

