import Phaser from 'phaser';

/**
 * 启动场景：目前没有外部资源需要加载，只负责设置底色并进入菜单。
 * 后续接入正式美术/音效时，把 preload() 与加载进度条放这里。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#08121d');
    this.scene.start('Menu');
  }
}
