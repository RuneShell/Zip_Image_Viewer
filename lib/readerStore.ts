import { useEffect, useRef } from "react";

import { ImgSetContent, Book, ImgBook, ImgInfo, FileType } from "./fileManager.tsx";
import {LayoutMode} from "./viewer.tsx";
import { leftSidebar } from "./HTMLVanilla.ts";
import { DocumentViewer, epubStyle } from "./documentWrap.ts";
import { EpubBook, epubCurrentDetail } from "./fileManager.tsx";

import { Logger } from "./myLogger.ts";
const logger = new Logger("readerStore", true);

// ------------------------------
// Handle Img URL
// ------------------------------

export const SCROLL_AHEAD_CACHE_SIZE = 6; // scroll 모드에서, 현재 페이지 기준으로 앞으로 미리 만들어둘 페이지 수
export const SCROLL_BEHIND_CACHE_SIZE = 4; // scroll 모드에서, 현재 페이지 기준으로 뒤로 미리 만들어둘 페이지 수

export class WindowedImgUrlCache {
    private readonly imgSet: ImgInfo[];
    private readonly aheadCacheSize: number; // 앞으로 미리 만들어둘 페이지 수
    private readonly behindCacheSize: number; // 뒤로 미리 만들어둘 페이지 수 
    private readonly imgSetLength: number;
    
    private pageIdx: number;
    private startIdx: number; // 실제 캐시된 범위의 시작 인덱스
    private endIdx: number;
    private cache: Map<number, string>;

    private pendingPageIdx: number | null = null; // 예약된 페이지 인덱스
    private refreshScheduled: boolean = false;

    constructor(imgSet: ImgInfo[], aheadCacheSize: number, behindCacheSize: number) {
        this.imgSet = imgSet;
        this.aheadCacheSize = aheadCacheSize;
        this.behindCacheSize = behindCacheSize;
        this.imgSetLength = imgSet.length;

        this.pageIdx = 0;
        this.startIdx = 0;
        this.endIdx = -1;
        this.cache = new Map<number, string>();
        this.setPage(this.pageIdx);
    }

    public setPage(newPageIdx: number) {
        if (newPageIdx < 0 || newPageIdx >= this.imgSetLength) {
            console.warn(`setPage: newPageIdx ${newPageIdx} is out of bounds (0, ${this.imgSetLength - 1})`);
            return;
        }

        const newStartIdx = Math.max(0, newPageIdx - this.behindCacheSize);
        const newEndIdx = Math.min(this.imgSetLength - 1, newPageIdx + this.aheadCacheSize);

        if (!this.cache.has(newPageIdx)) { // 현재 페이지는 즉시 확보
            this.cache.set(newPageIdx, URL.createObjectURL(this.imgSet[newPageIdx].file));
        }

        if (this.startIdx <= newPageIdx && newPageIdx <= this.endIdx) {
            if (this.pageIdx < newPageIdx) { // 앞으로 이동하는 경우
                for(let i = this.endIdx + 1; i <= newEndIdx; i++){ // 뒤에 추가
                    this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
                }
                for(let i = this.startIdx; i < newStartIdx; i++){ // 앞에 지움
                    URL.revokeObjectURL(this.cache.get(i)!);
                    this.cache.delete(i);
                }
            }
            else if (newPageIdx < this.pageIdx) { // 뒤로 이동하는 경우
                for(let i = this.startIdx - 1; i >= newStartIdx; i--){ // 앞에 추가 
                    this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
                }
                for(let i = this.endIdx; i > newEndIdx; i--){ // 뒤에 지움
                    URL.revokeObjectURL(this.cache.get(i)!);
                    this.cache.delete(i);
                }
            }
        }
        else{
            for(let i = newStartIdx; i < newPageIdx; i++){ // 앞
                this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
            }
            for (let i = newPageIdx + 1; i <= newEndIdx; i++){ // 뒤
                this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
            }
        }
    }

    // Delayed refresh mechanism (depricated becuase it renders only ONE image without windowHeight info)

