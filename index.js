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

    padEndArray(arr, length, value) {
        while (arr.length < length) {
            arr.push(value);
        }
        return arr;
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

    removeIndexes(start, length) {
        if (start < 0 || length < 0 || start + length > this.data.length) {
            PC.halt(`Invalid range for block ${this.name}: start=${start}, length=${length}`);
            return;
        }

        // Slice and store the values being removed
        const removed = this.data.slice(start, start + length);

        // Mark them as undefined
        for (let i = start; i < start + length; i++) {
            this.data[i] = undefined;
        }

        // Shift all defined elements to the front, pad with undefineds
        const defined = this.data.filter(x => x !== undefined);
        this.data = defined.concat(new Array(this.size - defined.length).fill(undefined));

        return removed;
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

class ThreadContext {
    constructor(name, register) {
        this.name = name;
        this.register = register;
        this.pointer = 0;
        this.active = true;
        this.didJump = false;
    }

    static clearAllThreads() {
        for (let thread of Object.values(PC.threadPool)) {
            thread.pointer = 0;
            thread.active = true;
            thread.didJump = false;
            thread.register.setBlockData(new Array(thread.register.size).fill(undefined));
        }
    }

    clear() {
        this.register.setBlockData(new Array(this.register.size).fill(undefined));
    }

    getInstructionIndexes() {
        let indexes = [];
        for (let i = 0; i < this.register.data.length; i++) {
            indexes.push(i);
            i += this.register.data[i] - 1;
        }
        return indexes;
    }

    getInstuctionIndexes(array){
        let indexes = [];
        for (let i = 0; i < array.length; i++) {
            indexes.push(i);
            i += array[i] - 1;
        }
        return indexes;
    }

    getProperJumpReturnRegister(){
        if (this.name == "thread_0") return thread_0_jr;
        else if (this.name == "thread_1") return thread_1_jr;
        else if (this.name == "thread_2") return thread_2_jr;
        else if (this.name == "thread_3") return thread_3_jr;
        else if (this.name == "thread_4") return thread_4_jr;
        else if (this.name == "thread_5") return thread_5_jr;
        else if (this.name == "thread_6") return thread_6_jr;
        else if (this.name == "thread_7") return thread_7_jr;
        else if (this.name == "thread_8") return thread_8_jr;
        else if (this.name == "thread_9") return thread_9_jr;
    }

    executeNextInstruction(){
        let instructionStart = this.pointer;
        let instructionLength = this.register.data[instructionStart]

        if(instructionLength == undefined){
            if(PC.options.logEmptyThreads && this.name != "thread_0") PC.log(`No instructions to execute`, [this.name, 'LOG'])
            else if(this.name == "thread_0") PC.log(`No instructions to execute`, [this.name, 'LOG']);
            return;
        }
        
        PC.log(`Executing instruction at index ${instructionStart} in thread ${this.name}`, [this.name,'FOUND']);

        let instruction = this.register.data.slice(instructionStart, instructionStart + instructionLength);
        if(instruction == undefined && instruction.length == 0){
            if(PC.options.logEmptyThreads && this.name != "thread_0") PC.log(`No instructions to execute`, [this.name, 'LOG'])
            else if(this.name == "thread_0") PC.log(`No instructions to execute`, [this.name, 'LOG']);
        } else {

            if (instruction.length !== instructionLength) {
                PC.halt(`Instruction length mismatch: expected ${instructionLength}, got ${instruction.length}`, [this.name, 'MACHINE CODE']);
                return;
            }

            this.instruct(instruction);

            PC.diagnostics.instructionsProcessed++;
            let size = this.register.data[this.pointer];

            if (!this.didJump) {
                if(size != undefined) this.pointer += size;
            } else {
                this.didJump = false;
            }
        }
    }

    instruct(array) {
        let opCode = array[1];
        let args = array.slice(2);

        if(opCode == undefined){
            PC.halt(`Opcode is undefined. Most likely forgot to add it to the OPCODE object`, [this.name,'MACHINE CODE']);
            return;
        }

        PC.log(`Executing instruction with opcode: ${opCode}, args: ${args}`, [this.name,'MACHINE CODE', 'INFO']);

        if (PC.mapOpcode(opCode) == null) {
            PC.halt(`Invalid syntax: Malformed instruction with opcode ${opCode}. Length may not be correct?`, [this.name,'MACHINE CODE']);
            return;
        }
        if (PC.mapOpcode(opCode) === -1) {
            PC.halt(`Invalid opcode: ${opCode} is not a valid opcode`, [this.name,'MACHINE CODE']);
            return;
        }

        let instructionName = PC.mapOpcode(opCode);
        PC.log(`Instruction name: ${instructionName}`, [this.name,'MACHINE CODE', 'INFO']);

        switch (instructionName) {
            case 'store': {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for store: expected 2, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }
                let address = args[0];
                let value = args[1];

                if (address < 0 || address >= ram.data.length) {
                    PC.halt(`Address out of bounds for store: ${address}`, [this.name,'MACHINE CODE']);
                    return;
                }
                if (typeof value !== 'number' || value < 0 || value > 0xffff) {
                    PC.halt(`Invalid value for store: ${value}`, [this.name,'MACHINE CODE']);
                    return;
                }

                ram.setByte(address, value);
                PC.log(`Stored value ${value} at address ${address} in RAM`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "print_c": {
                if(args.length == 1){
                    let value = args[0];

                    if (ram.data[value] === undefined) {
                        PC.halt(`Address ${value} in RAM does not exist for print_c`, [this.name,'MACHINE CODE']);
                        return;
                    }

                    let char = characterBlockVisualized()[ram.data[value]];

                    if (char == undefined) {
                        PC.log(`Character at index ${ram.data[value]} does not exist. Displaying first character instead`, [this.name,'MACHINE CODE', 'WARN']);
                        char = characterBlockVisualized()[0];
                    }

                    PC.log(`Character: '${char}'`, [this.name,'MACHINE CODE', 'PROGRAM LOG']);
                    PC.log(`Printed character from RAM at address ${value}: ${char}`, [this.name,'MACHINE CODE', 'SUCCESS']);
                } else {
                    let str = '';
                    args.forEach(arg => {
                        if (ram.data[arg] === undefined) {
                            PC.halt(`Address ${arg} in RAM does not exist for print_c`, [this.name,'MACHINE CODE']);
                            return;
                        }

                        let char = characterBlockVisualized()[ram.data[arg]];

                        if (char == undefined) {
                            PC.log(`Character at index ${ram.data[arg]} does not exist. Displaying first character instead`, [this.name,'MACHINE CODE', 'WARN']);
                            char = characterBlockVisualized()[0];
                        }

                        str += char;
                    })

                    PC.log(`String: '${str}'`, ['MACHINE CODE', 'PROGRAM LOG']);
                    PC.log(`Printed string from RAM at addresses ${args.join(', ')}: ${str}`, [this.name,'MACHINE CODE', 'SUCCESS']);
                }

            } break;

            case "print": {
                let value = args[0];

                if (args.length !== 1) {
                    PC.halt(`Invalid number of arguments for print: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (ram.data[value] === undefined) {
                    PC.halt(`Address ${value} in RAM does not exist for print`, [this.name,'MACHINE CODE']);
                    return;
                }

                PC.log("Number: " + ram.data[value], ['MACHINE CODE', 'PROGRAM LOG']);
                PC.log(`Printed value from RAM at address ${value}: ${ram.data[value]}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "set_pixel": {
                if (args.length !== 5) {
                    PC.halt(`Invalid number of arguments for set_pixel: expected 5, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let xAddress = ram.data[args[0]];
                let yAddress = ram.data[args[1]];
                let backColorAddress = ram.data[args[2]];
                let foreColorAddress = ram.data[args[3]];
                let characterAddress = ram.data[args[4]];

                if (xAddress === undefined || yAddress === undefined || backColorAddress === undefined || foreColorAddress === undefined || characterAddress === undefined) {
                    PC.halt(`One or more addresses in set_pixel do not exist in RAM`, [this.name,'MACHINE CODE']);
                    return;
                }

                let x = xAddress;
                let y = yAddress;
                let backColor = colorBlockVisualized()[backColorAddress];
                let foreColor = colorBlockVisualized()[foreColorAddress];
                let character = characterBlockVisualized()[characterAddress];
                
                if (character == undefined) {
                    PC.log(`Character at index ${args[4]} does not exist. Displaying first character instead`, [this.name,'MACHINE CODE', 'WARN']);
                    character = characterBlockVisualized()[0];
                }

                let cell = document.getElementById(`cell-${x}-${y}`);
                if (cell == null) {
                    PC.log(`Cell at (${x}, ${y}) does not exist. Skipping`, [this.name,'MACHINE CODE', 'WARN']);
                } else {
                    if (backColor == undefined) {
                        PC.log(`Back color ${args[2]} does not exist. Using #000000 instead`, [this.name,'MACHINE CODE', 'WARN']);
                        backColor = "#000000";
                    }
                    if (foreColor == undefined) {
                        PC.log(`Fore color ${args[3]} does not exist. Using #FFFFFF instead`, [this.name,'MACHINE CODE', 'WARN']);
                        foreColor = "#FFFFFF";
                    }

                    cell.style.backgroundColor = backColor;
                    cell.style.color = foreColor;
                    cell.textContent = character;

                    PC.log(`Set pixel at (${x}, ${y}) with back color ${backColor}, fore color ${foreColor}, character '${character}'`, [this.name,'MACHINE CODE', 'SUCCESS']);
                }


            } break;

            case "add": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for add: expected 2, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddress = args[2];

                if( ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for add`, [this.name,'MACHINE CODE']);
                    return;
                }
                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for add`, [this.name,'MACHINE CODE']);
                    return;
                }

                let result = ram.data[address1] + ram.data[address2];
                if (result > 0xffff) {
                    PC.halt(`Result of addition exceeds byte size: ${result}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (outputAddress < 0 || outputAddress >= ram.data.length) {
                    PC.halt(`Output address out of bounds for add: ${outputAddress}`, [this.name,'MACHINE CODE']);
                    return;
                }

                ram.setByte(outputAddress, result);
                PC.log(`Added values at addresses ${address1} and ${address2}, stored result ${result} at address ${outputAddress}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "subtract": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for subtract: expected 2, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddresss = args[2];

                if(ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for subtract`, [this.name,'MACHINE CODE']);
                    return;
                }
                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for subtract`, [this.name,'MACHINE CODE']);
                    return;
                }
                let result = ram.data[address1] - ram.data[address2];

                if (outputAddresss < 0 || outputAddresss >= ram.data.length) {
                    PC.halt(`Output address out of bounds for subtract: ${outputAddresss}`, [this.name,'MACHINE CODE']);
                    return;
                }

                ram.setByte(outputAddresss, result);

                PC.log(`Subtracted values at addresses ${address1} and ${address2}, stored result ${result} at address ${outputAddresss}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "multiply": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for multiply: expected 2, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddress = args[2];

                if(ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for multiply`, [this.name,'MACHINE CODE']);
                    return;
                }

                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for multiply`, [this.name,'MACHINE CODE']);
                    return;
                }

                let mulResult = ram.data[address1] * ram.data[address2];
                if (mulResult > 0xffff) {
                    PC.halt(`Result of multiplication exceeds byte size: ${mulResult}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (outputAddress < 0 || outputAddress >= ram.data.length) {
                    PC.halt(`Output address out of bounds for multiply: ${outputAddress}`, [this.name,'MACHINE CODE']);
                    return;
                }

                ram.setByte(outputAddress, mulResult);
                PC.log(`Multiplied values at addresses ${address1} and ${address2}, stored result ${mulResult} at address ${outputAddress}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "divide": {
                if (args.length !== 3) {
                    PC.halt(`Invalid number of arguments for divide: expected 2, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let address1 = args[0];
                let address2 = args[1];
                let outputAddress = args[2];

                if(ram.data[address1] === undefined) {
                    PC.halt(`Address ${address1} in RAM does not exist for divide`, [this.name,'MACHINE CODE']);
                    return;
                }

                if(ram.data[address2] === undefined) {
                    PC.halt(`Address ${address2} in RAM does not exist for divide`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (ram.data[address2] === 0) {
                    PC.halt(`Division by zero at address ${address2} in RAM`, [this.name,'MACHINE CODE']);
                    return;
                }

                let divResult = Math.floor(ram.data[address1] / ram.data[address2]);
                if (divResult < -0xffff || divResult > 0xffff) {
                    PC.halt(`Result of division is out of bounds: ${divResult}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (outputAddress < 0 || outputAddress >= ram.data.length) {
                    PC.halt(`Output address out of bounds for divide: ${outputAddress}`, [this.name,'MACHINE CODE']);
                    return;
                }
                ram.setByte(outputAddress, divResult);
                PC.log(`Divided values at addresses ${address1} and ${address2}, stored result ${divResult} at address ${outputAddress}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "jump": {
                if (args.length !== 1) {
                    PC.halt(`Invalid number of arguments for jump: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                // calculate the indexes of the instruction register
                let indexes = this.getInstructionIndexes();

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${args[0]}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }

                this.getProperJumpReturnRegister().setByte(0, this.pointer);
                this.pointer = indexes[args[0]];
                this.pointer = true;

                PC.log(`Jumped to instruction at instruction index ${indexes[args[0]]}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "set": {
                if (args.length !== 2){
                    PC.halt(`Invalid number of arguments for set: expected 2, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let srcAddress = args[0];
                let destAddress = args[1];

                if (ram.data[srcAddress] === undefined) {
                    PC.halt(`Source address ${srcAddress} in RAM does not exist for set`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (destAddress < 0 || destAddress >= ram.data.length) {
                    PC.halt(`Destination address out of bounds for set: ${destAddress}`, [this.name,'MACHINE CODE']);
                    return;
                }

                ram.setByte(destAddress, ram.data[srcAddress]);
                PC.log(`Set value from source address ${srcAddress} to destination address ${destAddress}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "jump_if_zero": {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for jump_if_zero: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                // calculate the indexes of the instruction register
                let indexes = this.getInstructionIndexes();

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${args[0]}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (ram.data[args[0]] === 0) {
                    this.getProperJumpReturnRegister().setByte(0, this.pointer);
                    this.pointer = indexes[args[0]];
                    this.pointer = true;
                    PC.log(`Jumped to instruction at instruction index ${indexes[args[0]]} because value is zero`, [this.name,'MACHINE CODE', 'SUCCESS']);
                } else {
                    PC.log(`Did not jump to instruction at index ${indexes[args[0]]} because value is not zero`, [this.name,'MACHINE CODE', 'INFO']);
                }
            } break;

            case "jump_if_not_zero": {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for jump_if_not_zero: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }
                // calculate the indexes of the instruction register
                let indexes = this.getInstructionIndexes();

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${args[0]}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }

                let address = args[0];
                let index = args[1];
                
                if (ram.data[address] === undefined) {
                    PC.halt(`Address ${address} in RAM does not exist for jump_if_not_zero`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (index < 0 || index >= indexes.length) {
                    PC.halt(`Jump address out of bounds: ${index}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if(ram.data[address] !== 0) {
                    this.getProperJumpReturnRegister().setByte(0, this.pointer);
                    this.pointer = indexes[index];
                    this.didJump = true;
                    PC.log(`Jumped to instruction at instruction index ${indexes[index]} because value is not zero`, [this.name,'MACHINE CODE', 'SUCCESS']);
                } else {
                    PC.log(`Did not jump to instruction at index ${indexes[index]} because value is zero`, [this.name,'MACHINE CODE', 'INFO']);
                }
            } break;

            case "halt": {
                PC.log(`Halting execution at instruction pointer ${this.pointer}`, [this.name,'MACHINE CODE', 'INFO']);
                this.pointer = 0;
                ThreadContext.clearAllThreads();
                PC.log("Instruction interpretation stopped", [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "return": {
                if (args.length !== 0) {
                    PC.halt(`Invalid number of arguments for return: expected 0, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (this.getProperJumpReturnRegister().data[0] === undefined) {
                    PC.log(`Jump-return register is empty, ignoring`, [this.name,'MACHINE CODE', 'WARN']);
                    return;
                }

                this.pointer = this.getProperJumpReturnRegister().data[0];
                this.getProperJumpReturnRegister().data[0] = undefined;

                PC.log(`Jumping to return address ${this.pointer} from jump-return register`, [this.name,'MACHINE CODE', 'FOUND', 'SUCCESS']);
            } break;

            case "goto": {
                if (args.length !== 1) {
                    PC.halt(`Invalid number of arguments for goto: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }

                // calculate the indexes of the instruction register
                let indexes = this.getInstructionIndexes();

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Goto address out of bounds: ${args[0]}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }

                this.pointer = indexes[args[0]];
                PC.log(`Goto instruction at instruction index ${indexes[args[0]]}`, [this.name,'MACHINE CODE', 'SUCCESS']);
            } break;

            case "goto_if_zero": {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for goto_if_zero: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }
                // calculate the indexes of the instruction register
                let indexes = this.getInstructionIndexes();

                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Goto address out of bounds: ${args[0]}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }

                if (ram.data[args[0]] === undefined) {
                    PC.halt(`Address ${args[0]} in RAM does not exist for goto_if_zero`, [this.name,'MACHINE CODE']);
                    return;
                }
                if (ram.data[args[0]] === 0) {
                    this.pointer = indexes[args[1]];
                    PC.log(`Goto instruction at instruction index ${indexes[args[1]]} because value is zero`, [this.name,'MACHINE CODE', 'SUCCESS']);
                } else {
                    PC.log(`Did not goto instruction at index ${indexes[args[1]]} because value is not zero`, [this.name,'MACHINE CODE', 'INFO']);
                }
            } break;

            case "goto_if_not_zero": {
                if (args.length !== 2) {
                    PC.halt(`Invalid number of arguments for goto_if_not_zero: expected 1, got ${args.length}`, [this.name,'MACHINE CODE']);
                    return;
                }
                // calculate the indexes of the instruction register
                let indexes = this.getInstructionIndexes();
                if (args[0] < 0 || args[0] >= indexes.length) {
                    PC.halt(`Goto address out of bounds: ${args[0]}, max ${indexes.length - 1}`, [this.name,'MACHINE CODE']);
                    return;
                }
                if (ram.data[args[0]] === undefined) {
                    PC.halt(`Address ${args[0]} in RAM does not exist for goto_if_not_zero`, [this.name,'MACHINE CODE']);
                    return;
                }
                if (ram.data[args[0]] !== 0) {
                    this.pointer = indexes[args[1]];
                    PC.log(`Goto instruction at instruction index ${indexes[args[1]]} because value is not zero`, [this.name,'MACHINE CODE', 'SUCCESS']);
                } else {
                    PC.log(`Did not goto instruction at index ${indexes[args[1]]} because value is zero`, [this.name, 'MACHINE CODE', 'INFO']);
                }
            } break;

            case "thread": {
                const threadIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                let threadId = args[0];
                let n = args[1];

                if (threadIndexes[threadId] === undefined) {
                    PC.halt(`Thread ID ${threadId} is out of bounds`, ['MACHINE CODE']);
                    return;
                }

                const threadKey = `thread_${threadIndexes[threadId]}`;
                const thread = PC.threadPool.get(threadKey);
                if (!thread) {
                    PC.halt(`Thread ${threadKey} does not exist`, ['MACHINE CODE']);
                    return;
                }

                // Start just after current instruction
                let cursor = this.pointer + array.length;
                let totalLength = 0;

                for (let i = 0; i < n; i++) {
                    const instrLen = this.register.data[cursor];
                    if (instrLen === undefined) {
                        PC.halt(`Unexpected end of instruction block while reading thread contents`, ['MACHINE CODE']);
                        return;
                    }
                    totalLength += instrLen;
                    cursor += instrLen;
                }

                // Remove from main and transfer to thread
                const removed = this.register.removeIndexes(this.pointer + array.length, totalLength);
                thread.register.pushBlockData(removed);

                PC.log(`Moved ${n} instruction(s) to ${threadKey}`, [this.name, 'MACHINE CODE', 'SUCCESS']);
                break;
            }

            case "nop": {} break;

            case "clear": {
                this.clear()
            } break;

            default: {
                PC.halt(`Instruction opcode: ${opCode}, name: ${instructionName}, is not defined`, ['MACHINE CODE']);
                return;
            }
        }
    }
}

class PC {
    static blocks = {};
    static mem = new Array(0xffff).fill(null);
    static Clock = null;
    static instructionPointer = 0;
    static threadPool = new Map();
    static on = false;
    static inputListener;

    static halt(message, prefixes = []){
        PC.log(message, prefixes.concat(['ERROR']));
        PC.powerOff();
    }

    static options = {
        logging: true,
        logCycle: false,
        simpleLog: false,
        logFilter: ["PROGRAM LOG", "ERROR", "WARN"],
        msPerCycle: 20, // 20,
        omitThreadPrefix: false,
        logEmptyThreads: false,
    }

    static diagnostics = {
        instructionsProcessed: 0,
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
            "ASSEMBLY": 'color: #C4C400; font-weight: bold;',
            "FILESYSTEM": 'color: #C4C4C4; font-weight: bold;',
            "thread_0": 'color: #F34EF3; font-weight: bold;',
            "thread_1": 'color: #F34EF3; font-weight: bold;',
            "thread_2": 'color: #F34EF3; font-weight: bold;',
            "thread_3": 'color: #F34EF3; font-weight: bold;',
            "thread_4": 'color: #F34EF3; font-weight: bold;',
            "thread_5": 'color: #F34EF3; font-weight: bold;',
            "thread_6": 'color: #F34EF3; font-weight: bold;',
            "thread_7": 'color: #F34EF3; font-weight: bold;',
            "thread_8": 'color: #F34EF3; font-weight: bold;',
            "thread_9": 'color: #F34EF3; font-weight: bold;',
            "interrupt": 'color: #000000; font-weight: bold;',
        };

        let formatString = '';
        let styleArray = [];

        for (let prefix of prefixes) {
            if (PC.options.omitThreadPrefix && prefix.startsWith("thread_")) continue;
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

    static compileToMachineCode(assemblyString){
        if(PC.on == false) return;
        let lines = assemblyString.trim().split(/\n/).map(line => line.trim()).filter(line => line.length > 0);

        PC.log(`Compiling assembly code to machine code`, ['ASSEMBLY']);

        let result = [];
        for(let line of lines){
            let parts = line.split(' ');
            parts[0] = ASSEMBLY_MAP[parts[0].toLowerCase()];

            if(parts[0] == undefined){
                PC.log(`Invalid instruction: ${line}`, ['ASSEMBLY', 'ERROR']);
                return [2, OPCODE.clear]
            }

            parts.forEach((part, index) => {
                if(typeof part !== 'number' && !isNaN(part)){
                    parts[index] = parseInt(part, 10);
                }
            });

            result.push(parts.length + 1)
            result.push(...parts)
        }

        return result
    }

    static resetVolatileMemory() {
        ram.setBlockData(new Array(ram.size).fill(undefined));
        ThreadContext.clearAllThreads();
        // delete all threads, threadPool is a set
        PC.threadPool.forEach((thread, name) => {
            thread.pointer = 0;
            thread.active = false;
            thread.didJump = false;
            thread.register.setBlockData(new Array(thread.register.size).fill(undefined));
        });

        // filesystem.setBlockData(new Array(filesystem.size).fill(undefined));
        PC.threadPool = new Map();
        PC.cycles = 0;
        clearInterval(PC.Clock);
        PC.diagnostics.instructionsProcessed = 0;
        PC.Clock = null;
        PC.clearScreen();
    }

    static createFile(name, body, type){
        if(name.match(/[a-zA-Z0-9_]+/) === null){
            PC.halt(`Invalid file name: ${name}. Only alphanumeric characters and underscores are allowed.`, ['FILESYSTEM']);
            return;
        }
        if(body.length > 0x7FFF - filesystem.start){
            PC.halt(`File body exceeds maximum size of ${0x7FFF - filesystem.start} bytes`, ['FILESYSTEM']);
            return;
        }
        if(["␀", "␂", "␃", "␄", "␜", "␟"].includes(name)){
            PC.halt(`Invalid characters in file name: ${name}`, ['FILESYSTEM']);
            return;
        }
        if(["␀", "␂", "␃", "␄", "␜", "␟"].some(char => body.includes(char))){
            PC.halt(`Invalid characters in file body`, ['FILESYSTEM']);
            return;
        }

        const typeMap = {
            "txt": 0, // text
            "a": 1, // assembly
        }

        let fileType = typeMap[type] ?? 0;

        let file = ["␜",  fileType.toString(), "␟", ...name, "␟", ...body, "␜"];

        file = file.map(x => charactersToCode(x)[0]);

        return file;
    }

    static powerOn(){
        // get everything from the startup block and put it into the instruction register
        PC.on = true;
        PC.log("Power on", ['MACHINE STATE']);

        PC.addThread("thread_0", thread_0);
        PC.addThread("thread_1", thread_1);
        PC.addThread("thread_2", thread_2);
        PC.addThread("thread_3", thread_3);
        PC.addThread("thread_4", thread_4);
        PC.addThread("thread_5", thread_5);
        PC.addThread("thread_6", thread_6);
        PC.addThread("thread_7", thread_7);
        PC.addThread("thread_8", thread_8);
        PC.addThread("thread_9", thread_9);
        PC.addThread("interrupt", interrupt_thread);

        thread_0.setBlockData([...startup_register.data]);

        PC.inputListener = (event) => {
            event.preventDefault();
            let key = event.key;
            if(key == "Enter") key = "\n";

            if(key.length != 1) key = "¤"

            let keyCode = charactersToCode(key)[0];

            let machineCode = [
                4, OPCODE.store, 2550, keyCode,
                3, OPCODE.print_c, 2550,
            ]

            interrupt_thread.pushBlockData(machineCode);
        };

        document.body.addEventListener('keyup', PC.inputListener);

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

            // for each thread in the thread pool, execute the instruction

            PC.threadPool.forEach((thread, name) => {
                thread.executeNextInstruction();
            });

            PC.cycles++;
        }, PC.options.msPerCycle);
    }

    static powerOff(){
        PC.on = false;
        PC.resetVolatileMemory();
        document.body.removeEventListener("keyup", PC.inputListener);
        setTimeout(() => {
            PC.log("Power off", ['MACHINE STATE']);
        }, 10)
    }

    static addThread(name, register){
        if(PC.threadPool.has(name)){
            PC.halt(`Thread with name ${name} already exists`, ['MACHINE STATE']);
            return;
        }

        PC.threadPool.set(name, new ThreadContext(name, register));
        PC.log(`Thread ${name} partitioned`, ['MACHINE STATE']);
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
    goto_if_zero: 14,
    goto_if_not_zero: 15,
    set_pixel: 16,
    nop: 17,
    clear: 18,
    thread: 19,
}

const ASSEMBLY_MAP = {
    // assembly mappings
    halt: OPCODE.halt,
    store: OPCODE.store,
    set: OPCODE.set,
    print: OPCODE.print,
    printc: OPCODE.print_c,
    add: OPCODE.add,
    sub: OPCODE.subtract,
    mul: OPCODE.multiply,
    div: OPCODE.divide,
    jmp: OPCODE.jump,
    jmpfz: OPCODE.jump_if_zero,
    jmpnz: OPCODE.jump_if_not_zero,
    ret: OPCODE.return,
    goto: OPCODE.goto,
    gotofz: OPCODE.goto_if_zero,
    gotonz: OPCODE.goto_if_not_zero,
    spix: OPCODE.set_pixel,
    nop: OPCODE.nop,
    clear: OPCODE.clear,
    thread: OPCODE.thread,
}



let colorBlock = new Block("colors", 0, 47); // 16*3 = 48
let characterBlock = new Block("character_map", 48, 303); // 255
let ram = new Block("RAM", 304, 2854);

let thread_0 = new Block("thread_0", 2855, 4855);
let thread_0_jr = new Block("thread_0_jr", 4856, 4856);

let thread_1 = new Block("thread_1", 4857, 6857);
let thread_1_jr = new Block("thread_1_jr", 6858, 6858);

let thread_2 = new Block("thread_2", 6859, 8859);
let thread_2_jr = new Block("thread_2_jr", 8860, 8860);

let thread_3 = new Block("thread_3", 8861, 10861);
let thread_3_jr = new Block("thread_3_jr", 10862, 10862);

let thread_4 = new Block("thread_4", 10863, 12863);
let thread_4_jr = new Block("thread_4_jr", 12864, 12864);

let thread_5 = new Block("thread_5", 12865, 14865);
let thread_5_jr = new Block("thread_5_jr", 14866, 14866);

let thread_6 = new Block("thread_6", 14867, 16867);
let thread_6_jr = new Block("thread_6_jr", 16868, 16868);

let thread_7 = new Block("thread_7", 16869, 18869);
let thread_7_jr = new Block("thread_7_jr", 18870, 18870);

let thread_8 = new Block("thread_8", 18871, 20871);
let thread_8_jr = new Block("thread_8_jr", 20872, 20872);

let thread_9 = new Block("thread_9", 20873, 22873);
let thread_9_jr = new Block("thread_9_jr", 22874, 22874);

let startup_register = new Block("startup", 22875, 24875);

let inputBuffer = new Block("input_buffer", 24876, 24876+255);
let interrupt_thread = new Block("interrupt_thread", 25132, 25132+50);

// shits fucked bc threads dont autoclear inputs. make that happen

// let filesystem = new Block("filesystem", 0x612C, 0xFFFF);

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
    0x0, 0x20,  // space , 00
    0x0, 0x61,  // a     , 01
    0x0, 0x62,  // b     , 02
    0x0, 0x63,  // c     , 03
    0x0, 0x64,  // d     , 04
    0x0, 0x65,  // e     , 05
    0x0, 0x66,  // f     , 06
    0x0, 0x67,  // g     , 07
    0x0, 0x68,  // h     , 08
    0x0, 0x69,  // i     , 09
    0x0, 0x6A,  // j     , 10
    0x0, 0x6B,  // k     , 11
    0x0, 0x6C,  // l     , 12
    0x0, 0x6D,  // m     , 13
    0x0, 0x6E,  // n     , 14
    0x0, 0x6F,  // o     , 15
    0x0, 0x70,  // p     , 16
    0x0, 0x71,  // q     , 17
    0x0, 0x72,  // r     , 18
    0x0, 0x73,  // s     , 19
    0x0, 0x74,  // t     , 20
    0x0, 0x75,  // u     , 21
    0x0, 0x76,  // v     , 22
    0x0, 0x77,  // w     , 23
    0x0, 0x78,  // x     , 24
    0x0, 0x79,  // y     , 25
    0x0, 0x7A,  // z     , 26
    0x0, 0x41,  // A     , 27
    0x0, 0x42,  // B     , 28
    0x0, 0x43,  // C     , 29
    0x0, 0x44,  // D     , 30
    0x0, 0x45,  // E     , 31
    0x0, 0x46,  // F     , 32
    0x0, 0x47,  // G     , 33
    0x0, 0x48,  // H     , 34
    0x0, 0x49,  // I     , 35
    0x0, 0x4A,  // J     , 36
    0x0, 0x4B,  // K     , 37
    0x0, 0x4C,  // L     , 38
    0x0, 0x4D,  // M     , 39
    0x0, 0x4E,  // N     , 40
    0x0, 0x4F,  // O     , 41
    0x0, 0x50,  // P     , 42
    0x0, 0x51,  // Q     , 43
    0x0, 0x52,  // R     , 44
    0x0, 0x53,  // S     , 45
    0x0, 0x54,  // T     , 46
    0x0, 0x55,  // U     , 47
    0x0, 0x56,  // V     , 48
    0x0, 0x57,  // W     , 49
    0x0, 0x58,  // X     , 50
    0x0, 0x59,  // Y     , 51
    0x0, 0x5A,  // Z     , 52
    0x0, 0x30,  // 0     , 53
    0x0, 0x31,  // 1     , 54
    0x0, 0x32,  // 2     , 55
    0x0, 0x33,  // 3     , 56
    0x0, 0x34,  // 4     , 57
    0x0, 0x35,  // 5     , 58
    0x0, 0x36,  // 6     , 59
    0x0, 0x37,  // 7     , 60
    0x0, 0x38,  // 8     , 61
    0x0, 0x39,  // 9     , 62
    0x0, 0x21,  // !     , 63
    0x0, 0x3F,  // ?     , 64
    0x0, 0x2C,  // ,     , 65
    0x0, 0x2E,  // .     , 66
    0x0, 0x3A,  // :     , 67
    0x0, 0x3B,  // ;     , 68
    0x0, 0x27,  // '     , 69
    0x0, 0x22,  // "     , 70
    0x0, 0x2D,  // -     , 71
    0x0, 0x2B,  // +     , 72
    0x0, 0x2F,  // /     , 73
    0x0, 0x2A,  // *     , 74
    0x0, 0x5F,  // _     , 75
    0x0, 0x3D,  // =     , 76
    0x0, 0x28,  // (     , 77
    0x0, 0x29,  // )     , 78
    0x0, 0x5B,  // [     , 79
    0x0, 0x5D,  // ]     , 80
    0x0, 0x7B,  // {     , 81
    0x0, 0x7D,  // }     , 82
    0x0, 0x3C,  // <     , 83
    0x0, 0x3E,  // >     , 84
    0x0, 0x5C,  // \     , 85
    0x0, 0x7E,  // ~     , 86
    0x0, 0x40,  // @     , 87
    0x0, 0x23,  // #     , 88
    0x0, 0x24,  // $     , 89
    0x0, 0x25,  // %     , 90
    0x0, 0x5E,  // ^     , 91
    0x0, 0x26,  // &     , 92
    0x24, 0x00, // ␀    , 93  : null
    0x24, 0x02, // ␂    , 94  : start of text
    0x24, 0x03, // ␃    , 95  : end of text
    0x24, 0x04, // ␄    , 96  : end of transmission
    0x24, 0x1C, // ␜    , 97  : file separator
    0x24, 0x1F, // ␟    , 98  : unit separator
    0x00, 0x0A, // \n    , 99  : line feed
    0x00, 0xA4  // ¤     , 100 : unknown character
]);

const characterBlockVisualized = () => characterBlock.visualize((data) => {
    return data.filter(v => v !== undefined).map(v => v.toString(16).padStart(2, '0').toUpperCase()).join("").match(/.{1,4}/g).map(v => {
        return String.fromCharCode(parseInt(v, 16))
    });
})

const colorBlockVisualized = () => colorBlock.visualize((data) => {
    return data.filter(v => v !== undefined).map(v => v.toString(16).toUpperCase().padStart(2, '0')).join("").match(/.{1,6}/g).map(v => "#"+v);
})

const getFileSystem = () => filesystem.visualize((data) => {
    return data.filter(v => v !== undefined).map(v => v.toString(16).padStart(2, '0').toUpperCase()).join("").match(/.{1,4}/g).map(v => {
        return String.fromCharCode(parseInt(v, 16))
    }).join("");
})

const charactersToCode = (str) => {
    let arr = [];
    str.split('').forEach(char => {
        let code = characterBlockVisualized().indexOf(char)

        if(code == -1){
            // if the character is not found, use the last character in the block
            code = characterBlockVisualized().length - 1;
        }

        arr.push(code);
    })

    return arr;
}

const codeToCharacters = (arr) => {
    let str = "";
    arr.forEach(code => {
        let char = characterBlockVisualized()[code];
        if(char == undefined){
            // if the character is not found, use the last character in the block
            char = characterBlockVisualized()[characterBlockVisualized().length - 1];
        }
        str += char;
    })

    return str;
}

startup_register.setBlockData([
// Store values in registers

]);