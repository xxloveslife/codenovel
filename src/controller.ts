import * as vscode from 'vscode';
import { Book, Layout, Position } from './book';
import { parseEpub } from './epubParser';
import { PositionStore } from './positionStore';
import { Renderer, SCHEME, StealthSpec, commentPrefixFor } from './renderer';

export class ReaderController {
  private book: Book | null = null;
  private bookPath = '';
  private page = 0;
  /**
   * 持久化锚点：只在用户主动导航（翻页/跳章/开书）时更新。
   * 配置变化时不得用换算后的页首位置覆盖它——positionOfPage 会把位置
   * 重新锚到页首，反复切换布局会让保存的进度单调向后漂移（每次最多一页）。
   */
  private anchor: Position = { chapterIndex: 0, charOffset: 0 };

  constructor(private renderer: Renderer, private store: PositionStore) {}

  private config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('stealthReader');
  }

  private layout(): Layout {
    const cfg = this.config();
    return {
      charsPerLine: cfg.get('charsPerLine', 40),
      linesPerPage: cfg.get('linesPerPage', 25),
    };
  }

  private spec(): StealthSpec {
    const cfg = this.config();
    return {
      linesPerPage: cfg.get('linesPerPage', 25),
      fakeCodeRatio: cfg.get('fakeCodeRatio', 0.25),
      fakeCodeLines: cfg.get('fakeCodeLines', []),
    };
  }

  async openBook(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      filters: { 'EPUB 电子书': ['epub'] },
      canSelectMany: false,
    });
    if (!picked?.length) return;
    await this.loadBook(picked[0].fsPath, null);
  }

  async nextPage(): Promise<void> {
    await this.turnPage(1);
  }

  async prevPage(): Promise<void> {
    await this.turnPage(-1);
  }

  /** 老板键（双向）：伪装页可见则瞬间隐藏；不可见则重新打开续读 */
  async bossKey(): Promise<void> {
    if (this.findStealthEditor()) {
      this.renderer.clear();
      await this.renderer.closeStealthTabs();
      return;
    }
    const state = await this.ensureBook();
    if (state === 'none') return;
    if (state === 'had') await this.render();
    // 'restored'：loadBook 已渲染，无需重复
  }

  async gotoChapter(): Promise<void> {
    if ((await this.ensureBook()) === 'none') return;
    const items = this.book!.chapterTitles.map((title, index) => ({
      label: title,
      index,
    }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: '跳转到章节' });
    if (!picked) return;
    this.page = this.book!.chapterStartPage(picked.index);
    this.anchor = this.book!.positionOfPage(this.page);
    await this.render();
  }

  /** 配置变化：按原锚点重建分页；锚点本身不变（防止进度漂移）。
   *  老板键藏起后不允许配置变化把伪装页重新拉起来：仅伪装页可见时才重渲染。 */
  async onConfigChanged(): Promise<void> {
    if (!this.book) return;
    this.book = new Book(this.book.chapters, this.layout());
    this.page = this.book.pageOfPosition(this.anchor);
    if (this.findStealthEditor()) await this.render();
  }

  /** 切走再切回伪装标签页时，重新应用装饰 */
  reapply(): void {
    const editor = this.findStealthEditor();
    if (editor && this.book) this.showPage(editor);
  }

  private async turnPage(delta: number): Promise<void> {
    // 刚从存档恢复时已渲染到存档页，本次按键不再额外翻页
    if ((await this.ensureBook()) !== 'had') return;
    const next = this.page + delta;
    if (next < 0 || next >= this.book!.totalPages) return;
    this.page = next;
    this.anchor = this.book!.positionOfPage(this.page);
    await this.render();
  }

  private findStealthEditor(): vscode.TextEditor | undefined {
    return vscode.window.visibleTextEditors.find(
      e => e.document.uri.scheme === SCHEME
    );
  }

  /** 无书时尝试从存档恢复；返回书的来源：原本就有 / 刚恢复 / 没有 */
  private async ensureBook(): Promise<'had' | 'restored' | 'none'> {
    if (this.book) return 'had';
    const saved = this.store.load();
    if (!saved) {
      void vscode.window.showInformationMessage(
        '先通过命令面板执行 "Stealth Reader: Open Book" 打开一本书'
      );
      return 'none';
    }
    await this.loadBook(saved.bookPath, saved.position);
    return this.book !== null ? 'restored' : 'none';
  }

  private async loadBook(fsPath: string, pos: Position | null): Promise<void> {
    try {
      const parsed = await parseEpub(fsPath);
      this.book = new Book(parsed.chapters, this.layout());
      this.bookPath = fsPath;
      this.page = pos ? this.book.pageOfPosition(pos) : 0;
      // 恢复时保留原始存档位置作为锚点（不重新锚到页首），全新打开才取页首
      this.anchor = pos ?? this.book.positionOfPage(this.page);
      await vscode.commands.executeCommand('setContext', 'stealthReader.active', true);
      await this.render();
    } catch (e) {
      this.book = null;
      await this.store.clear();
      void vscode.window.showErrorMessage(
        `打开书籍失败：${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  private async render(): Promise<void> {
    if (!this.book) return;
    const editor = await this.renderer.openEditor(this.spec());
    this.showPage(editor);
    await this.store.save({ bookPath: this.bookPath, position: this.anchor });
  }

  private showPage(editor: vscode.TextEditor): void {
    const cfg = this.config();
    const prefixCfg = cfg.get<string>('commentPrefix', 'auto');
    const prefix =
      prefixCfg === 'auto' ? commentPrefixFor(editor.document.languageId) : prefixCfg;
    const lines = [
      ...this.book!.getPage(this.page),
      `· ${this.page + 1}/${this.book!.totalPages}`,
    ];
    this.renderer.show(editor, lines, cfg.get('textColor', '#6A9955'), prefix);
  }
}
