// Type declaration for optional html2canvas dependency
// This module is dynamically imported and may not be available at runtime
declare module 'html2canvas' {
    interface Html2CanvasOptions {
        backgroundColor?: string | null;
        scale?: number;
        useCORS?: boolean;
        logging?: boolean;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
    }

    function html2canvas(
        _element: HTMLElement,
        _options?: Html2CanvasOptions
    ): Promise<HTMLCanvasElement>;

    export default html2canvas;
}
