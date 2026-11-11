import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * Phaser 的 UMD/ESM 产物里带了一段 webpack 全局对象探测：
 *   new Function("return this")()
 * 它只在 `typeof globalThis !== "object"` 时才会执行（现代浏览器永远走不到），
 * 但平台会把它当作 eval 类代码，要求额外申报 `code.eval`。
 * 这里在上线构建中把它替换为 `globalThis`，语义不变，避免无谓的权限声明。
 */
function stripPhaserEvalShim(): Plugin {
  const pattern = /new Function\(\s*(["'`])return this\1\s*\)\(\)/g;
  return {
    name: 'whalehook-strip-eval-shim',
    apply: 'build',
    enforce: 'post',
    renderChunk(code) {
      if (!code.includes('return this')) return null;
      const next = code.replace(pattern, 'globalThis');
      return next === code ? null : { code: next, map: null };
    },
  };
}

/**
 * 两套构建：
 * - 默认（web）：GitHub Pages / 普通网页，产物在 dist/
 * - mini：linux.do 微应用运行包，单个 IIFE app.js + app.css，产物在 dist-mini/web/
 *
 * mini 构建后由 scripts/package.mjs 补齐 index.html / strings.json 并打包成 app.zip。
 */
export default defineConfig(({ mode }) => {
  if (mode === 'mini') {
    return {
      publicDir: false,
      plugins: [stripPhaserEvalShim()],
      build: {
        outDir: 'dist-mini/web',
        emptyOutDir: true,
        target: 'es2022',
        minify: 'esbuild',
        sourcemap: process.env.MINI_APP_DEBUG === '1' ? 'inline' : false,
        cssCodeSplit: false,
        chunkSizeWarningLimit: 4000,
        lib: {
          entry: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
          name: 'WhaleHookTale',
          formats: ['iife'],
          fileName: () => 'app.js',
          cssFileName: 'app',
        },
      },
    };
  }

  // `base: './'` 让构建产物可以在任意子路径下运行（GitHub Pages 项目页即 /<repo>/）。
  return {
    base: './',
    plugins: [stripPhaserEvalShim()],
    build: {
      target: 'es2020',
      outDir: 'dist',
      chunkSizeWarningLimit: 2000,
    },
  };
});