    // public setPage(newPageIdx: number){
    //     if (newPageIdx < 0 || newPageIdx >= this.imgSetLength) {
    //         console.warn(`setPage: newPageIdx ${newPageIdx} is out of bounds (0, ${this.imgSetLength - 1})`);
    //         return;
    //     }

    //     // 현재 페이지는 즉시 확보
    //     if (!this.cache.has(newPageIdx)) {
    //         this.cache.set(newPageIdx, URL.createObjectURL(this.imgSet[newPageIdx].file));
    //     }

    //     this.pageIdx = newPageIdx;
    //     this.scheduleRefresh(newPageIdx);
    // }

    // private scheduleRefresh(newPageIdx: number) {
    //     this.pendingPageIdx = newPageIdx;
    //     if (this.refreshScheduled) return;
    //     this.refreshScheduled = true;

    //     requestIdleCallback(() => {
    //         this.refreshScheduled = false;

    //         const target = this.pendingPageIdx;
    //         this.pendingPageIdx = null;

    //         if(target !== null) {
    //             this.ensureWindow(target);
    //         }
    //     }, { timeout: 100 });
    // }

    // private ensureWindow(newPageIdx: number) {
    //     // TODO : 일단 setPage()랑 중복 부분이 많음. 되는지 확인용.
    //     if (newPageIdx < 0 || newPageIdx >= this.imgSetLength) {
    //         console.warn(`setPage: newPageIdx ${newPageIdx} is out of bounds (0, ${this.imgSetLength - 1})`);
    //         return;
    //     }

    //     const newStartIdx = Math.max(0, newPageIdx - this.behindCacheSize);
    //     const newEndIdx = Math.min(this.imgSetLength - 1, newPageIdx + this.aheadCacheSize);

    //     if (this.startIdx <= newPageIdx && newPageIdx <= this.endIdx) {
    //         if (this.pageIdx < newPageIdx) { // 앞으로 이동하는 경우
    //             for(let i = this.endIdx + 1; i <= newEndIdx; i++){ // 뒤에 추가
    //                 this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
    //             }
    //             for(let i = this.startIdx; i < newStartIdx; i++){ // 앞에 지움
    //                 URL.revokeObjectURL(this.cache.get(i)!);
    //                 this.cache.delete(i);
    //             }
    //         }
    //         else if (newPageIdx < this.pageIdx) { // 뒤로 이동하는 경우
    //             for(let i = this.startIdx - 1; i >= newStartIdx; i--){ // 앞에 추가 
    //                 this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
    //             }
    //             for(let i = this.endIdx; i > newEndIdx; i--){ // 뒤에 지움
    //                 URL.revokeObjectURL(this.cache.get(i)!);
    //                 this.cache.delete(i);
    //             }
    //         }
    //     }
    //     else{
    //         for(let i = newStartIdx; i < newPageIdx; i++){ // 앞
    //             this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
    //         }
    //         for (let i = newPageIdx + 1; i <= newEndIdx; i++){ // 뒤
    //             this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
    //         }
    //     }

    //     this.pageIdx = newPageIdx;
    //     this.startIdx = newStartIdx;
    //     this.endIdx = newEndIdx;
    // }


    public getURL(pageIdx: number): string | undefined {
        return this.cache.get(pageIdx);
    }

    public clearCache() {
        for (const url of this.cache?.values()) {
            URL.revokeObjectURL(url);
        }
        this.cache.clear();
    }
}



// ------------------------------
// Reader State Store (Observer Pattern)
// ------------------------------
export type DisplayMode = 'single' | 'double' | 'scroll';

type LayoutState = { 
                        mode: 'single'; 
                        rotationAngle: number;
                        zoomLevel: number;
                        translation: { x: number; y: number };
                    } | { 
                        mode: 'double';
                        isReverseView: boolean;
                        hasAddFittingPage: boolean;
                    } | {  
                        mode: 'scroll';
                        imgScrollBackgroundColor: string;
                    };

