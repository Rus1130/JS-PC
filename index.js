class Block {
    constructor(name, start, end){
        if(end-start < 0 || end-start > 256){
            console.error(`Invalid block size for ${name}: start=${start}, end=${end}. Size must be between 0 and 255.`);
            return;
        }
        this.data = new Array(end - start + 1).fill(-1); // Initialize with zeros
        this.start = start;
        this.end = end;
        this.name = name;
        PC.blocks[name] = this;
    }

    setBlockData(data){
        // 1. turn data into a string of 3-digit numbers
        // 2. pad it to 768 characters with zeros, to make sure its 256 bytes
        // 3. split it into 3-character chunks
        // 4. convert each chunk to an integer
        if(data.length > 256) {
            console.error(`Data length exceeds 256 bytes for block ${this.name}: ${data.length}`);
            return;
        }
        this.data = data;

        this.data.forEach((byte, index) => {
            PC.mem[this.start + index] = byte;
        });
    }

    setByte(index, value){
        if (index < 0 || index >= this.data.length) {
            if(PC.logging) console.error(`Index out of bounds for block ${this.name}: ${index}`);
            return;
        }
        if (typeof value !== 'number' || value < 0 || value > 256) {
            if(PC.logging) console.error(`Invalid byte value for block ${this.name}: ${value}`);
            return;
        }
        this.data[index] = value;

        PC.mem[this.start + index] = value;
    }
    
    indexToAddress(index){
        if (index < 0 || index > this.data.length - 1) {
            if(PC.logging) console.error(`Index out of bounds for block ${this.name}: ${index}`);
            return null;
        }
        return this.start + index;
    }

    visualize(custom_fn){
        if (typeof custom_fn !== 'function') {
            if(PC.logging) console.error(`Custom visualization function is not a function for block ${this.name}`);
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
    static mem = new Array(0xfffff).fill(-1);
    static cycle = null;

    static powerOn(){
        PC.cycle = setInterval(() => {
            for(let b in PC.blocks){
                let block = PC.blocks[b];
                for (let b2 in PC.blocks) {
                    if (b !== b2) {
                        let block2 = PC.blocks[b2];
                        if (block.start <= block2.end && block.end >= block2.start) {
                            if(PC.logging) console.error(`Memory block overlap detected between block ${b} and block ${b2}`);
                            clearInterval(PC.cycle);
                            PC.cycle = null;
                            return;
                        }
                    }
                }
                if(block.end - block.start > PC.mem.length){
                    if(PC.logging) console.error(`Memory block ${b} exceeds available memory size`);
                    clearInterval(PC.cycle);
                    PC.cycle = null;
                    return;
                }
            }
        }, 1)
    }

    static powerOff(){
        if (PC.cycle) {
            clearInterval(PC.cycle);
            PC.cycle = null;
        }
    }

    static instructionMap(name){
        const map = {
            "put": 0,
        }

        return map[name] ?? null;
    }

    static logging = false;

    static instruct(instructionIndex, ...args) {
        if(typeof instructionIndex === "string") instructionIndex = PC.instructionMap(instructionIndex);
        if(instructionIndex === null) {
            if(PC.logging) console.error(`Invalid instruction name: ${instructionIndex}`);
            return;
        }

        const instructionMap = {
            put: (blockIndex, addressIndex, value) => {
                if (blockIndex < 0 || blockIndex >= Object.keys(PC.blocks).length) {
                    if(PC.logging) console.error(`Invalid block index: ${blockIndex}`);
                    return;
                }
                const blockName = Object.keys(PC.blocks)[blockIndex];
                const block = PC.blocks[blockName]; 
                const address = block.indexToAddress(addressIndex);
                if (address === null) {
                    if(PC.logging) console.error(`Invalid address for block ${blockName} at index ${addressIndex}`);
                    return;
                }
                PC.blocks[blockName].setByte(addressIndex, value);
                if(PC.logging) console.log(`Set value ${value} at address ${address} in block ${blockName}`);
            }
        }

        const instruction = Object.keys(instructionMap)[instructionIndex];
        if (!instruction) {
            if(PC.logging) console.error(`Invalid instruction index: ${instructionIndex}`);
            return;
        }

        if(PC.logging) console.log(`Executing instruction: ${instruction} with args: ${args}`);

        if (instructionMap[instruction]) {
            instructionMap[instruction](...args);
        }
    }
}

let colors = new Block("colors", 0, 47); // 16
let character_map = new Block("character_map", 48, 49+0xFF); // 255

colors.setBlockData([
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

character_map.setBlockData([
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