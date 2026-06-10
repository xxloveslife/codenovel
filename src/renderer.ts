import * as vscode from 'vscode';

export const SCHEME = 'pyutil';
// 自定义 scheme 起得不显眼：悬停标签页时显示完整 URI
const DOC_NAME = 'util.py'; // 标签页显示的伪装文件名，.py 让语言推断为 python

/** 只读虚拟文档：内容只有空行，装饰画在空行上，文件本体零内容零痕迹 */
export class StealthDocProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;
  linesPerPage = 25;

  provideTextDocumentContent(): string {
    // N 个换行 → N+1 行：0..N-1 给正文，第 N 行给页码指示
    return '\n'.repeat(this.linesPerPage);
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

  async openEditor(linesPerPage: number): Promise<vscode.TextEditor> {
    const needsResize = this.provider.linesPerPage !== linesPerPage;
    if (needsResize) {
      this.provider.linesPerPage = linesPerPage;
      this.provider.refresh(this.uri);
    }
    const doc = await vscode.workspace.openTextDocument(this.uri);
    if (needsResize && doc.lineCount !== linesPerPage + 1) {
      // refresh 是异步生效的：等内容更新落地再渲染，避免装饰画在旧行数上
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
    const decorations: vscode.DecorationOptions[] = lines.map((line, i) => ({
      range: new vscode.Range(i, 0, i, 0),
      renderOptions: {
        after: {
          contentText: line === '' ? '' : `${prefix} ${line}`,
          color,
          // white-space: pre 防止 contentText 中连续空格被折叠
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
