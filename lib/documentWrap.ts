

// - pageBox로 목차 가져오기
// epubContent?

// - Viewer로 렌더링하기. 


import './foliate-js/view.js';
import { makeBook } from './foliate-js/view.js';
import { EPUB } from './foliate-js/epub.js';
import { EpubBook, EpubContent } from './fileManager.js';


type FoliateView = HTMLElement & {
    init(options: { lastLocation?: unknown, showTextStart?: boolean }): Promise<void>;
    open(file: File): Promise<void>;
    close(): Promise<void>;
    prev(): Promise<void>;
    next(): Promise<void>;
    goTo(cfi: string): Promise<void>;

    renderer?: {
        setAttribute(name: string, value: string): void;
        setStyles(styles: string): void;
    };
};


export type epubStyle = {
    backgroundColor: string;
    color: string;
    fontSize: string;
}
export const EpubColorPalette = {
    white: 'white',
    black: 'black',
    moonglow:  '#F4EACD',
    lavender: '#D6E6F5',
    gossip: '#B5D692',
}


export class DocumentViewer{
    private readonly view: FoliateView;
    private epubBook: EpubBook | null = null;
    private static epubStyle: epubStyle = {
        backgroundColor: EpubColorPalette.moonglow,
        color: 'black',
        fontSize: '1em',
    }
    private isOpenFreezed: boolean = false; // to prevent saving when opening book and loading prev location

    public constructor(container: HTMLElement) {
        this.view = document.createElement('foliate-view') as FoliateView;
        container.replaceChildren(this.view);

        this.view.addEventListener('relocate', (event: Event) => {
            if (this.isOpenFreezed) return; 
            // 왜인지 모르겠는데, DocumentViewer가 1개여도 relocate가 5회 연속으로 발생함. (책을 열 때)
            const detail = (event as CustomEvent).detail;
            
            if (this.epubBook && this.epubBook.currentDetail.cfi !== detail.cfi) { // EPUB의 현재 위치를 저장
                this.epubBook.currentDetail = {
                    cfi: detail.cfi,
                    fraction: detail.fraction,
                    section: detail.section,
                }
                console.log(`saved book: ${this.epubBook.title}, detail:`, this.epubBook.currentDetail);
            }
        });
    }

    public async open(epubBook: EpubBook) {
        this.isOpenFreezed = true;

        // close previous
        if (this.epubBook) {
            this.epubBook = null;
            this.view.close();
        }

        this.epubBook = epubBook;
        const file = (epubBook.content).getFile();

        await this.view.open(file);
        await this.view.init({ showTextStart: true });

        // go to previous location
        if (epubBook.currentDetail.cfi) await this.gotoCfi(epubBook.currentDetail.cfi);

        // set style after all page loaded.
        if (this.view) {
            Object.assign(this.view.style, { // default style for <foliate-view>
                display: 'block',
                width: '73vw',
                height: '100vh',
                minHeight: '0',
            })
            // this.view.renderer?.setAttribute('margin', '0');  // header/footer margin of `paginator`.

            this.changeStyle();
        }

        this.isOpenFreezed = false;
    }
    public destroy() {
        this.view.remove();
    }

    public prev() {
        return this.view?.prev() ?? Promise.resolve();
    }
    public next() {
        return this.view?.next() ?? Promise.resolve();
    }

    public gotoCfi(cfi: string) {
        return this.view.goTo(cfi) ?? Promise.resolve();
    }
    public gotoHref(href: string) {
        console.log('gotoHref:', href);
        return this.view.goTo(href) ?? Promise.resolve();
    }

    public changeStyle(backgroundColor: string = EpubColorPalette.moonglow, // TODO: Technical debt: 초기값이 위에도 있고, 2번 정의됨. readerStore에서 wrapping하는 게 맞나?
                        color: string = 'black',
                        fontSize: string = '1em',
    ) {
        DocumentViewer.epubStyle = { backgroundColor, color, fontSize };

        if (!this.view) return;
        this.view.renderer?.setStyles(`
            html {
                background-color: ${backgroundColor} !important;
            }
            body {
                background-color: ${backgroundColor} !important;
                color: ${color} !important;
                font-size: ${fontSize} !important;
            }
            body * {
                color: ${color} !important;
            }
        `);
    }
    public static getStyle(): epubStyle {
        return DocumentViewer.epubStyle;
    }
}