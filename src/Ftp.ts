
const _timeFormat = "20060102150405";

export enum EntryType {
  File,
  Folder,
  Symlink,
}
export class Entry {
  name: string;
  target?: string;
  type?: EntryType;
  size?: number;
  time?: Date;
  constructor(name?: string) {
    this.name = name || '';
  }
  setSize(size: string): void {
    this.size = Number(size);
  }
  setTime(fields: string[] | string, now: Date, _loc: string): void {
    if (fields[2].includes(":")) {
      const thisYear = now.getFullYear();
      const timeStr = `${fields[1]} ${fields[0]} ${thisYear} ${fields[2]}`;
      this.time = new Date(timeStr);
      if (
        this.time.getTime() > now.getTime() + (1000 * 60 * 60 * 24 * 365 * 6)
      ) {
        this.time.setFullYear(this.time.getFullYear() - 1);
      }
      return;
    }
    if (fields[2].length != 4) {
      throw new Error("Unsupported list date");
    }
    const timeStr = `${fields[1]} ${fields[0]} ${fields[2]} 00:00`;
    this.time = new Date(timeStr);
  }
}

export class ServerConn {
  list(_path: string): Entry[] {
    // TODO: implement
    return []
  }
}

export class DialOption {
  constructor(_config: dialOptions) {
  }
}
export class dialOptions {
}
