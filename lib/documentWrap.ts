

// - pageBox로 목차 가져오기
// epubContent?

// - Viewer로 렌더링하기. 


import './foliate-js/view.js';

type FoliateView = HTMLElement & {
    init(options: { lastLocation?: unknown, showTextStart?: boolean }): Promise<void>;
    open(file: File): Promise<void>;
    prev(): Promise<void>;
    next(): Promise<void>;
};



// export interface DocumentViewer {
//     mount(container: HTMLElement, file: File): Promise<void>;
//     unmount(): void;
//     prev(): Promise<void>;
//     next(): Promise<void>;
// }

export function createDocumentViewer(container: HTMLElement) {
    const view = document.createElement('foliate-view') as FoliateView;
    Object.assign(view.style, {
        display: 'block',
        width: '90vw',
        height: '100vh',
        minHeight: '0',
    })

    container.replaceChildren(view);

    return {
        async open(file: File) {
            await view.open(file);
            await view.init({ showTextStart: true });
            console.log('foliate-view open 완료');
        },
        destroy() {
        view.remove();
        },



        prev() {
        return view?.prev() ?? Promise.resolve();
        },

        next() {
        return view?.next() ?? Promise.resolve();
        },
    };
}
