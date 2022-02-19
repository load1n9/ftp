import { EntryType, Entry } from './Ftp.ts';

const listLineParsers = [
    parseRFC3659ListLine,
    parseLsListLine,
    parseDirListLine,
    parseHostedFTPLine,
];

const dirTimeFormats = [
    '01-02-06  03:04PM',
    '2006-01-02  15:04',
];

function parseRFC3659ListLine(line: string, now: Date, loc: string): Entry | null {
    const iSemicolon = line.indexOf(';');
    const iWhitespace = line.indexOf(' ');
    if (iSemicolon < 0 || iSemicolon > iWhitespace) {
        return null;
    }
    const e = new Entry();
    for (const field of line.split(';')) {
        const i = field.indexOf('=');
        if (i < 1) {
            return null;
        }
        const key = field.substring(0, i).toLowerCase();
        const value = field.substring(i + 1);
        switch (key) {
            case 'modify': {
                e.time = new Date();
                break;
			}
            case 'type':
                switch (value) {
                    case 'dir':
                        e.type = EntryType.Folder;
                        break;
                    case 'cdir':
                        e.type = EntryType.Folder;
                        break;
                    case 'pdir':
                        e.type = EntryType.Folder;
                        break;
                    case 'file':
                        e.type = EntryType.File;
                        break;
                }
                break;
            case 'size': {
                e.setSize(value);
                break;
			}
        }
    }
    e.name = line.substring(iWhitespace + 1);
    return e;
}
function parseLsListLine(line: string, now: Date, loc: string): Entry | null {
    const iWhitespace = line.indexOf(' ');
    if (iWhitespace == -1) {
        return null;
    }
    const e = new Entry();
    if (line[iWhitespace - 1] == 'd') {
        e.type = EntryType.Folder;
        line = line.substring(0, iWhitespace - 1);
    } else {
        e.type = EntryType.File;
    }
    const space = line.indexOf(' ');
    if (space == -1) {
        return null;
    }
    e.size = parseInt(line.substring(space + 1), 10);
    if (isNaN(e.size)) {
        return null;
    }
    line = line.substring(0, space);
    const i = line.lastIndexOf(' ');
    if (i == -1) {
        return null;
    }
    e.name = line.substring(i + 1);
    if (e.name.length == 0) {
        return null;
    }
    if (e.name[e.name.length - 1] == '/') {
        e.name = e.name.substring(0, e.name.length - 1);
        e.type = EntryType.Folder;
    }
    const err = e.setTime(line.substring(0, i), now, loc);
    if (err) {
        return null;
    }
    return e;
}
function parseDirListLine(line: string, now: Date, loc: string): Entry | null {
    let i = line.indexOf(' ');
    if (i == -1) {
        return null;
    }
    const e = new Entry();
    if (line[i + 1] == 'd') {
        e.type = EntryType.Folder;
        line = line.substring(0, i + 1);
    } else {
        e.type = EntryType.File;
    }
    const space = line.indexOf(' ');
    if (space == -1) {
        return null;
    }
    e.size = parseInt(line.substring(space + 1), 10);
    if (isNaN(e.size)) {
        return null;
    }
    line = line.substring(0, space);
    i = line.lastIndexOf(' ');
    if (i == -1) {
        return null;
    }
    e.name = line.substring(i + 1);
    if (e.name.length == 0) {
        return null;
    }
    if (e.name[e.name.length - 1] == '/') {
        e.name = e.name.substring(0, e.name.length - 1);
        e.type = EntryType.Folder;
    }
    const err = e.setTime(line.substring(0, i), now, loc);
    if (err) {
        return null;
    }
    return e;
}
function parseHostedFTPLine(line: string, now: Date, loc: string): Entry | null{
    let i = line.indexOf(' ');
    if (i != 10 && (i != 11 || line[10] != '+')) {
        return null;
    }
    const e = new Entry();
    if (line[i - 1] == 'd') {
        e.type = EntryType.Folder;
        line = line.substring(0, i - 1);
    } else {
        e.type = EntryType.File;
    }
    const space = line.indexOf(' ');
    if (space == -1) {
        return null;
    }
    e.size = parseInt(line.substring(space + 1), 10);
    if (isNaN(e.size)) {
        return null;
    }
    line = line.substring(0, space);
    i = line.lastIndexOf(' ');
    if (i == -1) {
        return null;
    }
    e.name = line.substring(i + 1);
    if (e.name.length == 0) {
        return null;
    }
    if (e.name[e.name.length - 1] == '/') {
        e.name = e.name.substring(0, e.name.length - 1);
        e.type = EntryType.Folder;
    }
    const err = e.setTime(line.substring(0, i), now, loc);
    if (err) {
        return null;
    }
    return e;
}
export function parseListLine(line: string, now: Date, loc: string): Entry | null {
    for (const f of listLineParsers) {
        const e = f(line, now, loc);
        if (e) {
            return e;
        }
    }
    return null;
}

