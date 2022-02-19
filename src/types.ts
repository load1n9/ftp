import { Entry } from './Ftp.ts';

export interface Item {
  path: string;
  entry: Entry;
  err?: Error;
}
