/**
 * 字段规则接口定义
 * 用于描述自定义类型中各个字段的校验规则
 */
interface FieldRule {
    type: string;//'number' | 'string' | 'boolean' | 'numberArray' | 'stringArray' | 'booleanArray';
    allowNull: boolean;
    allowEmptyArray?: boolean;
}

/**
 * 自定义类型结构描述接口
 * key为字段名，value为对应字段的校验规则
 */
interface CustomSchema {
    [key: string]: FieldRule;
}
