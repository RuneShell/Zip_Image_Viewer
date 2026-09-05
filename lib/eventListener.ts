import React, { useRef } from "react";

import {application, leftSidebar, rightSidebar,
        Application, LeftSidebar, RightSidebar
 } from "./HTMLVanilla.js";
import { DisplayMode, readerStore, useWindowedImgUrlCache, ReaderState} from "./readerStore.ts";
import { fileInputManager } from "./fileManager.js";


// Complement the **Key Binding?** as `Command Pattern`.

/* Possible Commands:
Arrows
Space

KeyV
KeyD
KeyH
KeyS
KeyF

KeyA
KeyR

wheel

.FileList.click
.Page.click
#prevArrow.click
#nextArrow.click
#vertical.click
#vertical_double.click
#horizontal.click
#scroll.click
#fullscreen.click
#add-fitting-page.click
#reverse-view.click
#imgPreview.click
#imgPreview_double.click

#openModal.click
#modal.click

#epubOptionItem_fontSize_range.click
.Epub-Option-Item-BackgroundColorBox.click

#test.click

*/



interface Command<TPayLoad = void> {
    execute(payload?: TPayLoad): void;
}
type AnyCommand = Command<any>; // Registry에 넣을 때 payload type이 달라서 any로 통일함.



// Commands
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
                readerStore.setLayoutMode({ mode: 'single' });
                break;
            case 'double':
                readerStore.setLayoutMode({ mode: 'double', isReverseView: false, hasAddFittingPage: false });
                break;
            case 'scroll': // TODO : 이 레이아웃을 변수로 관리하기
                readerStore.setLayoutMode({ mode: 'scroll' });
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
class SetFullscreenCommand implements Command {
    constructor(private application: Application){}
    execute(){
        this.application.toggleFullscreen();
    }
};

function Command2Lambda(command: AnyCommand, payload?: unknown){
    return () => command.execute(payload as never);
}


// Command Registry
const commands: Record<string, AnyCommand> = {
    prevPage: new PrevPageCommand(),
    nextPage: new NextPageCommand(),

    setDisplayMode: new SetDisplayModeCommand(),

    addFittingPage: new AddFittingPageCommand(),
    toggleReverseView: new ToggleReverseViewCommand(), // TODO: 생성자 파라미터 통일하기.
    setFullscreen: new SetFullscreenCommand(application),
}
// ---------------------------------
// 1. Bind Keydown Events to Commands
// ---------------------------------
// Key Binding
const keyToAction: Record<string, () => void> = {
    arrowleft:  () => commands.prevPage.execute(),
    arrowright: () => commands.nextPage.execute(),
    space:      () => commands.nextPage.execute(),

    KeyV: () => commands.setDisplayMode.execute("single"),
    KeyH: () => commands.setDisplayMode.execute("horizontal"),
    KeyD: () => commands.setDisplayMode.execute("double"),
    KeyS: () => commands.setDisplayMode.execute("scroll"),

    KeyA: () => commands.addFittingPage.execute(),
    KeyR: () => commands.toggleReverseView.execute(),
    KeyF: () => commands.setFullscreen.execute(),
}
document.addEventListener("keydown", (e) => {keyToAction[e.code]?.();});



// ---------------------------------
// 2. Bind Click Events to Commands
// ---------------------------------
const StaticElementById = {
    prevArrow: document.getElementById("prevArrow") as HTMLElement,
    nextArrow: document.getElementById("nextArrow") as HTMLElement,
}

interface StaticBinding{
    element: HTMLElement;
    event: string;
    command: AnyCommand;
    payload? : undefined;
}
const staticElementBindings: StaticBinding[] = [
    {element: StaticElementById.prevArrow, event: "click", command: commands.prevPage},
    {element: StaticElementById.nextArrow, event: "click", command: commands.nextPage},
]
for (const b of staticElementBindings){
    b.element.addEventListener(b.event, (e) => {
        b.command.execute(b.payload);
    });
}

// ---------------------------------
// 3. Bind Wheel Events to Commands
// --------------------------------



// ---------------------------------
// 4. Bind Drag/Drop Events to Commands
// ---------------------------------

// File Drag&Drop
application.rightSidebar.inputBox.selfElement.addEventListener("dragover", (e) => {
    e.stopPropagation(); 

    rightSidebar.freeze();}
);
application.rightSidebar.inputBox.selfElement.addEventListener("drop", async (e) => {
    e.stopPropagation();
    if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return rightSidebar.unfreeze();
    const inputFileList = Array.from(e.dataTransfer.files);
    await fileInputManager.acceptFiles(inputFileList); // 비동기

    rightSidebar.unfreeze();
});


// ---------------------------------
// 5. Bind Change Events to Commands
// ---------------------------------

// File Input Change
application.rightSidebar.selectFile.selfElement.addEventListener("change", async (e) => {
    rightSidebar.freeze();
    
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return rightSidebar.unfreeze();
    const inputFileList = Array.from(files);
    await fileInputManager.acceptFiles(inputFileList); // 비동기

    rightSidebar.unfreeze();
});
