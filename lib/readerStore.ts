import { useEffect, useRef } from "react";

import { ImgSetContent, Book, ImgInfo } from "./fileManager.tsx";
import {LayoutMode} from "./viewer.tsx";

// ------------------------------
// Handle Img URL
// ------------------------------
// 이미지 파일을 <img> src에 넣으려면, File 객체를 URL.createObjectURL()로 변환해야 함.
// 이 연산 자체는 빠르지만, 수천 장의 이미지를 동시에 변환하면, 디코딩 시간이 걸리고, 메모리를 과하게 먹을 수 있음.
// 앱 설계 목적 상, 사용자는 이미지들을 순차적으로 읽는 경우가 많으므로, Windowed Cache가 최적이다.
export class WindowedImgUrlCache {
    
    private imgSet: ImgInfo[];

    private cache = new Map<number, string>();
    private aheadCacheSize: number; // 앞으로 미리 만들어둘 페이지 수
    private behindCacheSize: number; // 뒤로 미리 만들어둘 페이지 수

    constructor(bookContent: ImgSetContent, aheadCacheSize = 10, behindCacheSize = 4){ // 양면으로 쳤을 때, 앞 5장, 뒤 2장.
        this.imgSet = bookContent.getImgSet();
        this.aheadCacheSize = aheadCacheSize;
        this.behindCacheSize = behindCacheSize;
    }
    
    // 현재 페이지가 바뀔 때마다 호출되는 함수
    public updateWindow(currentPageIdx: number){
        const start = Math.max(0, currentPageIdx - this.behindCacheSize);
        const end = Math.min(this.imgSet.length - 1, currentPageIdx + this.aheadCacheSize);

        // cache에서 window 밖 범위는 지움
        for (const key of this.cache.keys()){
            if (key < start || key > end){
                URL.revokeObjectURL(this.cache.get(key)!); // 메모리 해제
                this.cache.delete(key);
            }
        }

        // 윈도우 안 범위는 만들어서 cache에 넣음
        for (let i = start; i <= end; i++){
            if (this.cache.has(i)) continue; // 이미 cache에 있으면 skip
            this.cache.set(i, URL.createObjectURL(this.imgSet[i].file)); // 메모리 할당
        }
    }

    public getUrl(pageIdx: number): string | undefined {
        return this.cache.get(pageIdx);
    }

    public clearCache(){
        for (const url of this.cache.values()) URL.revokeObjectURL(url);
        this.cache.clear();
    }
}
// 위 class를 React hook으로 감싸줌.
export function useWindowedImgUrlCache(bookContent: ImgSetContent, currentPageIdx: number){
    const cacheRef = useRef<WindowedImgUrlCache | null>(null);

    useEffect(() => {
        cacheRef.current = new WindowedImgUrlCache(bookContent);
        return () => cacheRef.current?.clearCache();
    }, [bookContent]);

    useEffect(() => {
        cacheRef.current?.updateWindow(currentPageIdx);
    }, [currentPageIdx]); // currentPageIdx가 바뀔 때

    const getUrl = (pageIdx: number) => cacheRef.current?.getUrl(pageIdx);
    return {getUrl};
}




// ------------------------------
// Reader State Store (Observer Pattern)
// ------------------------------
export type DisplayMode = 'single' | 'double' | 'scroll';

type LayoutState = { 
                        mode: 'single'; 
                    } | { 
                        mode: 'double';
                        isReverseView: boolean;
                        hasAddFittingPage: boolean;
                    } | {  
                        mode: 'scroll';
                    };

export type ReaderState = {
    layoutState: LayoutState;
    selectedBook: Book | null;
    currentPage: number;
};



let readerState: ReaderState = {
    layoutState: { mode: 'single' },
    selectedBook: null,
    currentPage: 0,
};
const listeners = new Set<() => void>();

// Observer Pattern
export const readerStore = {
    getState: () => readerState, subscribe(listener: () => void){
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
//     useEffect(() => {
//     const unsubscribe = readerStore.subscribe(() => {
//         setState(readerStore.getState());
//     });

//     return unsubscribe;
// }, []); 처럼 해서 구독 해제


    setLayoutMode(layoutState: ReaderState['layoutState']) {
        readerState = {...readerState, layoutState};
        listeners.forEach(listener => listener());
    },
    toggleAddFittingPage() {
        if (readerState.layoutState.mode === 'double') {
            readerState = { ...readerState, layoutState: { ...readerState.layoutState, hasAddFittingPage: !readerState.layoutState.hasAddFittingPage } };
            listeners.forEach(listener => listener());
        }
    },
    toggleReverseView() {
        if (readerState.layoutState.mode === 'double') {
            readerState = { ...readerState, layoutState: { ...readerState.layoutState, isReverseView: !readerState.layoutState.isReverseView } };
            listeners.forEach(listener => listener());
        }
    },


    changeSelectedBook(book: Book) {
        readerState = { ...readerState, selectedBook: book, currentPage: book.currentPageIdx,}; // 읽던 책 페이지 불러오기
        listeners.forEach(listener => listener());
    },


    prevPage(count: number = 1){
        const nextPage = Math.max(0, readerState.currentPage - count);
        readerState = {...readerState, currentPage: nextPage}; // 상태 변경
        listeners.forEach(listener => listener()); // 모든 구독자에게 상태 변경 알림
    },
    nextPage(count: number = 1){
        const nextPage = readerState.selectedBook ? Math.min(readerState.selectedBook.pages - 1, readerState.currentPage + count) : readerState.currentPage;
        readerState = {...readerState, currentPage: nextPage};
        listeners.forEach(listener => listener());
    },
    setPage(page: number){
        if (0 <= page && readerState.selectedBook && page < readerState.selectedBook.pages) {
            readerState = {...readerState, currentPage: page};
            listeners.forEach(listener => listener());
        }
    },
}

