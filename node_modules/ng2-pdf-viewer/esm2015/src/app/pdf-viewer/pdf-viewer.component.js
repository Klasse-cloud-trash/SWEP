var PdfViewerComponent_1;
import { __decorate } from "tslib";
/**
 * Created by vadimdez on 21/06/16.
 */
import { Component, Input, Output, ElementRef, EventEmitter, OnChanges, SimpleChanges, OnInit, HostListener, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { createEventBus } from '../utils/event-bus-utils';
let PDFJS;
let PDFJSViewer;
function isSSR() {
    return typeof window === 'undefined';
}
if (!isSSR()) {
    PDFJS = require('pdfjs-dist/build/pdf');
    PDFJSViewer = require('pdfjs-dist/web/pdf_viewer');
    PDFJS.verbosity = PDFJS.VerbosityLevel.ERRORS;
}
export var RenderTextMode;
(function (RenderTextMode) {
    RenderTextMode[RenderTextMode["DISABLED"] = 0] = "DISABLED";
    RenderTextMode[RenderTextMode["ENABLED"] = 1] = "ENABLED";
    RenderTextMode[RenderTextMode["ENHANCED"] = 2] = "ENHANCED";
})(RenderTextMode || (RenderTextMode = {}));
let PdfViewerComponent = PdfViewerComponent_1 = class PdfViewerComponent {
    constructor(element) {
        this.element = element;
        this.isVisible = false;
        this._cMapsUrl = typeof PDFJS !== 'undefined'
            ? `https://unpkg.com/pdfjs-dist@${PDFJS.version}/cmaps/`
            : null;
        this._renderText = true;
        this._renderTextMode = RenderTextMode.ENABLED;
        this._stickToPage = false;
        this._originalSize = true;
        this._page = 1;
        this._zoom = 1;
        this._rotation = 0;
        this._showAll = true;
        this._canAutoResize = true;
        this._fitToPage = false;
        this._externalLinkTarget = 'blank';
        this._showBorders = false;
        this.isInitialized = false;
        this.afterLoadComplete = new EventEmitter();
        this.pageRendered = new EventEmitter();
        this.textLayerRendered = new EventEmitter();
        this.onError = new EventEmitter();
        this.onProgress = new EventEmitter();
        this.pageChange = new EventEmitter(true);
        if (isSSR()) {
            return;
        }
        let pdfWorkerSrc;
        if (window.hasOwnProperty('pdfWorkerSrc') &&
            typeof window.pdfWorkerSrc === 'string' &&
            window.pdfWorkerSrc) {
            pdfWorkerSrc = window.pdfWorkerSrc;
        }
        else {
            pdfWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`;
        }
        PDFJS.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
    }
    set cMapsUrl(cMapsUrl) {
        this._cMapsUrl = cMapsUrl;
    }
    set page(_page) {
        _page = parseInt(_page, 10) || 1;
        const orginalPage = _page;
        if (this._pdf) {
            _page = this.getValidPageNumber(_page);
        }
        this._page = _page;
        if (orginalPage !== _page) {
            this.pageChange.emit(_page);
        }
    }
    set renderText(renderText) {
        this._renderText = renderText;
    }
    set renderTextMode(renderTextMode) {
        this._renderTextMode = renderTextMode;
    }
    set originalSize(originalSize) {
        this._originalSize = originalSize;
    }
    set showAll(value) {
        this._showAll = value;
    }
    set stickToPage(value) {
        this._stickToPage = value;
    }
    set zoom(value) {
        if (value <= 0) {
            return;
        }
        this._zoom = value;
    }
    get zoom() {
        return this._zoom;
    }
    set rotation(value) {
        if (!(typeof value === 'number' && value % 90 === 0)) {
            console.warn('Invalid pages rotation angle.');
            return;
        }
        this._rotation = value;
    }
    set externalLinkTarget(value) {
        this._externalLinkTarget = value;
    }
    set autoresize(value) {
        this._canAutoResize = Boolean(value);
    }
    set fitToPage(value) {
        this._fitToPage = Boolean(value);
    }
    set showBorders(value) {
        this._showBorders = Boolean(value);
    }
    static getLinkTarget(type) {
        switch (type) {
            case 'blank':
                return PDFJS.LinkTarget.BLANK;
            case 'none':
                return PDFJS.LinkTarget.NONE;
            case 'self':
                return PDFJS.LinkTarget.SELF;
            case 'parent':
                return PDFJS.LinkTarget.PARENT;
            case 'top':
                return PDFJS.LinkTarget.TOP;
        }
        return null;
    }
    static setExternalLinkTarget(type) {
        const linkTarget = PdfViewerComponent_1.getLinkTarget(type);
        if (linkTarget !== null) {
            PDFJS.externalLinkTarget = linkTarget;
        }
    }
    ngAfterViewChecked() {
        if (this.isInitialized) {
            return;
        }
        const offset = this.pdfViewerContainer.nativeElement.offsetParent;
        if (this.isVisible === true && offset == null) {
            this.isVisible = false;
            return;
        }
        if (this.isVisible === false && offset != null) {
            this.isVisible = true;
            setTimeout(() => {
                this.ngOnInit();
                this.ngOnChanges({ src: this.src });
            });
        }
    }
    ngOnInit() {
        if (!isSSR() && this.isVisible) {
            this.isInitialized = true;
            this.setupMultiPageViewer();
            this.setupSinglePageViewer();
        }
    }
    ngOnDestroy() {
        if (this._pdf) {
            this._pdf.destroy();
        }
    }
    onPageResize() {
        if (!this._canAutoResize || !this._pdf) {
            return;
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.updateSize();
        }, 100);
    }
    get pdfLinkService() {
        return this._showAll
            ? this.pdfMultiPageLinkService
            : this.pdfSinglePageLinkService;
    }
    get pdfViewer() {
        return this.getCurrentViewer();
    }
    get pdfFindController() {
        return this._showAll
            ? this.pdfMultiPageFindController
            : this.pdfSinglePageFindController;
    }
    ngOnChanges(changes) {
        if (isSSR() || !this.isVisible) {
            return;
        }
        if ('src' in changes) {
            this.loadPDF();
        }
        else if (this._pdf) {
            if ('renderText' in changes) {
                this.getCurrentViewer().textLayerMode = this._renderText
                    ? this._renderTextMode
                    : RenderTextMode.DISABLED;
                this.resetPdfDocument();
            }
            else if ('showAll' in changes) {
                this.resetPdfDocument();
            }
            if ('page' in changes) {
                if (changes['page'].currentValue === this._latestScrolledPage) {
                    return;
                }
                // New form of page changing: The viewer will now jump to the specified page when it is changed.
                // This behavior is introducedby using the PDFSinglePageViewer
                this.getCurrentViewer().scrollPageIntoView({ pageNumber: this._page });
            }
            this.update();
        }
    }
    updateSize() {
        const currentViewer = this.getCurrentViewer();
        this._pdf
            .getPage(currentViewer.currentPageNumber)
            .then((page) => {
            const rotation = this._rotation || page.rotate;
            const viewportWidth = page.getViewport({
                scale: this._zoom,
                rotation
            }).width * PdfViewerComponent_1.CSS_UNITS;
            let scale = this._zoom;
            let stickToPage = true;
            // Scale the document when it shouldn't be in original size or doesn't fit into the viewport
            if (!this._originalSize ||
                (this._fitToPage &&
                    viewportWidth > this.pdfViewerContainer.nativeElement.clientWidth)) {
                scale = this.getScale(page.getViewport({ scale: 1, rotation })
                    .width);
                stickToPage = !this._stickToPage;
            }
            currentViewer._setScale(scale, stickToPage);
        });
    }
    clear() {
        if (this.loadingTask && !this.loadingTask.destroyed) {
            this.loadingTask.destroy();
        }
        if (this._pdf) {
            this._pdf.destroy();
            this._pdf = null;
            this.pdfMultiPageViewer.setDocument(null);
            this.pdfSinglePageViewer.setDocument(null);
            this.pdfMultiPageLinkService.setDocument(null, null);
            this.pdfSinglePageLinkService.setDocument(null, null);
            this.pdfMultiPageFindController.setDocument(null);
            this.pdfSinglePageFindController.setDocument(null);
        }
    }
    setupMultiPageViewer() {
        PDFJS.disableTextLayer = !this._renderText;
        PdfViewerComponent_1.setExternalLinkTarget(this._externalLinkTarget);
        const eventBus = createEventBus(PDFJSViewer);
        eventBus.on('pagerendered', e => {
            this.pageRendered.emit(e);
        });
        eventBus.on('pagechanging', e => {
            if (this.pageScrollTimeout) {
                clearTimeout(this.pageScrollTimeout);
            }
            this.pageScrollTimeout = setTimeout(() => {
                this._latestScrolledPage = e.pageNumber;
                this.pageChange.emit(e.pageNumber);
            }, 100);
        });
        eventBus.on('textlayerrendered', e => {
            this.textLayerRendered.emit(e);
        });
        this.pdfMultiPageLinkService = new PDFJSViewer.PDFLinkService({ eventBus });
        this.pdfMultiPageFindController = new PDFJSViewer.PDFFindController({
            linkService: this.pdfMultiPageLinkService,
            eventBus
        });
        const pdfOptions = {
            eventBus: eventBus,
            container: this.element.nativeElement.querySelector('div'),
            removePageBorders: !this._showBorders,
            linkService: this.pdfMultiPageLinkService,
            textLayerMode: this._renderText
                ? this._renderTextMode
                : RenderTextMode.DISABLED,
            findController: this.pdfMultiPageFindController
        };
        this.pdfMultiPageViewer = new PDFJSViewer.PDFViewer(pdfOptions);
        this.pdfMultiPageLinkService.setViewer(this.pdfMultiPageViewer);
        this.pdfMultiPageFindController.setDocument(this._pdf);
    }
    setupSinglePageViewer() {
        PDFJS.disableTextLayer = !this._renderText;
        PdfViewerComponent_1.setExternalLinkTarget(this._externalLinkTarget);
        const eventBus = createEventBus(PDFJSViewer);
        eventBus.on('pagechanging', e => {
            if (e.pageNumber != this._page) {
                this.page = e.pageNumber;
            }
        });
        eventBus.on('pagerendered', e => {
            this.pageRendered.emit(e);
        });
        eventBus.on('textlayerrendered', e => {
            this.textLayerRendered.emit(e);
        });
        this.pdfSinglePageLinkService = new PDFJSViewer.PDFLinkService({
            eventBus
        });
        this.pdfSinglePageFindController = new PDFJSViewer.PDFFindController({
            linkService: this.pdfSinglePageLinkService,
            eventBus
        });
        const pdfOptions = {
            eventBus: eventBus,
            container: this.element.nativeElement.querySelector('div'),
            removePageBorders: !this._showBorders,
            linkService: this.pdfSinglePageLinkService,
            textLayerMode: this._renderText
                ? this._renderTextMode
                : RenderTextMode.DISABLED,
            findController: this.pdfSinglePageFindController
        };
        this.pdfSinglePageViewer = new PDFJSViewer.PDFSinglePageViewer(pdfOptions);
        this.pdfSinglePageLinkService.setViewer(this.pdfSinglePageViewer);
        this.pdfSinglePageFindController.setDocument(this._pdf);
        this.pdfSinglePageViewer._currentPageNumber = this._page;
    }
    getValidPageNumber(page) {
        if (page < 1) {
            return 1;
        }
        if (page > this._pdf.numPages) {
            return this._pdf.numPages;
        }
        return page;
    }
    getDocumentParams() {
        const srcType = typeof this.src;
        if (!this._cMapsUrl) {
            return this.src;
        }
        const params = {
            cMapUrl: this._cMapsUrl,
            cMapPacked: true
        };
        if (srcType === 'string') {
            params.url = this.src;
        }
        else if (srcType === 'object') {
            if (this.src.byteLength !== undefined) {
                params.data = this.src;
            }
            else {
                Object.assign(params, this.src);
            }
        }
        return params;
    }
    loadPDF() {
        if (!this.src) {
            return;
        }
        if (this.lastLoaded === this.src) {
            this.update();
            return;
        }
        this.clear();
        this.loadingTask = PDFJS.getDocument(this.getDocumentParams());
        this.loadingTask.onProgress = (progressData) => {
            this.onProgress.emit(progressData);
        };
        const src = this.src;
        this.loadingTask.promise.then((pdf) => {
            this._pdf = pdf;
            this.lastLoaded = src;
            this.afterLoadComplete.emit(pdf);
            if (!this.pdfMultiPageViewer) {
                this.setupMultiPageViewer();
                this.setupSinglePageViewer();
            }
            this.resetPdfDocument();
            this.update();
        }, (error) => {
            this.onError.emit(error);
        });
    }
    update() {
        this.page = this._page;
        this.render();
    }
    render() {
        this._page = this.getValidPageNumber(this._page);
        const currentViewer = this.getCurrentViewer();
        if (this._rotation !== 0 ||
            currentViewer.pagesRotation !== this._rotation) {
            setTimeout(() => {
                currentViewer.pagesRotation = this._rotation;
            });
        }
        if (this._stickToPage) {
            setTimeout(() => {
                currentViewer.currentPageNumber = this._page;
            });
        }
        this.updateSize();
    }
    getScale(viewportWidth) {
        const pdfContainerWidth = this.pdfViewerContainer.nativeElement.clientWidth -
            (this._showBorders ? 2 * PdfViewerComponent_1.BORDER_WIDTH : 0);
        if (pdfContainerWidth === 0 || viewportWidth === 0) {
            return 1;
        }
        return ((this._zoom * (pdfContainerWidth / viewportWidth)) /
            PdfViewerComponent_1.CSS_UNITS);
    }
    getCurrentViewer() {
        return this._showAll ? this.pdfMultiPageViewer : this.pdfSinglePageViewer;
    }
    resetPdfDocument() {
        this.pdfFindController.setDocument(this._pdf);
        if (this._showAll) {
            this.pdfSinglePageViewer.setDocument(null);
            this.pdfSinglePageLinkService.setDocument(null);
            this.pdfMultiPageViewer.setDocument(this._pdf);
            this.pdfMultiPageLinkService.setDocument(this._pdf, null);
        }
        else {
            this.pdfMultiPageViewer.setDocument(null);
            this.pdfMultiPageLinkService.setDocument(null);
            this.pdfSinglePageViewer.setDocument(this._pdf);
            this.pdfSinglePageLinkService.setDocument(this._pdf, null);
        }
    }
};
PdfViewerComponent.CSS_UNITS = 96.0 / 72.0;
PdfViewerComponent.BORDER_WIDTH = 9;
PdfViewerComponent.ctorParameters = () => [
    { type: ElementRef }
];
__decorate([
    ViewChild('pdfViewerContainer')
], PdfViewerComponent.prototype, "pdfViewerContainer", void 0);
__decorate([
    Output('after-load-complete')
], PdfViewerComponent.prototype, "afterLoadComplete", void 0);
__decorate([
    Output('page-rendered')
], PdfViewerComponent.prototype, "pageRendered", void 0);
__decorate([
    Output('text-layer-rendered')
], PdfViewerComponent.prototype, "textLayerRendered", void 0);
__decorate([
    Output('error')
], PdfViewerComponent.prototype, "onError", void 0);
__decorate([
    Output('on-progress')
], PdfViewerComponent.prototype, "onProgress", void 0);
__decorate([
    Output()
], PdfViewerComponent.prototype, "pageChange", void 0);
__decorate([
    Input()
], PdfViewerComponent.prototype, "src", void 0);
__decorate([
    Input('c-maps-url')
], PdfViewerComponent.prototype, "cMapsUrl", null);
__decorate([
    Input('page')
], PdfViewerComponent.prototype, "page", null);
__decorate([
    Input('render-text')
], PdfViewerComponent.prototype, "renderText", null);
__decorate([
    Input('render-text-mode')
], PdfViewerComponent.prototype, "renderTextMode", null);
__decorate([
    Input('original-size')
], PdfViewerComponent.prototype, "originalSize", null);
__decorate([
    Input('show-all')
], PdfViewerComponent.prototype, "showAll", null);
__decorate([
    Input('stick-to-page')
], PdfViewerComponent.prototype, "stickToPage", null);
__decorate([
    Input('zoom')
], PdfViewerComponent.prototype, "zoom", null);
__decorate([
    Input('rotation')
], PdfViewerComponent.prototype, "rotation", null);
__decorate([
    Input('external-link-target')
], PdfViewerComponent.prototype, "externalLinkTarget", null);
__decorate([
    Input('autoresize')
], PdfViewerComponent.prototype, "autoresize", null);
__decorate([
    Input('fit-to-page')
], PdfViewerComponent.prototype, "fitToPage", null);
__decorate([
    Input('show-borders')
], PdfViewerComponent.prototype, "showBorders", null);
__decorate([
    HostListener('window:resize', [])
], PdfViewerComponent.prototype, "onPageResize", null);
PdfViewerComponent = PdfViewerComponent_1 = __decorate([
    Component({
        selector: 'pdf-viewer',
        template: `
    <div #pdfViewerContainer class="ng2-pdf-viewer-container">
      <div class="pdfViewer"></div>
    </div>
  `,
        styles: [".ng2-pdf-viewer-container{overflow-x:auto;position:relative;height:100%}:host ::ng-deep .textLayer{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;opacity:.2;line-height:1}:host ::ng-deep .textLayer>span{color:transparent;position:absolute;white-space:pre;cursor:text;-webkit-transform-origin:0 0;transform-origin:0 0}:host ::ng-deep .textLayer .highlight{margin:-1px;padding:1px;background-color:#b400aa;border-radius:4px}:host ::ng-deep .textLayer .highlight.begin{border-radius:4px 0 0 4px}:host ::ng-deep .textLayer .highlight.end{border-radius:0 4px 4px 0}:host ::ng-deep .textLayer .highlight.middle{border-radius:0}:host ::ng-deep .textLayer .highlight.selected{background-color:#006400}:host ::ng-deep .textLayer ::-moz-selection{background:#00f}:host ::ng-deep .textLayer ::-moz-selection,:host ::ng-deep .textLayer ::selection{background:#00f}:host ::ng-deep .textLayer .endOfContent{display:block;position:absolute;left:0;top:100%;right:0;bottom:0;z-index:-1;cursor:default;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}:host ::ng-deep .textLayer .endOfContent.active{top:0}:host ::ng-deep .annotationLayer section{position:absolute}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a,:host ::ng-deep .annotationLayer .linkAnnotation>a{position:absolute;font-size:1em;top:0;left:0;width:100%;height:100%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.pushButton>a:hover,:host ::ng-deep .annotationLayer .linkAnnotation>a:hover{opacity:.2;background:#ff0;box-shadow:0 2px 10px #ff0}:host ::ng-deep .annotationLayer .textAnnotation img{position:absolute;cursor:pointer}:host ::ng-deep .annotationLayer .textWidgetAnnotation input,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{background-color:rgba(0,54,255,.13);border:1px solid transparent;box-sizing:border-box;font-size:9px;height:100%;margin:0;padding:0 3px;vertical-align:top;width:100%}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select{background-color:rgba(0,54,255,.13);border:1px solid transparent;box-sizing:border-box;font-size:9px;height:100%;margin:0;padding:0 3px;vertical-align:top;width:100%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{background-color:rgba(0,54,255,.13);border:1px solid transparent;box-sizing:border-box;font-size:9px;height:100%;margin:0;vertical-align:top;width:100%}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select option{padding:0}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{border-radius:50%}:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea{font:message-box;font-size:9px;resize:none}:host ::ng-deep .annotationLayer .textWidgetAnnotation input[disabled],:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea[disabled]{background:0 0;border:1px solid transparent;cursor:not-allowed}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select[disabled]{background:0 0;border:1px solid transparent;cursor:not-allowed}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input[disabled],:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input[disabled]{background:0 0;border:1px solid transparent;cursor:not-allowed}:host ::ng-deep .annotationLayer .textWidgetAnnotation input:hover,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:hover{border:1px solid #000}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:hover{border:1px solid #000}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:hover,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:hover{border:1px solid #000}:host ::ng-deep .annotationLayer .textWidgetAnnotation input:focus,:host ::ng-deep .annotationLayer .textWidgetAnnotation textarea:focus{background:0 0;border:1px solid transparent}:host ::ng-deep .annotationLayer .choiceWidgetAnnotation select:focus{background:0 0;border:1px solid transparent}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{background-color:#000;content:\"\";display:block;position:absolute;height:80%;left:45%;width:1px}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input:checked:before{background-color:#000;content:\"\";display:block;position:absolute;border-radius:50%;height:50%;left:30%;top:20%;width:50%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:before{-webkit-transform:rotate(45deg);transform:rotate(45deg)}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input:checked:after{-webkit-transform:rotate(-45deg);transform:rotate(-45deg)}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb{font-family:monospace;padding-left:2px;padding-right:0}:host ::ng-deep .annotationLayer .textWidgetAnnotation input.comb:focus{width:115%}:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.checkBox input,:host ::ng-deep .annotationLayer .buttonWidgetAnnotation.radioButton input{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0}:host ::ng-deep .annotationLayer .popupWrapper{position:absolute;width:20em}:host ::ng-deep .annotationLayer .popup{position:absolute;z-index:200;max-width:20em;background-color:#ff9;box-shadow:0 2px 5px #333;border-radius:2px;padding:.6em;margin-left:5px;cursor:pointer;font:message-box;word-wrap:break-word}:host ::ng-deep .annotationLayer .popup h1{font-size:1em;border-bottom:1px solid #000;margin:0;padding-bottom:.2em}:host ::ng-deep .annotationLayer .popup p{margin:0;padding-top:.2em}:host ::ng-deep .annotationLayer .circleAnnotation svg ellipse,:host ::ng-deep .annotationLayer .fileAttachmentAnnotation,:host ::ng-deep .annotationLayer .highlightAnnotation,:host ::ng-deep .annotationLayer .inkAnnotation svg polyline,:host ::ng-deep .annotationLayer .lineAnnotation svg line,:host ::ng-deep .annotationLayer .polygonAnnotation svg polygon,:host ::ng-deep .annotationLayer .polylineAnnotation svg polyline,:host ::ng-deep .annotationLayer .squareAnnotation svg rect,:host ::ng-deep .annotationLayer .squigglyAnnotation,:host ::ng-deep .annotationLayer .stampAnnotation,:host ::ng-deep .annotationLayer .strikeoutAnnotation,:host ::ng-deep .annotationLayer .underlineAnnotation{cursor:pointer}:host ::ng-deep .pdfViewer{padding-bottom:10px}:host ::ng-deep .pdfViewer .canvasWrapper{overflow:hidden}:host ::ng-deep .pdfViewer .page{direction:ltr;width:816px;height:1056px;margin:1px auto -8px;position:relative;overflow:visible;border:9px solid rgba(0,0,0,.01);background-clip:content-box;-o-border-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=) 9 9 repeat;-webkit-border-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=) 9 9 repeat;border-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAA6UlEQVR4Xl2Pi2rEMAwE16fm1f7/r14v7w4rI0IzLAF7hLxNevBSEMEF5+OilNCsRd8ZMyn+a4NmsOT8WJw1lFbSYgGFzF2bLFoLjTClWjKKGRWpDYAGXUnZ4uhbBUzF3Oe/GG/ue2fn4GgsyXhNgysV2JnrhKEMg4fEZcALmiKbNhBBRFpSyDOj1G4QOVly6O1FV54ZZq8OVygrciDt6JazRgi1ljTPH0gbrPmHPXAbCiDd4GawIjip1TPh9tt2sz24qaCjr/jAb/GBFTbq9KZ7Ke/Cqt8nayUikZKsWZK7Fe6bg5dOUt8fZHWG2BHc+6EAAAAASUVORK5CYII=) 9 9 repeat;background-color:#fff}:host ::ng-deep .pdfViewer.removePageBorders .page{margin:0 auto 10px;border:none}:host ::ng-deep .pdfViewer.removePageBorders{padding-bottom:0}:host ::ng-deep .pdfViewer.singlePageView{display:inline-block}:host ::ng-deep .pdfViewer.singlePageView .page{margin:0;border:none}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .pdfViewer.scrollWrapped{margin-left:3.5px;margin-right:3.5px;text-align:center}:host ::ng-deep .spread{margin-left:3.5px;margin-right:3.5px;text-align:center}:host ::ng-deep .pdfViewer.scrollHorizontal,:host ::ng-deep .spread{white-space:nowrap}:host ::ng-deep .pdfViewer.removePageBorders,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .spread{margin-left:0;margin-right:0}:host ::ng-deep .spread .page{display:inline-block;vertical-align:middle;margin-left:-3.5px;margin-right:-3.5px}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollHorizontal .spread,:host ::ng-deep .pdfViewer.scrollWrapped .page,:host ::ng-deep .pdfViewer.scrollWrapped .spread{display:inline-block;vertical-align:middle}:host ::ng-deep .pdfViewer.scrollHorizontal .page,:host ::ng-deep .pdfViewer.scrollWrapped .page{margin-left:-3.5px;margin-right:-3.5px}:host ::ng-deep .pdfViewer.removePageBorders .spread .page,:host ::ng-deep .pdfViewer.removePageBorders.scrollHorizontal .page,:host ::ng-deep .pdfViewer.removePageBorders.scrollWrapped .page{margin-left:5px;margin-right:5px}:host ::ng-deep .pdfViewer .page canvas{margin:0;display:block}:host ::ng-deep .pdfViewer .page canvas[hidden]{display:none}:host ::ng-deep .pdfViewer .page .loadingIcon{position:absolute;display:block;left:0;top:0;right:0;bottom:0;background:url(data:image/gif;base64,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) center no-repeat}:host ::ng-deep .pdfPresentationMode .pdfViewer{margin-left:0;margin-right:0}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer .spread{display:block}:host ::ng-deep .pdfPresentationMode .pdfViewer .page,:host ::ng-deep .pdfPresentationMode .pdfViewer.removePageBorders .page{margin-left:auto;margin-right:auto}:host ::ng-deep .pdfPresentationMode:-ms-fullscreen .pdfViewer .page{margin-bottom:100%!important}:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page{margin-bottom:100%;border:0}:host ::ng-deep .pdfPresentationMode:-moz-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:-webkit-full-screen .pdfViewer .page,:host ::ng-deep .pdfPresentationMode:fullscreen .pdfViewer .page{margin-bottom:100%;border:0}"]
    })
], PdfViewerComponent);
export { PdfViewerComponent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRmLXZpZXdlci5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZzItcGRmLXZpZXdlci8iLCJzb3VyY2VzIjpbInNyYy9hcHAvcGRmLXZpZXdlci9wZGYtdmlld2VyLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOztHQUVHO0FBQ0gsT0FBTyxFQUNMLFNBQVMsRUFDVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFVBQVUsRUFDVixZQUFZLEVBQ1osU0FBUyxFQUNULGFBQWEsRUFDYixNQUFNLEVBQ04sWUFBWSxFQUNaLFNBQVMsRUFDVCxTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2pCLE1BQU0sZUFBZSxDQUFDO0FBVXZCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUxRCxJQUFJLEtBQVUsQ0FBQztBQUNmLElBQUksV0FBZ0IsQ0FBQztBQUVyQixTQUFTLEtBQUs7SUFDWixPQUFPLE9BQU8sTUFBTSxLQUFLLFdBQVcsQ0FBQztBQUN2QyxDQUFDO0FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO0lBQ1osS0FBSyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3hDLFdBQVcsR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUVuRCxLQUFLLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO0NBQy9DO0FBRUQsTUFBTSxDQUFOLElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN4QiwyREFBUSxDQUFBO0lBQ1IseURBQU8sQ0FBQTtJQUNQLDJEQUFRLENBQUE7QUFDVixDQUFDLEVBSlcsY0FBYyxLQUFkLGNBQWMsUUFJekI7QUFXRCxJQUFhLGtCQUFrQiwwQkFBL0IsTUFBYSxrQkFBa0I7SUF1SzdCLFlBQW9CLE9BQW1CO1FBQW5CLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFwSy9CLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFhM0IsY0FBUyxHQUNm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O29EQUduQjtBQUdEO0lBREMsS0FBSyxDQUFDLGFBQWEsQ0FBQzttREFHcEI7QUFHRDtJQURDLEtBQUssQ0FBQyxjQUFjLENBQUM7cURBR3JCO0FBc0ZEO0lBREMsWUFBWSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7c0RBYWpDO0FBOU9VLGtCQUFrQjtJQVQ5QixTQUFTLENBQUM7UUFDVCxRQUFRLEVBQUUsWUFBWTtRQUN0QixRQUFRLEVBQUU7Ozs7R0FJVDs7S0FFRixDQUFDO0dBQ1csa0JBQWtCLENBNmpCOUI7U0E3akJZLGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlZCBieSB2YWRpbWRleiBvbiAyMS8wNi8xNi5cbiAqL1xuaW1wb3J0IHtcbiAgQ29tcG9uZW50LFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIE9uQ2hhbmdlcyxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgT25Jbml0LFxuICBIb3N0TGlzdGVuZXIsXG4gIE9uRGVzdHJveSxcbiAgVmlld0NoaWxkLFxuICBBZnRlclZpZXdDaGVja2VkXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtcbiAgUERGRG9jdW1lbnRQcm94eSxcbiAgUERGVmlld2VyUGFyYW1zLFxuICBQREZQYWdlUHJveHksXG4gIFBERlNvdXJjZSxcbiAgUERGUHJvZ3Jlc3NEYXRhLFxuICBQREZQcm9taXNlXG59IGZyb20gJ3BkZmpzLWRpc3QnO1xuXG5pbXBvcnQgeyBjcmVhdGVFdmVudEJ1cyB9IGZyb20gJy4uL3V0aWxzL2V2ZW50LWJ1cy11dGlscyc7XG5cbmxldCBQREZKUzogYW55O1xubGV0IFBERkpTVmlld2VyOiBhbnk7XG5cbmZ1bmN0aW9uIGlzU1NSKCkge1xuICByZXR1cm4gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbmlmICghaXNTU1IoKSkge1xuICBQREZKUyA9IHJlcXVpcmUoJ3BkZmpzLWRpc3QvYnVpbGQvcGRmJyk7XG4gIFBERkpTVmlld2VyID0gcmVxdWlyZSgncGRmanMtZGlzdC93ZWIvcGRmX3ZpZXdlcicpO1xuXG4gIFBERkpTLnZlcmJvc2l0eSA9IFBERkpTLlZlcmJvc2l0eUxldmVsLkVSUk9SUztcbn1cblxuZXhwb3J0IGVudW0gUmVuZGVyVGV4dE1vZGUge1xuICBESVNBQkxFRCxcbiAgRU5BQkxFRCxcbiAgRU5IQU5DRURcbn1cblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAncGRmLXZpZXdlcicsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGRpdiAjcGRmVmlld2VyQ29udGFpbmVyIGNsYXNzPVwibmcyLXBkZi12aWV3ZXItY29udGFpbmVyXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwicGRmVmlld2VyXCI+PC9kaXY+XG4gICAgPC9kaXY+XG4gIGAsXG4gIHN0eWxlVXJsczogWycuL3BkZi12aWV3ZXIuY29tcG9uZW50LnNjc3MnXVxufSlcbmV4cG9ydCBjbGFzcyBQZGZWaWV3ZXJDb21wb25lbnRcbiAgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uSW5pdCwgT25EZXN0cm95LCBBZnRlclZpZXdDaGVja2VkIHtcbiAgQFZpZXdDaGlsZCgncGRmVmlld2VyQ29udGFpbmVyJykgcGRmVmlld2VyQ29udGFpbmVyO1xuICBwcml2YXRlIGlzVmlzaWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHN0YXRpYyBDU1NfVU5JVFM6IG51bWJlciA9IDk2LjAgLyA3Mi4wO1xuICBzdGF0aWMgQk9SREVSX1dJRFRIOiBudW1iZXIgPSA5O1xuXG4gIHByaXZhdGUgcGRmTXVsdGlQYWdlVmlld2VyOiBhbnk7XG4gIHByaXZhdGUgcGRmTXVsdGlQYWdlTGlua1NlcnZpY2U6IGFueTtcbiAgcHJpdmF0ZSBwZGZNdWx0aVBhZ2VGaW5kQ29udHJvbGxlcjogYW55O1xuXG4gIHByaXZhdGUgcGRmU2luZ2xlUGFnZVZpZXdlcjogYW55O1xuICBwcml2YXRlIHBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZTogYW55O1xuICBwcml2YXRlIHBkZlNpbmdsZVBhZ2VGaW5kQ29udHJvbGxlcjogYW55O1xuXG4gIHByaXZhdGUgX2NNYXBzVXJsID1cbiAgICB0eXBlb2YgUERGSlMgIT09ICd1bmRlZmluZWQnXG4gICAgICA/IGBodHRwczovL3VucGtnLmNvbS9wZGZqcy1kaXN0QCR7KFBERkpTIGFzIGFueSkudmVyc2lvbn0vY21hcHMvYFxuICAgICAgOiBudWxsO1xuICBwcml2YXRlIF9yZW5kZXJUZXh0ID0gdHJ1ZTtcbiAgcHJpdmF0ZSBfcmVuZGVyVGV4dE1vZGU6IFJlbmRlclRleHRNb2RlID0gUmVuZGVyVGV4dE1vZGUuRU5BQkxFRDtcbiAgcHJpdmF0ZSBfc3RpY2tUb1BhZ2UgPSBmYWxzZTtcbiAgcHJpdmF0ZSBfb3JpZ2luYWxTaXplID0gdHJ1ZTtcbiAgcHJpdmF0ZSBfcGRmOiBQREZEb2N1bWVudFByb3h5O1xuICBwcml2YXRlIF9wYWdlID0gMTtcbiAgcHJpdmF0ZSBfem9vbSA9IDE7XG4gIHByaXZhdGUgX3JvdGF0aW9uID0gMDtcbiAgcHJpdmF0ZSBfc2hvd0FsbCA9IHRydWU7XG4gIHByaXZhdGUgX2NhbkF1dG9SZXNpemUgPSB0cnVlO1xuICBwcml2YXRlIF9maXRUb1BhZ2UgPSBmYWxzZTtcbiAgcHJpdmF0ZSBfZXh0ZXJuYWxMaW5rVGFyZ2V0ID0gJ2JsYW5rJztcbiAgcHJpdmF0ZSBfc2hvd0JvcmRlcnMgPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0TG9hZGVkOiBzdHJpbmcgfCBVaW50OEFycmF5IHwgUERGU291cmNlO1xuICBwcml2YXRlIF9sYXRlc3RTY3JvbGxlZFBhZ2U6IG51bWJlcjtcblxuICBwcml2YXRlIHJlc2l6ZVRpbWVvdXQ6IE5vZGVKUy5UaW1lcjtcbiAgcHJpdmF0ZSBwYWdlU2Nyb2xsVGltZW91dDogTm9kZUpTLlRpbWVyO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBsb2FkaW5nVGFzazogYW55O1xuXG4gIEBPdXRwdXQoJ2FmdGVyLWxvYWQtY29tcGxldGUnKSBhZnRlckxvYWRDb21wbGV0ZSA9IG5ldyBFdmVudEVtaXR0ZXI8XG4gICAgUERGRG9jdW1lbnRQcm94eVxuICA+KCk7XG4gIEBPdXRwdXQoJ3BhZ2UtcmVuZGVyZWQnKSBwYWdlUmVuZGVyZWQgPSBuZXcgRXZlbnRFbWl0dGVyPEN1c3RvbUV2ZW50PigpO1xuICBAT3V0cHV0KCd0ZXh0LWxheWVyLXJlbmRlcmVkJykgdGV4dExheWVyUmVuZGVyZWQgPSBuZXcgRXZlbnRFbWl0dGVyPFxuICAgIEN1c3RvbUV2ZW50XG4gID4oKTtcbiAgQE91dHB1dCgnZXJyb3InKSBvbkVycm9yID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ29uLXByb2dyZXNzJykgb25Qcm9ncmVzcyA9IG5ldyBFdmVudEVtaXR0ZXI8UERGUHJvZ3Jlc3NEYXRhPigpO1xuICBAT3V0cHV0KCkgcGFnZUNoYW5nZTogRXZlbnRFbWl0dGVyPG51bWJlcj4gPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XG4gIEBJbnB1dCgpXG4gIHNyYzogc3RyaW5nIHwgVWludDhBcnJheSB8IFBERlNvdXJjZTtcblxuICBASW5wdXQoJ2MtbWFwcy11cmwnKVxuICBzZXQgY01hcHNVcmwoY01hcHNVcmw6IHN0cmluZykge1xuICAgIHRoaXMuX2NNYXBzVXJsID0gY01hcHNVcmw7XG4gIH1cblxuIEBJbnB1dCgncGFnZScpXG4gIHNldCBwYWdlKF9wYWdlKSB7XG4gICAgX3BhZ2UgPSBwYXJzZUludChfcGFnZSwgMTApIHx8IDE7XG4gICAgY29uc3Qgb3JnaW5hbFBhZ2UgPSBfcGFnZTtcblxuICAgIGlmICh0aGlzLl9wZGYpIHtcbiAgICAgIF9wYWdlID0gdGhpcy5nZXRWYWxpZFBhZ2VOdW1iZXIoX3BhZ2UpO1xuICAgIH1cblxuICAgIHRoaXMuX3BhZ2UgPSBfcGFnZTtcbiAgICBpZiAob3JnaW5hbFBhZ2UgIT09IF9wYWdlKSB7XG4gICAgICB0aGlzLnBhZ2VDaGFuZ2UuZW1pdChfcGFnZSk7XG4gICAgfVxuICB9XG5cbiAgQElucHV0KCdyZW5kZXItdGV4dCcpXG4gIHNldCByZW5kZXJUZXh0KHJlbmRlclRleHQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9yZW5kZXJUZXh0ID0gcmVuZGVyVGV4dDtcbiAgfVxuXG4gIEBJbnB1dCgncmVuZGVyLXRleHQtbW9kZScpXG4gIHNldCByZW5kZXJUZXh0TW9kZShyZW5kZXJUZXh0TW9kZTogUmVuZGVyVGV4dE1vZGUpIHtcbiAgICB0aGlzLl9yZW5kZXJUZXh0TW9kZSA9IHJlbmRlclRleHRNb2RlO1xuICB9XG5cbiAgQElucHV0KCdvcmlnaW5hbC1zaXplJylcbiAgc2V0IG9yaWdpbmFsU2l6ZShvcmlnaW5hbFNpemU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9vcmlnaW5hbFNpemUgPSBvcmlnaW5hbFNpemU7XG4gIH1cblxuICBASW5wdXQoJ3Nob3ctYWxsJylcbiAgc2V0IHNob3dBbGwodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9zaG93QWxsID0gdmFsdWU7XG4gIH1cblxuICBASW5wdXQoJ3N0aWNrLXRvLXBhZ2UnKVxuICBzZXQgc3RpY2tUb1BhZ2UodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9zdGlja1RvUGFnZSA9IHZhbHVlO1xuICB9XG5cbiAgQElucHV0KCd6b29tJylcbiAgc2V0IHpvb20odmFsdWU6IG51bWJlcikge1xuICAgIGlmICh2YWx1ZSA8PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fem9vbSA9IHZhbHVlO1xuICB9XG5cbiAgZ2V0IHpvb20oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3pvb207XG4gIH1cblxuICBASW5wdXQoJ3JvdGF0aW9uJylcbiAgc2V0IHJvdGF0aW9uKHZhbHVlOiBudW1iZXIpIHtcbiAgICBpZiAoISh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIHZhbHVlICUgOTAgPT09IDApKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0ludmFsaWQgcGFnZXMgcm90YXRpb24gYW5nbGUuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fcm90YXRpb24gPSB2YWx1ZTtcbiAgfVxuXG4gIEBJbnB1dCgnZXh0ZXJuYWwtbGluay10YXJnZXQnKVxuICBzZXQgZXh0ZXJuYWxMaW5rVGFyZ2V0KHZhbHVlOiBzdHJpbmcpIHtcbiAgICB0aGlzLl9leHRlcm5hbExpbmtUYXJnZXQgPSB2YWx1ZTtcbiAgfVxuXG4gIEBJbnB1dCgnYXV0b3Jlc2l6ZScpXG4gIHNldCBhdXRvcmVzaXplKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fY2FuQXV0b1Jlc2l6ZSA9IEJvb2xlYW4odmFsdWUpO1xuICB9XG5cbiAgQElucHV0KCdmaXQtdG8tcGFnZScpXG4gIHNldCBmaXRUb1BhZ2UodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9maXRUb1BhZ2UgPSBCb29sZWFuKHZhbHVlKTtcbiAgfVxuXG4gIEBJbnB1dCgnc2hvdy1ib3JkZXJzJylcbiAgc2V0IHNob3dCb3JkZXJzKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fc2hvd0JvcmRlcnMgPSBCb29sZWFuKHZhbHVlKTtcbiAgfVxuXG4gIHN0YXRpYyBnZXRMaW5rVGFyZ2V0KHR5cGU6IHN0cmluZykge1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnYmxhbmsnOlxuICAgICAgICByZXR1cm4gKDxhbnk+UERGSlMpLkxpbmtUYXJnZXQuQkxBTks7XG4gICAgICBjYXNlICdub25lJzpcbiAgICAgICAgcmV0dXJuICg8YW55PlBERkpTKS5MaW5rVGFyZ2V0Lk5PTkU7XG4gICAgICBjYXNlICdzZWxmJzpcbiAgICAgICAgcmV0dXJuICg8YW55PlBERkpTKS5MaW5rVGFyZ2V0LlNFTEY7XG4gICAgICBjYXNlICdwYXJlbnQnOlxuICAgICAgICByZXR1cm4gKDxhbnk+UERGSlMpLkxpbmtUYXJnZXQuUEFSRU5UO1xuICAgICAgY2FzZSAndG9wJzpcbiAgICAgICAgcmV0dXJuICg8YW55PlBERkpTKS5MaW5rVGFyZ2V0LlRPUDtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHN0YXRpYyBzZXRFeHRlcm5hbExpbmtUYXJnZXQodHlwZTogc3RyaW5nKSB7XG4gICAgY29uc3QgbGlua1RhcmdldCA9IFBkZlZpZXdlckNvbXBvbmVudC5nZXRMaW5rVGFyZ2V0KHR5cGUpO1xuXG4gICAgaWYgKGxpbmtUYXJnZXQgIT09IG51bGwpIHtcbiAgICAgICg8YW55PlBERkpTKS5leHRlcm5hbExpbmtUYXJnZXQgPSBsaW5rVGFyZ2V0O1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZWxlbWVudDogRWxlbWVudFJlZikge1xuICAgIGlmIChpc1NTUigpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHBkZldvcmtlclNyYzogc3RyaW5nO1xuXG4gICAgaWYgKFxuICAgICAgd2luZG93Lmhhc093blByb3BlcnR5KCdwZGZXb3JrZXJTcmMnKSAmJlxuICAgICAgdHlwZW9mICh3aW5kb3cgYXMgYW55KS5wZGZXb3JrZXJTcmMgPT09ICdzdHJpbmcnICYmXG4gICAgICAod2luZG93IGFzIGFueSkucGRmV29ya2VyU3JjXG4gICAgKSB7XG4gICAgICBwZGZXb3JrZXJTcmMgPSAod2luZG93IGFzIGFueSkucGRmV29ya2VyU3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICBwZGZXb3JrZXJTcmMgPSBgaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvcGRmLmpzLyR7XG4gICAgICAgIChQREZKUyBhcyBhbnkpLnZlcnNpb25cbiAgICAgIH0vcGRmLndvcmtlci5taW4uanNgO1xuICAgIH1cblxuICAgIChQREZKUyBhcyBhbnkpLkdsb2JhbFdvcmtlck9wdGlvbnMud29ya2VyU3JjID0gcGRmV29ya2VyU3JjO1xuICB9XG5cbiAgbmdBZnRlclZpZXdDaGVja2VkKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLnBkZlZpZXdlckNvbnRhaW5lci5uYXRpdmVFbGVtZW50Lm9mZnNldFBhcmVudDtcblxuICAgIGlmICh0aGlzLmlzVmlzaWJsZSA9PT0gdHJ1ZSAmJiBvZmZzZXQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5pc1Zpc2libGUgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1Zpc2libGUgPT09IGZhbHNlICYmIG9mZnNldCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmlzVmlzaWJsZSA9IHRydWU7XG5cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLm5nT25Jbml0KCk7XG4gICAgICAgIHRoaXMubmdPbkNoYW5nZXMoeyBzcmM6IHRoaXMuc3JjIH0gYXMgYW55KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIGlmICghaXNTU1IoKSAmJiB0aGlzLmlzVmlzaWJsZSkge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc2V0dXBNdWx0aVBhZ2VWaWV3ZXIoKTtcbiAgICAgIHRoaXMuc2V0dXBTaW5nbGVQYWdlVmlld2VyKCk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuX3BkZikge1xuICAgICAgdGhpcy5fcGRmLmRlc3Ryb3koKTtcbiAgICB9XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCd3aW5kb3c6cmVzaXplJywgW10pXG4gIHB1YmxpYyBvblBhZ2VSZXNpemUoKSB7XG4gICAgaWYgKCF0aGlzLl9jYW5BdXRvUmVzaXplIHx8ICF0aGlzLl9wZGYpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yZXNpemVUaW1lb3V0KSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5yZXNpemVUaW1lb3V0KTtcbiAgICB9XG5cbiAgICB0aGlzLnJlc2l6ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlU2l6ZSgpO1xuICAgIH0sIDEwMCk7XG4gIH1cblxuICBnZXQgcGRmTGlua1NlcnZpY2UoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5fc2hvd0FsbFxuICAgICAgPyB0aGlzLnBkZk11bHRpUGFnZUxpbmtTZXJ2aWNlXG4gICAgICA6IHRoaXMucGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlO1xuICB9XG5cbiAgZ2V0IHBkZlZpZXdlcigpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRWaWV3ZXIoKTtcbiAgfVxuXG4gIGdldCBwZGZGaW5kQ29udHJvbGxlcigpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLl9zaG93QWxsXG4gICAgICA/IHRoaXMucGRmTXVsdGlQYWdlRmluZENvbnRyb2xsZXJcbiAgICAgIDogdGhpcy5wZGZTaW5nbGVQYWdlRmluZENvbnRyb2xsZXI7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKGlzU1NSKCkgfHwgIXRoaXMuaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCdzcmMnIGluIGNoYW5nZXMpIHtcbiAgICAgIHRoaXMubG9hZFBERigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fcGRmKSB7XG4gICAgICBpZiAoJ3JlbmRlclRleHQnIGluIGNoYW5nZXMpIHtcbiAgICAgICAgdGhpcy5nZXRDdXJyZW50Vmlld2VyKCkudGV4dExheWVyTW9kZSA9IHRoaXMuX3JlbmRlclRleHRcbiAgICAgICAgICA/IHRoaXMuX3JlbmRlclRleHRNb2RlXG4gICAgICAgICAgOiBSZW5kZXJUZXh0TW9kZS5ESVNBQkxFRDtcbiAgICAgICAgdGhpcy5yZXNldFBkZkRvY3VtZW50KCk7XG4gICAgICB9IGVsc2UgaWYgKCdzaG93QWxsJyBpbiBjaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMucmVzZXRQZGZEb2N1bWVudCgpO1xuICAgICAgfVxuICAgICAgaWYgKCdwYWdlJyBpbiBjaGFuZ2VzKSB7XG4gICAgICAgIGlmIChjaGFuZ2VzWydwYWdlJ10uY3VycmVudFZhbHVlID09PSB0aGlzLl9sYXRlc3RTY3JvbGxlZFBhZ2UpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXcgZm9ybSBvZiBwYWdlIGNoYW5naW5nOiBUaGUgdmlld2VyIHdpbGwgbm93IGp1bXAgdG8gdGhlIHNwZWNpZmllZCBwYWdlIHdoZW4gaXQgaXMgY2hhbmdlZC5cbiAgICAgICAgLy8gVGhpcyBiZWhhdmlvciBpcyBpbnRyb2R1Y2VkYnkgdXNpbmcgdGhlIFBERlNpbmdsZVBhZ2VWaWV3ZXJcbiAgICAgICAgdGhpcy5nZXRDdXJyZW50Vmlld2VyKCkuc2Nyb2xsUGFnZUludG9WaWV3KHsgcGFnZU51bWJlcjogdGhpcy5fcGFnZSB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgdXBkYXRlU2l6ZSgpIHtcbiAgICBjb25zdCBjdXJyZW50Vmlld2VyID0gdGhpcy5nZXRDdXJyZW50Vmlld2VyKCk7XG4gICAgdGhpcy5fcGRmXG4gICAgICAuZ2V0UGFnZShjdXJyZW50Vmlld2VyLmN1cnJlbnRQYWdlTnVtYmVyKVxuICAgICAgLnRoZW4oKHBhZ2U6IFBERlBhZ2VQcm94eSkgPT4ge1xuICAgICAgICBjb25zdCByb3RhdGlvbiA9IHRoaXMuX3JvdGF0aW9uIHx8IHBhZ2Uucm90YXRlO1xuICAgICAgICBjb25zdCB2aWV3cG9ydFdpZHRoID1cbiAgICAgICAgICAocGFnZSBhcyBhbnkpLmdldFZpZXdwb3J0KHtcbiAgICAgICAgICAgIHNjYWxlOiB0aGlzLl96b29tLFxuICAgICAgICAgICAgcm90YXRpb25cbiAgICAgICAgICB9KS53aWR0aCAqIFBkZlZpZXdlckNvbXBvbmVudC5DU1NfVU5JVFM7XG4gICAgICAgIGxldCBzY2FsZSA9IHRoaXMuX3pvb207XG4gICAgICAgIGxldCBzdGlja1RvUGFnZSA9IHRydWU7XG5cbiAgICAgICAgLy8gU2NhbGUgdGhlIGRvY3VtZW50IHdoZW4gaXQgc2hvdWxkbid0IGJlIGluIG9yaWdpbmFsIHNpemUgb3IgZG9lc24ndCBmaXQgaW50byB0aGUgdmlld3BvcnRcbiAgICAgICAgaWYgKFxuICAgICAgICAgICF0aGlzLl9vcmlnaW5hbFNpemUgfHxcbiAgICAgICAgICAodGhpcy5fZml0VG9QYWdlICYmXG4gICAgICAgICAgICB2aWV3cG9ydFdpZHRoID4gdGhpcy5wZGZWaWV3ZXJDb250YWluZXIubmF0aXZlRWxlbWVudC5jbGllbnRXaWR0aClcbiAgICAgICAgKSB7XG4gICAgICAgICAgc2NhbGUgPSB0aGlzLmdldFNjYWxlKFxuICAgICAgICAgICAgKHBhZ2UgYXMgYW55KS5nZXRWaWV3cG9ydCh7IHNjYWxlOiAxLCByb3RhdGlvbiB9KVxuICAgICAgICAgICAgICAud2lkdGhcbiAgICAgICAgICApO1xuICAgICAgICAgIHN0aWNrVG9QYWdlID0gIXRoaXMuX3N0aWNrVG9QYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFZpZXdlci5fc2V0U2NhbGUoc2NhbGUsIHN0aWNrVG9QYWdlKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGNsZWFyKCkge1xuICAgIGlmICh0aGlzLmxvYWRpbmdUYXNrICYmICF0aGlzLmxvYWRpbmdUYXNrLmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy5sb2FkaW5nVGFzay5kZXN0cm95KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BkZikge1xuICAgICAgdGhpcy5fcGRmLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuX3BkZiA9IG51bGw7XG4gICAgICB0aGlzLnBkZk11bHRpUGFnZVZpZXdlci5zZXREb2N1bWVudChudWxsKTtcbiAgICAgIHRoaXMucGRmU2luZ2xlUGFnZVZpZXdlci5zZXREb2N1bWVudChudWxsKTtcblxuICAgICAgdGhpcy5wZGZNdWx0aVBhZ2VMaW5rU2VydmljZS5zZXREb2N1bWVudChudWxsLCBudWxsKTtcbiAgICAgIHRoaXMucGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlLnNldERvY3VtZW50KG51bGwsIG51bGwpO1xuXG4gICAgICB0aGlzLnBkZk11bHRpUGFnZUZpbmRDb250cm9sbGVyLnNldERvY3VtZW50KG51bGwpO1xuICAgICAgdGhpcy5wZGZTaW5nbGVQYWdlRmluZENvbnRyb2xsZXIuc2V0RG9jdW1lbnQobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cE11bHRpUGFnZVZpZXdlcigpIHtcbiAgICAoUERGSlMgYXMgYW55KS5kaXNhYmxlVGV4dExheWVyID0gIXRoaXMuX3JlbmRlclRleHQ7XG5cbiAgICBQZGZWaWV3ZXJDb21wb25lbnQuc2V0RXh0ZXJuYWxMaW5rVGFyZ2V0KHRoaXMuX2V4dGVybmFsTGlua1RhcmdldCk7XG5cbiAgICBjb25zdCBldmVudEJ1cyA9IGNyZWF0ZUV2ZW50QnVzKFBERkpTVmlld2VyKTtcblxuICAgIGV2ZW50QnVzLm9uKCdwYWdlcmVuZGVyZWQnLCBlID0+IHtcbiAgICAgIHRoaXMucGFnZVJlbmRlcmVkLmVtaXQoZSk7XG4gICAgfSk7XG5cbiAgICBldmVudEJ1cy5vbigncGFnZWNoYW5naW5nJywgZSA9PiB7XG4gICAgICBpZiAodGhpcy5wYWdlU2Nyb2xsVGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5wYWdlU2Nyb2xsVGltZW91dCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucGFnZVNjcm9sbFRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5fbGF0ZXN0U2Nyb2xsZWRQYWdlID0gZS5wYWdlTnVtYmVyO1xuICAgICAgICB0aGlzLnBhZ2VDaGFuZ2UuZW1pdChlLnBhZ2VOdW1iZXIpO1xuICAgICAgfSwgMTAwKTtcbiAgICB9KTtcblxuICAgIGV2ZW50QnVzLm9uKCd0ZXh0bGF5ZXJyZW5kZXJlZCcsIGUgPT4ge1xuICAgICAgdGhpcy50ZXh0TGF5ZXJSZW5kZXJlZC5lbWl0KGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5wZGZNdWx0aVBhZ2VMaW5rU2VydmljZSA9IG5ldyBQREZKU1ZpZXdlci5QREZMaW5rU2VydmljZSh7IGV2ZW50QnVzIH0pO1xuICAgIHRoaXMucGRmTXVsdGlQYWdlRmluZENvbnRyb2xsZXIgPSBuZXcgUERGSlNWaWV3ZXIuUERGRmluZENvbnRyb2xsZXIoe1xuICAgICAgbGlua1NlcnZpY2U6IHRoaXMucGRmTXVsdGlQYWdlTGlua1NlcnZpY2UsXG4gICAgICBldmVudEJ1c1xuICAgIH0pO1xuXG4gICAgY29uc3QgcGRmT3B0aW9uczogUERGVmlld2VyUGFyYW1zIHwgYW55ID0ge1xuICAgICAgZXZlbnRCdXM6IGV2ZW50QnVzLFxuICAgICAgY29udGFpbmVyOiB0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudC5xdWVyeVNlbGVjdG9yKCdkaXYnKSxcbiAgICAgIHJlbW92ZVBhZ2VCb3JkZXJzOiAhdGhpcy5fc2hvd0JvcmRlcnMsXG4gICAgICBsaW5rU2VydmljZTogdGhpcy5wZGZNdWx0aVBhZ2VMaW5rU2VydmljZSxcbiAgICAgIHRleHRMYXllck1vZGU6IHRoaXMuX3JlbmRlclRleHRcbiAgICAgICAgPyB0aGlzLl9yZW5kZXJUZXh0TW9kZVxuICAgICAgICA6IFJlbmRlclRleHRNb2RlLkRJU0FCTEVELFxuICAgICAgZmluZENvbnRyb2xsZXI6IHRoaXMucGRmTXVsdGlQYWdlRmluZENvbnRyb2xsZXJcbiAgICB9O1xuXG4gICAgdGhpcy5wZGZNdWx0aVBhZ2VWaWV3ZXIgPSBuZXcgUERGSlNWaWV3ZXIuUERGVmlld2VyKHBkZk9wdGlvbnMpO1xuICAgIHRoaXMucGRmTXVsdGlQYWdlTGlua1NlcnZpY2Uuc2V0Vmlld2VyKHRoaXMucGRmTXVsdGlQYWdlVmlld2VyKTtcbiAgICB0aGlzLnBkZk11bHRpUGFnZUZpbmRDb250cm9sbGVyLnNldERvY3VtZW50KHRoaXMuX3BkZik7XG4gIH1cblxuICBwcml2YXRlIHNldHVwU2luZ2xlUGFnZVZpZXdlcigpIHtcbiAgICAoUERGSlMgYXMgYW55KS5kaXNhYmxlVGV4dExheWVyID0gIXRoaXMuX3JlbmRlclRleHQ7XG5cbiAgICBQZGZWaWV3ZXJDb21wb25lbnQuc2V0RXh0ZXJuYWxMaW5rVGFyZ2V0KHRoaXMuX2V4dGVybmFsTGlua1RhcmdldCk7XG5cbiAgICBjb25zdCBldmVudEJ1cyA9IGNyZWF0ZUV2ZW50QnVzKFBERkpTVmlld2VyKTtcblxuICAgIGV2ZW50QnVzLm9uKCdwYWdlY2hhbmdpbmcnLCBlID0+IHtcbiAgICAgIGlmIChlLnBhZ2VOdW1iZXIgIT0gdGhpcy5fcGFnZSkge1xuICAgICAgICB0aGlzLnBhZ2UgPSBlLnBhZ2VOdW1iZXI7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBldmVudEJ1cy5vbigncGFnZXJlbmRlcmVkJywgZSA9PiB7XG4gICAgICB0aGlzLnBhZ2VSZW5kZXJlZC5lbWl0KGUpO1xuICAgIH0pO1xuXG4gICAgZXZlbnRCdXMub24oJ3RleHRsYXllcnJlbmRlcmVkJywgZSA9PiB7XG4gICAgICB0aGlzLnRleHRMYXllclJlbmRlcmVkLmVtaXQoZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZSA9IG5ldyBQREZKU1ZpZXdlci5QREZMaW5rU2VydmljZSh7XG4gICAgICBldmVudEJ1c1xuICAgIH0pO1xuICAgIHRoaXMucGRmU2luZ2xlUGFnZUZpbmRDb250cm9sbGVyID0gbmV3IFBERkpTVmlld2VyLlBERkZpbmRDb250cm9sbGVyKHtcbiAgICAgIGxpbmtTZXJ2aWNlOiB0aGlzLnBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZSxcbiAgICAgIGV2ZW50QnVzXG4gICAgfSk7XG5cbiAgICBjb25zdCBwZGZPcHRpb25zOiBQREZWaWV3ZXJQYXJhbXMgfCBhbnkgPSB7XG4gICAgICBldmVudEJ1czogZXZlbnRCdXMsXG4gICAgICBjb250YWluZXI6IHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2RpdicpLFxuICAgICAgcmVtb3ZlUGFnZUJvcmRlcnM6ICF0aGlzLl9zaG93Qm9yZGVycyxcbiAgICAgIGxpbmtTZXJ2aWNlOiB0aGlzLnBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZSxcbiAgICAgIHRleHRMYXllck1vZGU6IHRoaXMuX3JlbmRlclRleHRcbiAgICAgICAgPyB0aGlzLl9yZW5kZXJUZXh0TW9kZVxuICAgICAgICA6IFJlbmRlclRleHRNb2RlLkRJU0FCTEVELFxuICAgICAgZmluZENvbnRyb2xsZXI6IHRoaXMucGRmU2luZ2xlUGFnZUZpbmRDb250cm9sbGVyXG4gICAgfTtcblxuICAgIHRoaXMucGRmU2luZ2xlUGFnZVZpZXdlciA9IG5ldyBQREZKU1ZpZXdlci5QREZTaW5nbGVQYWdlVmlld2VyKHBkZk9wdGlvbnMpO1xuICAgIHRoaXMucGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlLnNldFZpZXdlcih0aGlzLnBkZlNpbmdsZVBhZ2VWaWV3ZXIpO1xuICAgIHRoaXMucGRmU2luZ2xlUGFnZUZpbmRDb250cm9sbGVyLnNldERvY3VtZW50KHRoaXMuX3BkZik7XG5cbiAgICB0aGlzLnBkZlNpbmdsZVBhZ2VWaWV3ZXIuX2N1cnJlbnRQYWdlTnVtYmVyID0gdGhpcy5fcGFnZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VmFsaWRQYWdlTnVtYmVyKHBhZ2U6IG51bWJlcik6IG51bWJlciB7XG4gICAgaWYgKHBhZ2UgPCAxKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAocGFnZSA+IHRoaXMuX3BkZi5udW1QYWdlcykge1xuICAgICAgcmV0dXJuIHRoaXMuX3BkZi5udW1QYWdlcztcbiAgICB9XG5cbiAgICByZXR1cm4gcGFnZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RG9jdW1lbnRQYXJhbXMoKSB7XG4gICAgY29uc3Qgc3JjVHlwZSA9IHR5cGVvZiB0aGlzLnNyYztcblxuICAgIGlmICghdGhpcy5fY01hcHNVcmwpIHtcbiAgICAgIHJldHVybiB0aGlzLnNyYztcbiAgICB9XG5cbiAgICBjb25zdCBwYXJhbXM6IGFueSA9IHtcbiAgICAgIGNNYXBVcmw6IHRoaXMuX2NNYXBzVXJsLFxuICAgICAgY01hcFBhY2tlZDogdHJ1ZVxuICAgIH07XG5cbiAgICBpZiAoc3JjVHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHBhcmFtcy51cmwgPSB0aGlzLnNyYztcbiAgICB9IGVsc2UgaWYgKHNyY1R5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoKHRoaXMuc3JjIGFzIGFueSkuYnl0ZUxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcmFtcy5kYXRhID0gdGhpcy5zcmM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBPYmplY3QuYXNzaWduKHBhcmFtcywgdGhpcy5zcmMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICBwcml2YXRlIGxvYWRQREYoKSB7XG4gICAgaWYgKCF0aGlzLnNyYykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmxhc3RMb2FkZWQgPT09IHRoaXMuc3JjKSB7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY2xlYXIoKTtcblxuICAgIHRoaXMubG9hZGluZ1Rhc2sgPSAoUERGSlMgYXMgYW55KS5nZXREb2N1bWVudCh0aGlzLmdldERvY3VtZW50UGFyYW1zKCkpO1xuXG4gICAgdGhpcy5sb2FkaW5nVGFzay5vblByb2dyZXNzID0gKHByb2dyZXNzRGF0YTogUERGUHJvZ3Jlc3NEYXRhKSA9PiB7XG4gICAgICB0aGlzLm9uUHJvZ3Jlc3MuZW1pdChwcm9ncmVzc0RhdGEpO1xuICAgIH07XG5cbiAgICBjb25zdCBzcmMgPSB0aGlzLnNyYztcbiAgICAoPFBERlByb21pc2U8UERGRG9jdW1lbnRQcm94eT4+dGhpcy5sb2FkaW5nVGFzay5wcm9taXNlKS50aGVuKFxuICAgICAgKHBkZjogUERGRG9jdW1lbnRQcm94eSkgPT4ge1xuICAgICAgICB0aGlzLl9wZGYgPSBwZGY7XG4gICAgICAgIHRoaXMubGFzdExvYWRlZCA9IHNyYztcblxuICAgICAgICB0aGlzLmFmdGVyTG9hZENvbXBsZXRlLmVtaXQocGRmKTtcblxuICAgICAgICBpZiAoIXRoaXMucGRmTXVsdGlQYWdlVmlld2VyKSB7XG4gICAgICAgICAgdGhpcy5zZXR1cE11bHRpUGFnZVZpZXdlcigpO1xuICAgICAgICAgIHRoaXMuc2V0dXBTaW5nbGVQYWdlVmlld2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlc2V0UGRmRG9jdW1lbnQoKTtcblxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfSxcbiAgICAgIChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgIHRoaXMub25FcnJvci5lbWl0KGVycm9yKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGUoKSB7XG4gICAgdGhpcy5wYWdlID0gdGhpcy5fcGFnZTtcblxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpIHtcbiAgICB0aGlzLl9wYWdlID0gdGhpcy5nZXRWYWxpZFBhZ2VOdW1iZXIodGhpcy5fcGFnZSk7XG4gICAgY29uc3QgY3VycmVudFZpZXdlciA9IHRoaXMuZ2V0Q3VycmVudFZpZXdlcigpO1xuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fcm90YXRpb24gIT09IDAgfHxcbiAgICAgIGN1cnJlbnRWaWV3ZXIucGFnZXNSb3RhdGlvbiAhPT0gdGhpcy5fcm90YXRpb25cbiAgICApIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjdXJyZW50Vmlld2VyLnBhZ2VzUm90YXRpb24gPSB0aGlzLl9yb3RhdGlvbjtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9zdGlja1RvUGFnZSkge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGN1cnJlbnRWaWV3ZXIuY3VycmVudFBhZ2VOdW1iZXIgPSB0aGlzLl9wYWdlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVTaXplKCk7XG4gIH1cblxuICBwcml2YXRlIGdldFNjYWxlKHZpZXdwb3J0V2lkdGg6IG51bWJlcikge1xuICAgIGNvbnN0IHBkZkNvbnRhaW5lcldpZHRoID1cbiAgICAgIHRoaXMucGRmVmlld2VyQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQuY2xpZW50V2lkdGggLVxuICAgICAgKHRoaXMuX3Nob3dCb3JkZXJzID8gMiAqIFBkZlZpZXdlckNvbXBvbmVudC5CT1JERVJfV0lEVEggOiAwKTtcblxuICAgIGlmIChwZGZDb250YWluZXJXaWR0aCA9PT0gMCB8fCB2aWV3cG9ydFdpZHRoID09PSAwKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gKFxuICAgICAgKHRoaXMuX3pvb20gKiAocGRmQ29udGFpbmVyV2lkdGggLyB2aWV3cG9ydFdpZHRoKSkgL1xuICAgICAgUGRmVmlld2VyQ29tcG9uZW50LkNTU19VTklUU1xuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGdldEN1cnJlbnRWaWV3ZXIoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5fc2hvd0FsbCA/IHRoaXMucGRmTXVsdGlQYWdlVmlld2VyIDogdGhpcy5wZGZTaW5nbGVQYWdlVmlld2VyO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFBkZkRvY3VtZW50KCkge1xuICAgIHRoaXMucGRmRmluZENvbnRyb2xsZXIuc2V0RG9jdW1lbnQodGhpcy5fcGRmKTtcblxuICAgIGlmICh0aGlzLl9zaG93QWxsKSB7XG4gICAgICB0aGlzLnBkZlNpbmdsZVBhZ2VWaWV3ZXIuc2V0RG9jdW1lbnQobnVsbCk7XG4gICAgICB0aGlzLnBkZlNpbmdsZVBhZ2VMaW5rU2VydmljZS5zZXREb2N1bWVudChudWxsKTtcblxuICAgICAgdGhpcy5wZGZNdWx0aVBhZ2VWaWV3ZXIuc2V0RG9jdW1lbnQodGhpcy5fcGRmKTtcbiAgICAgIHRoaXMucGRmTXVsdGlQYWdlTGlua1NlcnZpY2Uuc2V0RG9jdW1lbnQodGhpcy5fcGRmLCBudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wZGZNdWx0aVBhZ2VWaWV3ZXIuc2V0RG9jdW1lbnQobnVsbCk7XG4gICAgICB0aGlzLnBkZk11bHRpUGFnZUxpbmtTZXJ2aWNlLnNldERvY3VtZW50KG51bGwpO1xuXG4gICAgICB0aGlzLnBkZlNpbmdsZVBhZ2VWaWV3ZXIuc2V0RG9jdW1lbnQodGhpcy5fcGRmKTtcbiAgICAgIHRoaXMucGRmU2luZ2xlUGFnZUxpbmtTZXJ2aWNlLnNldERvY3VtZW50KHRoaXMuX3BkZiwgbnVsbCk7XG4gICAgfVxuICB9XG59XG4iXX0=