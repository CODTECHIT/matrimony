module.exports = {
  apps: [
    {
      name: "yfj-matrimony-api",
      script: "dist/index.js",
      instances: "max", // Scale to all available CPU cores on EC2
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
    },
  ],
};
