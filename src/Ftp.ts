import { ConnectTlsOptions, parseListLine, parseRFC3659ListLine, StatusCode } from "../mod.ts";
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
  options: DialOptions;
  conn: TextProtoReader;
  netConn: Deno.Conn; // underlying network connection
  host: string
  features: { [name: string]: string }; // Server capabilities discovered at runtime

  skipEPSV = false;
  mlstSupported = false;
  mfmtSupported = false;
  mdtmSupported = false;
  mdtmCanWrite = false;
  usePRET = false;

  constructor(
    options: DialOptions,
    conn: TextProtoReader,
    netConn: Deno.Conn,
    host: string
    features: { [name: string]: string },
  ) {
    this.options = options
    this.conn = conn
    this.netConn = netConn
    this.host = host
    this.features = features
  }

  cmd(expected: number, format: string, ...args: unknown[]) {
    this.conn.cmd(format, args)
    return this.conn.readResponse(expected)
  }

  login(user: string, password: string) {
    const { code, message } = this.cmd(-1, "USER %s", user)

    switch (code) {
      case StatusCode.StatusLoggedIn:
      case StatusCode.StatusUserOK:
        this.cmd(StatusCode.StatusLoggedIn, "PASS %s", password)
      default:
      // throw new Error(message)
    }

    // Probe features
    this.feat()
    if (this.features["MLST"] && !this.options.disableMLSD) {
      this.mlstSupported = true
    }
    this.usePRET = !!this.features["PRET"]

    this.mfmtSupported = !!this.features["MFMT"]
    this.mdtmSupported = !!this.features["MDTM"]
    this.mdtmCanWrite = this.mdtmSupported && this.options.writingMDTM

    // Switch to binary mode
    this.cmd(StatusCode.StatusCommandOK, "TYPE I")

    // Switch to UTF-8
    if (!this.options.disableUTF8) {
      this.setUTF8()
    }

    // If using implicit TLS, make data connections also use TLS
    if (this.options.tlsConfig) {
      this.cmd(StatusCode.StatusCommandOK, "PBSZ 0")
      this.cmd(StatusCode.StatusCommandOK, "PROT P")
    }
  }

  setUTF8() {
    if (!this.features["UTF8"]) {
      return
    }

    const { code, message } = this.cmd(-1, "OPTS UTF8 ON")

    // Workaround for FTP servers, that does not support this option.
    if (
      code == StatusCode.StatusBadArguments ||
      code == StatusCode.StatusNotImplementedParameter
    ) {
      return
    }

    // The ftpd "filezilla-server" has FEAT support for UTF8, but always returns
    // "202 UTF8 mode is always enabled. No need to send this command." when
    // trying to use it. That's OK
    if (code == StatusCode.StatusCommandNotImplemented) {
      return
    }

    if (code != StatusCode.StatusCommandOK) {
      throw new Error(message)
    }
  }

  feat() {
    const { code, message } = this.cmd(-1, "FEAT")

    if (code != StatusCode.StatusSystem) {
      // The server does not support the FEAT command. This is not an
      // error: we consider that there is no additional feature.
      return
    }

    const lines = (message as string).split("\n")
    for (let line of lines) {
      if (!line.startsWith(" ")) {
        continue
      }

      line = line.trim()
      const featureElements = line.split(" ", 2)
      const command = featureElements[0]
      let commandDesc = ""
      if (featureElements.length == 2) {
        commandDesc = featureElements[1]
      }

      this.features[command] = commandDesc
    }
  }

  epsv(): number {
    const line = this.cmd(StatusCode.StatusExtendedPassiveMode, "EPSV")

    const start = line.indexOf("|||")
    const end = line.lastIndexOf("|")
    if (start == -1 || end == -1) {
      throw new Error("invalid EPSV response format")
    }

    return parseInt(line.slice(start + 3, end))
  }

  pasv(): { host: string, port: number } {
    const line = this.cmd(StatusCode.StatusPassiveMode, "PASV")

    // PASV response format : 227 Entering Passive Mode (h1,h2,h3,h4,p1,p2).
    const start = line.indexOf("(")
    const end = line.lastIndexOf(")")
    if (start == -1 || end == -1) {
      throw new Error("invalid PASV response format")
    }

    // We have to split the response string
    const pasvData = line.slice(start + 1, end).split(",")

    if (pasvData.length < 6) {
      throw new Error("invalid PASV response format")
    }

    // Let's compute the port number
    const portPart1 = parseInt(pasvData[4])

    const portPart2 = parseInt(pasvData[5])

    // Recompose port
    const port = portPart1 * 256 + portPart2

    // Make the IP address to connect to
    const host = pasvData.slice(0, 4).join(".")
    return { host, port }
  }

  getDataConnPort(): { host: string, port: number } {
    if (!this.options.disableEPSV && !this.skipEPSV) {
      try {
        const port = this.epsv()
        return { host: this.host, port }
      } catch (e) {
        // if there is an error, skip EPSV for the next attempts
        this.skipEPSV = true
      }
    }

    return this.pasv()
  }

  openDataConn(): Promise<Deno.Conn> {
    const { host, port } = this.getDataConnPort() as { host: string, port: number }

    const addr = `${host}:${port.toString()}`
    if (this.options.dialFunc) {
      return this.options.dialFunc("tcp", addr)
    }

    if (this.options.tlsConfig) {
      const conn = this.options.dialer.dial("tcp", addr)
      return Deno.startTls(conn, this.options.tlsConfig)
    }

    return this.options.dialer.Dial("tcp", addr)
  }

  // cmdDataConnFrom executes a command which require a FTP data connection.
  // Issues a REST FTP command to specify the number of bytes to skip for the transfer.
  cmdDataConnFrom(offset: number, format: string, ...args: unknown[]): Deno.Conn {
    // If server requires PRET send the PRET command to warm it up
    // See: https://tools.ietf.org/html/draft-dd-pret-00
    if (this.usePRET) {
      this.cmd(-1, "PRET " + format, args)
    }

    const conn = await this.openDataConn()

    if (offset != 0) {
      try {
        this.cmd(StatusCode.StatusRequestFilePending, "REST %d", offset)
      } catch (e) {
        conn.close()
        throw e
      }
    }

    try {
      this.conn.cmd(format, args)
    } catch (e) {
      conn.close()
      throw e
    }

    let code, message
    try {
      ({ code, message } = this.conn.ReadResponse(-1))
    } catch (e) {
      conn.close()
      throw e
    }

    if (
      code != StatusCode.StatusAlreadyOpen &&
      code != StatusCode.StatusAboutToSend
    ) {
      conn.close()
      throw new Error(code, message)
    }

    return conn
  }

  nameList(path: string): string[] {
    let space = " "
    if (path == "") {
      space = ""
    }
    const conn = this.cmdDataConnFrom(0, "NLST%s%s", space, path)

    const r = new Response(conn, this)
    try {
      const scanner = new BufReader(this.options.wrapStream(r))
      let entries = []
      while (scanner.readString(`\n`)) {
        const string = await scanner.readString(`\n`)
        if (!string) break
        entries.push(string.slice(0, -1))
      }

      return entries
    } catch (e) {
      r.close()
      throw e
    }
  }

  list(path: string): Entry[] {
    let cmd
    let parser

    if (this.mlstSupported) {
      cmd = "MLSD"
      parser = parseRFC3659ListLine
    } else {
      cmd = "LIST"
      parser = parseListLine
    }

    let space = " "
    if (path == "") {
      space = ""
    }
    const conn = this.cmdDataConnFrom(0, "%s%s%s", cmd, space, path)

    const r = new Response(conn, this)
    try {
      const scanner = new BufReader(this.options.wrapStream(r))
      const now = new Date(Date.now())
      let entries = []
      while (true) {
        const string = await scanner.readString(`\n`)
        if (!string) break
        const entry = parser(string, now, this.options.location!)!
        entries.push(entry)
      }

      return entries
    } catch (e) {
      r.close()
      throw e
    }
  }

  authTLS() {
    this.cmd(StatusCode.StatusAuthOK, "AUTH TLS")
  }

  quit() {
    this.conn.cmd("QUIT")
    this.conn.close()
  }
}

