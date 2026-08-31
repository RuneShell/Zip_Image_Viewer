abstract class HTMLVanillaObject{

    // Freeze the object to prevent further modifications
    private isFrozen: boolean = false;
    public freeze() {
        this.isFrozen = true;
    }
    public unfreeze() {
        this.isFrozen = false;
    }
}

export class Application extends HTMLVanillaObject {
    // Singleton Pattern
    private static instance: Application;
    private constructor() {
        super();
    } // prevents new() from being called on this class
    public static getInstance(): Application {
        if (!Application.instance) Application.instance = new Application();
        return Application.instance;
    }
    
    // Fullscreen
    private fullscreen: boolean = false;
    public async toggleFullscreen() {
        this.freeze();

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            this.fullscreen = false;
        } else{
            await document.documentElement.requestFullscreen();
            this.fullscreen = true;
        }

        this.unfreeze();
    }
}
export const application = Application.getInstance();


export class LeftSidebar extends HTMLVanillaObject {
    // Singleton Pattern
    private static instance: LeftSidebar;
    private constructor() {
        super();
    } // prevents new() from being called on this class
    public static getInstance(): LeftSidebar {
        if (!LeftSidebar.instance) LeftSidebar.instance = new LeftSidebar();
        return LeftSidebar.instance;
    }

}
export const leftSidebar = LeftSidebar.getInstance();


export class RightSidebar extends HTMLVanillaObject {
    // Singleton Pattern
    private static instance: RightSidebar;
    private constructor() {
        super();
    } // prevents new() from being called on this class
    public static getInstance(): RightSidebar {
        if (!RightSidebar.instance) RightSidebar.instance = new RightSidebar();
        return RightSidebar.instance;
    }


}
export const rightSidebar = RightSidebar.getInstance();