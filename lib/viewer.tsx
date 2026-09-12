import { useState, useRef, useSyncExternalStore } from "react";
import { createRoot } from 'react-dom/client';

import { readerStore, ReaderState, 
         bookshelfStore } from "./readerStore.ts";
function useReaderState(){
    return useSyncExternalStore(readerStore.subscribe, readerStore.getState);
}

import { ImgSetContent, Book, FileType } from "./fileManager.tsx";





export type LayoutMode = 'single' | 'double' | 'scroll';


function BookViewer() {
    const readerState = useSyncExternalStore(readerStore.subscribe, readerStore.getState);
    if (readerState.selectedBook === null) return <div className="viewer-content"/>;    

    const format = readerState.selectedBook.format;

    return (
        <div className="viewer-content">
            /* Strategy + layout 조합별로 다른 JSX가 들어옴 */
            {format === 'img' && <ImgViewer readerState={readerState} />}
            {format === 'epub' && <EpubViewer readerState={readerState} />}
            {format === 'pdf' && <PdfViewer readerState={readerState} />}
        </div>
    )
}

function ImgViewer({ readerState }: { readerState: ReaderState }) {
    const selectedBook: Book | null = readerState.selectedBook ;  // 아래 useWindowedImgUrlCache에서 selectedBook이 null일 때를 처리하기 위해, 여기서도 null 체크를 해줍니다.
    if (selectedBook === null || selectedBook.format !== 'img') return null;

    const layoutMode = readerState.layoutState.mode;
    const selectedPages: number | [number, number] = readerState.selectedPages;

    const getURL = (pageIdx: number) => readerStore.getImgUrl(pageIdx);

    return <>
            {layoutMode === 'single' && <img className="Img-sheet" src={getURL(selectedPages as number)} alt="" />}
            {layoutMode === 'double' && <>
                <img className="Img-sheet" id="img-sheet_left"  src={getURL((selectedPages as [number, number])[0])} onClick={() => readerStore.prevPage()} alt="" />
                <img className="Img-sheet" id="img-sheet_right" src={getURL((selectedPages as [number, number])[1])} onClick={() => readerStore.nextPage()} alt="" /> </>}
            {layoutMode === 'scroll' && <div className={`Img-scroll-wrap ${readerState.layoutState.scrollBackgroundColor === 'black' ? 'black' : ''}`}>
                {selectedBook.content.getImgSet().map((_, i) => <img className="Img-sheet-scroll" id={`img-sheet_${i}`} src={getURL(i)} alt="" />)}
            </div>}
        </>;
    //     // ⚠️ scroll은 지난번 얘기한 가상화(virtualization)와 반드시 같이 써야 함
    //     // — 안 그러면 getUrl(i)가 윈도우 밖 페이지에서 undefined를 반환해서 이미지가 안 뜸
}

function EpubViewer({ readerState }: { readerState: ReaderState }) {
    // const containerRef = useRef<HTMLDivElement>(null);
    // const renditionRef = useRef<Rendition | null>(null);

    // useEffect(() => {
    //     const)

    // return {
    //     content: <div ref=containerRef className="epub-container" />,
    //     
    // Page: () => renditionRef.current?.next(),
    //     prevPage: () => renditionRef.current?.prev(),
    //     setPage: (page: number) => renditionRef.current?.display(page),
    // };

    return <> </>;
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
            {layoutMode == 'single' && <div className="CheckBox-Item" id="checkbox-single">
                <div className="Checkbox-Single-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">rotate(R)</span>
                    {/* <input type="checkbox" className="ButtonBox-Chcb" id="rotate"/>  */}
                </div>
                <div className="Checkbox-Single-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">reset-view(V)</span>
                    {/* <input type="checkbox" className="ButtonBox-Chcb" id="reset-view"/> */}
                </div>

            </div>}
            {layoutMode == 'double' && <><div className="CheckBox-Item" id="checkbox-double">
				<div className="Checkbox-Double-Item">
					<span className="ButtonBox-Chcb-Title Hidden-Letters">add-fitting-page(A)</span>
					<input type="checkbox" className="ButtonBox-Chcb" id="add-fitting-page" onClick={() => readerStore.toggleAddFittingPage()}/>
				</div>
				<div className="Checkbox-Double-Item">
					<span className="ButtonBox-Chcb-Title Hidden-Letters">reverse-view(R)</span>
					<input type="checkbox" className="ButtonBox-Chcb" id="reverse-view" onClick={() => readerStore.toggleReverseView()}/>
				</div>
			</div></>}
            {layoutMode == 'scroll' && <div className="CheckBox-Item" id="checkbox-scroll">
                <div className="Checkbox-scroll-Item">
                    <span className="ButtonBox-Chcb-Title Hidden-Letters">white-background(B)</span>
                    <input type="checkbox" className="ButtonBox-Chcb" id="white-background" onClick={() => readerStore.toggleScrollBackgroundColor()}/>
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
            <div key={book.title} className="bookWrap">
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

                <div className={`book book-${book.format}${readerState.selectedBook?.title === book.title ? ' book-selected' : ''}`} onClick={() => readerStore.selectBook(book)}>
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
    if (selectedBook === null) return <div className="page-box-content"/>;
    // console.log(`Rendering page box for book: ${selectedBook.title}, ${selectedBook.format}, ${selectedBook.pages}, ${selectedBook.bookSource}, ${selectedBook.content}`)! ? '' : '';

    const selectedPages: number | [number, number] = readerState.selectedPages;
    const pageSelectedClass = (pageIdx: number) => { // TODO : 리액트라 반영 안 됨
            if (typeof selectedPages === 'number') { // single mode
                return pageIdx === selectedPages ? 'page-selected' : '';
            } else if (readerState.layoutState.mode === 'double') { // double mode
                return (pageIdx === selectedPages[0] || pageIdx === selectedPages[1]) ? 'page-selected' : '';
            }
            else if (readerState.layoutState.mode === 'scroll') { // scroll mode
                return (selectedPages[0] <= pageIdx && pageIdx <= selectedPages[1]) ? 'page-selected' : '';
            }
        }

    const imgSet = selectedBook.content instanceof ImgSetContent ? selectedBook.content.getImgSet() : null;
    return <div className="page-box-content">
        {selectedBook.format === 'img' && 
            selectedBook.content.getImgSet().map((imgInfo, i) => (
                <div key={`${imgInfo.name}_${i}`} className={`page ${pageSelectedClass(i)}`} onClick={() => {readerStore.setCurrentPage(i)}}>
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

    const checkbox_root = createRoot(document.getElementById("checkbox-wrap") as HTMLElement);
    checkbox_root.render(<Checkbox />);


    const bookshelf_root = createRoot(document.getElementById("bookshelf") as HTMLElement);
    const pageBox_root = createRoot(document.getElementById("page-box") as HTMLElement);
    bookshelf_root.render(<Bookshelf />);
    pageBox_root.render(<PageBox />);
}