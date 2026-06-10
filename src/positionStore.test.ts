import { describe, it, expect } from 'vitest';
import { PositionStore, KeyValueStore } from './positionStore';

class FakeStore implements KeyValueStore {
  private m = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.m.get(key) as T | undefined;
  }
  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) this.m.delete(key);
    else this.m.set(key, value);
  }
}

describe('PositionStore', () => {
  it('保存后能读回，clear 后为空', async () => {
    const store = new PositionStore(new FakeStore());
    expect(store.load()).toBeNull();

    const state = {
      bookPath: 'C:/books/a.epub',
      position: { chapterIndex: 2, charOffset: 99 },
    };
    await store.save(state);
    expect(store.load()).toEqual(state);

    await store.clear();
    expect(store.load()).toBeNull();
  });

  it('覆盖保存返回最新值，且 load 返回防御性拷贝', async () => {
    const store = new PositionStore(new FakeStore());
    await store.save({ bookPath: 'a', position: { chapterIndex: 0, charOffset: 1 } });
    await store.save({ bookPath: 'b', position: { chapterIndex: 1, charOffset: 2 } });
    const loaded = store.load()!;
    expect(loaded.bookPath).toBe('b');
    loaded.position.charOffset = 999;
    expect(store.load()!.position.charOffset).toBe(2);
  });
});
