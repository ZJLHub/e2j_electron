/*
 * 自定义校验结果类型
 * 用于统一所有数据类型的校验返回格式
 */

import ValidationResult from "./ValidationResult";

/**
 * 数据校验工具类
 * 包含所有数据类型的校验方法
 */
export default class DataChecker {
    private static _instance: DataChecker | null = null;
    

    public static get instance(): DataChecker {
        if (DataChecker._instance === null) {
            DataChecker._instance = new DataChecker();
        }
        return DataChecker._instance;
    }

    /**
     * 检测数据是否为空
     * @param {any} data - 待检测的数据
     * @returns {boolean} 是否为空
     */
    isEmpty(data: any): boolean {
        return data === null || data === undefined ||
            (typeof data === 'string' && data.trim() === '');
    }

    /**
     * 检测空值是否符合允许规则
     * @param {any} data - 待检测的数据
     * @param {boolean} [allowNull=false] - 是否允许空值
     * @returns {ValidationResult|null} 若为空值且不允许则返回错误结果，否则返回null
     */
    checkNullValidation(data: any, allowNull: boolean = false): ValidationResult | null {
        if (this.isEmpty(data)) {
            if (allowNull) {
                return ValidationResult.success(null, '空值（允许空）');
            } else {
                return ValidationResult.error('数值不可空（默认不允许空值）');
            }
        }
        return null;
    }

    /**
     * 检测Excel单个单元格数据是否符合number类型规范
     * @param {any} data - Excel单元格原始数据
     * @param {boolean} [allowNull=false] - 是否允许空值
     * @returns {ValidationResult} 校验结果（自定义类型实例）
     */
    checkNumber(data: any, allowNull: boolean = false): ValidationResult {
        // 1. 先检测空值情况
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 处理原始数值类型
        if (typeof data === 'number') {
            if (isNaN(data) || !isFinite(data)) {
                return ValidationResult.error(`非法数值：${data}（NaN/Infinity不属于有效number类型）`);
            }
            return ValidationResult.success(data, `合法number类型（原始数值）`);
        }

        // 3. 处理字符串类型
        if (typeof data === 'string') {
            const trimmedData = data.trim();
            const parsedNum = Number(trimmedData);

            if (isNaN(parsedNum) || !isFinite(parsedNum)) {
                return ValidationResult.error(`字符串"${trimmedData}"无法转为有效number类型（包含非数字字符）`);
            }

            if (trimmedData.startsWith('0') && trimmedData.length > 1 && !trimmedData.includes('.')) {
                return ValidationResult.error(`字符串"${trimmedData}"带多余前导零（number类型不建议使用前导零）`);
            }

            return ValidationResult.success(parsedNum, `合法number类型（字符串转数值：${trimmedData} → ${parsedNum}`);
        }

        // 4. 处理其他不支持的类型
        return ValidationResult.error(`不支持的类型：${typeof data}（仅支持number或可转为number的string）`);
    }

    /**
     * 检测字符串类型
     * @param {any} data - 单元格数据
     * @param {boolean} allowNull - 是否允许空值
     * @returns {ValidationResult} 校验结果
     */
    checkString(data: any, allowNull: boolean = false): ValidationResult {
        // 先检测空值情况
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        if (typeof data === 'string') {
            return ValidationResult.success(data.trim(), '合法string类型');
        }

        // 非字符串类型尝试转换
        return ValidationResult.success(String(data), '非字符串类型转为string');
    }

    /**
    * 补充：基础boolean类型校验（checkXXX依赖，与现有checkNumber/checkString逻辑对齐）
    * @param {any} data - Excel单元格原始数据
    * @param {boolean} [allowNull=false] - 是否允许空值
    * @returns {ValidationResult} 校验结果
    */
    checkBoolean(data: any, allowNull: boolean = false): ValidationResult {
        // 1. 空值处理
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为小写字符串校验（支持true/false的大小写模糊匹配，如TRUE/FALSE/True）
        const dataStr = String(data).trim().toLowerCase();
        const validValues: string[] = ['true', 'false'];

        if (!validValues.includes(dataStr)) {
            return ValidationResult.error(`非法boolean值："${data}"（仅支持true/false，不区分大小写）`);
        }

        // 3. 转换为布尔值返回
        return ValidationResult.success(
            dataStr === 'true',
            `合法boolean类型（值：${dataStr === 'true' ? true : false}）`
        );
    }

