import React, { useRef } from "react";

import {application, leftSidebar, rightSidebar,
        Application, LeftSidebar, RightSidebar
 } from "./HTMLVanilla.js";
import { viewer, Viewer } from "./viewer.jsx";


// Complement the **Key Binding?** as `Command Pattern`.

/* Possible Commands:
Arrows
Space

KeyF
KeyV
KeyD
KeyH
KeyS

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

class SetFullscreenCommand implements Command {
    constructor(private application: Application){}
    execute(){
        this.application.toggleFullscreen();
    }
};



const commands: Record<string, Command> = {
    setFullscreen: new SetFullscreenCommand(application),
}

// 1. Bind Keydown Events to Commands
const keyToAction: Record<string, () => void> = {
    KeyF: () => commands.setFullscreen.execute(),
}
document.addEventListener("keydown", (e) => {console.log(`Key pressed: ${e.code}`); keyToAction[e.code]?.();}); // log for debugging

// 2. Bind Click Events to Commands // 이런 구현보다 직접 HTML에 박아두는 게 안전하다고 함.

// 3. Bind Wheel Events to Commands // 이렇게 구현할 필요가 있나?

// 4. Bind Drag Events to Commands

// 5. Bind Input Events to Commands

// 6. Bind Change Events to Commands

// =============================
// File Handlers
// const fileInputRef = useRef<HTMLInputElement>(null);
// const handleSelectFileClick = () => {
//     fileInputRef.current?.click();
// };

// // click
// const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     rightSidebar.freeze();
    
//     const files = e.target.files;
//     if (!files || files.length === 0) return;
//     const inputFileList = Array.from(files);
//     await fileInputManager.acceptFiles(inputFileList); // 비동기

//     rightSidebar.unfreeze();
// };
// // drag and drop
// const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
//     e.stopPropagation(); // stop event propagation to parent elements

//     rightSidebar.freeze();
// };

// const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
//     e.stopPropagation();

//     if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
//     const inputFileList = Array.from(e.dataTransfer.files);
//     await fileInputManager.acceptFiles(inputFileList); // 비동기

//     rightSidebar.unfreeze();
// };


