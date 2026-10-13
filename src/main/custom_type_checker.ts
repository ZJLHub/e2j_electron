import DataChecker from "./data_checker";
import data_checker_tool from "./data_checker_tool";
import ValidationResult from "./ValidationResult";

/**自定义类型检测，因data_checker太长而拆分 */
export default class custom_type_checker {

    private static _instance: custom_type_checker | null = null;

    public static get instance(): custom_type_checker {
        if (custom_type_checker._instance === null) {
            custom_type_checker._instance = new custom_type_checker();
        }
        return custom_type_checker._instance;
    }

    /**
     * 检测自定义类型（XXX）- 支持Excel其他页签声明的复合结构校验
     * 遵循JSON规范：字段名必须用双引号包裹，字符串值必须用双引号包裹
     * @param {any} data - Excel单元格原始数据（需符合{}包裹格式，如{"id":1,"name":"张三","isVip":true}）
     * @param {CustomSchema} customSchema - 自定义类型的结构描述（从Excel其他页签解析而来）
     *   - 格式示例：{ id: { type: 'number', allowNull: false }, name: { type: 'string', allowNull: false }, isVip: { type: 'boolean', allowNull: true } }
     * @param {boolean} [allowNull=false] - 是否允许单元格整体为空
     * @returns {ValidationResult} 校验结果（成功时value为解析后的对象，失败时为null）
     */
    checkCustom(data: any, customSchema: CustomSchema, allowNull: boolean = false): ValidationResult {
        const tool = data_checker_tool.instance;

        // 1. 先检测单元格整体空值（遵循统一空值处理规则）
        const nullCheckResult = DataChecker.instance.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为字符串处理（标准化Excel可能返回的各种类型）
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验自定义类型的格式（必须用{}包裹，符合二重类型规范）
        if (!dataStr.startsWith('{') || !dataStr.endsWith('}')) {
            return ValidationResult.error(`自定义类型格式错误："${dataStr}"（需用{}包裹，如{"id":1,"name":"张三"}）`);
        }

        // 4. 提取自定义类型内部的键值对（处理空对象场景，如{}）
        const content = dataStr.slice(1, -1).trim();
        const parsedResult: Record<string, any> = {}; // 存储解析后的合法键值对

        // 4.1 若内容为空（如{}），需校验schema是否允许所有字段为空
        if (content === '') {
            for (const [fieldName, fieldRule] of Object.entries(customSchema)) {
                if (!fieldRule.allowNull) {
                    return ValidationResult.error(`自定义类型空对象不合法：字段"${fieldName}"不允许为空`);
                }
                parsedResult[fieldName] = null; // 允许空的字段赋值为null
            }
            return ValidationResult.success(parsedResult, `合法自定义类型（空对象，所有字段允许为空）`);
        }

        // 4.2 引号感知分割键值对（双引号内的逗号不做分割）
        const keyValuePairs = tool.splitByCommaIgnoreQuotes(content);
        const processedFields = new Set<string>(); // 用于检测重复字段

        for (const pair of keyValuePairs) {
            // 分割键和值（按第一个:分割）
            const colonIndex = pair.indexOf(':');
            if (colonIndex === -1) {
                return ValidationResult.error(`自定义类型键值对格式错误："${pair}"（需用:分隔键和值，如"id":1）`);
            }

            // 字段名：必须用双引号包裹，剥离后使用
            const rawFieldName = pair.slice(0, colonIndex).trim();
            const fieldName = tool.stripOuterDoubleQuotes(rawFieldName);
            if (fieldName === null) {
                return ValidationResult.error(`自定义类型字段名格式错误："${rawFieldName}"（字段名必须用双引号"包裹，如"id"，JSON规范不支持单引号'和反引号\`）`);
            }

            // 字段值：原始字符串（后续根据类型处理）
            const fieldValue = pair.slice(colonIndex + 1).trim();

            // 校验1：字段是否在schema中定义（禁止多余字段）
            if (!customSchema.hasOwnProperty(fieldName)) {
                return ValidationResult.error(`自定义类型包含未定义字段："${fieldName}"（仅允许schema中的字段：${Object.keys(customSchema).join(', ')}）`);
            }

            // 校验2：字段是否重复（如"id":1,"id":2）
            if (processedFields.has(fieldName)) {
                return ValidationResult.error(`自定义类型字段重复："${fieldName}"（同一字段不可重复定义）`);
            }
            processedFields.add(fieldName);

            // 校验3：根据schema的字段类型，调用对应基础校验函数
            const fieldRule = customSchema[fieldName];
            let fieldCheckResult: ValidationResult;

            switch (fieldRule.type) {
                case 'number':
                    fieldCheckResult = DataChecker.instance.checkNumber(fieldValue, fieldRule.allowNull);
                    break;
                case 'string': {
                    // string类型：值必须用双引号包裹，剥离后做转义符检测
                    const strContent = tool.stripOuterDoubleQuotes(fieldValue);
                    if (strContent === null) {
                        fieldCheckResult = ValidationResult.error(`字符串值格式错误："${fieldValue}"（string类型的值必须用双引号"包裹，如"abc"）`);
                        break;
                    }
                    // 转义符检测
                    const escapeCheck = tool.checkEscapeSequences(strContent);
                    if (!escapeCheck.valid) {
                        fieldCheckResult = ValidationResult.error(`${escapeCheck.message}（字段值："${fieldValue}"）`);
                        break;
                    }
                    fieldCheckResult = DataChecker.instance.checkString(strContent, fieldRule.allowNull);
                    break;
                }
                case 'boolean':
                    fieldCheckResult = DataChecker.instance.checkBoolean(fieldValue, fieldRule.allowNull);
                    break;
                case 'numberArray':
                    fieldCheckResult = DataChecker.instance.checkNumberArray(
                        fieldValue,
                        fieldRule.allowNull,
                        fieldRule.allowEmptyArray ?? false
                    );
                    break;
                case 'stringArray':
                    fieldCheckResult = DataChecker.instance.checkStringArray(
                        fieldValue,
                        fieldRule.allowNull,
                        fieldRule.allowEmptyArray ?? false
                    );
                    break;
                case 'booleanArray':
                    fieldCheckResult = DataChecker.instance.checkBooleanArray(
                        fieldValue,
                        fieldRule.allowNull,
                        fieldRule.allowEmptyArray ?? false
                    );
                    break;
                default:
                    return ValidationResult.error(`自定义类型字段"${fieldName}"类型不支持："${fieldRule.type}"（仅支持基础类型及基础类型数组）`);
            }

            // 若字段校验失败，返回具体错误
            if (!fieldCheckResult.valid) {
                return ValidationResult.error(`自定义类型字段"${fieldName}"校验失败：${fieldCheckResult.message}（字段值："${fieldValue}"）`);
            }

            // 收集合法的字段值
            parsedResult[fieldName] = fieldCheckResult.value;
        }

        // 5. 校验schema中是否有必传字段未填写（如schema有id/name，数据只传了id）
        for (const [fieldName, fieldRule] of Object.entries(customSchema)) {
            if (!processedFields.has(fieldName)) {
                if (!fieldRule.allowNull) {
                    return ValidationResult.error(`自定义类型缺少必传字段："${fieldName}"（该字段不允许为空，需补充）`);
                }
                parsedResult[fieldName] = null; // 允许空的字段补默认null
            }
        }

        // 6. 所有校验通过，返回解析后的自定义对象
        return ValidationResult.success(
            parsedResult,
            `合法自定义类型（包含${Object.keys(parsedResult).length}个字段：${Object.keys(parsedResult).join(', ')}）`
        );
    }

