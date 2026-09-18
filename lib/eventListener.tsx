import React, { useRef } from "react";

import {application, leftSidebar, rightSidebar,
        Application, LeftSidebar, RightSidebar
 } from "./HTMLVanilla.js";
import { DisplayMode, readerStore, ReaderState} from "./readerStore.ts";
import { fileInputManager } from "./fileManager.js";


// Complement the **Key Binding?** as `Command Pattern`.


interface Command<TPayLoad = void> {
    execute(payload?: TPayLoad): void;
}
type AnyCommand = Command<any>; // Registry에 넣을 때 payload type이 달라서 any로 통일함.



// Viewer Commands


// freeze?
class PrevPageCommand implements Command {
    constructor(){}
    execute(){
        readerStore.prevPage();
    }  
}
class NextPageCommand implements Command {
    constructor(){}
    execute(){
        readerStore.nextPage();
    }  
}
class SetDisplayModeCommand implements Command<DisplayMode> {
    constructor(){}
    execute(mode: DisplayMode){
        switch(mode){
            case 'single':
                readerStore.setLayoutMode({ mode: 'single', rotationAngle: 0, zoomLevel: 1, translation: { x: 0, y: 0 } });
                break;
            case 'double':
                readerStore.setLayoutMode({ mode: 'double', isReverseView: false, hasAddFittingPage: false });
                break;
            case 'scroll': // TODO : 이 레이아웃을 변수로 관리하기
                readerStore.setLayoutMode({ mode: 'scroll', scrollBackgroundColor: 'white' });
                break;
        }

    }
}
class AddFittingPageCommand implements Command {
    constructor(){}
    execute(){
        readerStore.toggleAddFittingPage();
    }  
}
class ToggleReverseViewCommand implements Command {
    constructor(){}
    execute(){
        readerStore.toggleReverseView();
    }
}

class ToggleScrollBackgroundColorCommand implements Command {
    constructor(){}
    execute(){
        readerStore.toggleScrollBackgroundColor();
    }
}

class SetFullscreenCommand implements Command {
    constructor(private application: Application){}
    execute(){
        this.application.toggleFullscreen();
    }
};


class OpenModalCommand implements Command {
    constructor(){}
    execute(){
        leftSidebar.modal.open();
    }
}
class CloseModalCommand implements Command {
    constructor(){}
    execute(){ 
        leftSidebar.modal.close();
    }
}

// 이거 두 개 합치려면 Generic이 복잡해짐.
class ChangeEpubFontSizeCommand implements Command<number> {
    constructor(){} // TODO: viewer?
    execute(fontSize: number){
        // this.viewer.changeEpubFontSize(fontSize);
    }
}
class ChangeEpubBackgroundColorCommand implements Command<string> {
    constructor(){}
    execute(color: string){
        // this.viewer.changeEpubBackgroundColor(color);
    }
}


class FileDragoverCommand implements Command<File[]> {
    constructor(){} // TODO: rightsidebar
    execute(){        
        rightSidebar.freeze();
        rightSidebar.activate(true);
    }
}
class FileDropCommand implements Command<File[]> {
    constructor(){} // TODO: fileInputManager?
    async execute(inputFiles: Array<File>){
        if (inputFiles.length === 0) return rightSidebar.unfreeze();

        await fileInputManager.acceptFiles(inputFiles); // 비동기

        rightSidebar.activate(false);
        rightSidebar.unfreeze();
    }
}


class TestCommand implements Command {
    constructor(){}
    execute(){
        console.log("TestCommand executed");
    }
}


// Command Registry
const commands: Record<string, AnyCommand> = {
    prevPage: new PrevPageCommand(),
    nextPage: new NextPageCommand(),

    setDisplayMode: new SetDisplayModeCommand(),

    addFittingPage: new AddFittingPageCommand(),
    toggleReverseView: new ToggleReverseViewCommand(),

    toggleScrollBackgroundColor: new ToggleScrollBackgroundColorCommand(),  

    setFullscreen: new SetFullscreenCommand(application),

    openModal: new OpenModalCommand(),
    closeModal: new CloseModalCommand(),

    changeEpubFontSize: new ChangeEpubFontSizeCommand(),
    changeEpubBackgroundColor: new ChangeEpubBackgroundColorCommand(),

    fileDragover: new FileDragoverCommand(),
    fileDrop: new FileDropCommand(),

    test: new TestCommand(),
}



// ---------------------------------
//  Bind Events to Commands
// ---------------------------------

const EPUB_BG_COLORS = ["white", "black", "moonglow", "lavendar", "gossip"] as const;
type EpubBgColor = typeof EPUB_BG_COLORS[number];

const StaticElements = {
    // main
    prevArrow: document.getElementById("prevArrow") as HTMLElement,
    nextArrow: document.getElementById("nextArrow") as HTMLElement,

    // left sidebar
    vertical_button: document.getElementById("vertical") as HTMLElement,
    vertical_double_button: document.getElementById("vertical_double") as HTMLElement,
    scroll_button: document.getElementById("scroll") as HTMLElement,
    fullscreen_button: document.getElementById("fullscreen") as HTMLElement,

    // [React]
    // add_fitting_page_button: document.getElementById("add-fitting-page") as HTMLElement,
    // reverse_view_button: document.getElementById("reverse-view") as HTMLElement,

    openModal: document.getElementById("openModal") as HTMLElement,
    modal: document.getElementById("modal") as HTMLElement, // click to close modal

    epub_fontSize_range: document.getElementById("epub_fontSize_range") as HTMLInputElement, // <input type="range"> element
    epub_bgColor_options: Object.fromEntries(
        EPUB_BG_COLORS.map((color) => [color, document.getElementById(`epub_bgColor_option_${color}`) as HTMLElement])
    ) as Record<EpubBgColor, HTMLElement>,

    // right sidebar
    inputBox: document.getElementById("inputBox") as HTMLElement,
    selectFile: document.getElementById("selectFile") as HTMLInputElement, // <Input type="file"> element

    // other
    test_button: document.getElementById("test") as HTMLElement,
}
console.log("Static Elements:", StaticElements);

