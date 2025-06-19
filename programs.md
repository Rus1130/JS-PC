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

top bar multithreaded:
```
store 0 0
store 1 1
store 2 20
store 3 20
store 4 20
store 5 20

store 20 20
store 40 40
store 60 60

store 7 1
store 8 15
store 9 0

thread 1 3
sub 2 1 2
spix 2 0 7 8 9
jmpnz 2 0

thread 2 5
sub 3 1 3
add 3 20 3
spix 3 0 7 8 9
sub 3 20 3
jmpnz 3 0

thread 3 5
sub 4 1 4
add 4 40 4
spix 4 0 7 8 9
sub 4 40 4
jmpnz 4 0

thread 4 5
sub 5 1 5
add 5 60 5
spix 5 0 7 8 9
sub 5 60 5
jmpnz 5 0
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

Multithreaded top bar:
```
    4, OPCODE.store, 0, 0, // y
    4, OPCODE.store, 1, 1, // 1
    4, OPCODE.store, 2, 20, // x1
    4, OPCODE.store, 3, 20, // x2
    4, OPCODE.store, 4, 20, // x3
    4, OPCODE.store, 5, 20, // x4

    4, OPCODE.store, 20, 20,
    4, OPCODE.store, 40, 40,
    4, OPCODE.store, 60, 60,

    4, OPCODE.store, 7, 1, // back color
    4, OPCODE.store, 8, 15, // fore color
    4, OPCODE.store, 9, 0, // character

    4, OPCODE.thread, 1, 3, // start thread with 5 instructions
    5, OPCODE.subtract, 2, 1, 2,
    7, OPCODE.set_pixel, 2, 0, 7, 8, 9, // set pixel at (x, y) with back color, fore color and character
    4, OPCODE.jump_if_not_zero, 2, 0,

    4, OPCODE.thread, 2, 5, // start thread with 5 instructions
    5, OPCODE.subtract, 3, 1, 3,
    5, OPCODE.add, 3, 20, 3,
    7, OPCODE.set_pixel, 3, 0, 7, 8, 9, // set pixel at (x, y) with back color, fore color and character
    5, OPCODE.subtract, 3, 20, 3,
    4, OPCODE.jump_if_not_zero, 3, 0,

    4, OPCODE.thread, 3, 5, // start thread with 5 instructions
    5, OPCODE.subtract, 4, 1, 4,
    5, OPCODE.add, 4, 40, 4,
    7, OPCODE.set_pixel, 4, 0, 7, 8, 9, // set pixel at (x, y) with back color, fore color and character
    5, OPCODE.subtract, 4, 40, 4,
    4, OPCODE.jump_if_not_zero, 4, 0,

    4, OPCODE.thread, 4, 5, // start thread with 5 instructions
    5, OPCODE.subtract, 5, 1, 5,
    5, OPCODE.add, 5, 60, 5,
    7, OPCODE.set_pixel, 5, 0, 7, 8, 9, // set pixel at (x, y) with back color, fore color and character
    5, OPCODE.subtract, 5, 60, 5,
    4, OPCODE.jump_if_not_zero, 5, 0,
```
Multithread test:
```
    4, OPCODE.store, 1, 100,
    4, OPCODE.store, 2, 200,
    4, OPCODE.store, 3, 300,
    4, OPCODE.store, 4, 400,
    4, OPCODE.store, 5, 500,
    4, OPCODE.store, 6, 600,
    4, OPCODE.store, 7, 700,
    4, OPCODE.store, 8, 800,
    4, OPCODE.store, 9, 900,

    4, OPCODE.thread, 1, 20,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,
    3, OPCODE.print, 1,

    4, OPCODE.thread, 2, 20,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,
    3, OPCODE.print, 2,

    4, OPCODE.thread, 3, 20,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,
    3, OPCODE.print, 3,

    4, OPCODE.thread, 4, 20,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,
    3, OPCODE.print, 4,

    4, OPCODE.thread, 5, 20,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,
    3, OPCODE.print, 5,

    4, OPCODE.thread, 6, 20,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,
    3, OPCODE.print, 6,

    4, OPCODE.thread, 7, 20,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,
    3, OPCODE.print, 7,

    4, OPCODE.thread, 8, 20,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,
    3, OPCODE.print, 8,

    4, OPCODE.thread, 9, 20,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
    3, OPCODE.print, 9,
```