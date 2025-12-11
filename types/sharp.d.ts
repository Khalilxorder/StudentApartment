// Type declarations for sharp (externalized module)
// This file satisfies TypeScript during build when sharp is externalized via webpack

// Namespace declaration for sharp.Sharp type references
declare namespace sharp {
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
            variance?: number;
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
        ensureAlpha(alpha?: number): Sharp;
        removeAlpha(): Sharp;
        extractChannel(channel: 0 | 1 | 2 | 3 | 'red' | 'green' | 'blue' | 'alpha'): Sharp;
        joinChannel(images: string | Buffer | ArrayLike<string | Buffer>, options?: { raw?: { width: number; height: number; channels: number } }): Sharp;
        bandbool(boolOp: 'and' | 'or' | 'eor'): Sharp;
        tiff(options?: { quality?: number; compression?: string; predictor?: string; pyramid?: boolean; bitdepth?: number; tile?: boolean; tileWidth?: number; tileHeight?: number }): Sharp;
        avif(options?: { quality?: number; lossless?: boolean; effort?: number; chromaSubsampling?: string }): Sharp;
        heif(options?: { quality?: number; compression?: string; lossless?: boolean; effort?: number; chromaSubsampling?: string }): Sharp;
        gif(options?: { reoptimise?: boolean; colors?: number; effort?: number; dither?: number; loop?: number; delay?: number | number[] }): Sharp;
        composite(images: Array<{ input: Buffer | string; gravity?: string; top?: number; left?: number; tile?: boolean; blend?: string; density?: number; raw?: { width: number; height: number; channels: number } }>): Sharp;
        affine(matrix: [number, number, number, number], options?: { background?: string | { r: number; g: number; b: number; alpha?: number }; idx?: number; idy?: number; odx?: number; ody?: number; interpolator?: string }): Sharp;
        median(size?: number): Sharp;
        threshold(threshold?: number, options?: { greyscale?: boolean }): Sharp;
        boolean(operand: string | Buffer, operator: 'and' | 'or' | 'eor', options?: { raw?: { width: number; height: number; channels: number } }): Sharp;
        linear(a?: number | number[], b?: number | number[]): Sharp;
        recomb(inputMatrix: number[][]): Sharp;
        unflatten(): Sharp;
        clone(): Sharp;
    }
}

// Function declaration for sharp(input) calls
declare function sharp(input?: Buffer | string, options?: sharp.SharpOptions): sharp.Sharp;

// Module declaration for import sharp from 'sharp'
declare module 'sharp' {
    export = sharp;
}
