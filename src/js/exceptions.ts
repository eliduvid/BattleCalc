export class IllegalArgument extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = 'IllegalArgument';
    }

    static check(condition:boolean, message:string) {
        if (!condition) throw new IllegalArgument(message)
    }
}

export class IllegalState extends Error {
    constructor(msg:string) {
        super(msg);
        this.name = 'IllegalState';
    }

    static check(condition:boolean, message:string) {
        if (!condition) throw new IllegalState(message)
    }
}

export class ParseException extends Error {
    constructor(msg, readonly line: number) {
        super(`(on line ${line + 1}) ${msg}`);
        this.name = 'ParseException';
    }

    static check(condition: any, message: string, line: number) {
        if (!condition) throw new ParseException(message, line)
    }
}