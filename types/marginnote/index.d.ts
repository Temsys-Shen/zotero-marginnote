// Re-export MarginNote types so TypeScript can find them via `typeRoots`.
// This references the distributed d.ts that lives in node_modules.
/// <reference path="../../node_modules/marginnote/dist/index.d.ts" />

declare class NSString {
    static alloc(): NSString;
    /**
     * @param data NSData 数据
     * @param encoding 编码格式 (4 代表 UTF8)
     */
    initWithDataEncoding(data: NSData, encoding: number): string;
    static stringWithString(str: string): NSString;
}

declare class NSURLComponents {
    static componentsWithString(urlString: string): NSURLComponents;
    scheme: string;
    user: string;
    password: string;
    host: string;
    port: number;
    path: string;
    query: string;
    fragment: string;
    URL(): NSURL;
    string(): string;
}
