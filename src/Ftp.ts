export enum EntryType {
  File,
  Folder,
  Symlink,
}
export class Entry {
  name?: string;
  target?: string;
  type?: EntryType;
  size?: number | string;
  time?: Date;
  constructor(name?: string) {
    this.name = name;
  }
  setSize(size: number | string): void {
    if (size < 0) {
      throw new Error(`invalid size: ${size}`);
    }
    this.size = size;
  }
}
const timeFormat = "20060102150405";

export class ServerConn {

}

export class DialOption {
  constructor(config: dialOptions) {
  }
}
export class dialOptions {
}
