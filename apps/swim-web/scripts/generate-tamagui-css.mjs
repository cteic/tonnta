import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

register(new URL('./tamagui-ts-loader.mjs', import.meta.url));

const { config } = await import('@tonnta/ui/tamagui.config');

const designSystemCSS = config.getCSS();

const outFile = new URL('../public/tamagui.css', import.meta.url);
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(outFile, designSystemCSS);

console.log(
  `[tamagui] wrote design-system CSS to ${fileURLToPath(outFile)} (${designSystemCSS.length} bytes)`
);

process.exit(0);
