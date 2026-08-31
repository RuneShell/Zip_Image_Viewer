
import { createRoot } from "react-dom/client";




export class Viewer{
    // Singleton Pattern
    private static instance: Viewer;
    private constructor() {

        
        const viewer: React.JSX.Element =  (<div id="sideNavigation" onDragOver={handleDragOver}>
            <input ref={fileInputRef} id="selectFile" type="file" multiple hidden onChange={handleFileChange}/>
            <button id="selectFileButton" type="button" onClick={handleSelectFileClick} onDragOver={handleDragOver} onDrop={handleDrop}>Select File</button>
            </div>);
    } // prevents new() from being called on this class
    public static getInstance(): Viewer {
        if (!Viewer.instance) Viewer.instance = new Viewer();
        return Viewer.instance;
    }

    // ---------------------------
    // global variables
    // ---------------------------
    private readonly target = document.getElementById("react-viewer") as HTMLElement;
    private readonly root = createRoot(this.target);


    public insert(){ 

        this.root.render(this.FileSelector());
    }






    private FileSelector() { // 굳이 이 함수가 존재할 이유가?


        let fileInputRef, handleSelectFileClick, handleFileChange, handleDragOver, handleDrop;



        // return (<div id="sideNavigation" onDragOver={handleDragOver}>
        //     <input ref={fileInputRef} id="selectFile" type="file" multiple hidden onChange={handleFileChange}/>
        //     <button id="selectFileButton" type="button" onClick={handleSelectFileClick} onDragOver={handleDragOver} onDrop={handleDrop}>Select File</button>
        //     </div>
        // );
    }
}
export const viewer = Viewer.getInstance();





