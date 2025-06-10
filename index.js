class Block {
    /**
     * index of null: not in use
     * index of undefined: in use, but no value assigned
     */
    constructor(name, start, end){
        if(end-start < 0 || end-start > 0xffff){
            PC.halt(`Invalid block size for ${name}: start=${start}, end=${end}. Size must be between 0 and ${0xffff}.`);
            return;
        }
        this.data = new Array(end - start + 1).fill(undefined); // Initialize with zeros
        this.start = start;
        this.end = end;
        this.name = name;
        this.size = end - start + 1;
        PC.blocks[name] = this;

        this.data.forEach((byte, index) => {
            PC.mem[this.start + index] = byte;
        });
    }

    setBlockData(data){
        // 1. turn data into a string of 3-digit numbers
        // 2. pad it to 768 characters with zeros, to make sure its 256 bytes
        // 3. split it into 3-character chunks
        // 4. convert each chunk to an integer
        if(data.length > 0xffff) {
            PC.halt(`Data length exceeds ${0xffff} bytes for block ${this.name}: ${data.length}`);
            return;
        }
        this.data = data;

        this.data.forEach((byte, index) => {
            PC.mem[this.start + index] = byte;
        });
    }

    pushBlockData(data){
        // find the first undefined index in the block
        let firstUndefinedIndex = this.data.findIndex(byte => byte === undefined);

        if(firstUndefinedIndex == -1){
            PC.halt(`No free space in block ${this.name} to push data`);
            return;
        }

        for(let i = firstUndefinedIndex; i < firstUndefinedIndex+data.length; i++){
            this.setByte(i, data[i - firstUndefinedIndex]);
        }
    }

    setByte(index, value){
        if (index < 0 || index >= this.data.length) {
            PC.halt(`Index out of bounds for block ${this.name}: ${index}`);
            return;
        }
        if (typeof value !== 'number' || value < -0xffff || value > 0xffff) {
            PC.halt(`Invalid byte value for block ${this.name}: ${value}`);
            return;
        }
        this.data[index] = value;

        PC.mem[this.start + index] = value;
    }

    unsetAddress(address){
        this.data[address] = undefined;
        PC.mem[this.start + address] = undefined;
    }
    
    indexToAddress(index){
        if (index < 0 || index > this.data.length - 1) {
            PC.halt(`Index out of bounds for block ${this.name}: ${index}`);
            return null;
        }
        return this.start + index;
    }

    visualize(custom_fn){
        if (typeof custom_fn !== 'function') {
            PC.halt(`Custom visualization function is not a function for block ${this.name}`);
            return;
        }
        return custom_fn(this.data);
    }

    blockIndex(){
        return Object.keys(PC.blocks).indexOf(this.name);
    }

    asCharArray(){
        return this.data.map(byte => String.fromCharCode(byte));
    }
}

class PC {
    static blocks = {};
    static mem = new Array(0xffff).fill(null);
    static Clock = null;
    static instructionPointer = 0;
    static instructionAddresses = []

    static halt(message, prefixes = []){
        PC.log(message, prefixes.concat(['ERROR']));
        PC.powerOff();
    }

    static options = {
        logging: true,
        logCycle: false,
        simpleLog: false,
        logFilter: ["PROGRAM LOG", "ERROR", "WARN"],
        msPerCycle: 5 // 20,
    }

    static log(message, prefixes = []) {
        if(!PC.options.logging) return;
        const styles = {
            INFO: 'color: #0af; font-weight: bold;',
            SUCCESS: 'color: #0c0; font-weight: bold;',
            ERROR: 'color: #f33; font-weight: bold;',
            WARN: 'color: orange; font-weight: bold;',
            LOG: 'color: gray; font-weight: bold;',
            "PROGRAM LOG": 'color: #00c4c4; font-weight: bold;', // #F34EF3
            CYCLE: 'color: #F3F34E; font-weight: bold;',
            FOUND: 'color: #9b59b6; font-weight: bold;',
            "MACHINE CODE": 'color: #C40000; font-weight: bold;',
            "MACHINE STATE": 'color: #0000C4; font-weight: bold;',
        };

        let formatString = '';
        let styleArray = [];

        for (let prefix of prefixes) {
            formatString += `%c[${prefix}] `;
            styleArray.push(styles[prefix] || styles.LOG);
        }

        formatString += '%c' + message;
        styleArray.push('color: inherit;');

        function out(){
            if(prefixes.includes("ERROR")) console.error(formatString, ...styleArray)
            else if(prefixes.includes("WARN")) console.warn(formatString, ...styleArray);
            else console.log(formatString, ...styleArray);
        }

        if (PC.options.simpleLog) {
            if (PC.options.logFilter.length > 0 && !prefixes.some(prefix => PC.options.logFilter.includes(prefix))) {
                return;
            } else {
                out();
            }
        } else {
            out();
        }

        
    
    }

