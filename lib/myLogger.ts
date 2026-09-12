// -------------------------------------------------
// Custom Logger
// -------------------------------------------------

export class Logger {
    private readonly name: string;
    private startTime = 0;

    private ms = true; // milliseconds precision for timer logs

    private levels = {
        DEBUG: 0,
        INFO: 1,
        WARNING: 2,
        ERROR: 3,
        CRITICAL: 4
    }
    private currentLevel = this.levels.DEBUG; // default log level

    constructor(name: string = "record", allow_ms: boolean = true) {
        this.name = name;
        this.ms = allow_ms;
    }

    private getTime(): string {
        const now = new Date();

        if (this.ms)    return `${now.toLocaleString("sv-SE")}.${now.getMilliseconds().toString().padStart(3, "0")}`; // YYYY-MM-DD hh:mm:ss.SSS
        else            return `${now.toLocaleString("sv-SE")}`; // YYYY-MM-DD hh:mm:ss
    }
    private log(message: string, level: keyof typeof this.levels) {
        if (this.levels[level] >= this.currentLevel) {
            console.log(`[${level}][${this.name}] ${this.getTime()} \n${message}`);
        }
    }



    public setLevel(level: keyof typeof this.levels) {
        this.currentLevel = this.levels[level];
    }



    //====    custom log methods   ====
    public debug(message: string) { this.log(message, "DEBUG"); }
    public info(message: string) { this.log(message, "INFO"); }
    public warning(message: string) { this.log(message, "WARNING"); }
    public error(message: string) { this.log(message, "ERROR"); }
    public critical(message: string) { this.log(message, "CRITICAL"); }



    //====    timer log methods   ====
    public startTimer() {
        this.startTime = performance.now();
    }
    public endTimer(message: string = "", level: keyof typeof this.levels = "DEBUG") {
        const elapsed = (performance.now() - this.startTime) / 1000;
        this.log(`${message} \nElapsed: ${elapsed.toFixed(3)} sec`, level);
    }
}
// export const globalLogger = new Logger("global", true);