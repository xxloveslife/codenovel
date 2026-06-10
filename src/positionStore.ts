import { Position } from './book';

export interface ReadingState {
  bookPath: string;
  position: Position;
}

/** vscode.Memento 的最小结构子集，便于脱离 vscode 单测 */
export interface KeyValueStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

const KEY = 'stealthReader.state';

export class PositionStore {
  constructor(private store: KeyValueStore) {}

  async save(state: ReadingState): Promise<void> {
    await this.store.update(KEY, state);
  }

  load(): ReadingState | null {
    const state = this.store.get<ReadingState>(KEY);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  async clear(): Promise<void> {
    await this.store.update(KEY, undefined);
  }
}