    static output(message, prefixes = {}) {
        console.log('%c[OUTPUT]%c ' + message, 'color: #0c0; font-weight: bold;', 'color: inherit;');
    }

    static clearScreen() {
        const screen = document.getElementById('screen');
        const columns = screen.clientWidth / 8;
        const rows = screen.clientHeight / 8;

        for(let i = 0; i < columns * rows; i++) {
            const x = i % columns;
            const y = Math.floor(i / columns);
            const cell = document.getElementById(`cell-${x}-${y}`);
            cell.style.backgroundColor = '#FFFFFF';
            cell.style.color = '#000000';
            cell.textContent = '';
        }
    }

    static mapOpcode(opcode) {
        if (typeof opcode === 'string') {
            return Object.keys(OPCODE).find(key => OPCODE[key] === opcode) || -1;
        } else if (typeof opcode === 'number') {
            return Object.entries(OPCODE).find(([key, value]) => value === opcode)?.[0] || -1;
        }
        return null;
    }

    static cycles = 0;
    static didJump = false;

    static #runMachineCode(register){
        let instructionStart = PC.instructionPointer;
        let instructionLength = register.data[instructionStart];

        if(instructionLength == undefined) {
            PC.log("No instructions to execute", ['LOG']);
            instruction_register.setBlockData(new Array(instruction_register.size).fill(undefined));
            PC.instructionPointer = 0;
            return;
        }

        PC.log(`Executing instruction at address ${instructionStart} in register ${register.name}`, ['FOUND']);

        let instruction = register.data.slice(instructionStart, instructionStart + instructionLength);
        if (instruction.length !== instructionLength) {
            PC.halt(`Instruction length mismatch: expected ${instructionLength}, got ${instruction.length}`, ['MACHINE CODE']);
            return;
        }
        PC.instruct(instruction);
        let size = instruction_register.data[PC.instructionPointer];

