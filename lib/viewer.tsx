import {createRoot} from "react-dom/client";

// import {useFileInput} from "./eventListener.js";
// const {
//     fileInputRef,
//     handleSelectFileClick,
//     handleFileChange,
//     handleDragOver,
//     handleDrop
// } = useFileInput(); // 제거?


// Complement the **page state** as `State Pattern`.
// Complement the **display methods** as `Strategy Pattern`.


export class Viewer{
    // Singleton Pattern
    private static instance: Viewer;
    private constructor() { // prevents new() from being called on this class
        this.target = document.getElementById("react-viewer") as HTMLElement;
        console.log("Viewer target:", this.target);
        this.root = createRoot(this.target);

        //this.state = new SinglePageState();

    } 
    public static getInstance(): Viewer {
        if (!Viewer.instance) Viewer.instance = new Viewer();
        return Viewer.instance;
    }


    private readonly target;
    private readonly root;

    //private state: SinglePageState | HorizontalPageState | DoublePageState | ScrollPageState; // state pattern



    public changeState(){
        //this.state = newState;
    }

    // ---------------------------------
    // Display Page Methods
    // ---------------------------------
    public show(){
    }

    public prevPage(){
    }
    public nextPage(){
    }
}
export const viewer = Viewer.getInstance();


// ---------------------------------
// Page State Classes
// ---------------------------------
// State Pattern
interface PageState{
}

class SinglePageState implements PageState{
    // private strategy: DisplayImgStrategy | DisplayEpubStrategy | DisplayPdfStrategy; // strategy pattern

}

class HorizontalPageState implements PageState{
}
class DoublePageState implements PageState{
}
class ScrollPageState implements PageState{
}

// ---------------------------------
// Display Methods Classes
// ---------------------------------
// Strategy Pattern
interface DisplayStrategy{
    
}

class DisplayImgStrategy implements DisplayStrategy{
}
class DisplayEpubStrategy implements DisplayStrategy{
}
class DisplayPdfStrategy implements DisplayStrategy{
}