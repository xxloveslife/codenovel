import * as vscode from 'vscode';

export const SCHEME = 'stealth-reader';
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
    if (this.provider.linesPerPage !== linesPerPage) {
      this.provider.linesPerPage = linesPerPage;
      this.provider.refresh(this.uri);
    }
    const doc = await vscode.workspace.openTextDocument(this.uri);
    return vscode.window.showTextDocument(doc, { preview: false });
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
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText && tab.input.uri.scheme === SCHEME) {
          await vscode.window.tabGroups.close(tab);
        }
      }
    }
  }

  dispose(): void {
    this.decoType.dispose();
  }
}
