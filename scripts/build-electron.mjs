import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron', '@prisma/client', '.prisma/client', 'bcryptjs', 'pdfkit'],
  sourcemap: true,
};

await esbuild.build({
  ...shared,
  entryPoints: [path.join(root, 'electron/main.ts')],
  outfile: path.join(root, 'dist-electron/main.cjs'),
  format: 'cjs',
});

await esbuild.build({
  ...shared,
  entryPoints: [path.join(root, 'electron/preload.ts')],
  outfile: path.join(root, 'dist-electron/preload.cjs'),
  format: 'cjs',
});

console.log('Electron build complete');
