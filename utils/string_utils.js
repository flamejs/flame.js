Flame.StringUtils = (function() {
    function compare(stringA, stringB) {
        var a = asBlank(stringA);
        var b = asBlank(stringB);
        var comp = a < b ? -1 : b < a ? 1 : 0;
        return comp;
    }

    function compareIgnoreCase(stringA, stringB) {
        return compare(asBlank(stringA).toUpperCase(), asBlank(stringB).toUpperCase());
    }

    function asBlank(string) {
        return Ember.none(string) ? "" : string;
    }

    function escapeForRegexp(rawString) {
        return rawString.replace(/[\^$*+?.(){}\[\]|]/g, "\\$&");
    }

    return  {
        compare: compare,
        /**
         * Compare two strings in case-insensitive way:
         * 1. Null and undefined values are converted to "".
         * 2. The strings are compared ignoring the case and user language's rules of collation and case mapping,
         * using Unicode default collation and case mapping instead.
         * @param stringA the first string
         * @param stringB the second string
         * @return {*} -1, 1, or 0 depending if stringA comes before, after or is the same as stringB.
         */
        compareIgnoreCase: compareIgnoreCase,
        /**
         * @return the input string or in case it is null / undefined, "".
         */
        asBlank: asBlank,
        escapeForRegexp: escapeForRegexp
    };
})();
