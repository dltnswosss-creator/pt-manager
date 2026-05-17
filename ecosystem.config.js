module.exports = {
  apps: [
    {
      name: "pt-manager",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "C:\\Users\\SOON\\OneDrive\\바탕 화면\\순재\\code\\pt manager\\pt-manager",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
