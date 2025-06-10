# opcodes

# machine code documentation
* `:v` indicates a direct value, if ommitted, the value is read from an address
* The first number in the instruction indicates the length of the instruction in bytes


## halt
clears the instruction register and stops execution
```
2, OPCODE.halt
```
## store
stores a value into ram
```
4, OPCODE.store, [address], [value:v]
```

## set
takes a value from an address and stores it in another address
```
4, OPCODE.set, [source_address], [destination_address]
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
You can print multiple characters in the same string by providing multiple addresses. Make sure to adjust the length of the instruction accordingly.
```
5..., OPCODE.print_c, [address1], [address2], [address3], [...]
```

## set_pixel
sets a pixel on the screen
```
7, OPCODE.set_pixel, [x], [y], [back color], [text color], [character]
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

## jump
jumps to a specific instruction in the instruction register
```
3, OPCODE.jump, [index]
```

## jump_if_zero
jumps to a specific instruction if the value at the address is zero
```
4, OPCODE.jump_if_zero, [address], [index]
```
## jump_if_not_zero
jumps to a specific instruction if the value at the address is not zero
```
4, OPCODE.jump_if_not_zero, [address], [index]
```

## return
jumps to the instruction index that was stored before the most recent jump keyword was executed. Once jumped, it will clear the return register of any previous return value. If there is no value stored, this instruction will do nothing.
```
2, OPCODE.return
```

## goto
jumps to a specific instruction in the instruction register, does not have `return` functionality
```
3, OPCODE.goto, [index]
```

## nop
does nothing
```
2, OPCODE.nop
```


