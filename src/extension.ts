import * as vscode from 'vscode';
import { ReaderController } from './controller';
import { PositionStore } from './positionStore';
import { Renderer, SCHEME, StealthDocProvider } from './renderer';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new StealthDocProvider();
  const renderer = new Renderer(provider);
  const store = new PositionStore(context.globalState);
  const controller = new ReaderController(renderer, store);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider),
    provider,
    renderer,
    vscode.commands.registerCommand('stealthReader.openBook', () => controller.openBook()),
    vscode.commands.registerCommand('stealthReader.nextPage', () => controller.nextPage()),
    vscode.commands.registerCommand('stealthReader.prevPage', () => controller.prevPage()),
    vscode.commands.registerCommand('stealthReader.bossKey', () => controller.bossKey()),
    vscode.commands.registerCommand('stealthReader.gotoChapter', () => controller.gotoChapter()),
    vscode.window.onDidChangeVisibleTextEditors(() => controller.reapply()),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('stealthReader')) void controller.onConfigChanged();
    })
  );

  // 有存档时激活快捷键上下文，按 Alt+] 即可直接续读
  if (store.load()) {
    void vscode.commands.executeCommand('setContext', 'stealthReader.active', true);
  }
}

export function deactivate(): void {}
