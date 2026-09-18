import { useState, useRef, useSyncExternalStore, useEffect } from "react";
import { createRoot } from 'react-dom/client';

import { readerStore, ReaderState, 
         bookshelfStore,
        SCROLL_AHEAD_CACHE_SIZE, SCROLL_BEHIND_CACHE_SIZE } from "./readerStore.ts";
function useReaderState(){
    return useSyncExternalStore(readerStore.subscribe, readerStore.getState);
}
import { createDocumentViewer } from "./documentWrap.ts";

import { ImgSetContent, EpubContent, PdfContent,
         Book, FileType } from "./fileManager.tsx";


export type LayoutMode = 'single' | 'double' | 'scroll';


function BookViewer() {
    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState);
    if (readerState.selectedBook === null) return <div className="viewer-content"/>;    

    const format = readerState.selectedBook.format;

    return (
        <div className="viewer-content">
            {/* Strategy + layout 조합별로 다른 JSX가 들어옴 */}
            {format === 'img' && <ImgViewer readerState={readerState} />}
            {format === 'epub' && <EpubViewer readerState={readerState} />}
            {format === 'pdf' && <PdfViewer readerState={readerState} />}
        </div>
    )
}

function ImgViewer({ readerState }: { readerState: ReaderState }) {
    const layoutMode = readerState.layoutState.mode;

    // Scroll mode : virtualization loading
    useEffect(() => {
        if(layoutMode !== 'scroll') return;

        // use RequestAnimationFrame to Coalescing multiple scroll events into one frame.
        let rafId: number | null = null; // keep RequestAnimationFrame unique.
        const updateCurrentPage = () => {
            rafId = null;

            const imgSetContent = readerState.selectedBook?.content as ImgSetContent;
            if (!imgSetContent) return;

            const viewPortTop = window.scrollY;
            const viewPortHeight = window.innerHeight;

            let currentPage = readerStore.getCurrentPage();
            const currentPageTop = imgSetContent.accumulatedHeight[currentPage] ?? 0;
            const currentPageBottom = imgSetContent.accumulatedHeight[currentPage + 1] ?? 0;
            const threshold = 1 * viewPortHeight; // currentPage + 2.bottom에서 이벤트 발생.

            // Scroll jump
            if (viewPortTop > imgSetContent.accumulatedHeight[Math.min(currentPage + SCROLL_AHEAD_CACHE_SIZE + 1, imgSetContent.accumulatedHeight.length - 1)] || viewPortTop < imgSetContent.accumulatedHeight[Math.max(0, currentPage - SCROLL_BEHIND_CACHE_SIZE)]) {
                const newPage = findPageAtY(imgSetContent.accumulatedHeight, viewPortTop);
                readerStore.setCurrentPage(newPage);
            }

            // scroll downward
            else if (viewPortTop > currentPageBottom + threshold) { 
                let nextCacheHeight = 0;
                while(nextCacheHeight < threshold + (currentPageBottom - currentPageTop) && currentPage < imgSetContent.accumulatedHeight.length - 1){
                    currentPage++;
                    const pageHeight = imgSetContent.accumulatedHeight[currentPage + 1] - imgSetContent.accumulatedHeight[currentPage];
                    nextCacheHeight += pageHeight;
                }
                readerStore.setCurrentPage(currentPage);
            }
            // scroll upward
            else if (viewPortTop < currentPageTop - threshold) { 
                let nextCacheHeight = 0;
                while(nextCacheHeight < threshold && currentPage > 0){
                    currentPage--;
                    const pageHeight = imgSetContent.accumulatedHeight[currentPage + 1] - imgSetContent.accumulatedHeight[currentPage];
                    nextCacheHeight += pageHeight;
                }  
                readerStore.setCurrentPage(currentPage);
            }
        };


        const onScroll = () => {
            if (rafId !== null) return; // prevent multiple requestAnimationFrame calls
            rafId = requestAnimationFrame(updateCurrentPage);
        };

        window.addEventListener('scroll', onScroll);
        return () => { window.removeEventListener('scroll', onScroll); };
    }, [layoutMode]);


    const selectedBook: Book | null = readerState.selectedBook ;  // 아래 useWindowedImgUrlCache에서 selectedBook이 null일 때를 처리하기 위해, 여기서도 null 체크를 해줍니다.
    if (selectedBook === null || selectedBook.format !== 'img') return null;

    const selectedPages: number | [number, number] = readerState.selectedPages;

    const getURL = (pageIdx: number) => readerStore.getImgUrl(pageIdx);


    return <>
            {layoutMode === 'single' && <img className="Img-sheet" src={getURL(selectedPages as number)} alt="" />}
            {layoutMode === 'double' && <>
                <img className="Img-sheet" id="img-sheet_left"  src={getURL((selectedPages as [number, number])[0])} onClick={() => readerStore.prevPage()} alt="" />
                <img className="Img-sheet" id="img-sheet_right" src={getURL((selectedPages as [number, number])[1])} onClick={() => readerStore.nextPage()} alt="" /> </>}
            {layoutMode === 'scroll' && <div className={`Img-scroll-wrap ${readerState.layoutState.scrollBackgroundColor === 'black' ? 'black' : ''}`} style={{height: `${(selectedBook.content as ImgSetContent).totalHeight}px`}}>
                {range(selectedPages as [number, number]).map((pageIdx) => <img key={pageIdx} className="Img-sheet-scroll" id={`img-sheet_${pageIdx}`} src={getURL(pageIdx)} style={{top: (selectedBook.content as ImgSetContent).accumulatedHeight?.[pageIdx] || 0}} alt="" />)}
            </div>}
        </>;

        // 이거 매번 update할 필요가 전혀 없는데?
}
const range = (selectedPages: [number, number]) => Array.from({length: selectedPages[1] - selectedPages[0] + 1}, (_, i) => selectedPages[0] + i);
const findPageAtY = (accumulatedHeight: number[], y: number) => {
    // Binary Search : O(log(N))
    let lo = 0;
    let hi = accumulatedHeight.length - 1;

    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);

        if (accumulatedHeight[mid] <= y) {  
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }

    return lo;
}


