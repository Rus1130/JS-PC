# opcodes
* ram_store - 0
* print - 1
* print_c - 2
* set_pixel - 3
* add - 4
* subtract - 5
* multiply - 6
* divide - 7

# machine code documentation
* `:v` indicates a direct value, if ommitted, the value is read from an address

## ram_store
stores a value into ram
```
4, OPCODE.ram_store, [address], [value:v]
```

## print
prints a value to the console
```
3, OPCODE.print, [address]
```

## print_c
prints a character to the console
```
3, OPCODE.print_c, [address]
```

## set_pixel
sets a pixel on the screen
```
7, OPCODE.set_pixel, [x:v], [y:v], [back color:v], [text color:v], [character:v]
```

## add
adds two addresses and stores the result in an address
```
5, OPCODE.add, [address1], [address2], [result_address]
```

## subtract
subtracts two addresses and stores the result in an address
```
5, OPCODE.subtract, [address1], [address2], [result_address]
```

## multiply
multiplies two addresses and stores the result in an address
```
5, OPCODE.multiply, [address1], [address2], [result_address]
```

## divide
divides two addresses and stores the result in an address
```
5, OPCODE.divide, [address1], [address2], [result_address]
```

