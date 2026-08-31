const FileType = {
    IMG: "img",
    ZIP: "zip", // ?
    DIR: "dir", // ?
    EPUB: "epub",
    PDF: "pdf",
    UNKNOWN: "unknown"
} as const;
type FileType = typeof FileType[keyof typeof FileType];


interface Book<C extends BookContent = BookContent>{
    format: FileType,
    title: string,
    pages: number,
    content: C
}


// polymorphism
interface BookContent{
}
class ImgSetContent implements BookContent{
}
class EpubContent implements BookContent{
}
class PdfContent implements BookContent{
}



class FileInputManager{
    // Singleton pattern
    private static instance: FileInputManager;
    private constructor() {} // prevents new() from being called on this class
    public static getInstance(): FileInputManager {
        if (!FileInputManager.instance) FileInputManager.instance = new FileInputManager();
        return FileInputManager.instance;
    }

    private books: Book[] = [];

    // ---------------------------------
    // File Import Methods
    // ---------------------------------
    public acceptFiles(files: Array<File>): void{ // async
        if(!files || files.length === 0) return;
        // Array is Queue.
        // inputFileList.sort(SortAlphaNum);
    }
}
export const fileInputManager = FileInputManager.getInstance();

