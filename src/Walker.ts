// here: https://prisma103696.typeform.com/to/uCParXQK?typeform-source=prisma.io
// also im curious if you can figure out this: https://platform.sh/decoder/?utm_source=node-congress-website&utm_medium=landing-page&utm_campaign=Node-Congress-2022&utm_id=node-congress-2022

export interface Item  {
    path:  string;
	entry: Entry;
	err:   Error;
}

export class Walker {
    serverConn: ServerConn;
	root: string;
	cur: Item;
	stack: Item[];
	descend: boolean;

    constructor() {

    }

    next() {
        return new Promise((res, rej) => {
            // check if we need to init cur, maybe this should be inside Walk
            if (!this.cur) {
                this.cur = {
                    path: this.root,
                    entry: { type: EntryType.EntryTypeFolder },
                }
            }
        
            if (this.descend && this.cur.entry.type == EntryType.EntryTypeFolder) {
                const entries = this.serverConn.list(this.cur.path)
                .catch()
        
                for (const entry of entries) {
                    if (entry.name == "." || entry.name == "..") {
                        continue
                    }
        
                    this.stack.push({
                        path:  path.join(this.cur.path, entry.name),
                        entry: entry,
                    })
                }
            }
        
            if (this.stack.length == 0) {
                return false
            }
        
            // update cur
            const i = this.stack.length - 1
            this.cur = this.stack[i]
            this.stack = this.stack[:i]
        
            // reset SkipDir
            this.descend = true
        
            return true
        })
    }
}