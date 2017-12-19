import {Runtime} from "./runtime";

export class AffectingType {
    protected constructor(readonly register?: string) {
    };

    private static _writeRegistersCache: { [index: string]: AffectingType; } = {};

    public static getWriteForRegister(register: string): AffectingType {
        if (!this._writeRegistersCache.hasOwnProperty(register)) {
            this._writeRegistersCache[register] = new AffectingType(register);
        }
        return this._writeRegistersCache[register];
    }

    private static _readRegistersCache: { [index: string]: AffectingType; } = {};

    public static getReadForRegister(register: string): AffectingType {
        if (!this._readRegistersCache.hasOwnProperty(register)) {
            this._readRegistersCache[register] = new AffectingType(register);
        }
        return this._readRegistersCache[register];
    }

    static readonly READ_STACK = new AffectingType();
    static readonly WRITE_STACK = new AffectingType();
    static readonly READ_INPUT = new AffectingType();
    static readonly WRITE_OUTPUT = new AffectingType();
    static readonly JUMP = new AffectingType();
}

export const enum ArgumentType {
    REGISTER,
    LABEL
}

export interface Command {
    run(runtime: Runtime): Promise<void>;

    readonly affecting: ReadonlyArray<AffectingType>;
    readonly isLabel: boolean;
}

export class CommandFactory<T extends Command> {
    constructor(readonly c: { // noinspection JSUnusedLocalSymbols
        new(...arg: string[]): T }, readonly argumentsTypes: ReadonlyArray<ArgumentType>) {
    }

    create(...arg): T {
        return new this.c(...arg);
    }
}

export class EmptyCommand implements Command {
    public constructor(){}

    readonly affecting: ReadonlyArray<AffectingType> = [];
    readonly isLabel: boolean = false;

    async run(runtime: Runtime): Promise<void> {
    }

    static readonly factory: CommandFactory<EmptyCommand> = new CommandFactory<EmptyCommand>(EmptyCommand, []);
}

export class Label implements Command {
    public constructor(readonly name:string){}

    readonly affecting: ReadonlyArray<AffectingType> = [];
    readonly isLabel: boolean = true;

    async run(runtime: Runtime): Promise<void> {
    }

    static readonly factory: CommandFactory<Label> = new CommandFactory<Label>(Label, [ArgumentType.LABEL]);
}