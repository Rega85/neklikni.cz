import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));

const files = [
  { src: 'Header_final.tsx', dst: join('app', 'components', 'Header.tsx') },
  { src: 'page_final.tsx',   dst: join('app', 'page.tsx') },
  { src: 'billing_final.tsx', dst: join('app', 'billing', 'page.tsx') },
];

for (const { src, dst } of files) {
  const content = readFileSync(join(dir, src), 'utf8');
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, content, 'utf8');
  console.log('OK:', dst);
}
console.log('Hotovo!');
