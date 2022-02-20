import type { ConnectTlsOptions } from "./types.ts";
import { BufReader, TextProtoReader } from "../deps.ts";
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
    this.name = name || "";
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
  options?: dialOptions;
  conn?: textproto.Conn;
  netConn?: Deno.Conn; // underlying network connection
  host?: string;
  // Server capabilities discovered at runtime
  features?: Map<string, string>;
  skipEPSV?: boolean;
  mlstSupported?: boolean;
  mfmtSupported?: boolean;
  mdtmSupported?: boolean;
  mdtmCanWrite?: boolean;
  usePRET?: boolean;
  list(_path: string): Entry[] {
    // TODO: implement
    return [];
  }
  quit() {
  }
}

export class DialOption {
  setup(_config: dialOptions) {
  }
}
export class dialOptions {
  tlsConfig?: ConnectTlsOptions;
  explicitTLS?: boolean;
  conn?: Deno.Conn;
  disableEPSV?: boolean;
  disableUTF8?: boolean;
  disableMLSD?: boolean;
  writingMDTM?: boolean;
  location?: string;
  debugOutput?: Deno.Writer;
  shutTimeout?: number; //time.Duration
  wrapConn(conn: Deno.Conn): BufReader {
    return new BufReader(conn);
  }
  async dialFunc(_protocol: string, addr: string) {
    this.conn = await Deno.connect({
      hostname: addr,
      port: 21,
    });
  }
}

export class Response {
  conn?: Deno.Conn;
  c?: ServerConn;
  closed?: boolean;
}

export async function Dial(
  addr: string,
  options?: DialOption,
): Promise<ServerConn | null> {
  const _do = new dialOptions();
  if (options) {
    options.setup(_do);
  }

  if (!_do.location) {
    _do.location = new Date().toUTCString();
  }

  let tconn = _do.conn;
  if (tconn === undefined) {
    await _do.dialFunc("tcp", addr);
  }

  const remoteAddr = tconn?.remoteAddr;
  const c = new ServerConn();
  c.options = _do;
  c.features = new Map();
  c.conn = new textproto.Conn(_do.wrapConn(tconn as Deno.Conn));
  c.netConn = tconn;
  // c.host = remoteAddr?.ip.toString();
  const code = await c.conn.readLine();
  if (code === null) {
    await c.quit();
    throw new Error("EOF");
  }

  if (_do.explicitTLS) {
    const auth = await c.authTLS();
    if (!auth) {
      await c.quit();
      return null;
    }
    tconn = await Deno.connectTls(_do.tlsConfig || { port: 21 });
    // tconn = tls.client(tconn, _do.tlsConfig)
    c.conn = new TextProtoReader(_do.wrapConn(tconn));
  }

  return c;
}
