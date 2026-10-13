import ValidationResult from "./ValidationResult";

/**
 * 数据校验共用工具方法
 * 遵循JSON规范：仅识别双引号 "，不支持单引号 ' 和反引号 `
 *
 * 包含：
 * - 引号感知的逗号分割（双引号内的逗号不做分割）
 * - 转义符合法性检测（JSON标准转义符）
 * - 外层双引号剥离
 */
export default class data_checker_tool {

    private static _instance: data_checker_tool | null = null;

    public static get instance(): data_checker_tool {
        if (data_checker_tool._instance === null) {
            data_checker_tool._instance = new data_checker_tool();
        }
        return data_checker_tool._instance;
    }

    /**
     * 引号感知的逗号分割（仅识别双引号 "，符合JSON规范）
     * 双引号内的逗号视为普通字符，不做分割
     * 遇到转义符 \" 时不视为引号闭合
     * @param content - 待分割的字符串（不含外层括号）
     * @returns 分割后的元素列表（已trim，自动跳过空元素）
     */
    /**
     * 引号+括号感知的逗号分割（符合JSON规范）
     * 以下情况中的逗号不做分割：
     * - 双引号字符串内的逗号
     * - 数组 [] 内的逗号
     * - 对象 {} 内的逗号
     * 遇到转义符 \" 时不视为引号闭合
     * @param content - 待分割的字符串（不含外层括号）
     * @returns 分割后的元素列表（已trim，自动跳过空元素）
     */
    splitByCommaIgnoreQuotes(content: string): string[] {
        const elements: string[] = [];
        let current = '';
        let inString = false;   // 是否在双引号字符串内
        let bracketDepth = 0;   // [] 和 {} 的嵌套深度

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            // 转义符：在字符串内时，跳过下一个字符（如 \" \\ \n 等）
            if (char === '\\' && inString) {
                current += char;
                if (i + 1 < content.length) {
                    current += content[i + 1];
                    i++;
                }
                continue;
            }

            // 双引号：切换字符串状态
            if (char === '"') {
                inString = !inString;
                current += char;
                continue;
            }

            // 不在字符串内时，跟踪括号深度
            if (!inString) {
                if (char === '[' || char === '{') {
                    bracketDepth++;
                } else if (char === ']' || char === '}') {
                    bracketDepth--;
                }
            }

            // 逗号且不在字符串内且不在括号内：才是真正的分隔符
            if (char === ',' && !inString && bracketDepth === 0) {
                if (current.trim() !== '') {
                    elements.push(current.trim());
                }
                current = '';
                continue;
            }

            current += char;
        }

        // 最后一个元素
        if (current.trim() !== '') {
            elements.push(current.trim());
        }

        return elements;
    }

    /**
     * 检测字符串中的转义符是否合法（符合JSON规范）
     * 合法转义符：\" \\ \/ \b \f \n \r \t \uXXXX（4位十六进制）
     * @param str - 待检测的字符串内容（不含外层双引号）
     * @returns 校验结果（成功时value为原字符串）
     */
    checkEscapeSequences(str: string): ValidationResult {
        const validEscapes = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
        let i = 0;

        while (i < str.length) {
            if (str[i] !== '\\') {
                i++;
                continue;
            }

            // 遇到转义符，检查是否有后续字符
            if (i + 1 >= str.length) {
                return ValidationResult.error(`转义符错误：字符串末尾的"\\"无后续字符（转义符必须跟随合法字符）`);
            }

            const nextChar = str[i + 1];

            // \uXXXX：检查4位十六进制
            if (nextChar === 'u') {
                const hexPart = str.slice(i + 2, i + 6);
                if (hexPart.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hexPart)) {
                    return ValidationResult.error(`转义符错误："\\u${hexPart}"不是合法的Unicode转义（\\u后必须跟4位十六进制字符，如\\u0041）`);
                }
                i += 6; // 跳过 \uXXXX
                continue;
            }

            // 其他合法转义符
            if (!validEscapes.has(nextChar)) {
                return ValidationResult.error(`转义符错误："\\${nextChar}"不是合法的JSON转义符（仅支持：\\" \\\\ \\/ \\b \\f \\n \\r \\t \\uXXXX）`);
            }

            i += 2; // 跳过 \x
        }

        return ValidationResult.success(str, '转义符合法');
    }

    /**
     * 剥离字符串外层的双引号（仅支持JSON标准双引号）
     * @param str - 待处理的字符串
     * @returns 剥离后的内容；若不是双引号包裹则返回null
     */
    stripOuterDoubleQuotes(str: string): string | null {
        if (str.length >= 2 && str.startsWith('"') && str.endsWith('"')) {
            return str.slice(1, -1);
        }
        return null;
    }
}