export type ReaderState = {
    layoutState: LayoutState;
    selectedBook: Book | null;
     // for img
    currentPage: number;
    selectedPages: number | [number, number];
     // for epub
    currentDetail: epubCurrentDetail | null;
    epubStyle: epubStyle;

};

// React Ref HTML, Viewer elements.
// let epubContainerHTML: HTMLElement | null = null;
let epubViewer: DocumentViewer | null = null;
// let pdfContainerHTML: HTMLElement | null = null;
let pdfViewer: DocumentViewer | null = null;

let readerState: ReaderState = {
    layoutState: { mode: 'single', 
                   rotationAngle: 0, zoomLevel: 1, translation: { x: 0, y: 0 }
     },
    selectedBook: null,
    currentPage: -1,
    selectedPages: -1,
    currentDetail: null,
    epubStyle: DocumentViewer.getStyle(),
};
const viewerListeners = new Set<() => void>();

let imgCache: WindowedImgUrlCache | null = null;
function refreshImgCache(book: ImgBook){
    imgCache?.clearCache();
    imgCache = new WindowedImgUrlCache(book.content.getImgSet(), SCROLL_AHEAD_CACHE_SIZE, SCROLL_BEHIND_CACHE_SIZE);
    imgCache.setPage(book.currentPageIdx); // TODO : 이거 맞냐? 다음 페이지로 갈 때 다시 처음부터 만들면 캐시를 왜하는건데? // 괜찮은듯?
}