interface StaticBinding{
    element: Document | HTMLElement;
    event: string;
    command: AnyCommand;
    code?: string; // optional, for keydown events
    payload? : string | number | ((e: Event) => unknown);
}
const staticElementBindings: StaticBinding[] = [
    // 1. keydown events
    {element: document, event: "keydown", command: commands.prevPage, code: "ArrowLeft"},
    {element: document, event: "keydown", command: commands.nextPage, code: "ArrowRight"},
    {element: document, event: "keydown", command: commands.nextPage, code: "Space"},

    {element: document, event: "keydown", command: commands.setDisplayMode, code: "KeyV", payload: "single"},
    {element: document, event: "keydown", command: commands.setDisplayMode, code: "KeyD", payload: "double"},
    {element: document, event: "keydown", command: commands.setDisplayMode, code: "KeyS", payload: "scroll"},
    {element: document, event: "keydown", command: commands.setFullscreen,  code: "KeyF"},

    {element: document, event: "keydown", command: commands.addFittingPage,    code: "KeyA"},
    {element: document, event: "keydown", command: commands.toggleReverseView, code: "KeyR"},

    {element: document, event: "keydown", command: commands.toggleScrollBackgroundColor, code: "KeyB"},


    // 2. click events
    {element: StaticElements.prevArrow, event: "click", command: commands.prevPage},
    {element: StaticElements.nextArrow, event: "click", command: commands.nextPage},


    {element: StaticElements.vertical_button,        event: "click", command: commands.setDisplayMode, payload: "single"},
    {element: StaticElements.vertical_double_button, event: "click", command: commands.setDisplayMode, payload: "double"},
    {element: StaticElements.scroll_button,          event: "click", command: commands.setDisplayMode, payload: "scroll"},
    {element: StaticElements.fullscreen_button,      event: "click", command: commands.setFullscreen},

    // [React events]
    // {element: StaticElements.add_fitting_page_button, event: "click", command: commands.addFittingPage},
    // {element: StaticElements.reverse_view_button,     event: "click", command: commands.toggleReverseView},

    {element: StaticElements.openModal, event: "click", command: commands.openModal},
    {element: StaticElements.modal, event: "click", command: commands.closeModal},

    ...EPUB_BG_COLORS.map((color) => ({element: StaticElements.epub_bgColor_options[color], event: "click", command: commands.changeEpubBackgroundColor, payload: color })),

    // {element: StaticElements.test_button, event: "click", command: commands.test},

    // 3. change events
    {element: StaticElements.selectFile, event: "change", command: commands.fileDrop, payload: (e) => { return (e.target instanceof HTMLInputElement && e.target.files) ? Array.from(e.target.files) : []; }}, // payload는 input value를 반환하는 함수
    
    // 4. input events
    {element: StaticElements.epub_fontSize_range, event: "input", command: commands.changeEpubFontSize, payload: (e) => (e.target as HTMLInputElement).value}, // payload는 input value를 반환하는 함수

    // 5. drag/drop events
    {element: StaticElements.inputBox, event: "dragover", command: commands.fileDragover},
    {element: StaticElements.inputBox, event: "drop", command: commands.fileDrop, payload: (e) => {
        const dragEvent = e as DragEvent; // .dataTransfer는 DragEvent에만 있어서, type을 바꿔서 인식시켜줘야 함.
        return dragEvent.dataTransfer ? Array.from(dragEvent.dataTransfer.files) : []; 
    }},

]
// 0. wheel event binding
function bindWheelEvent(){
    const wheelThreshold = 130;
    document.addEventListener("wheel", (e) => {
        const event = e as WheelEvent;
        const steps = Math.floor(Math.abs(event.deltaY) / wheelThreshold);
        const command = event.deltaY < 0 ? commands.prevPage : commands.nextPage;
        for (let i = 0; i < steps; i++){
            command.execute();
        }
    }); 
}
// 1, 2, 3, 4, 5. Bind Static Element Events to Commands
function bindStaticElementEvents(){
    for (const b of staticElementBindings){
        if(b.event === "keydown"){
            document.addEventListener("keydown", (e) => {
                if (e.code === b.code) { // check if the key pressed matches the binding's code
                    e.preventDefault(); // prevent default action for the key press
                    const payload = typeof b.payload === "function" ? b.payload(e) : b.payload; // if payload is a function, call it with the event to get the actual payload
                    b.command.execute(payload);
                }
            });
        }
        else if (b.event === "dragover" || b.event === "drop" || b.event === "change" || b.event === "input"){
            b.element.addEventListener(b.event, (e) => {
                e.preventDefault(); // prevent default behavior (e.g., opening the file in the browser)
                e.stopPropagation(); // prevent the event from bubbling up to parent elements
                const payload = typeof b.payload === "function" ? b.payload(e) : b.payload;
                b.command.execute(payload);
            });
        }
        else{
            b.element.addEventListener(b.event, (e) => {
                const payload = typeof b.payload === "function" ? b.payload(e) : b.payload;
                b.command.execute(payload);
            });
        }
    }
}

bindStaticElementEvents();
bindWheelEvent();
