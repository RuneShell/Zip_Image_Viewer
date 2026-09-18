export type ImgShape = { width: number, height: number };


class FileParser {
    // Singleton pattern
    private static instance: FileParser;
    private constructor() {};
    public static getInstance(): FileParser {
        if (!FileParser.instance) FileParser.instance = new FileParser();
        return FileParser.instance;
    }


    public async getImgShape(file: File): Promise<ImgShape> {
        const ext = this.getFileExtension(file.name);

        // switch (ext) {
        //     case 'jpg':
        //     case 'jpeg':
        //         return this.getJpegShape(file);
        //     case 'png':
        // }
        const header  = new Uint8Array(await file.slice(0, 32).arrayBuffer());
        if (ext === 'png') {
            return Promise.resolve(this.getPngShape(header));
        } else if (ext === 'jpg' || ext === 'jpeg') {
            return await this.getJpegShape(file);
        } else if (ext === 'gif') {
            return Promise.resolve(this.getGifShape(header));
        } else if (ext === 'webp') {
            return Promise.resolve(this.getWebpShape(header));
        // } else if (ext === 'bmp') {
        //     return this.getBmpShape(header);
        } else{
            console.assert(false, "Unsupported image format", ext);
            return Promise.resolve({ width: -1, height: -1 });
        }
    }

    private getFileExtension(filename: string): string {
        return filename.split('.').pop()?.toLowerCase() || '';
    }

    private async getJpegShape(file: File): Promise<ImgShape> {
        // JPEG의 SOF marker는 파일 앞에 있는다는 보장이 없으므로, 청크 단위로 읽으며 찾아야 함.
        const chunkSize = 1024 * 64;
        let offset = 2; // SOI(FFD8) 이후부터 시작

        let carry = new Uint8Array(0);

        while (offset < file.size) {
            const chunk = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
            const data = new Uint8Array(carry.length + chunk.length);
            data.set(carry, 0);
            data.set(chunk, carry.length);

            for(let i = 0; i + 9 < data.length; i++) {
                if (data[i] != 0xFF) continue;

                const marker = data[i + 1];
                const isSOF = (marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF);
                if (isSOF) {
                    const view = new DataView(data.buffer, data.byteOffset);
                    return Promise.resolve({ width: view.getUint16(i + 7, false), height: view.getUint16(i + 5, false) });
                }
            }

            carry = data.slice(Math.max(0, data.length - 16)); // carry over the last 16 bytes to handle markers that may span across chunks
            offset += chunk.length;
        }

        console.assert(false, "SOF marker not found in JPEG file", file);
        return Promise.resolve({ width: -1, height: -1 });
    }

    private getPngShape(header: Uint8Array): ImgShape {
        const view = new DataView(header.buffer);
        // IHDR chunk에 위치.
        return { width: view.getUint32(16), height: view.getUint32(20, false) };
    }

    private getGifShape(header: Uint8Array): ImgShape {
        const view = new DataView(header.buffer);
        // Logical Screen Descriptor에 위치.
        return { width: view.getUint16(6, false), height: view.getUint16(8, false) };
    }

    private getWebpShape(header: Uint8Array): ImgShape {
        const view = new DataView(header.buffer);
        
        // VP8 lossy format
        if (header[12] == 0x56 && header[13] == 0x50 && header[14] == 0x38 && header[15] == 0x20) {
            for(let i = 20; i + 7 < header.length; i++) {
                if (header[i] == 0x9d && header[i + 1] == 0x01 && header[i + 2] == 0x2a) {
                    return { width: view.getUint16(i + 3, true) & 0x3FFF, height: view.getUint16(i + 5, true) & 0x3FFF };
                }

            }
        }

        // VP8L lossless format
        else if (header[12] == 0x56 && header[13] == 0x50 && header[14] == 0x38 && header[15] == 0x4c) {
            const bits = header[21] | (header[22] << 8) | (header[23] << 16) | (header[24] << 24);
            return { width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1 };
        }

        // VP8X extended format
        else if (header[12] == 0x56 && header[13] == 0x50 && header[14] == 0x38 && header[15] == 0x58) {
            return { width: header[24] + (header[25] << 8) + (header[26] << 16) + 1, height: header[27] + (header[28] << 8) + (header[29] << 16) + 1 };
        }
        
        console.assert(false, "Invalid WebP header", header);
        return {width: -1, height: -1};
    }


}
export const fileParser = FileParser.getInstance();

