import { useState, useRef, useSyncExternalStore, useEffect } from "react";
import { createRoot } from 'react-dom/client';

import { readerStore, ReaderState, 
         bookshelfStore,
        SCROLL_AHEAD_CACHE_SIZE, SCROLL_BEHIND_CACHE_SIZE } from "./readerStore.ts";
function useReaderState(){
    return useSyncExternalStore(readerStore.subscribe, readerStore.getState);
}
import { EpubColorPalette, DocumentViewer } from "./documentWrap.ts";

import { ImgBook, 
         ImgSetContent, EpubContent, PdfContent,
         Book, FileType, 
         PdfBook,
         EpubBook} from "./fileManager.tsx";


export type LayoutMode = 'single' | 'double' | 'scroll';


function BookViewer() {
    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState);
    const format = readerState.selectedBook?.format;

    return (
        <div className="viewer-content">
            {/* Strategy + layout 조합별로 다른 JSX가 들어옴 */}
            {format === 'img' && <ImgViewer readerState={readerState} />}
            {/* selectedBook == null일 경우에도 Container는 준비해 둬야 함. */}
            {/* epub */}
            { format !== 'img' && <EpubViewer readerState={readerState} />}
            {/* pdf */}
            { format !== 'img' && <PdfViewer readerState={readerState} />}
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
            {layoutMode === 'scroll' && <div className={`Img-scroll-wrap ${readerState.layoutState.imgScrollBackgroundColor === 'black' ? 'black' : ''}`} style={{height: `${(selectedBook.content as ImgSetContent).totalHeight}px`}}>
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
    // const selectedBook: Book | null = readerState.selectedBook ; 

    useEffect(() => {
        readerStore.setEpubViewer(new DocumentViewer(containerRef.current!));
    }, []);

    // `container load → select Book → open Book` 의 순서를 지키기 위해 useEffect를 하나 더 쓸 수 밖에 없었음.
    useEffect(() => {
        const selectedBook: Book | null = readerState.selectedBook;
        if (!selectedBook || selectedBook.format !== 'epub') return;
        readerStore.openEpub();
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
    const format = readerState.selectedBook?.format;
    const layoutMode = readerState.layoutState.mode;

    const epubStyle = readerState.epubStyle; // TODO: 이거 제대로 안 바뀌는 버그.

    // HTML에 .
    return <>
            {/* for IMG */}
            {format === FileType.IMG && layoutMode == 'single' && <div className="checkbox-wrap" id="checkbox-single">
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">rotate(R)</span>
                    {/* <input type="checkbox" className="ButtonBox-Chcb" id="rotate"/>  */}
                </div>
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">reset-view(V)</span>
                    {/* <input type="checkbox" className="ButtonBox-Chcb" id="reset-view"/> */}
                </div>

            </div>}
            {format === FileType.IMG && layoutMode == 'double' && <><div className="checkbox-wrap" id="checkbox-double">
				<div className="Checkbox-Item">
					<span className="ButtonBox-Chcb-Title Hidden-Letters">add-fitting-page(A)</span>
					<input type="checkbox" className="ButtonBox-Chcb" id="add-fitting-page" checked={readerState.layoutState.hasAddFittingPage} onChange={() => readerStore.toggleAddFittingPage()}/>
				</div>
				<div className="Checkbox-Item">
					<span className="ButtonBox-Chcb-Title Hidden-Letters">reverse-view(R)</span>
					<input type="checkbox" className="ButtonBox-Chcb" id="reverse-view" checked={readerState.layoutState.isReverseView} onChange={() => readerStore.toggleReverseView()}/>
				</div>
			</div></>}
            {format === FileType.IMG && layoutMode == 'scroll' && <div className="checkbox-wrap" id="checkbox-scroll">
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">background(B)</span>
                    <div className="ButtonBox-SquareWrap">
                        <div className={`ButtonBox-Square ${readerState.layoutState.imgScrollBackgroundColor === 'white' ? 'ButtonBox-Square-selected' : 'Hidden-Letters'}`} id="white-background" style={{background: 'white'}} onClick={() => readerStore.setScrollBackgroundColor('white')}/>
                        <div className={`ButtonBox-Square ${readerState.layoutState.imgScrollBackgroundColor === 'black' ? 'ButtonBox-Square-selected' : 'Hidden-Letters'}`} id="black-background" style={{background: 'black'}} onClick={() => readerStore.setScrollBackgroundColor('black')}/>
                    </div>
                </div>
			</div>}
            {/* for EPUB */}
            {format === FileType.EPUB && <div className="checkbox-wrap" id="checkbox-epub">
                <div className="Checkbox-Item Hidden-Letters">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">background</span>
                    <div className="ButtonBox-SquareWrap">
                        <div className={`ButtonBox-Square ${epubStyle.backgroundColor === 'white' ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} id="white-background" style={{background: 'white'}} onClick={() => readerStore.changeEpubStyle({ backgroundColor: 'white' })}/>
                        <div className={`ButtonBox-Square ${epubStyle.backgroundColor === 'black' ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} id="black-background" style={{background: 'black'}} onClick={() => readerStore.changeEpubStyle({ backgroundColor: 'black' })}/>
                        <div className={`ButtonBox-Square ${epubStyle.backgroundColor === EpubColorPalette.moonglow ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} id="moonglow-background" style={{background: EpubColorPalette.moonglow}} onClick={() => readerStore.changeEpubStyle({ backgroundColor: EpubColorPalette.moonglow })}/>
                        <div className={`ButtonBox-Square ${epubStyle.backgroundColor === EpubColorPalette.lavender ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} id="lavender-background" style={{background: EpubColorPalette.lavender}} onClick={() => readerStore.changeEpubStyle({ backgroundColor: EpubColorPalette.lavender })}/>
                        <div className={`ButtonBox-Square ${epubStyle.backgroundColor === EpubColorPalette.gossip ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} id="gossip-background" style={{background: EpubColorPalette.gossip}} onClick={() => readerStore.changeEpubStyle({ backgroundColor: EpubColorPalette.gossip })}/>
                    </div>
                </div>
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">font-color</span>
                    <div className="ButtonBox-SquareWrap">
                        <div className={`ButtonBox-Square ${epubStyle.color === 'white' ? 'ButtonBox-Square-selected' : 'Hidden-Letters'}`} id="white-font" style={{background: epubStyle.backgroundColor, color: 'white'}} onClick={() => readerStore.changeEpubStyle({ color: 'white' })}>A</div>
                        <div className={`ButtonBox-Square ${epubStyle.color === 'black' ? 'ButtonBox-Square-selected' : 'Hidden-Letters'}`} id="black-font" style={{background: epubStyle.backgroundColor, color: 'black'}} onClick={() => readerStore.changeEpubStyle({ color: 'black' })}>A</div>
                    </div>
                </div>
                <div className="Checkbox-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">font-size</span>
                    <div className="ButtonBox-SquareWrap">
                        <div className={`ButtonBox-Square ${epubStyle.fontSize === '0.8em' ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} onClick={() => readerStore.changeEpubStyle({ fontSize: '0.8em' })}><div className="ButtonBox-Square-Inner" style={{fontSize: '0.5em'}}>A</div></div>
                        <div className={`ButtonBox-Square ${epubStyle.fontSize === '1em' ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} onClick={() => readerStore.changeEpubStyle({ fontSize: '1em' })}><div className="ButtonBox-Square-Inner" style={{fontSize: '0.65em'}}>A</div></div>
                        <div className={`ButtonBox-Square ${epubStyle.fontSize === '1.2em' ? 'ButtonBox-Square-selected' : ''} Hidden-Letters`} onClick={() => readerStore.changeEpubStyle({ fontSize: '1.2em' })}><div className="ButtonBox-Square-Inner" style={{fontSize: '0.8em'}}>A</div></div>
                    </div>
                </div>

            </div>}
        </>;
        // fontsize, fontcolor(2), backgroundcolor(5),
        //  progressbar, scrollmode
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

    const getBookPages = (book: Book): number => {
        switch(book.format){
            case FileType.IMG:
                return (book as ImgBook).pages;
            case FileType.EPUB:
                return (book.content as EpubContent).getEpubToc().length;
            case FileType.PDF:
                return -1;
            default:
                return -1;
        }
    };

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
                        <span className="FileListDivider">|</span><span className="FileListType">{getBookPages(book)}</span>
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

    // scrollIntoView selected pages
    // // React Hook은 조건문 안에서 호출하면 안 되므로, 조건문보다 먼저 수행.
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = containerRef.current;
        if (container === null) return;

        const page = container.querySelector<HTMLElement>(`[page-index="${readerState.currentPage}"]`);
        if (page === null) return;

        page.scrollIntoView({ behavior: 'smooth', block: 'center'});
    }, [readerState.currentPage, selectedBook]);

    if (selectedBook === null) return <div className="page-box-content"/>;


    const selectedPages: number | [number, number] = readerState.selectedPages;
    const checkPageSelected = (pageIdx: number) => {
            switch(selectedBook.format){
                case FileType.IMG:
                    console.log('check page selection:', pageIdx, selectedPages, readerState.layoutState.mode);
                    if (typeof selectedPages === 'number') { // single mode
                        return pageIdx === selectedPages ? 'page-selected' : '';
                    } else if (readerState.layoutState.mode === 'double') { // double mode
                        return (pageIdx === selectedPages[0] || pageIdx === selectedPages[1]) ? 'page-selected' : '';
                    }
                    else if (readerState.layoutState.mode === 'scroll') { // scroll mode
                        return (selectedPages[0] <= pageIdx && pageIdx <= selectedPages[1]) ? 'page-selected' : '';
                    }
                    break;
                case FileType.EPUB:
                    return;
                    // return (pageIdx === readerState.currentDetail?.section.current) ? 'page-selected' : ''; // TODO: 비상. epub의 toc와 section은 다른 거임. section이 더 넓은 범위.
                case FileType.PDF:
                    return (pageIdx === readerState.currentPage) ? 'page-selected' : '';
                default:
                    return '';
            }
        }

    return <div ref={containerRef} className="page-box-content">
        {selectedBook.format === 'img' && 
            (selectedBook.content as ImgSetContent).getImgSet().map((imgInfo, i) => (
                <div key={`${imgInfo.name}_${i}`} page-index={i} className={`page ${checkPageSelected(i)}`} onClick={() => {readerStore.setCurrentPage(i, {scrollTo: true});}}>
                    <span className="page-name">{imgInfo.name}</span>
                    <span className="page-shape Hidden-Letters">{imgInfo.width}x{imgInfo.height}</span>
                </div>
        ))}
        {selectedBook.format === 'epub' &&
            ((selectedBook.content as EpubContent).getEpubToc().map((tocItem, i) => (
                <div key={`${tocItem.label}_${i}`} page-index={i} className={`page ${checkPageSelected(i)}`} onClick={() => {readerStore.gotoHref(tocItem.href);}}>
                    <span className="page-name">{tocItem.label}</span>
                    {/* <span className="page-shape Hidden-Letters">{tocItem.href}</span> */}
                </div>
        )))}
        {/* {selectedBook.format === 'pdf' &&

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