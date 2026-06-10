export interface FakeLayout {
  /** 虚拟文档全文（假代码行 + 空槽位行） */
  content: string;
  /** 第 i 个正文槽位对应的文档行号；最后一个槽位留给页码指示 */
  slotLines: number[];
}

/** 内置伪装片段：按顺序循环，连续几行也像一段真代码 */
export const DEFAULT_SNIPPETS = [
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

/**
 * 生成伪装文档布局：每个正文槽位前按 ratio 累积预算插入代码行（Bresenham 式），
 * 布局对相同入参完全确定，保证翻页时代码骨架稳定不跳动。
 */
export function buildFakeLayout(
  linesPerPage: number,
  ratio: number,
  snippets: string[]
): FakeLayout {
  const src = snippets.length > 0 ? snippets : DEFAULT_SNIPPETS;
  const safeRatio = Math.min(3, Math.max(0, ratio));
  const lines: string[] = [];
  const slotLines: number[] = [];
  let budget = 0;
  let snip = 0;
  for (let i = 0; i < linesPerPage; i++) {
    budget += safeRatio;
    while (budget >= 1) {
      lines.push(src[snip % src.length]);
      snip++;
      budget -= 1;
    }
    slotLines.push(lines.length);
    lines.push('');
  }
  slotLines.push(lines.length);
  lines.push('');
  return { content: lines.join('\n'), slotLines };
}