// Observer Pattern
export const readerStore = {
    getState: () => readerState, subscribe(listener: () => void){
        viewerListeners.add(listener);
        return () => viewerListeners.delete(listener);
    },
//     useEffect(() => {
//     const unsubscribe = readerStore.subscribe(() => {
//         setState(readerStore.getState());
//     });

//     return unsubscribe;
// }, []); 처럼 해서 구독 해제

    setLayoutMode(layoutState: ReaderState['layoutState']) {
        readerState = {...readerState, layoutState};
        if (layoutState.mode === 'double' && readerState.selectedBook) {
            const anchorPage = readerState.currentPage - (readerState.currentPage & 1);
            readerStore.setCurrentPage(anchorPage);
        }
        else {
            readerStore.setCurrentPage(readerState.currentPage, {scrollTo: true});
        }

    },


    selectBook(book: Book) {
        readerState = { ...readerState, selectedBook: book};

        if (book.format === 'img') {
            const currentPage = book.currentPageIdx; // 읽던 책 페이지는 아래의 setCurrentPage에서 처리됨.
            logger.debug(`selectBook: ${readerState.currentPage} -> ${currentPage}`);

            leftSidebar.contentInfoBox.setPageCount(book.pages);

            // Generate img cache.
            refreshImgCache(book as ImgBook);
            
            if (readerState.layoutState.mode === 'double') {
                const anchorPage = currentPage - (currentPage & 1);
                readerStore.setCurrentPage(anchorPage);
            }
            else readerStore.setCurrentPage(currentPage, {scrollTo: true});
        }
        else if (book.format === 'epub') {
            viewerListeners.forEach(l => l());
            // to `OpenEpub()` in readerStore.ts.
        }

    },


    prevPage(){
        const book = readerState.selectedBook;
        if (!book) return;

        if (book.format === 'img') {
            if (readerState.layoutState.mode === 'single') {
                const count = 1;
                const prevPage = Math.max(0, readerState.currentPage - count);
                readerStore.setCurrentPage(prevPage);
            }
            else if (readerState.layoutState.mode === 'double'){
                const count = (readerState.layoutState.isReverseView) ? -2 : 2;
                const prevPage = Math.max(0, readerState.currentPage - count);
                readerStore.setCurrentPage(prevPage);
            }
            else if (readerState.layoutState.mode === 'scroll') { // scroll up to: 0.88 * viewPortScroll.
                window.scrollTo({ top: Math.max(0, window.scrollY - 0.88 * window.innerHeight), behavior: 'smooth' });
            }
        }
        else if (book.format === 'epub') {
            epubViewer?.prev();
            readerState = { ...readerState, currentPage: -1, selectedPages: -1, currentDetail: book.currentDetail };
            viewerListeners.forEach(l => l());
        }
        else if (book.format === 'pdf') {
            // pdfViewer?.prev();
        }
    },
    nextPage(){
        let book = readerState.selectedBook;
        if (!book) return;

        if (book.format === FileType.IMG) {
            book = book as ImgBook;
            if (readerState.layoutState.mode === 'single') {
                const count = 1;
                const nextPage = readerState.selectedBook ? Math.min(book.pages - 1, readerState.currentPage + count) : readerState.currentPage;
                readerStore.setCurrentPage(nextPage);
            }
            else if (readerState.layoutState.mode === 'double'){
                const count = (readerState.layoutState.isReverseView) ? -2 : 2;
                const nextPage = readerState.selectedBook ? Math.min(book.pages - 1, readerState.currentPage + count) : readerState.currentPage;
                readerStore.setCurrentPage(nextPage);
            }
            else if (readerState.layoutState.mode === 'scroll') { // scroll down to: 0.88 * viewPortScroll.
                window.scrollTo({ top: Math.min(window.scrollY + 0.88 * window.innerHeight, (readerState.selectedBook?.content as ImgSetContent).totalHeight - window.innerHeight), behavior: 'smooth' });
            }    
        }
        else if (book.format === 'epub') {
            epubViewer?.next();
            readerState = { ...readerState, currentPage: -1, selectedPages: -1, currentDetail: book.currentDetail };
            viewerListeners.forEach(l => l());
        }
        else if (book.format === 'pdf') {
            // pdfViewer?.next();
        }
    },

    getCurrentPage(): number {
        return readerState.currentPage;
    },

    // -------------------------------
    // book.format specific methods
    // -------------------------------
    // for `ImgBook` format.

    // double layout options
    toggleAddFittingPage() {
        if (readerState.layoutState.mode === 'double') {
            readerState = { ...readerState, layoutState: { ...readerState.layoutState, hasAddFittingPage: !readerState.layoutState.hasAddFittingPage } };
        }
        readerStore.setCurrentPage(readerState.currentPage);
    },
    toggleReverseView() {
        if (readerState.layoutState.mode === 'double') {
            readerState = { ...readerState, layoutState: { ...readerState.layoutState, isReverseView: !readerState.layoutState.isReverseView } };
        }
        readerStore.setCurrentPage(readerState.currentPage);
    },

    setCurrentPage(pageIdx: number, options?: { scrollTo?: boolean }): void { // 1 ms // scrollTo: 수동으로 scroll을 옮겨줘야 하는 이벤트. 사용자가 스크롤을 움직일 떄는 필요없기 떄문.
        // if (pageIdx === readerState.currentPage) return; // 이미 같은 페이지면 무시 // 사용할 수 없는 이유 : 모드가 바뀌거나, 책이 바뀌거나.
        const scrollTo = options?.scrollTo ?? false;

        const book = readerState.selectedBook as ImgBook | null;
        if (!book || pageIdx < 0 || pageIdx >= book.pages) return;

        readerState = {...readerState, currentPage: pageIdx, selectedPages: getSelectedPages(pageIdx), currentDetail: null};
        book.currentPageIdx = pageIdx; // 책 객체에도 현재 페이지를 기록

        imgCache?.setPage(pageIdx);
        viewerListeners.forEach(l => l()); 

        if(readerState.layoutState.mode === 'scroll' && scrollTo) {
            // requestAnimationFrame to avoid collision with rendering.
            const top = (readerState.selectedBook as ImgBook).content.accumulatedHeight[pageIdx];
            requestAnimationFrame(() => {
                window.scrollTo({top, behavior: 'auto'});
            });
        }
        
        logger.debug(`setCurrentPage: ${pageIdx} (selectedPages: ${JSON.stringify(readerState.selectedPages)})`);
    },

    // scroll layout options
    setScrollBackgroundColor(newColor: string = '') {
        if (readerState.layoutState.mode === 'scroll') {
            if (newColor === '') newColor = (readerState.layoutState.imgScrollBackgroundColor === 'white') ? 'black' : 'white'; // toggle if no color selected.
            readerState = { ...readerState, layoutState: { ...readerState.layoutState, imgScrollBackgroundColor: newColor } };
            readerStore.setCurrentPage(readerState.currentPage);
        }
    },


    // for `EpubBook` format.
    setEpubViewer(viewer: DocumentViewer) {
        epubViewer = viewer;
    },
    openEpub() {
        if (!epubViewer) return;
        epubViewer.open((readerState.selectedBook as EpubBook));
    },
    gotoHref(href: string) {
        // const epubBook = (readerState.selectedBook?.content as EpubContent)?.getEpubBook();
        epubViewer?.gotoHref(href);
        readerState = { ...readerState, currentPage: -1, selectedPages: -1, currentDetail: (readerState.selectedBook as EpubBook).currentDetail };
        viewerListeners.forEach(l => l());
    },
    changeEpubStyle({backgroundColor = '', color = '', fontSize = ''}) {
        if (backgroundColor === '') backgroundColor = readerState.epubStyle.backgroundColor;
        if (color === '') color = readerState.epubStyle.color;
        if (fontSize === '') fontSize = readerState.epubStyle.fontSize;
        
        epubViewer?.changeStyle(backgroundColor, color, fontSize);
        readerState = {...readerState, epubStyle: { backgroundColor, color, fontSize } };
        viewerListeners.forEach(l => l());
    },

    // for `PdfBook` format.
    setPdfViewer(viewer: DocumentViewer | null) {
        pdfViewer = viewer;
    },
    // openPdf(file: File) {
    //     if (!pdfViewer) return;
    //     pdfViewer.open(file);
    // },




    // ------------------------------
    // unObserved helper methods
    // ------------------------------
    getImgUrl(pageIdx: number): string | undefined {
        return imgCache?.getURL(pageIdx);
    },

}