        // Only advance if jump did not occur
        if (!PC.didJump) {
            PC.instructionPointer += size;
        } else {
            PC.didJump = false;
        }
    }

    static resetVolatileMemory() {
        ram.setBlockData(new Array(ram.size).fill(undefined));
        instruction_register.setBlockData(new Array(instruction_register.size).fill(undefined));
        jump_return_register.setBlockData(new Array(jump_return_register.size).fill(undefined));
        PC.instructionPointer = 0;
        PC.cycles = 0;
        PC.didJump = false;
        clearInterval(PC.Clock);
        PC.Clock = null;
        PC.clearScreen();
    }

    static powerOn(){
        // get everything from the startup block and put it into the instruction register
        PC.log("Power on", ['MACHINE STATE']);

        instruction_register.setBlockData(startup_register.data);

        PC.Clock = setInterval(() => {
            if(PC.options.logCycle) PC.log(PC.cycles, ['CYCLE']);
            // Memory overlap check
            for(let b in PC.blocks){
                let block = PC.blocks[b];
                for (let b2 in PC.blocks) {
                    if (b !== b2) {
                        let block2 = PC.blocks[b2];
                        if (block.start <= block2.end && block.end >= block2.start) {
                            PC.halt(`Memory block overlap detected between block ${b} and block ${b2}`);
                            return;
                        }
                    }
                }
                if(block.end - block.start > PC.mem.length){
                    PC.halt(`Memory block ${b} exceeds available memory size`);
                    return;
                }
            }

            PC.#runMachineCode(instruction_register);

            PC.cycles++;
        }, PC.options.msPerCycle);
    }

    static powerOff(){
        PC.resetVolatileMemory();
        setTimeout(() => {
            PC.log("Power off", ['MACHINE STATE']);
        }, 10)
    }

    static getInstructionIndexes() {
        let indexes = [];
        for (let i = 0; i < instruction_register.data.length; i++) {
            indexes.push(i);
            i += instruction_register.data[i] - 1;
        }
        return indexes;
    }

    static instruct(array) {
        let opCode = array[1];
        let args = array.slice(2);
        if(opCode == undefined){
            PC.halt(`Opcode is undefined. Most likely forgot to add it to the OPCODE object`, ['MACHINE CODE']);
            return;
        }

        PC.log(`Executing instruction with opcode: ${opCode}, args: ${args}`, ['MACHINE CODE', 'INFO']);

        if (PC.mapOpcode(opCode) == null) {
            PC.halt(`Invalid syntax: Malformed instruction with opcode ${opCode}. Length may not be correct?`, ['MACHINE CODE']);
            return;
        }
        if (PC.mapOpcode(opCode) === -1) {
            PC.halt(`Invalid opcode: ${opCode} is not a valid opcode`, ['MACHINE CODE']);
            return;
        }

        let instructionName = PC.mapOpcode(opCode);
        PC.log(`Instruction name: ${instructionName}`, ['MACHINE CODE', 'INFO']);

        switch (instructionName) {
            case 'store': {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for store: expected 2, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }
                let address = args[0];
                let value = args[1];

                if (address < 0 || address >= ram.data.length) {
                    PC.halt(`Address out of bounds for store: ${address}`, ['MACHINE CODE']);
                    return;
                }
                if (typeof value !== 'number' || value < 0 || value > 0xffff) {
                    PC.halt(`Invalid value for store: ${value}`, ['MACHINE CODE']);
                    return;
                }

                ram.setByte(address, value);
                PC.log(`Stored value ${value} at address ${address} in RAM`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "print_c": {
                if(args.length == 1){
                    let value = args[0];

                    if (ram.data[value] === undefined) {
                        PC.halt(`Address ${value} in RAM does not exist for print_c`, ['MACHINE CODE']);
                        return;
                    }

                    let char = characterBlockVisualized()[ram.data[value]];

                    if (char == undefined) {
                        PC.log(`Character at index ${ram.data[value]} does not exist. Displaying first character instead`, ['MACHINE CODE', 'WARN']);
                        char = characterBlockVisualized()[0];
                    }

                    PC.log(`Character: '${char}'`, ['MACHINE CODE', 'PROGRAM LOG']);
                    PC.log(`Printed character from RAM at address ${value}: ${char}`, ['MACHINE CODE', 'SUCCESS']);
                } else {
                    let str = '';
                    args.forEach(arg => {
                        if (ram.data[arg] === undefined) {
                            PC.halt(`Address ${arg} in RAM does not exist for print_c`, ['MACHINE CODE']);
                            return;
                        }

                        let char = characterBlockVisualized()[ram.data[arg]];

                        if (char == undefined) {
                            PC.log(`Character at index ${ram.data[arg]} does not exist. Displaying first character instead`, ['MACHINE CODE', 'WARN']);
                            char = characterBlockVisualized()[0];
                        }

                        str += char;
                    })

                    PC.log(`String: '${str}'`, ['MACHINE CODE', 'PROGRAM LOG']);
                    PC.log(`Printed string from RAM at addresses ${args.join(', ')}: ${str}`, ['MACHINE CODE', 'SUCCESS']);
                }

            } break;

            case "print": {
                let value = args[0];

                if (args.length !== 1) {
                    PC.halt(`Invalid number of arguments for print: expected 1, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                if (ram.data[value] === undefined) {
                    PC.halt(`Address ${value} in RAM does not exist for print`, ['MACHINE CODE']);
                    return;
                }

                PC.log("Number: " + ram.data[value], ['MACHINE CODE', 'PROGRAM LOG']);
                PC.log(`Printed value from RAM at address ${value}: ${ram.data[value]}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "set_pixel": {
                if (args.length !== 5) {
                    PC.halt(`Invalid number of arguments for set_pixel: expected 5, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                let xAddress = ram.data[args[0]];
                let yAddress = ram.data[args[1]];
                let backColorAddress = ram.data[args[2]];
                let foreColorAddress = ram.data[args[3]];
                let characterAddress = ram.data[args[4]];

                if (xAddress === undefined || yAddress === undefined || backColorAddress === undefined || foreColorAddress === undefined || characterAddress === undefined) {
                    PC.halt(`One or more addresses in set_pixel do not exist in RAM`, ['MACHINE CODE']);
                    return;
                }

                let x = xAddress;
                let y = yAddress;
                let backColor = colorBlockVisualized()[backColorAddress];
                let foreColor = colorBlockVisualized()[foreColorAddress];
                let character = characterBlockVisualized()[characterAddress];
                
                if (character == undefined) {
                    PC.log(`Character at index ${args[4]} does not exist. Displaying first character instead`, ['MACHINE CODE', 'WARN']);
                    character = characterBlockVisualized()[0];
                }

                let cell = document.getElementById(`cell-${x}-${y}`);
                if (cell == null) {
                    PC.log(`Cell at (${x}, ${y}) does not exist. Skipping`, ['MACHINE CODE', 'WARN']);
                } else {
                    if (backColor == undefined) {
                        PC.log(`Back color ${args[2]} does not exist. Using #000000 instead`, ['MACHINE CODE', 'WARN']);
                        backColor = "#000000";
                    }
                    if (foreColor == undefined) {
                        PC.log(`Fore color ${args[3]} does not exist. Using #FFFFFF instead`, ['MACHINE CODE', 'WARN']);
                        foreColor = "#FFFFFF";
                    }

                    cell.style.backgroundColor = backColor;
                    cell.style.color = foreColor;
                    cell.textContent = character;

                    PC.log(`Set pixel at (${x}, ${y}) with back color ${backColor}, fore color ${foreColor}, character '${character}'`, ['MACHINE CODE', 'SUCCESS']);
                }


            } break;

            case "add": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for add: expected 2, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddress = args[2];

                if( ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for add`, ['MACHINE CODE']);
                    return;
                }
                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for add`, ['MACHINE CODE']);
                    return;
                }

                let result = ram.data[address1] + ram.data[address2];
                if (result > 0xffff) {
                    PC.halt(`Result of addition exceeds byte size: ${result}`, ['MACHINE CODE']);
                    return;
                }

                if (outputAddress < 0 || outputAddress >= ram.data.length) {
                    PC.halt(`Output address out of bounds for add: ${outputAddress}`, ['MACHINE CODE']);
                    return;
                }

                ram.setByte(outputAddress, result);
                PC.log(`Added values at addresses ${address1} and ${address2}, stored result ${result} at address ${outputAddress}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "subtract": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for subtract: expected 2, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddresss = args[2];

                if(ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for subtract`, ['MACHINE CODE']);
                    return;
                }
                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for subtract`, ['MACHINE CODE']);
                    return;
                }
                let result = ram.data[address1] - ram.data[address2];

                if (outputAddresss < 0 || outputAddresss >= ram.data.length) {
                    PC.halt(`Output address out of bounds for subtract: ${outputAddresss}`, ['MACHINE CODE']);
                    return;
                }

                ram.setByte(outputAddresss, result);

                PC.log(`Subtracted values at addresses ${address1} and ${address2}, stored result ${result} at address ${outputAddresss}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "multiply": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for multiply: expected 2, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddress = args[2];

                if(ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for multiply`, ['MACHINE CODE']);
                    return;
                }

                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for multiply`, ['MACHINE CODE']);
                    return;
                }

                let mulResult = ram.data[address1] * ram.data[address2];
                if (mulResult > 0xffff) {
                    PC.halt(`Result of multiplication exceeds byte size: ${mulResult}`, ['MACHINE CODE']);
                    return;
                }

                if (outputAddress < 0 || outputAddress >= ram.data.length) {
                    PC.halt(`Output address out of bounds for multiply: ${outputAddress}`, ['MACHINE CODE']);
                    return;
                }

                ram.setByte(outputAddress, mulResult);
                PC.log(`Multiplied values at addresses ${address1} and ${address2}, stored result ${mulResult} at address ${outputAddress}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "divide": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for divide: expected 2, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddress = args[2];

                if(ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for divide`, ['MACHINE CODE']);
                    return;
                }

                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for divide`, ['MACHINE CODE']);
                    return;
                }

                if (ram.data[address2] === 0) {
                    PC.halt(`Division by zero at address ${address2} in RAM`, ['MACHINE CODE']);
                    return;
                }

                let divResult = Math.floor(ram.data[address1] / ram.data[address2]);
                if (divResult < -0xffff || divResult > 0xffff) {
                    PC.halt(`Result of division is out of bounds: ${divResult}`, ['MACHINE CODE']);
                    return;
                }

                if (outputAddress < 0 || outputAddress >= ram.data.length) {
                    PC.halt(`Output address out of bounds for divide: ${outputAddress}`, ['MACHINE CODE']);
                    return;
                }
                ram.setByte(outputAddress, divResult);
                PC.log(`Divided values at addresses ${address1} and ${address2}, stored result ${divResult} at address ${outputAddress}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "jump": {
                if (args.length !== 1) {
                    PC.halt(`Invalid number of arguments for jump: expected 1, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                // calculate the indexes of the instruction register
                let indexes = PC.getInstructionIndexes();

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${args[0]}, max ${indexes.length - 1}`, ['MACHINE CODE']);
                    return;
                }

                jump_return_register.setByte(0, PC.instructionPointer);
                PC.instructionPointer = indexes[args[0]];
                PC.didJump = true;

                PC.log(`Jumped to instruction at instruction index ${indexes[args[0]]}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "set": {
                if (args.length !== 2){
                    PC.halt(`Invalid number of arguments for set: expected 2, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                let srcAddress = args[0];
                let destAddress = args[1];

                if (ram.data[srcAddress] === undefined) {
                    PC.halt(`Source address ${srcAddress} in RAM does not exist for set`, ['MACHINE CODE']);
                    return;
                }

                if (destAddress < 0 || destAddress >= ram.data.length) {
                    PC.halt(`Destination address out of bounds for set: ${destAddress}`, ['MACHINE CODE']);
                    return;
                }

                ram.setByte(destAddress, ram.data[srcAddress]);
                PC.log(`Set value from source address ${srcAddress} to destination address ${destAddress}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "jump_if_zero": {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for jump_if_zero: expected 1, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                // calculate the indexes of the instruction register
                let indexes = [];
                for (let i = 0; i < instruction_register.data.length; i++) {
                    indexes.push(i);
                    i += instruction_register.data[i] - 1;
                }

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${args[0]}, max ${indexes.length - 1}`, ['MACHINE CODE']);
                    return;
                }

                if (ram.data[args[0]] === 0) {
                    jump_return_register.setByte(0, PC.instructionPointer);
                    PC.instructionPointer = indexes[args[0]];
                    PC.didJump = true;
                    PC.log(`Jumped to instruction at instruction index ${indexes[args[0]]} because value is zero`, ['MACHINE CODE', 'SUCCESS']);
                } else {
                    PC.log(`Did not jump to instruction at index ${indexes[args[0]]} because value is not zero`, ['MACHINE CODE', 'INFO']);
                }
            } break;

            case "jump_if_not_zero": {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for jump_if_not_zero: expected 1, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }
                // calculate the indexes of the instruction register
                let indexes = [];
                for (let i = 0; i < instruction_register.data.length; i++) {
                    indexes.push(i);
                    i += instruction_register.data[i] - 1;
                }

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${args[0]}, max ${indexes.length - 1}`, ['MACHINE CODE']);
                    return;
                }

                let address = args[0];
                let index = args[1];
                
                if (ram.data[address] === undefined) {
                    PC.halt(`Address ${address} in RAM does not exist for jump_if_not_zero`, ['MACHINE CODE']);
                    return;
                }

                if (index < 0 || index >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${index}, max ${indexes.length - 1}`, ['MACHINE CODE']);
                    return;
                }

                if( ram.data[address] !== 0) {
                    jump_return_register.setByte(0, PC.instructionPointer);
                    PC.instructionPointer = indexes[index];
                    PC.didJump = true;
                    PC.log(`Jumped to instruction at instruction index ${indexes[index]} because value is not zero`, ['MACHINE CODE', 'SUCCESS']);
                } else {
                    PC.log(`Did not jump to instruction at index ${indexes[index]} because value is zero`, ['MACHINE CODE', 'INFO']);
                }
            } break;

            case "halt": {
                PC.log(`Halting execution at instruction pointer ${PC.instructionPointer}`, ['MACHINE CODE', 'INFO']);
                PC.instructionPointer = 0;
                instruction_register.setBlockData(new Array(instruction_register.size).fill(undefined));
                PC.log("Instruction interpretation stopped", ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "return": {
                if (args.length !== 0) {
                    PC.halt(`Invalid number of arguments for return: expected 0, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                if (jump_return_register.data[0] === undefined) {
                    PC.log(`Jump-return register is empty, ignoring`, ['MACHINE CODE', 'WARN']);
                    return;
                }

                PC.instructionPointer = jump_return_register.data[0];
                jump_return_register.data[0] = undefined;

                PC.log(`Jumping to return address ${PC.instructionPointer} from jump-return register`, ['MACHINE CODE', 'FOUND', 'SUCCESS']);
            } break;

            case "goto": {
                if (args.length !== 1) {
                    PC.halt(`Invalid number of arguments for goto: expected 1, got ${args.length}`, ['MACHINE CODE']);
                    return;
                }

                // calculate the indexes of the instruction register
                let indexes = [];
                for (let i = 0; i < instruction_register.data.length; i++) {
                    indexes.push(i);
                    i += instruction_register.data[i] - 1;
                }

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Goto address out of bounds: ${args[0]}, max ${indexes.length - 1}`, ['MACHINE CODE']);
                    return;
                }

                PC.instructionPointer = indexes[args[0]];
                PC.log(`Wentto instruction at instruction index ${indexes[args[0]]}`, ['MACHINE CODE', 'SUCCESS']);
            } break;

            case "nop": {} break;

            default: {
                PC.halt(`Instruction opcode: ${opCode}, name: ${instructionName}, is not defined`, ['MACHINE CODE']);
                return;
            }
        }
    }
}

