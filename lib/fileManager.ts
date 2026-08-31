// 재귀로 하던 걸 async generator로 바꿔서 구현.


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
    private imgSet: Array<ImgInfo> = [];

    public async appendImg(file: File){
        let width = 0;
        let height = 0;

        if (GET_IMG_SHAPE){
            const img = new Image();
            img.src = URL.createObjectURL(file);

            await img.decode(); // Wait for the image to load and decode
            width = img.naturalWidth;
            height = img.naturalHeight;

            URL.revokeObjectURL(img.src); // Clean up the object URL after use
        }

        let imgInfo: ImgInfo = {
            name: file.name,
            file: file,
            width: width,
            height: height
        }

        this.imgSet.push(imgInfo);
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

interface ImgInfo{
    name: string,
    file: File,
    width: number,
    height: number
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
        if(!inputFiles || inputFiles.length === 0) return;

        console.log("FileInputManager.acceptFiles() called with files:", inputFiles);
        inputFiles.sort(SortAlphaNum);
        
        for await (const book of this.flattenZipEntriesGen(inputFiles)){
            console.log("FileInputManager.acceptFiles() processing book:", book.title, "type:", book.format);
            this.books.push(book);
            // TODO : display book.
        }
    }
    
    // Core logic. 
    // TODO : 의미론적으로 flatten zip의 기능과 make book의 기능을 같이 가지고 있는데, 찢는게 낫지 않을까?
    private async * flattenZipEntriesGen(inputFiles: Array<File>) : AsyncGenerator<Book<ImgSetContent> | Book<EpubContent> | Book<PdfContent>>{
        const stack: Array<File> = [...inputFiles].reverse(); // shallow copy, reverse for LIFO.

        let imgSetContent = new ImgSetContent();
        let currentDirPath: string | null = null; // 지금 group이 속한 디렉토리 경로. null이면 루트 디렉토리. (imgSetContent에 누적되는 img들의 경로를 판단하기 위해 필요)

        // 지금까지 imgSetContent에 누적한 img들을 book으로 확정하고, 새 imgSetContent를 시작하는 함수.
        const flushImgSetContent = function*(): Generator<Book<ImgSetContent>>{
            const imgCount = imgSetContent.getImgCount();
            if (imgCount == 0) return; // 아무것도 없으면 flush하지 않음.

            yield {
                format: FileType.IMG,
                title: currentDirPath ?? imgSetContent.getImgSetName(),
                pages: imgCount,
                content: imgSetContent
            };
        }

        while (stack.length > 0){
            const file = stack.pop()!;
            const fileType = CheckFileType(file.name);

            switch (fileType){
                case FileType.ZIP: {
                    const unzipped = await zipReader.UnzipFile(file);
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

                    imgSetContent.appendImg(file);
                    break;
                }
                case FileType.EPUB: {
                    const epubContent = new EpubContent(file);
                    yield {
                        format: FileType.EPUB,
                        title: file.name,
                        pages: 0, // EPUB의 경우 페이지 수를 미리 알 수 없음?
                        content: epubContent
                    };
                    break;
                }
                case FileType.PDF: {
                    const pdfContent = new PdfContent(file);
                    yield {
                        format: FileType.PDF,
                        title: file.name,
                        pages: 0, // PDF의 경우 페이지 수를 미리 알 수 없음?
                        content: pdfContent
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

class ZipReader {
    private readonly getEntryOptions: zip.ZipReaderOptions = {
        // filenameEncoding: "utf-8" // TODO : 인코딩 연결
        // onprogress: (progress, total, entry) => { console.log("unzipping:", progress, total, entry); // TODO : 이거 되는거임?
    }
    private DecryptOptions: zip.ZipReaderOptions = {
        password: "",
        /*
        onprogress: (index, max) => {
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

        const entries = this.getEntries(file, this.getEntryOptions);

        let entries2files: Array<File> | null = await this.tryDecryptEntries(entries, this.DecryptOptions.password); // 기본 비밀번호로 시도
        while (entries2files === null) {
            // TODO : unzipAbortController 
            // TODO : status : 비번 입력해주세요.
            // TODO : 비밀번호 입력 UI 띄우기.자체 freeze도 하고 해야겠지.
            const password = prompt(`${file.name}`, "password") ?? "";
            if (password === "") return []; // 비밀번호 입력 취소 시, 빈 배열 반환.
            this.DecryptOptions.password = password;

            entries2files = await this.tryDecryptEntries(entries, this.DecryptOptions.password);
            if (entries2files === null) {
                alert("Incorrect password. Please try again."); // TODO : status : 비밀번호 틀렸습니다. 다시 입력해주세요.???
            }
        }

        return entries2files;
    }

    // ---------------------------------
    // Helper Methods
    // ---------------------------------
    private getEntries(file: File, options: zip.ZipReaderOptions): Promise<Array<zip.Entry>> {
        return new ZipReader(new zip.BlobReader(file), options).getEntries(options);
    }
    private async getData(entry: zip.Entry, options: zip.ZipReaderOptions): Promise<Blob> {
        return await entry.getData(new zip.BlobWriter(), options);
    }

    private async tryDecryptEntries(entries: entries, password: string): Promise<Array<zip.Entry> | null> {
        let entries2files = [];

        try{
            for (const entry of entries){
                let entry2file = await this.getData(entry, (password === "") ? {} : this.DecryptOptions);
                entry2file.name = entry.filename;
                entries2files.push(entry2file);
            }
            return entries2files;
        } catch (e) {
            console.error("Failed to decrypt zip entries:", e);
            // throw new Error("Failed to decrypt zip entries. Please check the password."); // TODO : 에러 처리
            return null;
        }
    }
}
const zipReader = new ZipReader();

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