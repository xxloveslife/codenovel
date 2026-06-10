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
});