const OPCODE = {
    halt: 0,
    store: 1,
    set: 2,
    print: 3,
    print_c: 4,
    add: 5,
    subtract: 6,
    multiply: 7,
    divide: 8,
    jump: 9,
    jump_if_zero: 10,
    jump_if_not_zero: 11,
    return: 12,
    goto: 13,
    set_pixel: 14,
    nop: 15
}



let colorBlock = new Block("colors", 0, 47); // 16*3 = 48
let characterBlock = new Block("character_map", 48, 303); // 255
let ram = new Block("RAM", 304, 2854);

let instruction_register = new Block("instruction_register", 2855, 5855);
let startup_register = new Block("startup", 5856, 6856);
let jump_return_register = new Block("jump_return_register", 6857, 6857);

colorBlock.setBlockData([
    0x0,  0x0,  0x0,  // #000000
    0x0,  0x0,  0xC4, // #0000C4
    0x0,  0xC4, 0x0,  // #00C400
    0x0,  0xC4, 0xC4, // #00C4C4
    0xC4, 0x0,  0x0,  // #C40000
    0xC4, 0x0,  0xC4, // #C400C4
    0xC4, 0x7E, 0x0,  // #C47E00
    0xC4, 0xC4, 0xC4, // #C4C4C4
    0x4E, 0x4E, 0x4E, // #4E4E4E
    0x4E, 0x4E, 0xDC, // #4E4EDC
    0x4E, 0xDC, 0x4E, // #4EDC4E
    0x4E, 0xF3, 0xF3, // #4EF3F3
    0xDC, 0x4E, 0x4E, // #DC4E4E
    0xF3, 0x4E, 0xF3, // #F34EF3
    0xF3, 0xF3, 0x4E, // #F3F34E
    0xFF, 0xFF, 0xFF  // #FFFFFF
]);

