import { Entry } from './Ftp.ts';

export interface Item {
  path: string;
  entry: Entry;
  err?: Error;
}

export interface ConnectTlsOptions {
  caCerts?: string[];
  certFile?: string;
  hostname?: string;
  port: number;
}