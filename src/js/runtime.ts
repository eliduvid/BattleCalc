import {IllegalArgument, IllegalState} from "./exceptions";
import {Command, Label} from "./commands";

class Register {
    private _value: number;

    constructor(readonly name: string) {
    }

    get value() {
        return this._value;
    }

    set value(value: number) {
        IllegalArgument.check(Number.isInteger(value), `Value of register ${this.name} must be integral, not ${value}`);
        this._value = value;
    }
}

export class Queue {
    protected _queue: number[] = [];

    constructor(...values: number[]) {
        values.forEach(v => this.push(v));
    }

    push(...values: number[]): void {
        values.forEach(value => {
            IllegalArgument.check(Number.isInteger(value), `value in queue must be integer, not ${value}`);
            this._queue.push(value)
        });
    }

    pop(): number {
        return this._queue.shift()
    }

    hasValues(): boolean {
        return this._queue.length !== 0;
    }

    isEmpty(): boolean {
        return this._queue.length === 0;
    }

    get array(): ReadonlyArray<number> {
        return this._queue;
    }

    clear() {
        this._queue = [];
    }
}

export class Stack extends Queue{
    pop(): number {
        return this._queue.pop()
    }

    push(value: number): void {
        IllegalArgument.check(Number.isInteger(value), `value in stack must be integer, not ${value}`);
        this._queue.push(value)
    }
}

export class Input {
    constructor(private valueSupplier: () => Promise<number>) {
    }

    async getValue(): Promise<number>{
        let value = await this.valueSupplier();
        IllegalState.check(Number.isInteger(value), `input function supplied non-integer value ${value}.`);
        return value;
    }
}

export class Output {
    constructor(private callback: (value: number) => any) {
    }

    out(value: number) {
        this.callback(value)
    }
}


export class CommandRuntime {
    private labelsIndex: { [label: string]: number } = {};
    private _activeCommandIndex: number = 0;

    constructor(private commands: ReadonlyArray<Command|Label>) {
        this.commands.forEach((command, index) => {
            if (command.isLabel) {
                this.labelsIndex[(<Label>command).name] = index;
            }
        });
        this.skipEmpty();
    }

    get activeCommand(): Command {
        return <Command>this.commands[this._activeCommandIndex]
    }

    get activeCommandIndex(): number {
        return this._activeCommandIndex;
    }

    goToLabel(name: string) {
        IllegalArgument.check(this.labelsIndex.hasOwnProperty(name), `there is no label named ${name}`);
        this._activeCommandIndex = this.labelsIndex[name];
    }

    isRunning(): boolean {
        return this.activeCommandIndex < this.commands.length;
    }

    async executeCurrentCommand(runtime: Runtime) {
        IllegalState.check(this.isRunning(), "trying to execute command of finalized runtime");
        let activeCommand = this.activeCommand;
        await activeCommand.run(runtime);
        // If command not jumped (see Jmp and Jnz)
        if (this.activeCommand === activeCommand) {
            this._activeCommandIndex++;
        }
        this.skipEmpty();
    }

    async executeAll(runtime: Runtime, stepCallback: (runtime: Runtime) => Promise<any>) {
        await stepCallback(runtime);
        while (this.isRunning()) {
            await this.executeCurrentCommand(runtime);
            await stepCallback(runtime);
        }
    }

    finish() {
        this._activeCommandIndex = this.commands.length;
    }

    private skipEmpty() {
        while (this.isRunning() && this.activeCommand.affecting.length === 0) {
            this._activeCommandIndex++;
        }
    }
}

export class Runtime {
    private registers: { [name: string]: Register } = {};
    readonly stack: Stack = new Stack();

    constructor(readonly commandRuntime: CommandRuntime, readonly stdin: Input, readonly stdout: Output, registers: ReadonlyArray<string>) {
        this.createRegisters(registers)
    }

    private createRegisters(names: ReadonlyArray<string>) {
        names.forEach(value => this.registers[value] = new Register(value));
    }

    get registersNames(): string[] {
        return Object.keys(this.registers);
    }

    hasRegister(name) {
        return this.registers.hasOwnProperty(name);
    }

    getRegisterByName(name) {
        IllegalArgument.check(this.hasRegister(name), `there is no register named ${name}`);
        return this.registers[name];
    }

    async executeCurrentCommand(): Promise<void>{
        await this.commandRuntime.executeCurrentCommand(this);
    }

    async executeAll(stepCallback: (runtime: Runtime) => Promise<any>): Promise<void> {
        await this.commandRuntime.executeAll(this, stepCallback);
    }
}

export class CommandEditor {
    private _commands: Command[] = [];

    constructor(readonly registersNames: ReadonlyArray<string>) {
    }

    hasRegister(name): boolean {
        return this.registersNames.indexOf(name) !== -1;
    }

    addCommands(...commands: Command[]) {
        this.insertCommands(this._commands.length, ...commands);
    }

    insertCommands(toIndex: number, ...commands: Command[]) {
        this._commands.splice(toIndex, 0, ...commands);
    }

    removeCommands(fromIndex: number=0, quantity: number=this._commands.length) {
        this._commands.splice(fromIndex, quantity);
    }

    moveCommands(fromIndex:number, quantity:number, toIndex:number) {
        this._commands.splice(toIndex, 0, ...this._commands.splice(fromIndex, quantity));
    }

    get commands(): ReadonlyArray<Command> {
        return this._commands;
    }

    execute(outputCallback: (value: number) => any, inputSupplier: () => Promise<number>) {
        return new Runtime(new CommandRuntime(this.commands), new Input(inputSupplier),
            new Output(outputCallback), this.registersNames);
    }
}