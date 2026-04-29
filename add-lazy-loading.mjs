/**
 * add-lazy-loading.mjs
 * Añade loading="lazy" a todas las <img> que no tengan atributo loading=
 *
 * REGLAS:
 *  ✅ Solo procesa archivos .astro reales del sitio
 *  🚫 Ignora carpetas .claude/ (worktrees internos de Claude Code)
 *  🚫 No toca imágenes que ya tienen loading="eager" o loading="lazy"
 *  🚫 No toca imágenes con fetchpriority="high" (heroes críticos)
 *  🚫 No toca imágenes del logo en Navbar (deben cargar rápido)
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR   = path.join(__dirname, 'src');

// Directorios a ignorar completamente
const IGNORE_DIRS = ['.claude', 'worktrees', 'node_modules'];

// ─── helpers ───────────────────────────────────────────────────────────────

async function getAllAstroFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...await getAllAstroFiles(full));
    } else if (e.name.endsWith('.astro')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Procesa el contenido de un archivo .astro añadiendo loading="lazy"
 * a los <img> que no lo tengan.
 * Maneja tanto tags en una línea como multilínea.
 */
function addLazyLoading(content) {
  let count = 0;

  // Regex que captura <img ... > y <img ... />
  // [\s\S]*? → non-greedy → se detiene en el primer > o />
  const result = content.replace(/<img\b([\s\S]*?)(\/?\s*>)/g, (match, attrs, closing) => {
    // 1. Ya tiene loading= → no tocar
    if (/\bloading\s*=/.test(attrs)) return match;

    // 2. Imagen hero con fetchpriority="high" → no tocar
    if (/fetchpriority\s*=\s*["']high["']/.test(attrs)) return match;

    // 3. Logo del navbar (src con "logo") → no tocar
    if (/src\s*=.*logo/i.test(attrs)) return match;

    count++;
    return `<img loading="lazy"${attrs}${closing}`;
  });

  return { result, count };
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  Escaneando archivos .astro del sitio …\n');

  const files = await getAllAstroFiles(SRC_DIR);
  console.log(`📄  Archivos encontrados: ${files.length}\n`);
  console.log('─'.repeat(72));

  let totalFixed  = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    const content          = await readFile(filePath, 'utf-8');
    const { result, count } = addLazyLoading(content);

    if (count > 0) {
      await writeFile(filePath, result, 'utf-8');
      totalFixed  += count;
      filesChanged++;
      const rel = filePath.replace(path.join(__dirname, 'src') + path.sep, 'src/');
      console.log(`✅  +${String(count).padStart(2)} lazy  →  ${rel}`);
    }
  }

  console.log('\n' + '═'.repeat(72));
  console.log('📊  RESUMEN FINAL');
  console.log('─'.repeat(72));
  console.log(`   Archivos modificados  : ${filesChanged}`);
  console.log(`   Imágenes actualizadas : ${totalFixed}  (loading="lazy" añadido)`);
  console.log('═'.repeat(72));
  console.log('\n✅  Listo. Carga inicial más rápida en todas las páginas.\n');
}

main().catch((err) => {
  console.error('\n❌  Error:', err);
  process.exit(1);
});
