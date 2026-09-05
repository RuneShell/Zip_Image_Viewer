// Complement the **sub element classes** as `Composite Pattern`.


abstract class HTMLVanillaObject{
    protected abstract selfElement: HTMLElement;  // private과 readonly는 동시에 사용 불가.

    // Change the content of the object
    public changeText(text: string){
        if (this.isFrozen) return;
        this.selfElement.textContent = text;
    }
    public changeCSS(property: string, value: string){
        if (this.isFrozen) return;
        this.selfElement.style.setProperty(property, value);
    }


    // Freeze the object to prevent further modifications
    private isFrozen: boolean = false;
    public freeze() {
        this.isFrozen = true;
    }
    public unfreeze() {
        this.isFrozen = false;
    }
}


// ---------------------------------
// HTMLVanillaObject Subclasses - Left Sidebar
// ---------------------------------

// Singleton Pattern is not applied to these classes. because they are less important.

class TitleBar extends HTMLVanillaObject { // 꾸미기 기능
    protected selfElement = document.getElementById("title") as HTMLElement;
    public constructor() { super(); }
}
class StatusReport extends HTMLVanillaObject {
    protected selfElement = document.getElementById("status") as HTMLElement;
    public constructor() { super(); }
}
class EncodingSelector extends HTMLVanillaObject {
    protected selfElement = document.getElementById("encoding") as HTMLElement;
    public constructor() { super(); }
}
class DisplayButtonBox extends HTMLVanillaObject {
    protected selfElement = document.getElementById("buttonBox") as HTMLElement;
    public constructor() { super(); }
}
class BookshelfBox extends HTMLVanillaObject {
    protected selfElement = document.getElementById("bookshelf-box") as HTMLElement;
    public constructor() { super(); } 

    private readonly bookshelf: HTMLElement = this.selfElement.querySelector("#bookshelf") as HTMLElement;
}
class ContentInfoBox extends HTMLVanillaObject  {
    protected selfElement = document.getElementById("ImgInfoBox") as HTMLElement;
    public constructor() { super(); }
}
class EpubOptionBox extends HTMLVanillaObject {
    protected selfElement = document.getElementById("epubOptionWrap") as HTMLElement;
    public constructor() { super(); }
}

// ---------------------------------

class InputBox extends HTMLVanillaObject {
    public selfElement = document.getElementById("inputBox") as HTMLElement;
    public constructor() { super(); }
}
class InputBoxInner extends HTMLVanillaObject {
    public selfElement = document.getElementById("inputBoxInner") as HTMLElement;
    public constructor() { super(); }
}
class selectFile extends HTMLVanillaObject {
    public selfElement = document.getElementById("selectFile") as HTMLInputElement;
    public constructor() { super(); }
}

// ---------------------------------
// HTMLVanillaObject Main classes - Application, RightSidebar, LeftSidebar
// ---------------------------------



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

    protected selfElement = document.getElementById("inputBox") as HTMLElement;
    public inputBox = new InputBox();
    public inputBoxInner = new InputBoxInner();
    public selectFile = new selectFile();

    public activate(on: boolean) {
        if(on){
            this.inputBox.selfElement.classList.add("active");
            this.inputBoxInner.selfElement.classList.add("active");
        } else{
            this.inputBox.selfElement.classList.remove("active");
            this.inputBoxInner.selfElement.classList.remove("active");
        }
    }
}
export const rightSidebar = RightSidebar.getInstance();




export class LeftSidebar extends HTMLVanillaObject {
    // Singleton Pattern
    private static instance: LeftSidebar;
    private constructor() { super(); } // prevents new() from being called on this class
    public static getInstance(): LeftSidebar {
        if (!LeftSidebar.instance) LeftSidebar.instance = new LeftSidebar();
        return LeftSidebar.instance;
    }

    protected selfElement = document.getElementById("sideNavigation") as HTMLElement;


    // Methods
    
}
export const leftSidebar = LeftSidebar.getInstance();



export class Application extends HTMLVanillaObject {
    // Singleton Pattern
    private static instance: Application;
    private constructor() { super(); } // prevents new() from being called on this class
    public static getInstance(): Application {
        if (!Application.instance) Application.instance = new Application();
        return Application.instance;
    }
    
    // selfElement element
    protected selfElement = document.body; // Application does not have a specific HTML element associated with it
    public rightSidebar = RightSidebar.getInstance();
    public leftSidebar = LeftSidebar.getInstance();

    // STATIC Document Elements
    public readonly HTMLElementById = {
        status: document.getElementById("status") as HTMLElement,
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