function EpubViewer({ readerState }: { readerState: ReaderState }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedBook: Book | null = readerState.selectedBook ; 
    if (selectedBook === null) return null; // 이미 format체크는 했지만, compiler가 content 타입까지는 체크하지 못하므로, 여기서 한 번 더 체크해줍니다.

    useEffect(() => {
        if(!containerRef.current) return;

        const epubViewer = createDocumentViewer(containerRef.current);
        const file: File = (readerState.selectedBook?.content as EpubContent).getFile();

        if (file) epubViewer.open(file);

        return () => { epubViewer.destroy(); };
    }, [readerState.selectedBook]);

    return <div ref={containerRef} className="Epub-viewer">
     </div>;
}

function PdfViewer({ readerState }: { readerState: ReaderState }) {
    return <> </>;
}
// ------------------------------
// Checkbox
// ------------------------------
function Checkbox(){
    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState);
    const layoutMode = readerState.layoutState.mode;

    const checkboxCfig = {
        'add-fitting-page':{
            
        }
    }

    // HTML에 .
    return <>
            {layoutMode == 'single' && <div className="checkbox-wrap" id="checkbox-single">
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">rotate(R)</span>
                    {/* <input type="checkbox" className="ButtonBox-Chcb" id="rotate"/>  */}
                </div>
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">reset-view(V)</span>
                    {/* <input type="checkbox" className="ButtonBox-Chcb" id="reset-view"/> */}
                </div>

            </div>}
            {layoutMode == 'double' && <><div className="checkbox-wrap" id="checkbox-double">
				<div className="Checkbox-Item">
					<span className="ButtonBox-Chcb-Title Hidden-Letters">add-fitting-page(A)</span>
					<input type="checkbox" className="ButtonBox-Chcb" id="add-fitting-page" checked={readerState.layoutState.hasAddFittingPage} onChange={() => readerStore.toggleAddFittingPage()}/>
				</div>
				<div className="Checkbox-Item">
					<span className="ButtonBox-Chcb-Title Hidden-Letters">reverse-view(R)</span>
					<input type="checkbox" className="ButtonBox-Chcb" id="reverse-view" checked={readerState.layoutState.isReverseView} onChange={() => readerStore.toggleReverseView()}/>
				</div>
			</div></>}
            {layoutMode == 'scroll' && <div className="checkbox-wrap" id="checkbox-scroll">
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">white-background(B)</span>
                    <input type="checkbox" className="ButtonBox-Chcb" id="white-background" checked={readerState.layoutState.scrollBackgroundColor === 'white'} onChange={() => readerStore.toggleScrollBackgroundColor()}/>
                </div>
			</div>}
        </>;
}    




// ------------------------------
// BookShelf, ContentInfoBox
// ------------------------------
// Bookshelf는 viewer, contentInfoBox와 다르게, 페이지를 넘길 때마다 리렌더링할 필요가 없고, 필요한 데이터가 다르다.
// 따라서 추가로 Store를 정의헤야 한다.