// readerStore helper methods // listener 단에서 안 쓰는 거.
function getSelectedPages(currentPage: number): number | [number, number] {
    // single mode
    if (readerState.layoutState.mode === 'single') { // single page
        return currentPage;
    }

    // [leftPage, rightPage] for double mode
    else if (readerState.layoutState.mode === 'double') { 
        // set anchor page to even number
        let anchorPage: number = currentPage - (currentPage & 1);
        let derivedPage: number;
        // page to display
        let leftPage: number, rightPage: number;

        // option: add-fitting-page
        if (readerState.layoutState.hasAddFittingPage!) {
            derivedPage = anchorPage - 1;
            leftPage = derivedPage; rightPage = anchorPage;
        } else{
            derivedPage = anchorPage + 1;
            leftPage = anchorPage; rightPage = derivedPage;
        }
        // option: reverse-view
            if (readerState.layoutState.isReverseView) {
            [leftPage, rightPage] = [rightPage, leftPage];
        }

        return [leftPage, rightPage];
    }

    // [start page, end page] for scroll mode
    else { 
        const startPage = Math.max(0, currentPage - SCROLL_BEHIND_CACHE_SIZE);
        const endPage = Math.min((readerState.selectedBook as ImgBook | null)!?.pages - 1 || 0, currentPage + SCROLL_AHEAD_CACHE_SIZE);
        return [startPage, endPage];
    }
}



// ------------------------------
// Bookshelf Store (Observer Pattern)
// ------------------------------
let bookshelfState: { books: Book[] } = { books: [] };
const bookshelfListeners = new Set<() => void>();

export const bookshelfStore = {
    getState: () => bookshelfState, subscribe(listener: () => void){
        bookshelfListeners.add(listener);
        return () => bookshelfListeners.delete(listener);
    },

    refreshBookshelf(books: Book[]) {
        bookshelfState = { books };
        bookshelfListeners.forEach(listener => listener());
    }  
}