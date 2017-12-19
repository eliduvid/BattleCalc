import createElement from "./createElement";
import {IllegalArgument, IllegalState} from "./exceptions";
import {CommandEditor, Queue, Runtime, Stack} from "./runtime";
import CommandInfo from "./commandInfo";
import {Command} from "./commands";
import {EditorFromTextArea, fromTextArea} from "codemirror";
import CommandParser from "./commandParser";

function sleep(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function randomInteger(min, max) {
    return Math.floor(min + Math.random() * (max + 1 - min));
}

class Resolvable {
    private _resolve: () => void;
    readonly promise: Promise<undefined> = new Promise<undefined>(resolve => this._resolve = resolve);

    get resolve(): () => void {
        return this._resolve;
    }

    static readonly resolved = new Resolvable();
}

Resolvable.resolved.resolve();

export class ConsoleWrapper {
    private inputQueue: Queue = new Queue();

    constructor(private consoleIn: HTMLInputElement, private consoleOut: HTMLElement) {
        consoleIn.addEventListener('keypress', (event: KeyboardEvent) => {
            if (event.keyCode === 13 && consoleIn.value.trim()) {
                if (consoleIn.value.match(/^\s*\d+(\d|\s)*$/)) {
                    let values = consoleIn.value.trim().split(/\s+/).map(num => parseInt(num));
                    this.inputQueue.push(...values);
                    this.inputLog(values.join(' '));
                } else {
                    this.error(`"${consoleIn.value}" contains non-integer values`)
                }
                consoleIn.value = '';
            }
        });
    }

    async getInputValue(): Promise<number> {
        let output = this.inputQueue.pop();
        for (let i = 5; i < 0 && output === undefined; i--) {
            await sleep(200);
        }
        if (output === undefined) {
            this.std('Waiting for input:');
            while (output === undefined) {
                await sleep(200);
                output = this.inputQueue.pop();
            }
        }
        return output;
    }

    clear(): void {
        this.inputQueue.clear();
        this.consoleOut.innerHTML = '';
    }

    std(line: string) {
        this.log(line, 'console_message')
    }

    error(line: string) {
        this.log(line, 'console_message', 'error')
    }

    private inputLog(line: string) {
        this.log('>\xa0' + line, 'console_message');
    }

    private log(text: string, ...classes: string[]) {
        this.consoleOut.appendChild(createElement('div').classes(...classes).innerText(text).element);
    }

    disable() {
        this.consoleIn.value = '';
        this.consoleIn.disabled = true;
    }

    enable() {
        this.consoleIn.disabled = false;
    }
}

export class EditorWrapper {
    private mark: HTMLElement;
    private editor: EditorFromTextArea;

    constructor(textArea: HTMLTextAreaElement) {
        this.editor = fromTextArea(textArea, {
            lineNumbers: true,
            gutters: ["running", "CodeMirror-linenumbers"],
            lineWrapping: true
        });
        this.mark = createElement('div').classes('running_mark').innerHtml('&#9658;').element;
    }

    markLine(lineNumber: number) {
        this.editor.setGutterMarker(lineNumber, "running", this.mark);
    }

    unmark() {
        this.editor.clearGutter("running");
    }

    get text() {
        return this.editor.getValue();
    }

    set text(text: string) {
        this.editor.setValue(text);
    }

    enable() {
        this.editor.setOption('readOnly', false);
    }

    disable() {
        this.editor.setOption('readOnly', "nocursor");
    }
}

export class StackWrapper {
    constructor(private stack: HTMLElement) {
    }

    set value(value: Stack) {
        let valueArray = value.array;
        this.evenElements(valueArray.length);
        for (let i = 0; i < valueArray.length; i++) {
            (<HTMLElement>this.stack.children[i]).innerText = valueArray[i].toString();
        }
    }

    private evenElements(count: number) {
        let dif = count - this.stack.childElementCount;
        if (dif > 0) {
            this.addElements(dif);
        } else if (dif < 0) {
            this.removeElements(-dif);
        }
    }

    private addElements(count: number = 1) {
        for (let i = 0; i < count; i++) {
            this.stack.appendChild(createElement('div').classes('stack_item').element);
        }
    }

    private removeElements(count: number = 1) {
        for (let i = 0; i < count; i++) {
            this.stack.lastElementChild.remove();
        }
    }

    clear() {
        this.removeElements(this.stack.childElementCount);
    }
}

export class RegistersWrapper {
    readonly registers: { [registerName: string]: HTMLElement };

    constructor(wrapper: HTMLElement, ...registersNames: string[]) {
        this.registers = RegistersWrapper.generateRegistersElements(wrapper, registersNames);
    }

    private static generateRegistersElements(wrapper: HTMLElement, registersNames: string[]): { [registerName: string]: HTMLElement } {
        while (wrapper.childElementCount) {
            wrapper.lastElementChild.remove();
        }
        let output = {};
        registersNames.forEach(register => {
            wrapper.appendChild(createElement('span').innerText(register + ': ').element);
            let regElement = createElement('span').classes('register').element;
            wrapper.appendChild(regElement);
            output[register] = regElement;
        });

        return output;
    }

    registerNames(): string[] {
        return Object.keys(this.registers);
    }

    getElementForRegister(regName: string) {
        IllegalArgument.check(this.registers.hasOwnProperty(regName), `there is no element for register "${regName}"`);
        return this.registers[regName];
    }

    set(runtime: Runtime) {
        runtime.registersNames.forEach(regName => this.setRegister(regName, runtime.getRegisterByName(regName).value))
    }

    setRegister(regName: string, regValue: number) {
        this.getElementForRegister(regName).innerText = regValue.toString();
    }

    clearRegister(regName: string) {
        this.getElementForRegister(regName).innerText = '';
    }

    clear() {
        this.registerNames().forEach(regName => this.clearRegister(regName));
    }
}

export class CommandEditorWrapper {
    private commandEditor: CommandEditor;

    constructor(private parser: CommandParser,
                private editor: EditorWrapper,
                private console: ConsoleWrapper,
                private stack: StackWrapper,
                private registers: RegistersWrapper) {
        this.commandEditor = new CommandEditor(this.registers.registerNames());
    }

    compile(): RuntimeWrapper {
        this.commandEditor.removeCommands();
        this.commandEditor.addCommands(...this.parser.parseText(this.editor.text));
        let runtime = this.commandEditor.execute(this.console.std.bind(this.console), this.console.getInputValue.bind(this.console));
        return new RuntimeWrapper(runtime, this.editor, this.console, this.stack, this.registers);
    }
}

export class RuntimeWrapper {
    private pausePromise: Resolvable = Resolvable.resolved;

    constructor(private runtime: Runtime,
                private editor: EditorWrapper,
                private console: ConsoleWrapper,
                private stack: StackWrapper,
                private registers: RegistersWrapper) {
    }

    clear(): void {
        this.console.clear();
        this.stack.clear();
        this.registers.clear()
    }

    consoleActive() {
        this.console.enable();
        this.editor.disable();
    }

    editorActive() {
        this.console.disable();
        this.editor.enable();
    }

    async run(): Promise<void> {
        this.clear();
        this.runtime.registersNames.forEach(reg => this.runtime.getRegisterByName(reg).value = randomInteger(-10000, 10000));
        this.consoleActive();
        await this.runtime.executeAll(async () => {
            this.setVisibleState();
            await sleep(1000);
            await this.pausePromise.promise;
        });
    }

    pause() {
        this.pausePromise = new Resolvable();
    }

    unpause() {
        this.pausePromise.resolve();
    }

    stop() {
        this.editor.unmark();
        this.runtime.commandRuntime.finish();
        this.unpause();
        this.editorActive();
    }

    setVisibleState() {
        if (this.runtime.commandRuntime.isRunning()) {
            this.editor.markLine(this.runtime.commandRuntime.activeCommandIndex);
        } else {
            this.editor.unmark();
        }
        this.registers.set(this.runtime);
        this.stack.value = this.runtime.stack;
    }
}

const enum RunningState {
    RUNNING,
    PAUSED,
    NOT_RUNNING
}

export class RunButtonsWrapper {
    private _runningState: RunningState = null;
    private stopButton: HTMLButtonElement;
    private pauseButton: HTMLButtonElement;
    private unpauseButton: HTMLButtonElement;
    private runButton: HTMLButtonElement;
    private clearButton: HTMLButtonElement;
    readonly run: () => void;
    readonly pause: () => void;
    readonly unpause: () => void;
    readonly stop: () => void;
    readonly clear: () => void;

    constructor(private wrapper: HTMLElement,
                runCallback: () => any,
                pauseCallback: () => any,
                unpauseCallback: () => any,
                stopCallback: () => any,
                clearCallback: () => any,
                errCallback: (e: Error) => any) {
        this.runButton = createElement('button').innerText('run')
            .eventListener('click',
                this.run = RunButtonsWrapper.wrapThrowing(runCallback, () => this.runningState = RunningState.RUNNING, errCallback)
            ).element;
        this.pauseButton = createElement('button').innerText('pause')
            .eventListener('click',
                this.pause = RunButtonsWrapper.wrapThrowing(pauseCallback, () => this.runningState = RunningState.PAUSED, errCallback)
            ).element;
        this.unpauseButton = createElement('button').innerText('run')
            .eventListener('click',
                this.unpause = RunButtonsWrapper.wrapThrowing(unpauseCallback, () => this.runningState = RunningState.RUNNING, errCallback)
            ).element;
        this.stopButton = createElement('button').innerText('stop')
            .eventListener('click',
                this.stop = RunButtonsWrapper.wrapThrowing(stopCallback, () => this.runningState = RunningState.NOT_RUNNING, errCallback)
            ).element;
        this.clearButton = createElement('button').innerText('clear')
            .eventListener('click',
                this.clear = RunButtonsWrapper.wrapThrowing(clearCallback, () => {
                }, errCallback)
            ).element;
        this.runningState = RunningState.NOT_RUNNING;
    }

    set runningState(runningState: RunningState) {
        if (this.runningState !== runningState) {
            while (this.wrapper.childElementCount) {
                this.wrapper.lastElementChild.remove();
            }

            switch (runningState) {
                case RunningState.RUNNING:
                    this.wrapper.appendChild(this.stopButton);
                    this.wrapper.appendChild(this.pauseButton);
                    break;
                case RunningState.PAUSED:
                    this.wrapper.appendChild(this.stopButton);
                    this.wrapper.appendChild(this.unpauseButton);
                    break;
                case RunningState.NOT_RUNNING:
                    this.wrapper.appendChild(this.clearButton);
                    this.wrapper.appendChild(this.runButton);
                    break;
                default:
                    throw new IllegalState(`unknown running state ${runningState}`);
            }

            this._runningState = runningState;
        }
    }

    get runningState() {
        return this._runningState;
    }

    static wrapAndCallThrowing(func: () => void, successCallback: () => void, errCallback: (e: Error) => void) {
        try {
            func();
            successCallback();
        } catch (e) {
            errCallback(e);
        }
    }

    static wrapThrowing(func: () => void, successCallback: () => void, errCallback: (e: Error) => void): () => void {
        return () => RunButtonsWrapper.wrapAndCallThrowing(func, successCallback, errCallback);
    }
}

export function generateDescription(wrapper: HTMLElement, index: ReadonlyArray<CommandInfo<Command>>) {
    index.forEach(value => {
        if (value.description) {
            wrapper.appendChild(createElement('p').innerHtml(value.description).element);
        }
    });
}