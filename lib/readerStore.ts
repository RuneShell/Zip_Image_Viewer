import { useEffect, useRef } from "react";

import { ImgSetContent, Book, ImgBook, ImgInfo } from "./fileManager.tsx";
import {LayoutMode} from "./viewer.tsx";
import { leftSidebar } from "./HTMLVanilla.ts";

import { Logger } from "./myLogger.ts";
const logger = new Logger("readerStore", true);

// ------------------------------
// Handle Img URL
// ------------------------------

const SCROLL_AHEAD_CACHE_SIZE = 8; // scroll 모드에서, 현재 페이지 기준으로 앞으로 미리 만들어둘 페이지 수
const SCROLL_BEHIND_CACHE_SIZE = 4; // scroll 모드에서, 현재 페이지 기준으로 뒤로 미리 만들어둘 페이지 수

export class WindowedImgUrlCache {
    private readonly imgSet: ImgInfo[];
    private readonly aheadCacheSize: number; // 앞으로 미리 만들어둘 페이지 수
    private readonly behindCacheSize: number; // 뒤로 미리 만들어둘 페이지 수 
    private readonly imgSetLength: number;
    
    private pageIdx: number;
    private startIdx: number; // 실제 캐시된 범위의 시작 인덱스
    private endIdx: number;
    private cache: Map<number, string>

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

    public setPage(newPageIdx: number){
        if (newPageIdx < 0 || newPageIdx >= this.imgSetLength) {
            console.warn(`setPage: newPageIdx ${newPageIdx} is out of bounds (0, ${this.imgSetLength - 1})`);
            return;
        }

        const newStartIdx = Math.max(0, newPageIdx - this.behindCacheSize);
        const newEndIdx = Math.min(this.imgSetLength - 1, newPageIdx + this.aheadCacheSize);

        if (this.startIdx <= newPageIdx && newPageIdx <= this.endIdx) { // 캐시된 window 범위 내에서 이동하는 경우
            
            // TODO: refresh window here
            // cache가 너무 커지는 경우, refresh가 너무 오래 걸릴 수 있기에, 추후 여기서 분기를 내야 함.

            // 반동기 작업의 뒤쪽 구현은 ensureWindow()에서 처리하도록 함.
        }
        else{ // 캐시를 다시 만들어야 하는 경우
            for (const url of this.cache.values()) {
                URL.revokeObjectURL(url);
            }
            this.cache.clear();

            this.cache = new Map<number, string>();
            this.cache.set(newPageIdx, URL.createObjectURL(this.imgSet[newPageIdx].file));


            // TODO : refresh window here
        }
    }

