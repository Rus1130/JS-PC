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

    instruct(){

    }
}

let RAM = new Block("RAM", 0x0000, 0x0f00);