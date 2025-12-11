// Type declarations for sharp (externalized module)
// This file satisfies TypeScript during build when sharp is externalized via webpack

declare module 'sharp' {
    interface SharpOptions {
        failOnError?: boolean;
        pages?: number;
        page?: number;
        density?: number;
        ignoreIcc?: boolean;
        limitInputPixels?: number | boolean;
        unlimited?: boolean;
        sequentialRead?: boolean;
        animated?: boolean;
    }

    interface Metadata {
        format?: string;
        size?: number;
        width?: number;
        height?: number;
        space?: string;
        channels?: number;
        depth?: string;
        density?: number;
        chromaSubsampling?: string;
        isProgressive?: boolean;
        hasProfile?: boolean;
        hasAlpha?: boolean;
        orientation?: number;
        exif?: Buffer;
        icc?: Buffer;
        iptc?: Buffer;
        xmp?: Buffer;
    }

    interface Stats {
        channels: Array<{
            min: number;
            max: number;
            sum: number;
            squaresSum: number;
            mean: number;
            stdev: number;
            minX: number;
            minY: number;
            maxX: number;
            maxY: number;
        }>;
        isOpaque: boolean;
        entropy: number;
        sharpness: number;
    }

    interface OutputInfo {
        format: string;
        size: number;
        width: number;
        height: number;
        channels: number;
        premultiplied: boolean;
    }

    interface Sharp {
        metadata(): Promise<Metadata>;
        stats(): Promise<Stats>;
        toBuffer(): Promise<Buffer>;
        toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: OutputInfo }>;
        toFile(path: string): Promise<OutputInfo>;
        resize(width?: number | null, height?: number | null, options?: {
            width?: number;
            height?: number;
            fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
            position?: string | number;
            background?: string | { r: number; g: number; b: number; alpha?: number };
            kernel?: string;
            withoutEnlargement?: boolean;
            withoutReduction?: boolean;
            fastShrinkOnLoad?: boolean;
        }): Sharp;
        webp(options?: { quality?: number; alphaQuality?: number; lossless?: boolean; nearLossless?: boolean; smartSubsample?: boolean; effort?: number }): Sharp;
        jpeg(options?: { quality?: number; progressive?: boolean; chromaSubsampling?: string; optimiseCoding?: boolean; mozjpeg?: boolean; trellisQuantisation?: boolean; overshootDeringing?: boolean; optimiseScans?: boolean; quantisationTable?: number }): Sharp;
        png(options?: { progressive?: boolean; compressionLevel?: number; adaptiveFiltering?: boolean; palette?: boolean; quality?: number; effort?: number; colours?: number; dither?: number }): Sharp;
        raw(): Sharp;
        greyscale(): Sharp;
        grayscale(): Sharp;
        convolve(options: { width: number; height: number; kernel: number[]; scale?: number; offset?: number }): Sharp;
        rotate(angle?: number, options?: { background?: string | { r: number; g: number; b: number; alpha?: number } }): Sharp;
        flip(): Sharp;
        flop(): Sharp;
        sharpen(sigma?: number, flat?: number, jagged?: number): Sharp;
        blur(sigma?: number): Sharp;
        flatten(options?: { background?: string | { r: number; g: number; b: number } }): Sharp;
        gamma(gamma?: number, gammaOut?: number): Sharp;
        negate(options?: { alpha?: boolean }): Sharp;
        normalise(): Sharp;
        normalize(): Sharp;
        clahe(options: { width: number; height: number; maxSlope?: number }): Sharp;
        modulate(options?: { brightness?: number; saturation?: number; hue?: number; lightness?: number }): Sharp;
        tint(rgb: string | { r: number; g: number; b: number }): Sharp;
        extract(options: { left: number; top: number; width: number; height: number }): Sharp;
        trim(options?: { background?: string | { r: number; g: number; b: number }; threshold?: number }): Sharp;
        extend(options: { top?: number; left?: number; bottom?: number; right?: number; extendWith?: string; background?: string | { r: number; g: number; b: number; alpha?: number } } | number): Sharp;
    }

    function sharp(input?: Buffer | string, options?: SharpOptions): Sharp;

    export = sharp;
}
