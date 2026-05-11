module.exports = {
  apps: [{
    name:        'gev-icms',
    script:      'src/index.js',
    cwd:         '/var/www/gev-icms/gev-icms-backend',
    instances:   1,
    exec_mode:   'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT:     3000,
    },
    error_file:  '/var/log/gev-icms/error.log',
    out_file:    '/var/log/gev-icms/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
