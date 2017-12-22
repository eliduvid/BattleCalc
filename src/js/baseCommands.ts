import {AffectingType, ArgumentType, Command, CommandFactory, EmptyCommand, Label} from "./commands";
import {Runtime} from "./runtime";
import CommandInfo from "./commandInfo";

export class Push implements Command {
    isLabel: boolean = false;

    constructor(private register: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.stack.push(runtime.getRegisterByName(this.register).value);
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.register),
        AffectingType.WRITE_STACK
    ];

    static readonly factory: CommandFactory<Push> = new CommandFactory(Push, [
        ArgumentType.REGISTER
    ]);
}

export class Pop implements Command {
    isLabel: boolean = false;

    constructor(private register: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.register).value = runtime.stack.pop();
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.READ_STACK,
        AffectingType.getWriteForRegister(this.register)
    ];

    static readonly factory: CommandFactory<Pop> = new CommandFactory(Pop, [
        ArgumentType.REGISTER
    ]);
}

export class Mov implements Command {
    isLabel: boolean = false;

    constructor(private registerTo: string, private registerFrom: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.registerTo).value = runtime.getRegisterByName(this.registerFrom).value;
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.registerFrom),
        AffectingType.getWriteForRegister(this.registerTo)
    ];

    static readonly factory: CommandFactory<Mov> = new CommandFactory(Mov, [
        ArgumentType.REGISTER,
        ArgumentType.REGISTER
    ]);
}

export class Inc implements Command {
    isLabel: boolean = false;

    constructor(private register: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.register).value++;
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.register),
        AffectingType.getWriteForRegister(this.register)
    ];

    static readonly factory: CommandFactory<Inc> = new CommandFactory(Inc, [
        ArgumentType.REGISTER
    ]);
}

export class Dec implements Command {
    isLabel: boolean = false;

    constructor(private register: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.register).value--;
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.register),
        AffectingType.getWriteForRegister(this.register)
    ];

    static readonly factory: CommandFactory<Dec> = new CommandFactory(Dec, [
        ArgumentType.REGISTER
    ]);
}

export class Add implements Command {
    isLabel: boolean = false;

    constructor(private registerTo: string, private registerFrom: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.registerTo).value += runtime.getRegisterByName(this.registerFrom).value;
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.registerTo),
        AffectingType.getReadForRegister(this.registerFrom),
        AffectingType.getWriteForRegister(this.registerTo)
    ];

    static readonly factory: CommandFactory<Add> = new CommandFactory(Add, [
        ArgumentType.REGISTER,
        ArgumentType.REGISTER
    ]);
}

export class Sub implements Command {
    isLabel: boolean = false;

    constructor(private registerTo: string, private registerFrom: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.registerTo).value -= runtime.getRegisterByName(this.registerFrom).value;
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.registerTo),
        AffectingType.getReadForRegister(this.registerFrom),
        AffectingType.getWriteForRegister(this.registerTo)
    ];

    static readonly factory: CommandFactory<Sub> = new CommandFactory(Sub, [
        ArgumentType.REGISTER,
        ArgumentType.REGISTER
    ]);
}

export class Jmp implements Command {
    isLabel: boolean = false;

    constructor(private label: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.commandRuntime.goToLabel(this.label);
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.JUMP
    ];

    static readonly factory: CommandFactory<Jmp> = new CommandFactory(Jmp, [
        ArgumentType.LABEL
    ]);
}

export class Jnz implements Command {
    isLabel: boolean = false;

    constructor(private register: string, private label: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        if (runtime.getRegisterByName(this.register).value !== 0) {
            runtime.commandRuntime.goToLabel(this.label);
        }
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.register),
        AffectingType.JUMP
    ];

    static readonly factory: CommandFactory<Jnz> = new CommandFactory(Jnz, [
        ArgumentType.REGISTER,
        ArgumentType.LABEL
    ]);
}

export class Read implements Command {
    isLabel: boolean = false;

