import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerDir = join(__dirname, '../worker');
const outputPath = join(__dirname, '../app/public/admin-stats.json');

const wrangler = join(workerDir, 'node_modules/.bin/wrangler');

function d1(sql) {
  const raw = execSync(
    `${wrangler} d1 execute archercoguides-db --remote --json --command '${sql}'`,
    { cwd: workerDir, encoding: 'utf8' }
  );
  const parsed = JSON.parse(raw);
  return parsed[0]?.results ?? [];
}

const now = Math.floor(Date.now() / 1000);
const ago7d = now - 7 * 24 * 3600;

console.log('Querying D1...');

const stats = {
  totalUsers:    d1('SELECT COUNT(*) AS cnt FROM users')[0]?.cnt ?? 0,
  totalViews:    d1('SELECT COUNT(*) AS cnt FROM views')[0]?.cnt ?? 0,
  newUsersLast7d: d1(`SELECT COUNT(*) AS cnt FROM users WHERE created_at >= ${ago7d}`)[0]?.cnt ?? 0,
  topGuides:     d1('SELECT guide_id, COUNT(*) AS view_count FROM views GROUP BY guide_id ORDER BY view_count DESC LIMIT 10'),
  recentViews:   d1('SELECT v.tg_id, u.username, u.first_name, v.guide_id, v.viewed_at FROM views v LEFT JOIN users u ON u.tg_id = v.tg_id ORDER BY v.viewed_at DESC LIMIT 20'),
  updatedAt:     now,
};

writeFileSync(outputPath, JSON.stringify(stats, null, 2));
console.log('✓ admin-stats.json written:', outputPath);
console.log(`  users=${stats.totalUsers} views=${stats.totalViews} guides=${stats.topGuides.length}`);
