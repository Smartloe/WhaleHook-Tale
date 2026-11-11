import { getSDK, type MiniAppSDK } from '@discourse-mini-app/sdk';
import messages from '../strings.json';

type Locale = keyof typeof messages;
type ShellStrings = (typeof messages)[Locale];

/**
 * 微应用外壳适配层。
 *
 * - 在 linux.do 微应用容器内：拿到平台 SDK，首帧后调用 `lifecycle.ready()`。
 * - 普通网页 / GitHub Pages / 本地预览：`getSDK()` 会抛错，这里静默降级，
 *   游戏照常运行，且不请求任何权限。
 *
 * 只使用平台公开的 SDK 能力，不访问父页面 DOM 或论坛 Cookie。
 */
let sdk: MiniAppSDK | null = null;
let readySent = false;
let disposed = false;
let strings: ShellStrings = messages.zh_CN;

function pickLocale(): Locale {
  const language = (navigator.language || 'zh-CN').toLowerCase();
  if (language.startsWith('zh')) {
    return language.includes('tw') || language.includes('hk') || language.includes('mo')
      ? 'zh_TW'
      : 'zh_CN';
  }
  return 'en';
}

function setText(id: string, text: string): void {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = text;
  }
}

/** 连接宿主并写入外壳文案；返回是否运行在微应用容器内 */
export function initShell(): boolean {
  const locale = pickLocale();
  strings = messages[locale];
  document.documentElement.lang = locale === 'zh_TW' ? 'zh-TW' : locale === 'zh_CN' ? 'zh-CN' : 'en';

  const stage = document.getElementById('game');
  stage?.setAttribute('aria-label', strings.canvasLabel);
  setText('whalehook-loading', strings.loading);
  setText('whalehook-notice', strings.notice);

  try {
    sdk = getSDK();
  } catch {
    sdk = null;
  }
  return sdk !== null;
}

/** 首帧渲染完成后调用：移除加载提示，并按平台要求通知 lifecycle.ready() */
export function markFirstRender(): void {
  document.getElementById('whalehook-loading')?.remove();
  notifyReady();
}

/**
 * 外壳 DOM 就绪即可通知平台。
 * 平台在收到 app-rendered 之前会把应用 frame 置为 hidden/inert，
 * 而 Phaser 的场景创建与渲染都靠 requestAnimationFrame —— 隐藏时 rAF 不回调。
 * 因此必须先从外壳层把 ready 送出去，平台才会揭开 frame、Phaser 才真正开始跑。
 */
export function notifyShellReady(): void {
  notifyReady();
}

/** 初始化失败时调用：把错误展示给用户，同时仍通知平台已完成初始化 */
export function showFatalError(error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  const loading = document.getElementById('whalehook-loading');
  if (loading) {
    loading.textContent = strings.error.replace('{message}', detail);
    loading.classList.add('whalehook__error');
  }
  notifyReady();
}

export function disposeShell(): void {
  disposed = true;
  sdk = null;
}

function notifyReady(): void {
  if (readySent || disposed || !sdk) {
    return;
  }
  readySent = true;
  const current = sdk;
  // 同上：不能用 requestAnimationFrame，用 setTimeout 保证一定能送达。
  window.setTimeout(() => {
    if (disposed) {
      return;
    }
    void current.lifecycle.ready().catch((error: unknown) => {
      console.warn('[whalehook] lifecycle.ready 失败', error);
    });
  }, 0);
}