function Bookshelf() {
    const { books } = useSyncExternalStore(bookshelfStore.subscribe, bookshelfStore.getState);
    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState); // TODO: 이게 필요한가? 매번 로드되는데?
    // console.log(`Rendering zip book`);

    // 미구현 : book.size
    return (
        <div className="bookshelf-content">
            {books.map(book => (
            <div key={book.bookSource?.sourceName || book.title} className="bookWrap">
                {/* For zipped items, indicate that the item is a ZIP file in the UX. */}
                {book.bookSource && book.bookSource.type === FileType.ZIP && (
                <div className="book book-zip">
                    <span className="FileListType">zip</span><span className="FileListDivider">|</span><span className="FileListTitle">{book.bookSource.sourceName}</span>
                </div>
                )}
                {/* For directory items, indicate that the item is a DIRECTORY in the UX. */}
                {book.bookSource && book.bookSource.type === FileType.DIR && (
                <div className="book book-dir">
                    <span className="FileListType">dir</span><span className="FileListDivider">|</span><span className="FileListTitle">{book.bookSource.sourceName}</span>
                </div>
                )}

                <div className={`book book-${book.format}${(readerState.selectedBook === book) ? ' book-selected' : ''}`} onClick={() => readerStore.selectBook(book)}>
                    <span className="FileListType">{book.format}</span><span className="FileListDivider">|</span><span className="FileListTitle">{book.title}</span>
                    <div className="FileListPageWrap Hidden-Letters">
                        <span className="FileListDivider">|</span><span className="FileListType">{book.pages}</span>
                    </div>
                </div>
            </div>
        ))}
        </div>
    );
}

function PageBox() {
    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState);
    const selectedBook: Book | null = readerState.selectedBook;

    // scrollIntoView // React Hook은 조건문 안에서 호출하면 안 되므로, 조건문보다 먼저 수행.
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = containerRef.current;
        if (container === null) return;

        const page = container.querySelector<HTMLElement>(`[data-page-index="${readerState.currentPage}"]`);
        if (page === null) return;

        page.scrollIntoView({ behavior: 'smooth', block: 'center'});
    }, [readerState.currentPage, selectedBook]);

    if (selectedBook === null) return <div className="page-box-content"/>;
    // console.log(`Rendering page box for book: ${selectedBook.title}, ${selectedBook.format}, ${selectedBook.pages}, ${selectedBook.bookSource}, ${selectedBook.content}`)! ? '' : '';

    const selectedPages: number | [number, number] = readerState.selectedPages;
    const pageSelectedClass = (pageIdx: number) => {
            if (typeof selectedPages === 'number') { // single mode
                return pageIdx === selectedPages ? 'page-selected' : '';
            } else if (readerState.layoutState.mode === 'double') { // double mode
                return (pageIdx === selectedPages[0] || pageIdx === selectedPages[1]) ? 'page-selected' : '';
            }
            else if (readerState.layoutState.mode === 'scroll') { // scroll mode
                return (selectedPages[0] <= pageIdx && pageIdx <= selectedPages[1]) ? 'page-selected' : '';
            }
        }

    const imgSetContent = selectedBook.content as ImgSetContent; // TODO : 이거 안전한 코드 맞음?
    return <div ref={containerRef} className="page-box-content">
        {selectedBook.format === 'img' && 
            selectedBook.content.getImgSet().map((imgInfo, i) => (
                <div key={`${imgInfo.name}_${i}`} data-page-index={i} className={`page ${pageSelectedClass(i)}`} onClick={() => {readerStore.setCurrentPage(i, {scrollTo: true});}}>
                    <span className="page-name">{imgInfo.name}</span>
                    <span className="page-shape Hidden-Letters">{imgInfo.width}x{imgInfo.height}</span>
                </div>
        ))}
        {/* {selectedBook.format === 'epub' &&
        } */}
    </div>;
}


// ------------------------------
// Render React
// ------------------------------
export function renderReact() {
    const viewer_root = createRoot(document.getElementById("react-viewer") as HTMLElement);
    viewer_root.render(<BookViewer />);

    const checkbox_root = createRoot(document.getElementById("checkbox-container") as HTMLElement);
    checkbox_root.render(<Checkbox />);


    const bookshelf_root = createRoot(document.getElementById("bookshelf") as HTMLElement);
    const pageBox_root = createRoot(document.getElementById("page-box") as HTMLElement);
    bookshelf_root.render(<Bookshelf />);
    pageBox_root.render(<PageBox />);
}