    /**
     * 检测字符串数组类型（stringArray）- 支持引号等级（`>'>"）、允许空元素、兼容元素内逗号
     * @param {any} data - Excel单元格原始数据（需符合[]包裹，如[`a'b"c`, 'd"e', "f"]）
     * @param {boolean} [allowNull=false] - 是否允许单元格整体为空
     * @param {boolean} [allowEmptyArray=false] - 是否允许空数组（如[]）
     * @returns {ValidationResult} 校验结果
     */
    checkStringArray(data: any, allowNull: boolean = false, allowEmptyArray: boolean = false): ValidationResult {
        // 1. 基础配置：引号类型、优先级（`>'>"`）
        const quoteConfig = {
            validTypes: new Set(['`', "'", '"']), // 合法引号类型
            priority: { '`': 3, "'": 2, '"': 1 }  // 优先级映射（数字越大等级越高）
        };

        // 2. 处理单元格整体空值
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 3. 标准化输入为字符串
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 4. 校验数组最外层格式（必须用[]包裹）
        if (!dataStr.startsWith('[') || !dataStr.endsWith(']')) {
            return ValidationResult.error(`数组格式错误："${dataStr}"（需用[]包裹`);
        }

        // 5. 提取数组内部内容，处理空数组场景
        const arrayInnerContent = dataStr.slice(1, -1).trim();
        if (arrayInnerContent === '') {
            return allowEmptyArray
                ? ValidationResult.success([], '空数组（允许空数组）')
                : ValidationResult.error(`空数组（默认不允许空数组，需至少1个元素）`);
        }

        // 6. 核心逻辑：按引号等级分割元素（高等级包裹时低等级引号视为普通字符）
        const elements: string[] = [];          // 最终分割的元素列表
        let currentElement = '';      // 正在拼接的当前元素
        let quoteStack: Array<{ type: string; priority: number }> = [];          // 引号栈（仅存储当前活跃的高等级引号，低等级不入栈）

        for (let i = 0; i < arrayInnerContent.length; i++) {
            const char = arrayInnerContent[i];

            // 6.1 处理引号：根据优先级判断是否入栈/出栈
            if (quoteConfig.validTypes.has(char)) {
                const currentPriority = quoteConfig.priority[char as keyof typeof quoteConfig.priority];
                currentElement += char; // 无论是否入栈，引号本身都加入元素

                if (quoteStack.length === 0) {
                    // 栈空：当前引号作为最外层，入栈（激活该等级引号）
                    quoteStack.push({ type: char, priority: currentPriority });
                } else {
                    const topQuote = quoteStack[quoteStack.length - 1];
                    // 仅当“当前引号等级 == 栈顶引号等级”时，才视为闭合（出栈）
                    if (currentPriority === topQuote.priority) {
                        quoteStack.pop();
                    }
                    // 高等级引号（如栈顶是'，当前是`）：视为普通字符，不入栈
                    // 低等级引号（如栈顶是`，当前是'）：视为普通字符，不入栈
                }
                continue;
            }

            // 6.2 处理逗号：仅当引号栈为空（不在任何高等级引号包裹内）时，视为元素分隔符
            if (char === ',' && quoteStack.length === 0) {
                if (currentElement.trim() !== '') {
                    elements.push(currentElement.trim());
                    currentElement = '';
                }
                continue;
            }

            // 6.3 普通字符（含低等级引号、元素内逗号）：直接加入当前元素
            currentElement += char;
        }

        // 7. 加入最后一个未保存的元素
        if (currentElement.trim() !== '') {
            elements.push(currentElement.trim());
        }

        // 8. 校验1：最外层引号是否闭合（栈不为空说明有未配对的高等级引号）
        if (quoteStack.length > 0) {
            const unclosedQuote = quoteStack[0].type;
            return ValidationResult.error(`引号未闭合：元素包含未配对的"${unclosedQuote}"（高等级引号需自行闭合，数组内容：${arrayInnerContent}）`);
        }

        // 9. 校验2：每个元素必须用合法引号包裹（未加引号则报错），并提取内容
        const validElements: string[] = [];
        // 正则：匹配最外层引号（忽略内部低等级引号），支持空内容（如``、''、""）
        const outerQuoteRegex = /^(['"`])([\s\S]*?)\1$/;

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const quoteMatch = element.match(outerQuoteRegex);

            // 9.1 未加引号或引号不配对（如`a'b"c）：报错
            if (!quoteMatch) {
                return ValidationResult.error(`数组第${i + 1}个元素格式错误："${element}"（必须用反引号、单引号（'）或双引号（"）包裹，且最外层引号需配对）`);
            }

            // 9.2 提取引号内的实际内容（允许空内容，如`` → 空字符串）
            const outerQuoteType = quoteMatch[1]; // 最外层引号类型（`/'/"）
            const elementContent = quoteMatch[2]; // 引号内内容（含低等级引号）

            // 9.3 校验内容合法性（复用checkString，允许空内容）
            const contentCheck = this.checkString(elementContent, false);
            if (!contentCheck.valid) {
                return ValidationResult.error(`数组第${i + 1}个元素内容无效：${contentCheck.message}（元素原始值："${element}"，最外层引号："${outerQuoteType}"）`);
            }

            validElements.push(contentCheck.value);
        }

        // 10. 返回成功结果（标注引号等级规则）
        return ValidationResult.success(
            validElements,
            `合法stringArray类型（共${validElements.length}个元素，引号等级：\`>'>"，允许空元素和元素内低等级引号）`
        );
    }

    /**
     * 检测布尔值数组类型（booleanArray）
     * @param {any} data - Excel单元格原始数据（需符合[]包裹格式，如[true,false]）
     * @param {boolean} [allowNull=false] - 是否允许空值（单元格整体为空）
     * @param {boolean} [allowEmptyArray=false] - 是否允许空数组（如[]）
     * @returns {ValidationResult} 校验结果（自定义类型实例）
     */
    checkBooleanArray(data: any, allowNull: boolean = false, allowEmptyArray: boolean = false): ValidationResult {
        // 1. 先检测单元格整体空值情况
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为字符串处理（标准化输入格式）
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验数组格式（必须用[]包裹）
        if (!dataStr.startsWith('[') || !dataStr.endsWith(']')) {
            return ValidationResult.error(`数组格式错误："${dataStr}"（需用[]包裹，如[true,false]）`);
        }

        // 4. 提取数组内部元素（处理空数组场景）
        const arrayContent = dataStr.slice(1, -1).trim();
        if (arrayContent === '') {
            if (allowEmptyArray) {
                return ValidationResult.success([], '空数组（允许空数组）');
            } else {
                return ValidationResult.error(`空数组（默认不允许空数组，需至少1个元素）`);
            }
        }

        // 5. 分割元素并校验每个元素是否为合法boolean（支持true/false的大小写模糊匹配）
        const elements = arrayContent.split(',').map(item => item.trim().toLowerCase()); // 统一转为小写处理
        const validElements: boolean[] = [];
        const validBooleanValues: string[] = ['true', 'false']; // 合法布尔值字符串

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (!validBooleanValues.includes(element)) {
                return ValidationResult.error(`数组第${i + 1}个元素校验失败："${element}"不是合法boolean值（仅支持true/false，不区分大小写）`);
            }
            validElements.push(element === 'true'); // 转换为布尔值（true/false）
        }

        // 6. 所有元素校验通过，返回成功结果
        return ValidationResult.success(
            validElements,
            `合法booleanArray类型（共${validElements.length}个元素：[${validElements.join(', ')}]）`
        );
    }


