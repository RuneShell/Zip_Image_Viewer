// 재귀로 하던 걸 async generator로 바꿔서 구현.
import {
    ZipReader,
    BlobReader,
    BlobWriter,
} from "@zip.js/zip.js";
import type {
    Entry,
    ZipReaderGetEntriesOptions,
    EntryGetDataOptions
} from "@zip.js/zip.js";


// ---------------------------------
// global Constants
// ---------------------------------
const GET_IMG_SHAPE: boolean = true; // 이미지의 shape를 가져올지 여부. false면 width만 가져옴. <= 어차피 html 사이즈에 맞춰야해서 필요해야할지도 모름.


const FileType = {
    IMG: "img",
    ZIP: "zip", // ?
    DIR: "dir", // ?
    EPUB: "epub",
    PDF: "pdf",
    UNKNOWN: "unknown"
} as const;
type FileType = typeof FileType[keyof typeof FileType];
 

interface BaseBook{
    title: string;
    pages: number;
    currentPageIdx: number;
}
export interface ImgBook extends BaseBook{
    format: typeof FileType.IMG;
    content: ImgSetContent;
}
export interface EpubBook extends BaseBook{
    format: typeof FileType.EPUB;
    content: EpubContent;
}
export interface PdfBook extends BaseBook{
    format: typeof FileType.PDF;
    content: PdfContent;
}
export type Book = ImgBook | EpubBook | PdfBook;



// polymorphism
interface BookContent{

}
export class ImgSetContent implements BookContent{
    private imgSet: ImgInfo[] = [];

    public async appendImg(file: File){
        let width = 0;
        let height = 0;

        if (GET_IMG_SHAPE){
            const img = new Image();
            const objectUrl = URL.createObjectURL(file); // 개당 100B-1Kb 정도의 메모리 사용.

            img.src = objectUrl;
            await img.decode();

            width = img.naturalWidth;
            height = img.naturalHeight;

            URL.revokeObjectURL(objectUrl);
        }

        let imgInfo: ImgInfo = {
            name: file.name,
            file: file,
            width: width,
            height: height
        }

        this.imgSet.push(imgInfo);
    }

    // public getImg(pageIdx: number): ImgInfo | null{
    //     return this.imgSet[pageIdx] ? this.imgSet[pageIdx] : null;
    // }
    public getImgSet(): ImgInfo[]{
        return this.imgSet;
    }

    public getImgCount(): number{ // 필요한가?
        return this.imgSet.length;
    }
    public getImgSetName(): string{
        if (this.imgSet.length === 0) return "";
        const firstImgName = this.imgSet[0].name;
        const imgSetName = firstImgName.substring(0, firstImgName.lastIndexOf("/")); // 경로를 포함한 경우, 마지막 슬래시까지 잘라서 반환
        return imgSetName;
    }
}
class EpubContent implements BookContent{
    private epubFile: File;
    public constructor(epubFile: File){
        this.epubFile = epubFile;
    }
}
class PdfContent implements BookContent{
    private pdfFile: File;
    public constructor(pdfFile: File){
        this.pdfFile = pdfFile;
    }
}

export interface ImgInfo{
    name: string,
    file: File,
    width: number,
    height: number
}


// ---------------------------------
// Book State Classes
// ---------------------------------
// State Pattern
abstract class BookState{
    private currentPageIdx: number = 0;

    public changeState(newState: BookState){
        newState.currentPageIdx = this.currentPageIdx;
        return newState;
    }
}

class SinglePageState extends BookState{
    private rotation: number = 0; // 0, 90, 180, 270

}

class DoublePageState extends BookState{
    private isReverseView: boolean = false;
    private hasFittingPage: boolean = false;

}
class ScrollPageState extends BookState{
    // private heightOffset: number = 0; // 스크롤 위치를 저장하는 변수. 스크롤 위치를 유지하기 위해 필요.
}



