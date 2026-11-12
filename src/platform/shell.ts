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

/** 供存档等模块复用宿主 SDK；未在微应用容器内时为 null */
export function getHostSDK(): MiniAppSDK | null {
  return sdk;
}

function notifyReady(): void {
  if (readySent || disposed || !sdk) {
    return;
  }
  readySent = true;
  const current = sdk;
  // 不能用 requestAnimationFrame：平台在收到 app-rendered 前会把应用 frame 设为
  // hidden/inert，隐藏文档里的 rAF 不会回调。用 setTimeout 保证一定能送达，
  // 并先等 SDK 的连接握手（sdk.ready），失败时允许重试。
  window.setTimeout(() => {
    void sendReady(current, 0);
  }, 0);
}

async function sendReady(current: MiniAppSDK, attempt: number): Promise<void> {
  if (disposed) {
    return;
  }
  try {
    await current.ready;
    if (disposed) {
      return;
    }
    await current.lifecycle.ready();
  } catch (error) {
    if (disposed) {
      return;
    }
    console.warn('[whalehook] lifecycle.ready 失败，将重试', error);
    if (attempt < 5) {
      readySent = false;
      window.setTimeout(() => {
        if (readySent || disposed || sdk !== current) {
          return;
        }
        readySent = true;
        void sendReady(current, attempt + 1);
      }, 400 * (attempt + 1));
    } else {
      // 放弃重试后仍允许后续 markFirstRender/showFatalError 再触发一次
      readySent = false;
    }
  }
}
