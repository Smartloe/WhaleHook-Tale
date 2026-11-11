import { copyFile, readFile, stat } from 'node:fs/promises';
import { pack } from '@discourse-mini-app/sdk/pack';

/**
 * 生成 linux.do 微应用运行包 app.zip。
 *
 * 用法：
 *   MINI_APP_ID=<应用页面分配的 UUID> MINI_APP_VERSION=0.1.0 npm run build:mini
 *
 * 打包前会检查 index.html 是否含平台禁止的内容（脚本、事件属性、内联样式、
 * 资源预连接、嵌套 iframe/object），避免提交后才发现格式不符。
 */
const WEB_DIR = 'dist-mini/web';
const OUT_DIR = 'dist-mini/package';
const BASE_FILES = ['index.html', 'app.js', 'app.css', 'strings.json'];

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));

if (process.env.MINI_APP_ID) {
  manifest.id = process.env.MINI_APP_ID.trim();
}
if (process.env.MINI_APP_VERSION) {
  manifest.version = process.env.MINI_APP_VERSION.trim();
}
if (manifest.id.endsWith('000000000000')) {
  console.warn(
    '[打包警告] manifest.id 仍是占位值。请在社区应用页创建应用后，用 MINI_APP_ID 传入真实 ID 再打包。',
  );
}

await copyFile('src/template.html', `${WEB_DIR}/index.html`);
await copyFile('src/strings.json', `${WEB_DIR}/strings.json`);

const html = await readFile(`${WEB_DIR}/index.html`, 'utf8');
const forbidden = [
  [/<script\b/i, '<script> 标签'],
  [/\son[a-z]+\s*=/i, '内联事件属性'],
  [/\sstyle\s*=/i, '内联 style 属性'],
  [/<link\b[^>]*rel=["']?(?:preconnect|prefetch|dns-prefetch)/i, '资源预连接'],
  [/<(?:iframe|object|embed)\b/i, '嵌套浏览上下文'],
];
for (const [pattern, label] of forbidden) {
  if (pattern.test(html)) {
    throw new Error(`index.html 含平台禁止的${label}，请修改 src/template.html`);
  }
}

const files = {};
for (const name of BASE_FILES) {
  const path = `${WEB_DIR}/${name}`;
  try {
    await stat(path);
  } catch {
    throw new Error(`缺少打包文件：${path}（请确认 vite --mode mini 构建成功）`);
  }
  files[name] = await readFile(path);
}

const js = files['app.js'].toString('utf8');
if (
  /\bnew Function\s*\(|\beval\s*\(/.test(js) &&
  !(manifest.permissions ?? []).includes('code.eval')
) {
  throw new Error(
    'app.js 含 eval / new Function，需要申报 code.eval 权限；请先移除该代码（见 vite.config.ts 的 stripPhaserEvalShim）',
  );
}

for (const path of manifest.assets ?? []) {
  if (
    !/^[a-zA-Z0-9_.\-/]{1,160}$/.test(path) ||
    path.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`manifest.assets 路径不合法：${path}`);
  }
  files[path] = await readFile(`${WEB_DIR}/${path}`);
}

const result = await pack({ manifest, files, outputDirectory: OUT_DIR });

console.log('');
console.log(`✅ 已生成 ${result.file}`);
console.log(`   ${(result.size / 1024 / 1024).toFixed(2)} MiB · sha256 ${result.zipSha256}`);
console.log(`   应用 ID：${manifest.id}`);
console.log(`   版本：${manifest.version}`);
console.log('');
console.log('下一步：在社区应用管理页上传该 app.zip，等待 sandbox 构建后检查，再新建发布提审。');
