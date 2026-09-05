import { useState, useRef, useSyncExternalStore } from "react";
import { createRoot } from 'react-dom/client';

import { readerStore, useWindowedImgUrlCache, ReaderState } from "./readerStore.ts";
function useReaderState(){
    return useSyncExternalStore(readerStore.subscribe, readerStore.getState);
}

import { ImgSetContent, Book } from "./fileManager.tsx";





export type LayoutMode = 'single' | 'double' | 'scroll';


function BookViewer() {
    if (readerStore.getState().selectedBook === null) return <div className="viewer-content">{null}</div>;

    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState);
    const format = readerState.selectedBook!.format;

    return (
        <div className="viewer-content">
            /* Strategy + layout 조합별로 다른 JSX가 들어옴 */
            {format === 'img' && <ImgReader readerState={readerState} />}
            {format === 'epub' && <EpubReader readerState={readerState} />}
            {format === 'pdf' && <PdfReader readerState={readerState} />}
        </div>
    )
}

function ImgReader({ readerState }: { readerState: ReaderState }) {
    const selectedBook: Book | null = readerState.selectedBook ;  // 아래 useWindowedImgUrlCache에서 selectedBook이 null일 때를 처리하기 위해, 여기서도 null 체크를 해줍니다.
    if (!selectedBook || selectedBook.format !== 'img') return null;
    const layoutMode = readerState.layoutState.mode;
    const index = readerState.currentPage; // currentPage는 직접 수정하지 않음.

    const { getUrl } = useWindowedImgUrlCache(selectedBook.content, index); // 캐시는 이 훅 안에서만 관리

    return <>
            {layoutMode === 'single' && <img src={getUrl(index)} alt="" />}
            {layoutMode === 'double' && <>
                <img className="Img-sheet" id="img-sheet_left"  src={getUrl(index)} onClick={() => readerStore.prevPage()} alt="" />
                <img className="Img-sheet" id="img-sheet_right" src={getUrl(index + 1)} onClick={() => readerStore.nextPage()} alt="" />
            </>}
            {layoutMode === 'scroll' && selectedBook.content.getImgSet().map((_, i) => <img className="Img-sheet" id={`img-sheet_${i}`} src={getUrl(i)} alt="" />)}
        </>;
    //     // ⚠️ scroll은 지난번 얘기한 가상화(virtualization)와 반드시 같이 써야 함
    //     // — 안 그러면 getUrl(i)가 윈도우 밖 페이지에서 undefined를 반환해서 이미지가 안 뜸
}

function EpubReader({ readerState }: { readerState: ReaderState }) {
    // const containerRef = useRef<HTMLDivElement>(null);
    // const renditionRef = useRef<Rendition | null>(null);

    // useEffect(() => {
    //     const)

    // return {
    //     content: <div ref=containerRef className="epub-container" />,
    //     nextPage: () => renditionRef.current?.next(),
    //     prevPage: () => renditionRef.current?.prev(),
    //     setPage: (page: number) => renditionRef.current?.display(page),
    // };

    return <> </>;
}

function PdfReader({ readerState }: { readerState: ReaderState }) {
    return <> </>;
}
    

// ------------------------------
// Render React
// ------------------------------
const root = createRoot(document.getElementById("react-viewer") as HTMLElement);
root.render(<BookViewer />);