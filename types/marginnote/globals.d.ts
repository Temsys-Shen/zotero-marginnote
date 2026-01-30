declare global {
    const self: JSExtension & { window?: UIWindow } & Record<string, any>;
    const NSMutableData: {
        dataWithCapacity(aNumItems: number): NSMutableData;
        dataWithLength(length: number): NSMutableData;
    };
    
    type NSMutableDataInterface = {
        mutableBytes(): any;
        setLength(length: number): void;
        increaseLengthBy(extraLength: number): void;
        appendBytesLength(bytes: any, length: number): void;
        appendData(other: NSData): void;
        replaceBytesInRangeWithBytes(range: any, bytes: any): void;
        replaceBytesInRangeWithBytesLength(range: any, replacementBytes: any, replacementLength: number): void;
        resetBytesInRange(range: any): void;
        setData(data: NSData): void;
    };
    
    type NSMutableData = NSData & NSMutableDataInterface;
    
    const ZoteroNetwork: {
        fetch(url: string, options?: any): Promise<any>;
    };
}

export { };