    /**
     * 检测数值数组类型（numberArray）
     * @param {any} data - Excel单元格原始数据（需符合[]包裹格式，如[1,2.3]）
     * @param {boolean} [allowNull=false] - 是否允许空值（单元格整体为空）
     * @param {boolean} [allowEmptyArray=false] - 是否允许空数组（如[]）
     * @returns {ValidationResult} 校验结果（自定义类型实例）
     */
    checkNumberArray(data: any, allowNull: boolean = false, allowEmptyArray: boolean = false): ValidationResult {
        // 1. 先检测单元格整体空值情况
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为字符串处理（标准化输入格式，避免Excel返回number类型的干扰）
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验数组格式（必须用[]包裹，符合需求文档中数组配置规范）
        if (!dataStr.startsWith('[') || !dataStr.endsWith(']')) {
            return ValidationResult.error(`数组格式错误："${dataStr}"（需用[]包裹，如[1,2.3]）`);
        }

        // 4. 提取数组内部元素（处理空数组场景）
        const arrayContent = dataStr.slice(1, -1).trim();
        if (arrayContent === '') {
            if (allowEmptyArray) {
                return ValidationResult.success([], '空数组（允许空数组）');
            } else {
                return ValidationResult.error(`空数组（默认不允许空数组，需至少1个元素）`);
            }
        }

        // 5. 分割元素并复用checkNumber函数校验单个元素（保证与基础number类型校验逻辑一致）
        const elements = arrayContent.split(',').map(item => item.trim()); // 按逗号分割并去空格
        const validElements: number[] = [];

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            // 复用checkNumber校验（不允许元素为空，数组元素默认非空；不允许前导零等非法格式）
            const elementCheck = this.checkNumber(element, false);
            if (!elementCheck.valid) {
                return ValidationResult.error(`数组第${i + 1}个元素校验失败：${elementCheck.message}（元素值："${element}"）`);
            }
            validElements.push(elementCheck.value as number); // 收集转换后的合法数值
        }

