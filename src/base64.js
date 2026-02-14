// base64.js
// Base64 解码工具函数

var SZBase64 = class {
    static get _keyStr() {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    }

    static decode(input) {
        let output = "";
        let i = 0;

        while (i < input.length) {
            const enc1 = this._keyStr.indexOf(input.charAt(i++));
            const enc2 = this._keyStr.indexOf(input.charAt(i++));
            const enc3 = this._keyStr.indexOf(input.charAt(i++));
            const enc4 = this._keyStr.indexOf(input.charAt(i++));

            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;

            output += String.fromCharCode(chr1);
            if (enc3 !== 64) {
                output += String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output += String.fromCharCode(chr3);
            }
        }

        return output;
    }
}
