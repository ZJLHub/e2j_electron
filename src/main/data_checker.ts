/*
 * 自定义校验结果类型
 * 用于统一所有数据类型的校验返回格式
 */

import custom_type_checker from "./custom_type_checker";
import data_checker_tool from "./data_checker_tool";
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
     * 检测字符串数组类型（stringArray）- 遵循JSON规范，仅支持双引号包裹
     * @param {any} data - Excel单元格原始数据（需符合[]包裹，如["a","b","c"]）
     * @param {boolean} [allowNull=false] - 是否允许单元格整体为空
     * @param {boolean} [allowEmptyArray=false] - 是否允许空数组（如[]）
     * @returns {ValidationResult} 校验结果
     */
    checkStringArray(data: any, allowNull: boolean = false, allowEmptyArray: boolean = false): ValidationResult {
        const tool = data_checker_tool.instance;

        // 1. 处理单元格整体空值
        const nullCheckResult = this.checkNullValidation(data, allowNull);
        if (nullCheckResult) {
            return nullCheckResult;
        }

        // 2. 标准化输入为字符串
        const dataStr = typeof data === 'string' ? data.trim() : String(data).trim();

        // 3. 校验数组最外层格式（必须用[]包裹）
        if (!dataStr.startsWith('[') || !dataStr.endsWith(']')) {
                console.log('333333333333333dataStr::::::::::::::', dataStr);
            return ValidationResult.error(`数组格式错误："${dataStr}"（需用[]包裹，如["a","b"]）`);
        }

        // 4. 提取数组内部内容，处理空数组场景
        const arrayInnerContent = dataStr.slice(1, -1).trim();
        if (arrayInnerContent === '') {
            return allowEmptyArray
                ? ValidationResult.success([], '空数组（允许空数组）')
                : ValidationResult.error('空数组（默认不允许空数组，需至少1个元素）');
        }

        // 5. 引号感知分割（仅识别双引号，双引号内的逗号不做分割）
        const elements = tool.splitByCommaIgnoreQuotes(arrayInnerContent);

        // 6. 逐个校验元素：必须用双引号包裹 + 转义符合法
        const validElements: string[] = [];

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];

            // 6.1 剥离外层双引号（仅支持JSON标准双引号，不支持单引号/反引号）
            const elementContent = tool.stripOuterDoubleQuotes(element);
            if (elementContent === null) {
                console.log('222222222222222222222222222element::::::::::::::', element);
                return ValidationResult.error(`数组第${i + 1}个元素格式错误："${element}"（必须用双引号"包裹，如"abc"，JSON规范不支持单引号'和反引号\`）`);
            }

            // 6.2 检测内容中的转义符是否合法
            const escapeCheck = tool.checkEscapeSequences(elementContent);
            if (!escapeCheck.valid) {
                return ValidationResult.error(`数组第${i + 1}个元素${escapeCheck.message}（元素值："${element}"）`);
            }

            validElements.push(elementContent);
        }

        // 7. 返回成功结果
        return ValidationResult.success(
            validElements,
            `合法stringArray类型（共${validElements.length}个元素，仅支持双引号包裹）`
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
                return ValidationResult.error('空数组（默认不允许空数组，需至少1个元素）');
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
                return ValidationResult.error('空数组（默认不允许空数组，需至少1个元素）');
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

}