    public ensureWindow(newPageIdx: number) {
        // TODO : 일단 setPage()랑 중복 부분이 많음. 되는지 확인용.
        if (newPageIdx < 0 || newPageIdx >= this.imgSetLength) {
            console.warn(`setPage: newPageIdx ${newPageIdx} is out of bounds (0, ${this.imgSetLength - 1})`);
            return;
        }

        const newStartIdx = Math.max(0, newPageIdx - this.behindCacheSize);
        const newEndIdx = Math.min(this.imgSetLength - 1, newPageIdx + this.aheadCacheSize);

        if (this.startIdx <= newPageIdx && newPageIdx <= this.endIdx) {
            if (this.pageIdx < newPageIdx) { // 앞으로 이동하는 경우
                for(let i = this.startIdx; i < newStartIdx; i++){ // 앞에 지움
                    URL.revokeObjectURL(this.cache.get(i)!);
                    this.cache.delete(i);
                }
                for(let i = this.endIdx + 1; i <= newEndIdx; i++){ // 뒤에 추가
                    this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
                }
            }
            else if (newPageIdx < this.pageIdx) { // 뒤로 이동하는 경우
                for(let i = this.endIdx; i > newEndIdx; i--){ // 뒤에 지움
                    URL.revokeObjectURL(this.cache.get(i)!);
                    this.cache.delete(i);
                }
                for(let i = this.startIdx - 1; i >= newStartIdx; i--){ // 앞에 추가 
                    this.cache.set(i, URL.createObjectURL(this.imgSet[i].file));
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

        this.pageIdx = newPageIdx;
        this.startIdx = newStartIdx;
        this.endIdx = newEndIdx;
    }

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
                        scrollBackgroundColor: string;
                    };

export type ReaderState = {
    layoutState: LayoutState;
    selectedBook: Book | null;
    currentPage: number;
    selectedPages: number | [number, number];
};



let readerState: ReaderState = {
    layoutState: { mode: 'single', 
                   rotationAngle: 0, zoomLevel: 1, translation: { x: 0, y: 0 }
     },
    selectedBook: null,
    currentPage: -1,
    selectedPages: -1,
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
            readerStore.setCurrentPage(readerState.currentPage);
        }

    },

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

    // scroll layout options
    toggleScrollBackgroundColor() {
        if (readerState.layoutState.mode === 'scroll') {
            const newColor = readerState.layoutState.scrollBackgroundColor === 'white' ? 'black' : 'white';
            readerState = { ...readerState, layoutState: { ...readerState.layoutState, scrollBackgroundColor: newColor } };
            readerStore.setCurrentPage(readerState.currentPage);
        }
    },


    selectBook(book: Book) {
        readerState = { ...readerState, selectedBook: book};
        const currentPage = book.currentPageIdx; // 읽던 책 페이지는 아래의 setCurrentPage에서 처리됨.
        logger.debug(`selectBook: ${readerState.currentPage} -> ${currentPage}`);

        // Generate cache.
        if (book.format === 'img') {
            refreshImgCache(book as ImgBook);
        }

        leftSidebar.contentInfoBox.setPageCount(book.pages);

        if (readerState.layoutState.mode === 'double') {
            const anchorPage = currentPage - (currentPage & 1);
            readerStore.setCurrentPage(anchorPage);
        }
        else readerStore.setCurrentPage(currentPage);
    },


    prevPage(){
        let count = 1;
        if (readerState.layoutState.mode === 'double'){
            count = (readerState.layoutState.isReverseView) ? -2 : 2;
        }

        const prevPage = Math.max(0, readerState.currentPage - count);
        readerStore.setCurrentPage(prevPage);
    },
    nextPage(){
        let count = 1;
        if (readerState.layoutState.mode === 'double'){
            count = (readerState.layoutState.isReverseView) ? -2 : 2;
        }
        
        const nextPage = readerState.selectedBook ? Math.min(readerState.selectedBook.pages - 1, readerState.currentPage + count) : readerState.currentPage;
        readerStore.setCurrentPage(nextPage);
    },
    // TODO: 이거 이미지 전용인데 왜 혼용해서 사용함? 어떻게든 고쳐야됨.
    setCurrentPage(pageIdx: number){ // 1 ms
        const book = readerState.selectedBook;
        if (!book || pageIdx < 0 || pageIdx >= book.pages) return;

        readerState = {...readerState, currentPage: pageIdx, selectedPages: getSelectedPages(pageIdx)};
        book.currentPageIdx = pageIdx; // 책 객체에도 현재 페이지를 기록

        imgCache?.setPage(pageIdx);
        viewerListeners.forEach(l => l());  
        imgCache?.ensureWindow(pageIdx);
        logger.debug(`setCurrentPage: ${pageIdx} (selectedPages: ${JSON.stringify(readerState.selectedPages)})`);
    },

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
        const endPage = Math.min(readerState.selectedBook!.pages - 1, currentPage + SCROLL_AHEAD_CACHE_SIZE);
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
        console.log("bookshelfStore.refreshBookshelf() called with books:", books);
        bookshelfState = { books };
        bookshelfListeners.forEach(listener => listener());
    }  
}