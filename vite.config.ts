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
 * 微应用运行时会把 navigator / window 上的若干属性设为只读（DOM 隔离）。
 * Phaser 启动时会给旧的媒体/振动 API 打 polyfill，直接赋值这些属性会抛
 * `Cannot assign to read only property 'getUserMedia'`，整个 bundle 因此中断。
 *
 * 这里把三处赋值改成纯读取表达式：现代浏览器上本来就是 no-op，
 * 只影响 Phaser 的旧前缀能力探测，不影响游戏玩法。
 */
function guardFrozenGlobals(): Plugin {
  const replacements: Array<[RegExp, string]> = [
    [
      /navigator\.getUserMedia\s*=\s*navigator\.getUserMedia\s*\|\|\s*navigator\.webkitGetUserMedia\s*\|\|\s*navigator\.mozGetUserMedia\s*\|\|\s*navigator\.msGetUserMedia\s*\|\|\s*navigator\.oGetUserMedia/g,
      '(navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia||navigator.oGetUserMedia||void 0)',
    ],
    [
      /window\.URL\s*=\s*window\.URL\s*\|\|\s*window\.webkitURL\s*\|\|\s*window\.mozURL\s*\|\|\s*window\.msURL/g,
      '(window.URL||window.webkitURL||window.mozURL||window.msURL||void 0)',
    ],
    [
      /navigator\.vibrate\s*=\s*navigator\.vibrate\s*\|\|\s*navigator\.webkitVibrate\s*\|\|\s*navigator\.mozVibrate\s*\|\|\s*navigator\.msVibrate/g,
      '(navigator.vibrate||navigator.webkitVibrate||navigator.mozVibrate||navigator.msVibrate||void 0)',
    ],
  ];
  return {
    name: 'whalehook-guard-frozen-globals',
    apply: 'build',
    enforce: 'post',
    renderChunk(code) {
      let next = code;
      let matched = 0;
      for (const [pattern, value] of replacements) {
        const before = next;
        next = next.replace(pattern, value);
        if (next !== before) {
          matched += 1;
        }
      }
      if (matched !== replacements.length) {
        throw new Error(
          `guardFrozenGlobals: 只匹配到 ${matched}/${replacements.length} 处 Phaser polyfill 赋值。` +
            'Phaser 升级后压缩产物可能变化，请更新正则，否则微应用沙箱会在启动时抛只读属性错误。',
        );
      }
      return { code: next, map: null };
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
      plugins: [stripPhaserEvalShim(), guardFrozenGlobals()],
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
