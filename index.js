class Block {
    constructor(name, start, end){
        this.data = new Array(end-start).fill(0);
        this.start = start;
        this.end = end;
        PC.blocks[name] = this;
    }

    asCharArray(){
        return this.data.map(byte => String.fromCharCode(byte));
    }
}

            // "000000",
            // "0000C4",
            // "00C400",
            // "00C4C4",
            // "C40000",
            // "C400C4",
            // "C47E00",
            // "C4C4C4",
            // "4E4E4E",
            // "4E4EDC",
            // "4EDC4E",
            // "4EF3F3",
            // "DC4E4E",
            // "F34EF3",
            // "F3F34E",
            // "FFFFFF",

class PC {
    static blocks = {};
    static mem = new Array(0xffff).fill(null);
    static cycle = null;

    static powerOn(){
        PC.cycle = setInterval(() => {
            for(let b in PC.blocks){
                let block = PC.blocks[b];
                PC.mem.splice(block.start, block.end - block.start, ...block.data);
            }
        }, 1)
    }

    static powerOff(){
        if (PC.cycle) {
            clearInterval(PC.cycle);
            PC.cycle = null;
        }
    }

    instruct(instruction, ...args) {
        // Handle instruction execution
        // This is a placeholder for the actual instruction handling logic
        console.log(`Executing instruction: ${instruction} with args: ${args}`);

        switch(instruction){
            case "pxl": {
                let [x, y, color] = args;
                if (x < 0 || x >= 80 || y < 0 || y >= 60) {
                    console.error("Pixel coordinates out of bounds");
                    return;
                }
                let index = (y * 80 + x) * 3; // Each pixel is represented by 3 bytes (RGB)
                RAM.data[index] = color[0];     // R
                RAM.data[index + 1] = color[1]; // G
                RAM.data[index + 2] = color[2]; // B
            } break;
        }

    }
}

            // "000000",
            // "0000C4",
            // "00C400",
            // "00C4C4",
            // "C40000",
            // "C400C4",
            // "C47E00",
            // "C4C4C4",
            // "4E4E4E",
            // "4E4EDC",
            // "4EDC4E",
            // "4EF3F3",
            // "DC4E4E",
            // "F34EF3",
            // "F3F34E",
            // "FFFFFF",

let screen_data = new Block("screen_data", 0x0000, 0x12C0 * 4); // 4800
console.log(screen_data)