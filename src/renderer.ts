import * as vscode from 'vscode';
import { buildFakeLayout, FakeLayout } from './fakeLayout';

export const SCHEME = 'pyutil';
// 自定义 scheme 起得不显眼：悬停标签页时显示完整 URI
const DOC_NAME = 'util.py'; // 标签页显示的伪装文件名，.py 让语言推断为 python

export interface StealthSpec {
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

  /** 应用新 spec；返回内容是否变化（需要 refresh） */
  setSpec(spec: StealthSpec): boolean {
    const key = JSON.stringify(spec);
    if (key === this.specKey) return false;
    this.specKey = key;
    this.layout = buildFakeLayout(spec.linesPerPage, spec.fakeCodeEvery, spec.fakeCodeBlock, spec.fakeCodeJitter, spec.fakeCodeLines);
    return true;
  }

  get expectedLineCount(): number {
    return this.layout.content.split('\n').length;
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
  readonly uri = vscode.Uri.parse(`${SCHEME}:/${DOC_NAME}`);
  private decoType = vscode.window.createTextEditorDecorationType({});

  constructor(private provider: StealthDocProvider) {}

  async openEditor(spec: StealthSpec): Promise<vscode.TextEditor> {
    const changed = this.provider.setSpec(spec);
    if (changed) this.provider.refresh(this.uri);
    const doc = await vscode.workspace.openTextDocument(this.uri);
    if (changed && doc.lineCount !== this.provider.expectedLineCount) {
      await this.waitForDocChange(doc, 1000);
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
    const slots = this.provider.layout.slotLines;
    const decorations: vscode.DecorationOptions[] = lines.slice(0, slots.length).map((line, i) => ({
      range: new vscode.Range(slots[i], 0, slots[i], 0),
      renderOptions: {
        after: {
          contentText: line === '' ? '' : `${prefix} ${line}`,
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

  async closeStealthTabs(): Promise<void> {
    const stealthTabs = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputText && tab.input.uri.scheme === SCHEME);
    if (stealthTabs.length > 0) {
      await vscode.window.tabGroups.close(stealthTabs);
    }
  }

  dispose(): void {
    this.decoType.dispose();
  }
}
