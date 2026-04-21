import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const GUIDES_DIR = join(ROOT, 'guides');
const OUT_PUBLIC = join(ROOT, 'app', 'public');
const OUT_GUIDES = join(OUT_PUBLIC, 'guides');
const OUT_CATALOG = join(OUT_PUBLIC, 'catalog.json');

type Meta = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  youtubeUrl: string;
  isPaid: boolean;
  priceStars: number;
  duration: string;
  publishedAt: string;
  coverUrl: string;
};

function listGuideDirs(): string[] {
  return readdirSync(GUIDES_DIR).filter((name) => {
    const path = join(GUIDES_DIR, name);
    return statSync(path).isDirectory();
  });
}

function main() {
  if (!existsSync(OUT_PUBLIC)) mkdirSync(OUT_PUBLIC, { recursive: true });
  if (existsSync(OUT_GUIDES)) rmSync(OUT_GUIDES, { recursive: true, force: true });
  mkdirSync(OUT_GUIDES, { recursive: true });

  const catalog: Meta[] = [];
  for (const dir of listGuideDirs()) {
    const metaPath = join(GUIDES_DIR, dir, 'meta.json');
    const contentPath = join(GUIDES_DIR, dir, 'content.html');
    if (!existsSync(metaPath) || !existsSync(contentPath)) {
      console.warn(`[build-catalog] skipping ${dir}: missing meta.json or content.html`);
      continue;
    }
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Meta;
    catalog.push(meta);

    const destDir = join(OUT_GUIDES, meta.slug);
    mkdirSync(destDir, { recursive: true });
    copyFileSync(contentPath, join(destDir, 'content.html'));

    const assetsSrc = join(GUIDES_DIR, dir, 'assets');
    if (existsSync(assetsSrc)) {
      const destAssets = join(destDir, 'assets');
      mkdirSync(destAssets, { recursive: true });
      for (const a of readdirSync(assetsSrc)) {
        copyFileSync(join(assetsSrc, a), join(destAssets, a));
      }
    }

    const coverSrc = join(GUIDES_DIR, dir, 'cover.jpg');
    if (existsSync(coverSrc)) {
      copyFileSync(coverSrc, join(destDir, 'cover.jpg'));
    }
  }

  catalog.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  writeFileSync(OUT_CATALOG, JSON.stringify(catalog, null, 2));
  console.log(`[build-catalog] wrote ${catalog.length} guides to ${OUT_CATALOG}`);
}

main();
