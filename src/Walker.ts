import { Entry, EntryType, ServerConn } from "./Ftp.ts";
import * as Path from "https://deno.land/std@0.126.0/path/mod.ts";
import type { Item } from "./types.ts";

export class Walker {
  #serverConn: ServerConn;
  #root: string;
  #cur: Item | null;
  #stack: Item[];
  #descend: boolean;

  constructor(serverConn: ServerConn, root: string) {
    this.#serverConn = serverConn;
    this.#root = root;
    this.#cur = null;
    this.#stack = [];
    this.#descend = false;
  }

  next(): boolean {
    if (this.#cur == null) {
      const _e = new Entry();
      _e.type = EntryType.Folder;
      this.#cur = {
        path: this.#root,
        entry: _e,
      };
    }

    if (this.#descend && this.#cur.entry.type == EntryType.Folder) {
      const entries = this.#serverConn.list(this.#cur.path);

      // an error occurred, drop out and stop walking
      if (entries == null) {
        this.#cur.err = entries;
        return false;
      }

      for (const entry of entries) {
        if (entry.name == "." || entry.name == "..") {
          continue;
        }

        const item: Item = {
          path: Path.join(this.#cur.path, entry.name),
          entry: entry,
        };

        this.#stack.push(item);
      }
    }
    if (this.#stack.length == 0) {
      return false;
    }
    const i = this.#stack.length - 1;
    this.#cur = this.#stack[i];
    this.#stack = this.#stack.slice(0, i);
    this.#descend = true;
    return true;
  }

  skipDir(): void {
    this.#descend = false;
  }

  err() {
    return this.#cur?.err;
  }

  stat(): Entry | undefined {
    return this.#cur?.entry;
  }

  path() {
    return this.#cur?.path;
  }
}