export interface DialOption {
  setup: (options: DialOptions) => void
}

export class DialOptions {
  tlsConfig?: ConnectTlsOptions;
  explicitTLS?: boolean;
  conn?: Deno.Conn;
  disableEPSV = false;
  disableUTF8 = false;
  disableMLSD = false;
  writingMDTM = false;
  location?: string;
  debugOutput?: Deno.Writer;
  shutTimeout?: number; //time.Duration
  dialFunc?: (network: string, adddress: string) => Promise<Deno.Conn>

  wrapConn(conn: Deno.Conn): BufReader {
    return new BufReader(conn);
  }
}

export class Response {
  conn: Deno.Conn;
  c: ServerConn;
  closed = false;

  constructor(conn: Deno.Conn, c: ServerConn) {
    this.conn = conn
    this.c = c
  }

  close() {
    if (this.closed) return
    this.conn.close()
    this.c.checkDataShut()
    this.closed = true
  }
}

export async function dial(addr: string, options?: DialOption): Promise<ServerConn> {
  const dialOptions = new DialOptions();
  if (options) {
    options.setup(dialOptions);
  }

  if (!dialOptions.location) {
    dialOptions.location = new Date().toUTCString();
  }

  let tconn = dialOptions.conn;
  if (!tconn) {
    if (dialOptions.dialFunc) {
      tconn = await dialOptions.dialFunc("tcp", addr)
    } else if (dialOptions.tlsConfig && !dialOptions.explicitTLS) {
      tconn = await Deno.connectTls(dialOptions.tlsConfig)
    } else {
      const url = new URL(addr)
      tconn = await Deno.connect({
        hostname: url.hostname,
        port: parseInt(url.port),
        transport: "tcp"
      })
    }
  }

  const c = new ServerConn(
    dialOptions,
    new TextProtoConn(dialOptions.wrapConn(tconn as Deno.Conn)),
    tconn,
    "" //TODO: fix?
    {},
  );

  try {
    await c.conn.readResponse();
  } catch (e) {
    c.quit()
    throw e
  }

  if (dialOptions.explicitTLS) {
    Deno.startTls
    try {
      await c.authTLS();
    } catch (e) {
      c.quit()
      throw e
    }
    tconn = await Deno.startTls(tconn, dialOptions.tlsConfig);
    c.conn = new TextProtoReader(dialOptions.wrapConn(tconn));
  }

  return c;
}

export function dialWithTimeout(timeout: number): DialOption {
  return {
    setup: (dialOptions: DialOptions) => dialOptions.dialer.Timeout = timeout
  }
}
