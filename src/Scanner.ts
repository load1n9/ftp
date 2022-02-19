export class Scanner {
  bytes: string;
  position = 0;

  constructor(str: string) {
    this.bytes = str;
  }

  nextFields(count: number) {
    const fields = new Array(count);

    for (let i = 0; i < count; i++) {
      const field = this.next();
      if (field != "") {
        fields[i] = field;
      } else {
        break;
      }
    }
  }

  next() {
    const len = this.bytes.length;

    while (this.position < len) {
      if (this.bytes[this.position] != " ") {
        break;
      }
      this.position++;
    }

    const start = this.position;

    while (this.position < len) {
      if (this.bytes[this.position] == " ") {
        this.position++;
        return this.bytes.slice(start, this.position - 1);
      }
      this.position++;
    }

    return this.bytes.slice(start, this.position);
  }

  remaining() {
    return this.bytes.slice(this.position, this.bytes.length);
  }
}