    /**
     * 检测自定义类型数组（XXXArray）- 自定义类型的数组形式校验
     * @param {any} data - Excel单元格原始数据（需符合[]包裹，内部元素为自定义类型，如[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]）
     * @param {CustomSchema} customSchema - 自定义类型的结构描述（同checkXXX的customSchema参数）
     * @param {boolean} [allowNull=false] - 是否允许单元格整体为空
     * @param {boolean} [allowEmptyArray=false] - 是否允许空数组（如[]）
     * @returns {ValidationResult} 校验结果（成功时value为自定义对象数组，失败时为null）
     */
    checkCustomArray(data: any, customSchema: CustomSchema, allowNull: boolean = false, allowEmptyArray: boolean = false): ValidationResult {
        // 1. 先检测单元格整体空值（统一空值处理规则）
        const nullCheckResult = DataChecker.instance.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为字符串处理（标准化输入格式）
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验数组格式（必须用[]包裹，符合数组统一规范）
        if (!dataStr.startsWith('[') || !dataStr.endsWith(']')) {
            return ValidationResult.error(`自定义类型数组格式错误："${dataStr}"（需用[]包裹，如[{"id":1},{"id":2}]）`);
        }

        // 4. 提取数组内部的自定义类型元素（处理空数组场景）
        const arrayContent = dataStr.slice(1, -1).trim();
        const validElements: any[] = []; // 存储校验通过的自定义对象

        // 4.1 处理空数组（如[]）
        if (arrayContent === '') {
            if (allowEmptyArray) {
                return ValidationResult.success([], '合法自定义类型数组（空数组，允许空数组）');
            } else {
                return ValidationResult.error('自定义类型空数组不合法（默认不允许空数组，需至少1个元素）');
            }
        }

        // 4.2 分割数组元素（自定义类型元素间用,分隔，用平衡括号法匹配{}）
        // 注意：如果字符串值内包含 { 或 }，平衡括号法会受影响，当前暂不处理该极端场景
        const elements: string[] = [];
        let balance = 0; // 用于匹配{}的平衡
        let currentElement = '';

        for (const char of arrayContent) {
            if (char === '{') balance++;
            if (char === '}') balance--;

            // 当平衡为0且遇到,时，说明是元素分隔符，截取当前元素
            if (char === ',' && balance === 0) {
                elements.push(currentElement.trim());
                currentElement = '';
            } else {
                currentElement += char;
            }
        }
        // 加入最后一个元素（循环结束后剩余的currentElement）
        elements.push(currentElement.trim());

        // 4.3 逐个校验数组元素（复用checkCustom函数，保证自定义类型规则统一）
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            // 跳过空元素（如数组内有多余逗号导致的空字符串）
            if (DataChecker.instance.isEmpty(element)) {
                return ValidationResult.error(`自定义类型数组第${i + 1}个元素为空（不允许空元素）`);
            }

            // 调用checkCustom校验单个自定义类型元素
            const elementCheckResult = this.checkCustom(element, customSchema, false); // 数组元素默认不允许空
            if (!elementCheckResult.valid) {
                return ValidationResult.error(`自定义类型数组第${i + 1}个元素校验失败：${elementCheckResult.message}（元素值："${element}"）`);
            }

            validElements.push(elementCheckResult.value);
        }

        // 5. 所有元素校验通过，返回数组结果
        return ValidationResult.success(
            validElements,
            `合法自定义类型数组（共${validElements.length}个元素，自定义类型字段：${Object.keys(customSchema).join(', ')}）`
        );
    }


}
