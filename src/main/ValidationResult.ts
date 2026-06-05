/**检验数据后 返回的类形 */
export default class ValidationResult {
    valid: boolean;
    message: string;
    value: any;

    /**
     * 构造校验结果
     * @param {boolean} valid - 是否合法
     * @param {string} message - 校验说明（错误原因或成功信息）
     * @param {any} value - 转换后的合法值（不合法则为null）
     */
    constructor(valid: boolean, message: string, value: any = null) {
        this.valid = valid;       // 布尔值：是否通过校验
        this.message = message;   // 字符串：校验描述信息
        this.value = value;       // 任意类型：转换后的值（校验失败为null）
    }

    /**
     * 快速创建“成功”的校验结果
     * @param {any} value - 转换后的合法值
     * @param {string} message - 成功信息（可选）
     * @returns {ValidationResult} 成功的校验结果实例
     */
    static success(value: any, message: string = '校验通过'): ValidationResult {
        return new ValidationResult(true, message, value);
    }

    /**      
     * 快速创建“失败”的校验结果
     * @param {string} message - 失败原因
     * @returns {ValidationResult} 失败的校验结果实例
     */
    static error(message: string): ValidationResult {
        return new ValidationResult(false, message, null);
    }
}