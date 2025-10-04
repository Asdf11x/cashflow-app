// dev-tunnel.cjs  <-- Note the new .cjs extension

const localtunnel = require('localtunnel');
const { createServer } = require('vite');
const chalk = require('chalk');
const react = require('@vitejs/plugin-react');

const PORT = 5174;

(async () => {
  try {
    console.log(chalk.blue('Starting localtunnel...'));
    const tunnel = await localtunnel({ port: PORT });
    const { url } = tunnel;

    console.log(chalk.green(`Tunnel ready at: ${url}\n`));

    const tunnelHost = new URL(url).hostname;

    const viteServer = await createServer({
      configFile: false,
      plugins: [react()],
      server: {
        port: PORT,
        host: true,
        hmr: {
          protocol: 'wss',
          host: tunnelHost,
        },
        origin: url,
        allowedHosts: [tunnelHost],
      },
    });

    await viteServer.listen();

    console.log(chalk.cyan('Vite dev server is running. You can now access it via the tunnel URL.\n'));
    viteServer.printUrls();

    viteServer.httpServer.on('close', () => {
      tunnel.close();
    });
  } catch (error) {
    console.error(chalk.red('An error occurred:'), error);
    process.exit(1);
  }
})();