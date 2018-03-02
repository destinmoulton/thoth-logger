class Helpers {
    isArray(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
    }

    isObject(obj) {
        return obj !== null && typeof obj === "object";
    }

    isObjectEmpty(obj) {
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) return false;
        }
        return true;
    }

    isString(obj) {
        return typeof obj === "string" || obj instanceof String;
    }

    isArgDefined(obj) {
        return obj !== undefined && obj !== null;
    }

    isArgEmpty(arg) {
        if (this.isArray(arg)) {
            // Arrays
            return arg.length === 0;
        } else if (this.isObject(arg)) {
            return this.isObjectEmpty(arg);
        } else if (this.isString(arg)) {
            return arg.length === 0;
        }

        return false;
    }
}