characterBlock.setBlockData([
    0x0, 0x20, // space , 00
    0x0, 0x61, // a     , 01
    0x0, 0x62, // b     , 02
    0x0, 0x63, // c     , 03
    0x0, 0x64, // d     , 04
    0x0, 0x65, // e     , 05
    0x0, 0x66, // f     , 06
    0x0, 0x67, // g     , 07
    0x0, 0x68, // h     , 08
    0x0, 0x69, // i     , 09
    0x0, 0x6A, // j     , 10
    0x0, 0x6B, // k     , 11
    0x0, 0x6C, // l     , 12
    0x0, 0x6D, // m     , 13
    0x0, 0x6E, // n     , 14
    0x0, 0x6F, // o     , 15
    0x0, 0x70, // p     , 16
    0x0, 0x71, // q     , 17
    0x0, 0x72, // r     , 18
    0x0, 0x73, // s     , 19
    0x0, 0x74, // t     , 20
    0x0, 0x75, // u     , 21
    0x0, 0x76, // v     , 22
    0x0, 0x77, // w     , 23
    0x0, 0x78, // x     , 24
    0x0, 0x79, // y     , 25
    0x0, 0x7A, // z     , 26
    0x0, 0x41, // A     , 27
    0x0, 0x42, // B     , 28
    0x0, 0x43, // C     , 29
    0x0, 0x44, // D     , 30
    0x0, 0x45, // E     , 31
    0x0, 0x46, // F     , 32
    0x0, 0x47, // G     , 33
    0x0, 0x48, // H     , 34
    0x0, 0x49, // I     , 35
    0x0, 0x4A, // J     , 36
    0x0, 0x4B, // K     , 37
    0x0, 0x4C, // L     , 38
    0x0, 0x4D, // M     , 39
    0x0, 0x4E, // N     , 40
    0x0, 0x4F, // O     , 41
    0x0, 0x50, // P     , 42
    0x0, 0x51, // Q     , 43
    0x0, 0x52, // R     , 44
    0x0, 0x53, // S     , 45
    0x0, 0x54, // T     , 46
    0x0, 0x55, // U     , 47
    0x0, 0x56, // V     , 48
    0x0, 0x57, // W     , 49
    0x0, 0x58, // X     , 50
    0x0, 0x59, // Y     , 51
    0x0, 0x5A, // Z     , 52
    0x0, 0x30, // 0     , 53
    0x0, 0x31, // 1     , 54
    0x0, 0x32, // 2     , 55
    0x0, 0x33, // 3     , 56
    0x0, 0x34, // 4     , 57
    0x0, 0x35, // 5     , 58
    0x0, 0x36, // 6     , 59
    0x0, 0x37, // 7     , 60
    0x0, 0x38, // 8     , 61
    0x0, 0x39, // 9     , 62
    0x0, 0x21, // !     , 63
    0x0, 0x3F, // ?     , 64
    0x0, 0x2C, // ,     , 65
    0x0, 0x2E, // .     , 66
    0x0, 0x3A, // :     , 67
    0x0, 0x3B, // ;     , 68
    0x0, 0x27, // '     , 69
    0x0, 0x22, // "     , 70
    0x0, 0x2D, // -     , 71
    0x0, 0x2B, // +     , 72
    0x0, 0x2F, // /     , 73
    0x0, 0x2A, // *     , 74
    0x0, 0x5F, // _     , 75
    0x0, 0x3D, // =     , 76
    0x0, 0x28, // (     , 77
    0x0, 0x29, // )     , 78
    0x0, 0x5B, // [     , 79
    0x0, 0x5D, // ]     , 80
    0x0, 0x7B, // {     , 81
    0x0, 0x7D, // }     , 82
    0x0, 0x3C, // <     , 83
    0x0, 0x3E, // >     , 84
    0x0, 0x5C, // \     , 85
    0x0, 0x7E, // ~     , 86
    0x0, 0x40, // @     , 87
    0x0, 0x23, // #     , 88
    0x0, 0x24, // $     , 89
    0x0, 0x25, // %     , 90
    0x0, 0x5E, // ^     , 91
    0x0, 0x26, // &     , 92
]);

