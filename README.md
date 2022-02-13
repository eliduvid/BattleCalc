# BattleCalc
Interpreter for simplified assembly-like language. Originally was hosted on gitlab and intended as a learning tool, but ended up never used like one. Working version available at https://battle-calc.neocities.org/

[I tried to host it on github pages, but require.js model I used then for some reason is not compatible with it 🤷‍♂️]

Yeah, and historic origins of the name are complicated and not so interesting.

## Console
Takes whitespace-separated integer numbers and gives them one-by-one to READ command.

## Available commands:
__.label_name__<br>
Creates label with given (case sensitive) name that leads to this very spot.


__PUSH__ _register_<br>
Puts value from register to stack.


__POP__ _register_<br>
Gets value from stack and puts it into register.


__MOV__ registerTo registerFrom<br>
Copies value from registerFrom to registerTo.


__INC__ _register_<br>
Increases value of register by one;


__DEC__ _register_<br>
Decreases value of register by one;


__ADD__ _registerTo_ _registerFrom_<br>
Adds value of registerFrom to registerTo and saves the result in registerTo.


__SUB__ _registerTo_ _registerFrom_<br>
Subtracts value of registerTo from registerFrom to and saves the result in registerTo.


__JMP__ _.label_name_<br>
Jumps to label defined by "." operator.


__JNZ__ _register_ _.label_name_<br>
If register not equals to zero, jumps to label defined by "." operator. Otherwise does nothing.


__READ__ _register_<br>
Reads one value from console input and puts it in register.


__PRINT__ _register_<br>
Prints value of register to console.
