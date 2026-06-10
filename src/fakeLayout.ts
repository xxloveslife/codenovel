export interface FakeLayout {
  /** 虚拟文档全文（假代码行 + 空槽位行） */
  content: string;
  /** 第 i 个正文槽位对应的文档行号；最后一个槽位留给页码指示 */
  slotLines: number[];
  /** 第 i 个正文槽位的缩进前缀（长度等于 slotLines） */
  slotIndents: string[];
}

/** Markdown 伪装结构行：插在正文段落之间，像在写笔记/文档 */
export const DEFAULT_MD_SNIPPETS = [
  '## 笔记整理',
  '',
  '- [ ] 待办：整理本周要点',
  '- 重点摘录如下',
  '',
  '> 摘要：先把结论记下来',
  '',
  '### 小结',
  '1. 第一条',
  '2. 第二条',
  '',
  '---',
];

/** 内置伪装片段：按顺序循环，连续几行也像一段真代码；以 import 开头更像文件头 */
export const DEFAULT_SNIPPETS = [
  'import json',
  'import time',
  'from pathlib import Path',
  'def load_config(path: str) -> dict:',
  '    with open(path, encoding="utf-8") as f:',
  '        return json.load(f)',
  'class CacheManager:',
  '    def __init__(self, root: str):',
  '        self.root = Path(root)',
  '        self.entries = {}',
  '    def get(self, key, default=None):',
  '        return self.entries.get(key, default)',
  '    def put(self, key, value):',
  '        self.entries[key] = value',
  'def normalize(items):',
  '    return [x.strip() for x in items if x]',
  'def retry(fn, times=3, delay=0.5):',
  '    for attempt in range(times):',
  '        try:',
  '            return fn()',
  '        except OSError:',
  '            time.sleep(delay)',
  'if __name__ == "__main__":',
  '    main()',
];

/** mulberry32：确定性伪随机，保证相同配置下布局稳定（翻页代码骨架不跳动） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 围绕均值 avg 按 jitter 幅度扰动：jitter 0 → 恒为 avg；jitter 1 → 约在 [1, 2*avg] */
function jittered(avg: number, jitter: number, rand: () => number, min: number): number {
  const delta = avg * jitter * (rand() * 2 - 1);
  return Math.max(min, Math.round(avg + delta));
}

/**
 * 随机成段混排布局：连续若干行正文 + 连续若干行代码交替（页首不以代码开头），
 * 块大小围绕 textBlock/codeBlock 均值按 jitter 扰动；固定种子，入参相同则布局相同。
 * indentLevels: 各槽位的缩进档位列表，长度 > 1 时随机选取；默认 [0] 时全为空串且不消耗随机数。
 */
export function buildFakeLayout(
  linesPerPage: number,
  textBlock: number,
  codeBlock: number,
  jitter: number,
  snippets: string[],
  indentLevels: number[] = [0]
): FakeLayout {
  const src = snippets.length > 0 ? snippets : DEFAULT_SNIPPETS;
  const tb = Math.max(1, Math.floor(textBlock));
  const cb = Math.max(0, Math.floor(codeBlock));
  const j = Math.min(1, Math.max(0, jitter));
  const rand = mulberry32(0x9e3779b9);
  const lines: string[] = [];
  const slotLines: number[] = [];
  const slotIndents: string[] = [];
  const useIndents = indentLevels.length > 1;
  let snip = 0;
  let slotsLeft = linesPerPage;
  while (slotsLeft > 0) {
    const textRun = Math.min(slotsLeft, jittered(tb, j, rand, 1));
    for (let k = 0; k < textRun; k++) {
      slotLines.push(lines.length);
      lines.push('');
      if (useIndents) {
        const level = indentLevels[Math.floor(rand() * indentLevels.length)];
        slotIndents.push(' '.repeat(level));
      } else {
        slotIndents.push('');
      }
    }
    slotsLeft -= textRun;
    if (cb > 0 && slotsLeft > 0) {
      const codeRun = jittered(cb, j, rand, 1);
      for (let k = 0; k < codeRun; k++) {
        lines.push(src[snip % src.length]);
        snip++;
      }
    }
  }
  slotLines.push(lines.length);
  lines.push('');
  slotIndents.push('');
  return { content: lines.join('\n'), slotLines, slotIndents };
}
