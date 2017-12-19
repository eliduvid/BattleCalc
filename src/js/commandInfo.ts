import {Command, CommandFactory} from "./commands";

export default class CommandInfo<T extends Command> {
    private _description: string;

    public constructor(readonly regex: RegExp,
                        readonly factory: CommandFactory<T>,
                        readonly splitFunc: (line: string) => string[],
                        readonly name: string) {
    }

    static fromFactoryAndName <V extends Command> (factory: CommandFactory<V>, name: string) {
        return new CommandInfo(new RegExp(`^${name}.*`, 'i'), factory, CommandInfo.defaultSplitFunc, name);
    }

    /**
     * Input line must be trimmed
     */
    private static defaultSplitFunc(line: string): string[] {
        return line.split(/\s+/).slice(1);
    }

    get description(): string {
        return this._description;
    }

    setDescription(value: string): CommandInfo<T> {
        this._description = value;
        return this;
    }
}