const characterBlockVisualized = () => characterBlock.visualize((data) => {
    return data.map(v => v.toString(16).padStart(2, '0').toUpperCase()).join("").match(/.{1,4}/g).map(v => {
        return String.fromCharCode(parseInt(v, 16))
    });
})

const colorBlockVisualized = () => colorBlock.visualize((data) => {
    return data.map(v => v.toString(16).toUpperCase().padStart(2, '0')).join("").match(/.{1,6}/g).map(v => "#"+v);
})

const charactersToCode = (str) => {
    let error = false;
    let arr = [];
    str.split("").forEach(char => {
        if (!characterBlockVisualized().includes(char)) {
            PC.halt(`Character '${char}' is not defined in the character block`, ['MACHINE CODE']);
            error = true;
            return;
        }
        arr.push(characterBlockVisualized().indexOf(char));
    })
    return arr;
}

const codeToCharacters = (arr) => {
    return arr.map(index => characterBlockVisualized()[index]).join("");
}

startup_register.setBlockData([
    4, OPCODE.store, 0, 80, // x
    4, OPCODE.store, 1, 1, // 1
    4, OPCODE.store, 2, 0, // y
    4, OPCODE.store, 3, 1, // back color
    4, OPCODE.store, 4, 15, // fore color
    4, OPCODE.store, 5, 0, // character
    5, OPCODE.subtract, 0, 1, 0,
    7, OPCODE.set_pixel, 0, 2, 3, 4, 5, // set pixel at (x, y) with back color, fore color and character
    4, OPCODE.jump_if_not_zero, 0, 5,
]);

/*
add PROCEDURES
*/