// ---------------------------------
// FileInputManager Class
// ---------------------------------
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
    public async acceptFiles(inputFiles: Array<File>): Promise<void>{
        inputFiles.sort(SortAlphaNum);
        
        for await (const book of this.flattenZipEntriesGen(inputFiles)){
            console.log("FileInputManager.acceptFiles() processing book:", book.title, "type:", book.format, book.content);
            this.books.push(book);
            // TODO : display book.
        }
        
    }
    
    
    // Core logic. 
    // TODO : 의미론적으로 flatten zip의 기능과 make book의 기능을 같이 가지고 있는데, 찢는게 낫지 않을까?
    private async * flattenZipEntriesGen(inputFiles: Array<File>) : AsyncGenerator<Book>{
        const stack: Array<File> = [...inputFiles].reverse(); // shallow copy, reverse for LIFO.

        let imgSetContent = new ImgSetContent();
        let currentDirPath: string | null = null; // 지금 group이 속한 디렉토리 경로. null이면 루트 디렉토리. (imgSetContent에 누적되는 img들의 경로를 판단하기 위해 필요)

        // 지금까지 imgSetContent에 누적한 img들을 book으로 확정하고, 새 imgSetContent를 시작하는 함수.
        const flushImgSetContent = function*(): Generator<Book>{
            const imgCount = imgSetContent.getImgCount();
            if (imgCount == 0) return; // 아무것도 없으면 flush하지 않음.

            yield {
                format: FileType.IMG,
                title: currentDirPath ?? imgSetContent.getImgSetName(),
                pages: imgCount,
                content: imgSetContent,
                currentPageIdx: 0
            };

            imgSetContent = new ImgSetContent(); // 새 imgSetContent 시작.
        }

        while (stack.length > 0){
            const file = stack.pop()!;
            const fileType = CheckFileType(file.name);

            switch (fileType){
                case FileType.ZIP: {
                    const unzipped = await zipManager.UnzipFile(file);
                    unzipped.sort(SortAlphaNum);
                    stack.push(...unzipped.reverse()); // reverse for LIFO
                    break;
                }
                case FileType.IMG: {
                    const fileDirPath = dirNameOf(file.name);
                    if (currentDirPath !== fileDirPath) { // 연속된 이미지 파일 두 개의 디렉토리 경로를 비교해서 경계를 자름.
                        yield* flushImgSetContent(); // 현재까지 누적한 imgSetContent를 flush하고, 새 imgSetContent를 시작.
                        currentDirPath = fileDirPath;
                    }

                    await imgSetContent.appendImg(file);
                    break;
                }
                case FileType.EPUB: {
                    const epubContent = new EpubContent(file);
                    yield {
                        format: FileType.EPUB,
                        title: file.name,
                        pages: 0, // EPUB의 경우 페이지 수를 미리 알 수 없음?
                        content: epubContent,
                        currentPageIdx: 0
                    };
                    break;
                }
                case FileType.PDF: {
                    const pdfContent = new PdfContent(file);
                    yield {
                        format: FileType.PDF,
                        title: file.name,
                        pages: 0, // PDF의 경우 페이지 수를 미리 알 수 없음?
                        content: pdfContent,
                        currentPageIdx: 0
                    };  
                    break;
                }
                case FileType.DIR: {
                    // 빈 폴더 마커는 그룹 경계 판단에 쓰지 않음 (이미지 경로로만 판단하므로 무시해도 안전)
                    break;
                }
                default: {
                    // TODO: unknown 타입 처리.
                    break;
                }
            }
        }

        // 마지막으로 남은 imgSetContent를 flush
        yield* flushImgSetContent();
    }
}
export const fileInputManager = FileInputManager.getInstance();

class ZipManager {
    private readonly getEntryOptions: ZipReaderGetEntriesOptions = {
        // filenameEncoding: "utf-8" // TODO : 인코딩 연결
    }
    private DecryptOptions: EntryGetDataOptions = {  // https://gildas-lormeau.github.io/zip.js/api/interfaces/EntryGetDataCheckPasswordOptions.html?utm_source=chatgpt.com
        password: "",
        /*
        onprogress: (index, max) => { // https://gildas-lormeau.github.io/zip.js/api/interfaces/EntryGetDataCheckPasswordOptions.html?utm_source=chatgpt.com
            unzipProgress.value = index;
            unzipProgress.max = max;
        },
        signal
        checkSignature: true,
        preventClose: true,
        transferStreams: true,
        useCompressionStream: true,
        useWebWorkers: true
        */
    }

    public async UnzipFile(file: File) : Promise<Array<File>>{
        const fileType = CheckFileType(file.name);
        if (fileType !== FileType.ZIP) throw new Error("File is not a zip file.");

        const entries = await this.getEntries(file, this.getEntryOptions);

        let entries2files: File[] | null = await this.tryDecryptEntries(entries, this.DecryptOptions.password!); // 기본 비밀번호로 시도
        while (entries2files === null) {
            // TODO : unzipAbortController 
            // TODO : status : 비번 입력해주세요.
            // TODO : 비밀번호 입력 UI 띄우기.자체 freeze도 하고 해야겠지.
            const password = prompt(`${file.name}`, "password") ?? "";
            if (password === "") return []; // 비밀번호 입력 취소 시, 빈 배열 반환.
            if (typeof password === "string") this.DecryptOptions.password = password;

            entries2files = await this.tryDecryptEntries(entries, this.DecryptOptions.password!);
            if (entries2files === null) {
                alert("Incorrect password. Please try again."); // TODO : status : 비밀번호 틀렸습니다. 다시 입력해주세요.???
            }
        }

        return entries2files;
    }

