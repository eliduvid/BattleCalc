import CommandParser from "./commandParser";
import commandIndex from "./baseCommands";
import ready from './ready';
import {
    CommandEditorWrapper,
    ConsoleWrapper,
    generateDescription,
    EditorWrapper,
    RegistersWrapper,
    RunButtonsWrapper,
    RuntimeWrapper,
    StackWrapper
} from "./UIClasses";

let $: (id: string) => HTMLElement | null = document.getElementById.bind(document);
function getURLKeys(): {[key: string]: string} {
    let o = {};
    document.location.search.slice(1).split('&').forEach(v => {
        let [key, value] = v.split('=');
        o[key] = value;
    });
    return o;
}

ready(async () => {
    generateDescription($('description'), commandIndex);
    let parser = new CommandParser(commandIndex);
    let editor = new EditorWrapper(<HTMLTextAreaElement>$('editor'));
    editor.enable();
    let innerConsole = new ConsoleWrapper(<HTMLInputElement>$('console_in'), $('console_out'));
    innerConsole.disable();
    let stack = new StackWrapper($('stack'));
    let registers = new RegistersWrapper($('registers_wrapper'), 'A', 'B', 'C');
    let command = new CommandEditorWrapper(parser, editor, innerConsole, stack, registers);
    let runtime: RuntimeWrapper = null;
    let buttons = new RunButtonsWrapper($('buttons_wrapper'), () => {
        runtime = command.compile();
        runtime.run().catch((e) => innerConsole.error(e.toString())).finally(buttons.stop.bind(buttons));
    }, () => {
        runtime.pause();
    }, () => {
        runtime.unpause();
    }, () => {
        runtime.stop();
    }, () => {
        innerConsole.clear();
        stack.clear();
        registers.clear();
    }, (e: Error) => {
        innerConsole.error(e.toString());
    });

    if (getURLKeys()['demo'] === 'true') {
        editor.text = `; Example program
; Infinitely takes numbers and multiplies them

.Loop ; Global infinite loop
    ; Getting input
    read a
    read b

    ; Preserving value of B
    push b

    ; Putting zero in C
    sub c c

    jnz b .loop
    jmp .loopEnd
    .loop ; while B < 0
        add c a
        dec b
    jnz b .loop
    .loopEnd

    ; Retrieving value of B
    pop b

    ; Output
    print a
    print b
    print c
jmp .Loop`;
    }
});