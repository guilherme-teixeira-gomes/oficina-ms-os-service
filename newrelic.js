'use strict';
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'oficina-os-service'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: { enabled: true },
  logging: { level: 'info' },
  application_logging: {
    enabled: true,
    forwarding: { enabled: true },
    metrics: { enabled: true }
  },
  allow_all_headers: true
};
