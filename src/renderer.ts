import * as vscode from 'vscode';
import { buildFakeLayout, FakeLayout, DEFAULT_SNIPPETS, DEFAULT_MD_SNIPPETS } from './fakeLayout';

export const SCHEME = 'draft';
// 自定义 scheme 起得不显眼：悬停标签页时显示完整 URI；scheme 改为 draft 更中性

export interface StealthSpec {
  mode: 'code' | 'markdown';
  linesPerPage: number;
  fakeCodeEvery: number;
  fakeCodeBlock: number;
  fakeCodeJitter: number;
  fakeCodeLines: string[];
}

/** 只读虚拟文档：假代码进文档本体获得真实语法高亮；正文画在空槽位行上 */
export class StealthDocProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;
  private specKey = '';
  layout: FakeLayout = buildFakeLayout(25, 4, 0, 0, []);
  mode: 'code' | 'markdown' = 'code';

  /** 应用新 spec；返回内容是否变化（需要 refresh） */
  setSpec(spec: StealthSpec): boolean {
    const key = JSON.stringify(spec);
    if (key === this.specKey) return false;
    this.specKey = key;
    this.mode = spec.mode;
    const snippets = spec.fakeCodeLines.length > 0
      ? spec.fakeCodeLines
      : (spec.mode === 'markdown' ? DEFAULT_MD_SNIPPETS : DEFAULT_SNIPPETS);
    const indentLevels = spec.mode === 'code' ? [0, 4, 8] : [0];
    this.layout = buildFakeLayout(spec.linesPerPage, spec.fakeCodeEvery, spec.fakeCodeBlock, spec.fakeCodeJitter, snippets, indentLevels);
    return true;
  }

  provideTextDocumentContent(): string {
    // 假代码进文档本体获得真实语法高亮；正文画在空槽位行上
    return this.layout.content;
  }

  refresh(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}

export function commentPrefixFor(languageId: string): string {
  return ['python', 'shellscript', 'yaml', 'ruby', 'perl', 'r'].includes(languageId)
    ? '#'
    : '//';
}

export class Renderer implements vscode.Disposable {
  private static readonly DOC_NAMES = { code: 'util.py', markdown: 'notes.md' } as const;

  get uri(): vscode.Uri {
    return vscode.Uri.parse(`${SCHEME}:/${Renderer.DOC_NAMES[this.provider.mode]}`);
  }

  private decoType = vscode.window.createTextEditorDecorationType({});

  constructor(private provider: StealthDocProvider) {}

  async openEditor(spec: StealthSpec): Promise<vscode.TextEditor> {
    const changed = this.provider.setSpec(spec);
    const target = this.uri;
    if (changed) {
      this.provider.refresh(target);
      await this.closeStealthTabs(target); // 关掉切换模式后残留的另一文件名 tab
    }
    const doc = await vscode.workspace.openTextDocument(target);
    // 仅当文档内容尚未等于目标内容时才等刷新落地（避免装饰画在旧行数上）。
    // 布局是确定性的：重启后恢复的内容常与新内容完全一致 → refresh 不产生变化
    // 事件，旧的"等行数变化"判断会白等满超时。改用内容比较，已一致则立即渲染。
    if (changed && doc.getText() !== this.provider.layout.content) {
      await this.waitForDocChange(doc, 300);
    }
    return vscode.window.showTextDocument(doc, { preview: false });
  }

  /** 等待该虚拟文档的下一次内容变更（带超时兜底） */
  private waitForDocChange(doc: vscode.TextDocument, timeoutMs: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        sub.dispose();
        resolve();
      }, timeoutMs);
      const sub = vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.uri.toString() === doc.uri.toString()) {
          clearTimeout(timer);
          sub.dispose();
          resolve();
        }
      });
    });
  }

  show(editor: vscode.TextEditor, lines: string[], color: string, prefix: string): void {
    const { slotLines, slotIndents } = this.provider.layout;
    const decorations: vscode.DecorationOptions[] = lines.slice(0, slotLines.length).map((line, i) => ({
      range: new vscode.Range(slotLines[i], 0, slotLines[i], 0),
      renderOptions: {
        after: {
          contentText: line === '' ? '' : `${slotIndents[i]}${prefix ? prefix + ' ' : ''}${line}`,
          color,
          textDecoration: 'none; white-space: pre;',
        },
      },
    }));
    editor.setDecorations(this.decoType, decorations);
  }

  clear(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.scheme === SCHEME) {
        editor.setDecorations(this.decoType, []);
      }
    }
  }

  async closeStealthTabs(except?: vscode.Uri): Promise<void> {
    const stealthTabs = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputText
        && tab.input.uri.scheme === SCHEME
        && (!except || tab.input.uri.toString() !== except.toString()));
    if (stealthTabs.length > 0) await vscode.window.tabGroups.close(stealthTabs);
  }

  dispose(): void {
    this.decoType.dispose();
  }
}