        // 6. 所有元素校验通过，返回成功结果
        return ValidationResult.success(
            validElements,
            `合法numberArray类型（共${validElements.length}个元素：[${validElements.join(', ')}]）`
        );
    }

    /**
     * 检测自定义类型（XXX）- 支持Excel其他页签声明的复合结构校验
     * @param {any} data - Excel单元格原始数据（需符合{}包裹格式，如{id:1;name:张三;isVip:true}）
     * @param {CustomSchema} customSchema - 自定义类型的结构描述（从Excel其他页签解析而来）
     *   - 格式示例：{ id: { type: 'number', allowNull: false }, name: { type: 'string', allowNull: false }, isVip: { type: 'boolean', allowNull: true } }
     * @param {boolean} [allowNull=false] - 是否允许单元格整体为空
     * @returns {ValidationResult} 校验结果（成功时value为解析后的对象，失败时为null）
     */
    checkCustom(data: any, customSchema: CustomSchema, allowNull: boolean = false): ValidationResult {
        // 1. 先检测单元格整体空值（遵循统一空值处理规则）
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为字符串处理（标准化Excel可能返回的各种类型）
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验自定义类型的格式（必须用{}包裹，符合二重类型规范）
        if (!dataStr.startsWith('{') || !dataStr.endsWith('}')) {
            return ValidationResult.error(`自定义类型格式错误："${dataStr}"（需用{}包裹，如{id:1;name:张三}）`);
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

        // 4.2 分割键值对（字段间用;分隔，如"id:1;name:张三" → ["id:1", "name:张三"]）
        const keyValuePairs = content.split(';').map(item => item.trim()).filter(item => item !== '');
        const processedFields = new Set<string>(); // 用于检测重复字段

        for (const pair of keyValuePairs) {
            // 分割键和值（需处理值中含:的场景？需求未提，暂按"第一个:"分割）
            const colonIndex = pair.indexOf(':');
            if (colonIndex === -1) {
                return ValidationResult.error(`自定义类型键值对格式错误："${pair}"（需用:分隔键和值，如id:1）`);
            }

            const fieldName = pair.slice(0, colonIndex).trim();
            const fieldValue = pair.slice(colonIndex + 1).trim();

            // 校验1：字段是否在schema中定义（禁止多余字段）
            if (!customSchema.hasOwnProperty(fieldName)) {
                return ValidationResult.error(`自定义类型包含未定义字段："${fieldName}"（仅允许schema中的字段：${Object.keys(customSchema).join(', ')}）`);
            }

            // 校验2：字段是否重复（如"id:1;id:2"）
            if (processedFields.has(fieldName)) {
                return ValidationResult.error(`自定义类型字段重复："${fieldName}"（同一字段不可重复定义）`);
            }
            processedFields.add(fieldName);

            // 校验3：根据schema的字段类型，调用对应基础校验函数
            const fieldRule = customSchema[fieldName];
            let fieldCheckResult: ValidationResult;

            switch (fieldRule.type) {
                case 'number':
                    fieldCheckResult = this.checkNumber(fieldValue, fieldRule.allowNull);
                    break;
                case 'string':
                    fieldCheckResult = this.checkString(fieldValue, fieldRule.allowNull);
                    break;
                case 'boolean':
                    fieldCheckResult = this.checkBoolean(fieldValue, fieldRule.allowNull);
                    break;
                case 'numberArray':
                    fieldCheckResult = this.checkNumberArray(
                        fieldValue, 
                        fieldRule.allowNull, 
                        fieldRule.allowEmptyArray ?? false
                    );
                    break;
                case 'stringArray':
                    fieldCheckResult = this.checkStringArray(
                        fieldValue, 
                        fieldRule.allowNull, 
                        fieldRule.allowEmptyArray ?? false
                    );
                    break;
                case 'booleanArray':
                    fieldCheckResult = this.checkBooleanArray(
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
     * @param {any} data - Excel单元格原始数据（需符合[]包裹，内部元素为自定义类型，如[{id:1;name:张三},{id:2;name:李四}]）
     * @param {CustomSchema} customSchema - 自定义类型的结构描述（同checkXXX的customSchema参数）
     * @param {boolean} [allowNull=false] - 是否允许单元格整体为空
     * @param {boolean} [allowEmptyArray=false] - 是否允许空数组（如[]）
     * @returns {ValidationResult} 校验结果（成功时value为自定义对象数组，失败时为null）
     */
    checkCustomArray(data: any, customSchema: CustomSchema, allowNull: boolean = false, allowEmptyArray: boolean = false): ValidationResult {
        // 1. 先检测单元格整体空值（统一空值处理规则）
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 统一转为字符串处理（标准化输入格式）
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验数组格式（必须用[]包裹，符合数组统一规范）
        if (!dataStr.startsWith('[') || !dataStr.endsWith(']')) {
            return ValidationResult.error(`自定义类型数组格式错误："${dataStr}"（需用[]包裹，如[{id:1},{id:2}]）`);
        }

        // 4. 提取数组内部的自定义类型元素（处理空数组场景）
        const arrayContent = dataStr.slice(1, -1).trim();
        const validElements: any[] = []; // 存储校验通过的自定义对象

        // 4.1 处理空数组（如[]）
        if (arrayContent === '') {
            if (allowEmptyArray) {
                return ValidationResult.success([], '合法自定义类型数组（空数组，允许空数组）');
            } else {
                return ValidationResult.error(`自定义类型空数组不合法（默认不允许空数组，需至少1个元素）`);
            }
        }

        // 4.2 分割数组元素（自定义类型元素间用,分隔，需处理元素内部含,的场景？用平衡括号法匹配）
        const elements: string[] = [];
        let balance = 0; // 用于匹配{}的平衡（统计 '{' 和 '}' 这两个Z的数量差）
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

        // 4.3 逐个校验数组元素（复用checkXXX函数，保证自定义类型规则统一）
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            // 跳过空元素（如数组内有多余逗号导致的空字符串）
            if (this.isEmpty(element)) {
                return ValidationResult.error(`自定义类型数组第${i + 1}个元素为空（不允许空元素）`);
            }

            // 调用checkXXX校验单个自定义类型元素
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