    // ---------------------------------
    // Helper Methods
    // ---------------------------------
    
    private async getEntries(file: File, options?: ZipReaderGetEntriesOptions): Promise<Entry[]> {
        const reader = new ZipReader(new BlobReader(file));
        try{
            return await reader.getEntries(options);
        } finally{
            reader.close();
        }
    }
    private async getData(entry: Entry, options?: EntryGetDataOptions): Promise<Blob> {
        if (entry.directory) throw new Error(`Cannot extract directory entry: ${entry.filename}`);
        
        return await entry.getData(new BlobWriter(), options);
    }

    private async tryDecryptEntries(entries: Entry[], password: string): Promise<File[] | null> {
        let entries2files: File[] = [];

        try{
            for (const entry of entries){
                if(entry.directory) continue; // 디렉토리 마커는 무시

                const blob = await this.getData(entry, { password: password });
                const file = new File([blob], entry.filename);

                entries2files.push(file);
            }
            return entries2files;
        } catch (e) {
            return null;
        }
    }
}
const zipManager = new ZipManager();

// ---------------------------------
// Helper Functions
// ---------------------------------
function CheckFileType(filename: string): FileType{
    let parts = filename.split(".");
    let ext = parts[parts.length - 1].toLowerCase();

    switch(ext){
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "bmp":
        case "webp":
            return FileType.IMG;
        case "zip":
        case "7z":
        // case "rar":  // rar files are not supported by JSZip. LICENSED.
            return FileType.ZIP;
        case "epub":
            return FileType.EPUB;
        case "pdf":
            return FileType.PDF;
        case "/":
            return FileType.DIR;
        default:
            return FileType.UNKNOWN;
    }   
}

function dirNameOf(path: string): string | null{
    const idx = path.lastIndexOf("/");
    return idx === -1 ? null : path.substring(0, idx);
}





//sort_algorithm: alphanum-sort
//-1not swap 1swap
function SortAlphaNum(a: File, b: File){
	let aName = a.name;
	let bName = b.name;

    // 경로가 포함된 경우
	if(aName.includes('/')){
	    let aNameSplit = aName.split('/');
	    let bNameSplit = bName.split('/');

    	for(let i = 0; i < Math.max(aNameSplit.length, bNameSplit.length); i++){
	    	let aNamePart = aNameSplit[i];
	    	let bNamePart = bNameSplit[i];

            // 경로 깊이가 다르면, 깊은 쪽이 뒤로 가도록
            if(aNamePart === undefined) return -1; 
            if(bNamePart === undefined) return 1;
	
	    	// 디렉토리 표시(트레일링 슬래시로 인한 빈 문자열) 체크
	    	if(aNamePart=="" && (i+1 == aNameSplit.length)) return -1;
	    	if(bNamePart=="" && (i+1 == bNameSplit.length)) return 1;
		
	    	// Compare Parts
	    	let result = SortAlphaNum_(aNamePart, bNamePart);
	    	if(result != 0){
	    		return result;
	    	}; // 같으면 다음 파트로 넘어감
    	};
        
        return 0; // 모든 파트가 같으면 같다고 판단
	}
    // 경로가 포함되지 않은 경우
    else{
	    return SortAlphaNum_(aName, bName);
	}
}
// 경로 없는 문자열만 비교하는 함수
function SortAlphaNum_(a: string, b: string): number{
	const seperator = /([가-힣a-zA-Z]+|\d+|[-.])/g;

	const aSep = a.match(seperator) ?? [];
	const bSep = b.match(seperator) ?? [];

	let aPart;	let aCode;
	let bPart;	let bCode;
	let aCursor = 0;
	let bCursor = 0;

	while(aCursor < aSep.length && bCursor < bSep.length){
		aPart = aSep[aCursor];	
		aCode = aPart[0].charCodeAt(0);
		bPart = bSep[bCursor];	
		bCode = bPart[0].charCodeAt(0);
		
        // Convert to int to remove front '0'
		if(48 <= aCode && aCode <= 57) aPart = parseInt(aPart, 10); 
		if(48 <= bCode && bCode <= 57) bPart = parseInt(bPart, 10); // 10 넣는게 맞나?

		if(aPart === bPart){
			aCursor++;
			bCursor++;
			continue;
		}
		else if(bPart === '-' || bPart === '.'){ // bPart first -> '-' < '.'
            return -1;
        }
        else if(aPart === '-' || aPart === '.'){
            return 1;
        }
		else return aPart > bPart ? 1 : -1;
	}

	return -1;
}