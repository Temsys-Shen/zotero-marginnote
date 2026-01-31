// Re-export MarginNote types so TypeScript can find them via `typeRoots`.
// This references the distributed d.ts that lives in node_modules.
/// <reference path="../../node_modules/marginnote/dist/index.d.ts" />

declare class NSString {
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

// Extend existing global classes from MarginNote
declare global {
    // Extend UIView with constructor
    class UIView {
        constructor(frame: CGRect);
    }

    // Override UILabel constructor to match actual runtime behavior
    interface UILabel {
        new(frame?: CGRect): any;
    }

    // Extend UIColor with additional methods
    const UIColor: {
        colorWithHexString(rgbHex: string): UIColor;
        blackColor(): UIColor;
        darkGrayColor(): UIColor;
        lightGrayColor(): UIColor;
        whiteColor(): UIColor;
        grayColor(): UIColor;
        redColor(): UIColor;
        greenColor(): UIColor;
        blueColor(): UIColor;
        cyanColor(): UIColor;
        yellowColor(): UIColor;
        magentaColor(): UIColor;
        orangeColor(): UIColor;
        purpleColor(): UIColor;
        brownColor(): UIColor;
        clearColor(): UIColor;
        colorWithWhiteAlpha(white: number, alpha: number): UIColor;
        colorWithRedGreenBlueAlpha(red: number, green: number, blue: number, alpha: number): UIColor;
        CGColor(): any;
    };

    // Extend UILabel with additional methods
    class UILabel {
        constructor(frame?: CGRect);
        text(): string;
        setText(text: string): void;
    }

    // Extend UITextField with additional methods
    class UITextField {
        constructor(frame: CGRect);
        initWithFrame(frame: CGRect): UITextField;
        text(): string;
        resignFirstResponder(): boolean;
    }

    // Extend UITableView with additional methods
    class UITableView {
        constructor(frame: CGRect);
        initWithFrame(frame: CGRect): UITableView;
        registerClassForCellReuseIdentifier(cellClass: any, identifier: string): void;
        dequeueReusableCellWithIdentifierForIndexPath(identifier: string, indexPath: NSIndexPath): UITableViewCell;
        deselectRowAtIndexPathAnimated(indexPath: NSIndexPath, animated: boolean): void;
        separatorStyle: number;
        backgroundColor: UIColor;
        reloadData(): void;
    }

    // Extend UITableViewCell with additional methods
    class UITableViewCell {
        constructor(style: number, reuseIdentifier: string);
        initWithFrame(style: number, reuseIdentifier: string): UITableViewCell;
        viewWithTag(tag: number): UIView;
    }

    // Extend UIButton with additional methods
    class UIButton {
        static buttonWithType(type: number): UIButton;
        initWithFrame(frame: CGRect): UIButton;
        addTargetActionForControlEvents(target: any, action: string, controlEvents: number): void;
        titleLabel: UILabel;
    }

    // Extend UIFont with additional methods
    const UIFont: {
        systemFontOfSize(fontSize: number): UIFont;
        boldSystemFontOfSize(fontSize: number): UIFont;
        italicSystemFontOfSize(fontSize: number): UIFont;
    };
}

// Declare NSIndexPath if not already declared
declare class NSIndexPath {
    row: number;
    section: number;
}

// Declare UITableView globally for JavaScript files (extends UIView)
declare class UITableView extends UIView {
    constructor(frame: CGRect);
    initWithFrame(frame: CGRect): UITableView;
    registerClassForCellReuseIdentifier(cellClass: any, identifier: string): void;
    dequeueReusableCellWithIdentifierForIndexPath(identifier: string, indexPath: NSIndexPath): UITableViewCell;
    deselectRowAtIndexPathAnimated(indexPath: NSIndexPath, animated: boolean): void;
    separatorStyle: number;
    backgroundColor: UIColor;
    reloadData(): void;
    dataSource: any;
    delegate: any;
}