    constructor(private register: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.getRegisterByName(this.register).value = await runtime.stdin.getValue().catch((reason) => {
            if (console && console.log) console.log(`Input returned no value with error: ${reason.toString()}`);
            return runtime.getRegisterByName(this.register).value;
        });
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.READ_INPUT,
        AffectingType.getWriteForRegister(this.register)
    ];

    static readonly factory: CommandFactory<Read> = new CommandFactory(Read, [
        ArgumentType.REGISTER
    ]);
}

export class Print implements Command {
    isLabel: boolean = false;

    constructor(private register: string) {
    }

    async run(runtime: Runtime): Promise<void> {
        runtime.stdout.out(runtime.getRegisterByName(this.register).value);
    }

    affecting: ReadonlyArray<AffectingType> = [
        AffectingType.getReadForRegister(this.register),
        AffectingType.WRITE_OUTPUT
    ];

    static readonly factory: CommandFactory<Print> = new CommandFactory(Print, [
        ArgumentType.REGISTER
    ]);
}

export let commandIndex: ReadonlyArray<CommandInfo<Command>> = [
    new CommandInfo(/^\s*$/, EmptyCommand.factory, () => [], '<empty command>'),
    new CommandInfo(/^\.\s*.*/, Label.factory, line => line.trim().split(/\s+/), '. (label definition)').setDescription(`
    <b>.</b><i>label_name</i><br>
    Creates label with given (case sensitive) name that leads to this very spot.
    `),
    CommandInfo.fromFactoryAndName(Push.factory, 'PUSH').setDescription(`
    <b>PUSH</b> <i>register</i><br>
    Puts value from <i>register</i> to stack.
    `),
    CommandInfo.fromFactoryAndName(Pop.factory, "POP").setDescription(`
    <b>POP</b> <i>register</i><br>
    Gets value from stack and puts it into <i>register</i>.
    `),
    CommandInfo.fromFactoryAndName(Mov.factory, "MOV").setDescription(`
    <b>MOV</b> <i>registerTo registerFrom</i><br>
    Copies value from <i>registerFrom</i> to <i>registerTo</i>.
    `),
    CommandInfo.fromFactoryAndName(Inc.factory, "INC").setDescription(`
    <b>INC</b> <i>register</i><br>
    Increases value of <i>register</i> by one;
    `),
    CommandInfo.fromFactoryAndName(Dec.factory, "DEC").setDescription(`
    <b>DEC </b><i>register</i><br>
    Decreases value of <i>register</i> by one;
    `),
    CommandInfo.fromFactoryAndName(Add.factory, "ADD").setDescription(`
    <b>ADD </b><i>registerTo registerFrom</i><br>
    Adds value of <i>registerFrom</i> to <i>registerTo</i> and saves the result in <i>registerTo</i>.
    `),
    CommandInfo.fromFactoryAndName(Sub.factory, "SUB").setDescription(`
    <b>SUB </b><i>registerTo registerFrom</i><br>
    Subtracts value of <i>registerTo</i> from <i>registerFrom</i> to  and saves the result in <i>registerTo</i>.
    `),
    CommandInfo.fromFactoryAndName(Jmp.factory, "JMP").setDescription(`
    <b>JMP </b>.<i>label_name</i><br>
    Jumps to label defined by "." operator.
    `),
    CommandInfo.fromFactoryAndName(Jnz.factory, "JNZ").setDescription(`
    <b>JNZ </b><i>register </i>.<i>label_name</i><br>
    If <i>register</i> not equals to zero, jumps to label defined by "." operator.
    Otherwise does nothing.
    `),
    CommandInfo.fromFactoryAndName(Read.factory, "READ").setDescription(`
    <b>READ </b><i>register</i><br>
    Reads one value from console input and puts it in <i>register</i>.
    `),
    CommandInfo.fromFactoryAndName(Print.factory, "PRINT").setDescription(`
    <b>PRINT </b><i>register</i><br>
    Prints value of <i>register</i> to console.
    `)
];

export default commandIndex;