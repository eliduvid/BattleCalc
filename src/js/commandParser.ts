import {ParseException} from "./exceptions";
import {ArgumentType, Command} from "./commands";
import CommandInfo from "./commandInfo";

export default class CommandParser {
    constructor(private commandIndex: ReadonlyArray<CommandInfo<Command>>) {
    }

    parseLine(line: string, lineNumber: number): Command {
        let normalizedLine = line.replace(/;.*$/, '').trim();
        let commandInfo = this.commandIndex.find(command => command.regex.test(normalizedLine));
        ParseException.check(commandInfo, `unknown command in line "${normalizedLine}"`, lineNumber);
        let arg = commandInfo.splitFunc(normalizedLine);
        ParseException.check(arg.length === commandInfo.factory.argumentsTypes.length,
            `${arg.length > commandInfo.factory.argumentsTypes.length ? "too many" : "not enough"} arguments for command "${commandInfo.name}"`, lineNumber);
        CommandParser.checkArguments(arg, commandInfo.factory.argumentsTypes, lineNumber);
        return commandInfo.factory.create(...CommandParser.normalizeArgumentsCase(arg, commandInfo.factory.argumentsTypes));
    }

    parseText(text): Command[] {
        return text.split('\n').map(this.parseLine.bind(this))
    }

    /**
     * Input arrays must be same size.
     */
    private static checkArguments(arg: ReadonlyArray<string>, types: ReadonlyArray<ArgumentType>, lineNumber: number): void {
        arg.map((value, index) => {
            ParseException.check(types[index] !== ArgumentType.LABEL || value.startsWith("."), 'labels references must start with .(dot)', lineNumber);
        });
    }

    /**
     * Input arrays must be same size.
     */
    private static normalizeArgumentsCase(arg: ReadonlyArray<string>, types: ReadonlyArray<ArgumentType>): string[] {
        return arg.map((value, index) => types[index] === ArgumentType.REGISTER ? value.toUpperCase() : value);
    }
}