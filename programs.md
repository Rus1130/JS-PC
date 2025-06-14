# Assembly
fibonacci:
```
store 1 0
store 2 1
store 3 0
add 1 2 3
print 2
set 2 1
set 3 2
jmp 3
```

top bar:
``` 
store 0 80
store 1 1
store 2 0
store 3 1
store 4 15
store 5 0
sub 0 1 0
spix 0 2 3 4 5
jmpnz 0 5
```
# Machine Code
fibonacci:
``` 
    4, OPCODE.store, 1, 0,
    4, OPCODE.store, 2, 1,
    4, OPCODE.store, 3, 0,
    5, OPCODE.add, 1, 2, 3,
    3, OPCODE.print, 2,
    4, OPCODE.set, 2, 1,
    4, OPCODE.set, 3, 2,
    3, OPCODE.jump, 3
```

Hello, World!
```
    4, OPCODE.store, 0, 34, // H
    4, OPCODE.store, 1, 5, // e
    4, OPCODE.store, 2, 12, // l
    4, OPCODE.store, 3, 15, // o
    4, OPCODE.store, 4, 0, // space
    4, OPCODE.store, 5, 65, // ,
    4, OPCODE.store, 6, 49, // W
    4, OPCODE.store, 7, 18, // r
    4, OPCODE.store, 8, 4, // d
    4, OPCODE.store, 9, 63, // !
    15, OPCODE.print_c, 0, 1, 2, 2, 3, 5, 4, 6, 3, 7, 2, 8, 9
```

Simulated function:
```
    4, OPCODE.store, 3, 153,
    4, OPCODE.store, 0, 100,
    4, OPCODE.store, 1, 0,
    3, OPCODE.goto, 6,
    // simulated function start
    5, OPCODE.add, 0, 1, 1,
    3, OPCODE.print, 1,
    // simulated function end
    2, OPCODE.return,
    3, OPCODE.jump, 4, // function call
    3, OPCODE.jump, 4,
    3, OPCODE.print, 3,
    3, OPCODE.jump, 4,
    3, OPCODE.jump, 4,
    3, OPCODE.jump, 4,
    3, OPCODE.jump, 4,
```

Top bar:
```
    4, OPCODE.store, 0, 80, // x
    4, OPCODE.store, 1, 1, // 1
    4, OPCODE.store, 2, 0, // y
    4, OPCODE.store, 3, 1, // back color
    4, OPCODE.store, 4, 15, // fore color
    4, OPCODE.store, 5, 0, // character
    5, OPCODE.subtract, 0, 1, 0,
    7, OPCODE.set_pixel, 0, 2, 3, 4, 5, // set pixel at (x, y) with back color, fore color and character
    4, OPCODE.jump_if_not_zero, 0, 5,
```