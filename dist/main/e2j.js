'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const xlsx_1 = __importDefault(require("xlsx"));
const data_checker_1 = __importDefault(require("./data_checker"));
const ValidationResult_1 = __importDefault(require("./ValidationResult"));
const custom_type_checker_1 = __importDefault(require("./custom_type_checker"));
class E2j {
    constructor() {
        this._collectedExcelNames = new Map();
        this._all_excel_paths = [];
        // 全局缓存：所有Sheet对应的自定义类型结构，预扫描完成后完整填充
        this._customSchemaMap = new Map();
        //#endregion
    }
    static get instance() {
        if (E2j._instance === null) {
            E2j._instance = new E2j();
        }
        return E2j._instance;
    }
    begin_change(paths) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.get_all_excel_path(paths);
            yield this._check_excel_config();
        });
    }
    //#region 路径遍历模块（无改动，仅分离独立区域）
    get_all_excel_path() {
        return __awaiter(this, arguments, void 0, function* (paths = []) {
            this._all_excel_paths = [];
            if (paths.length === 0) {
                console.warn('get_all_excel_path：传入的路径数组为空');
                return this._all_excel_paths;
            }
            for (const singlePath of paths) {
                const stat = yield promises_1.default.stat(singlePath);
                if (stat.isDirectory()) {
                    yield this._traverseFolder(singlePath);
                }
                else {
                    this._all_excel_paths.push(singlePath);
                }
            }
            console.log(`Excel文件收集完成，共${this._all_excel_paths.length}个有效文件`);
            return this._all_excel_paths;
        });
    }
    _traverseFolder(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dirEntries = yield promises_1.default.readdir(folderPath, {
                    withFileTypes: true,
                    recursive: false
                });
                for (const entry of dirEntries) {
                    const fullPath = path_1.default.join(folderPath, entry.name);
                    if (entry.isFile()) {
                        const fileExt = path_1.default.extname(entry.name).toLowerCase();
                        if (fileExt === '.xlsx' || fileExt === '.xls') {
                            this._all_excel_paths.push(fullPath);
                            console.log(`已收集Excel文件（子文件夹）：${fullPath}`);
                        }
                        else {
                            console.log(`跳过非Excel文件（子文件夹）：${fullPath}`);
                        }
                    }
                    else if (entry.isDirectory()) {
                        console.log(`进入子文件夹：${fullPath}`);
                        yield this._traverseFolder(fullPath);
                    }
                }
            }
            catch (err) {
                console.error(`遍历文件夹失败：${folderPath}，原因：${err.message}`);
            }
        });
    }
    //#endregion
    //#region Excel校验总入口（仅调度，轻量化）
    _check_excel_config() {
        return __awaiter(this, void 0, void 0, function* () {
            const excelPaths = this._all_excel_paths;
            if (!excelPaths || excelPaths.length === 0) {
                console.warn("_check_excel_config：无待校验Excel文件");
                return;
            }
            const dataChecker = data_checker_1.default.instance;
            this._customSchemaMap.clear();
            // 阶段1：预扫描全部文件+全部Sheet，统一生成并缓存所有自定义Schema（修复时序bug核心）
            yield this._preScanAllExcelSheets(excelPaths);
            console.log(`预扫描完成，已加载全部自定义类型定义，共${this._customSchemaMap.size}个Schema缓存`);
            // 阶段2：全部Schema就绪后，二次遍历做真实数据校验
            for (const filePath of excelPaths) {
                try {
                    console.log(`\n===== 开始校验Excel文件：${filePath} =====`);
                    const workbook = xlsx_1.default.readFile(filePath, {
                        cellDates: true,
                        cellNF: true,
                        raw: false
                    });
                    const sheetNames = workbook.SheetNames;
                    console.log(`文件包含Sheet列表：${sheetNames.join(', ')}`);
                    for (const sheetName of sheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        const sheetData = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1, raw: false });
                        // 解析表头获取标准化字段配置
                        const parseResult = this._parseSheetHeaderToSchema(sheetData, sheetName);
                        if (!parseResult.valid)
                            continue;
                        const columnConfigs = parseResult.configs;
                        // 校验当前Sheet所有业务数据行
                        yield this._validateSheetDataRows(filePath, sheetName, sheetData, columnConfigs, dataChecker);
                    }
                    console.log(`===== 文件【${filePath}】校验处理完成 =====`);
                }
                catch (err) {
                    console.error(`处理Excel文件【${filePath}】失败：${err.message}，跳过该文件`);
                    continue;
                }
            }
        });
    }
    //#endregion
    //#region 阶段1：预扫描全量Sheet，统一缓存自定义Schema（解决时序bug）
    /** 遍历全部Excel，读取所有Sheet表头，提前把所有自定义类型Schema存入缓存 */
    _preScanAllExcelSheets(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const filePath of filePaths) {
                try {
                    const workbook = xlsx_1.default.readFile(filePath, {
                        cellDates: true,
                        cellNF: true,
                        raw: false
                    });
                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        const sheetData = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1, raw: false });
                        const parseResult = this._parseSheetHeaderToSchema(sheetData, sheetName);
                        // 表头合法则存入全局Schema缓存
                        if (parseResult.valid) {
                            this._customSchemaMap.set(sheetName, parseResult.schema);
                            console.debug(`预扫描缓存自定义类型：${sheetName}`);
                        }
                    }
                }
                catch (err) {
                    console.warn(`预扫描文件【${filePath}】异常，跳过该文件预解析：${err.message}`);
                    continue;
                }
            }
        });
    }
    /** 解析单Sheet6行表头，输出字段配置 + 当前Sheet对应的CustomSchema */
    _parseSheetHeaderToSchema(sheetData, sheetName) {
        // 表头行数基础校验
        if (sheetData.length < 6) {
            console.error(`Sheet【${sheetName}】表头行数不足，至少需要6行，当前仅${sheetData.length}行，跳过该Sheet`);
            return { valid: false, configs: [], schema: {} };
        }
        const [_tableDescRow, exportTargetRow, allowNullRow, _commentRow, fieldNameRow, typeRow] = sheetData;
        // 生成标准化列配置，同时校验表头合法性
        const configResult = this._createSheetColumnConfigs({
            exportTargetRow,
            allowNullRow,
            fieldNameRow,
            typeRow,
            commentRow: _commentRow,
            sheetName
        });
        if (!configResult.valid) {
            return { valid: false, configs: [], schema: {} };
        }
        // 根据字段配置生成当前Sheet的自定义类型结构
        const sheetSchema = {};
        for (const cfg of configResult.configs) {
            sheetSchema[cfg.fieldName] = {
                type: cfg.type,
                allowNull: cfg.allowNull
            };
        }
        return {
            valid: true,
            configs: configResult.configs,
            schema: sheetSchema
        };
    }
    /** 纯表头校验工具：逐列校验导出目标、可空、字段名、类型，返回标准化字段数组 */
    _createSheetColumnConfigs(args) {
        const { exportTargetRow, allowNullRow, fieldNameRow, typeRow, commentRow, sheetName } = args;
        const maxColCount = Math.max((exportTargetRow === null || exportTargetRow === void 0 ? void 0 : exportTargetRow.length) || 0, (allowNullRow === null || allowNullRow === void 0 ? void 0 : allowNullRow.length) || 0, (fieldNameRow === null || fieldNameRow === void 0 ? void 0 : fieldNameRow.length) || 0, (typeRow === null || typeRow === void 0 ? void 0 : typeRow.length) || 0);
        if (maxColCount === 0) {
            console.error(`Sheet【${sheetName}】表头无有效列，跳过`);
            return { valid: false, configs: [] };
        }
        const columnConfigs = [];
        const fieldNameSet = new Set();
        let isHeaderValid = true;
        for (let colIndex = 0; colIndex < maxColCount; colIndex++) {
            const exportTarget = ((exportTargetRow === null || exportTargetRow === void 0 ? void 0 : exportTargetRow[colIndex]) || '').toString().trim();
            const allowNullStr = ((allowNullRow === null || allowNullRow === void 0 ? void 0 : allowNullRow[colIndex]) || '').toString().trim().toLowerCase();
            const fieldName = ((fieldNameRow === null || fieldNameRow === void 0 ? void 0 : fieldNameRow[colIndex]) || '').toString().trim();
            const type = ((typeRow === null || typeRow === void 0 ? void 0 : typeRow[colIndex]) || '').toString().trim();
            const comment = ((commentRow === null || commentRow === void 0 ? void 0 : commentRow[colIndex]) || '').toString().trim();
            // 导出目标校验
            if (!exportTarget || !['client', 'server', 'client+server'].includes(exportTarget)) {
                console.error(`Sheet【${sheetName}】列${colIndex + 1}：导出目标${exportTarget || '空'}不合法`);
                isHeaderValid = false;
                continue;
            }
            // 可空标识校验
            if (allowNullStr && !['yes', 'no'].includes(allowNullStr)) {
                console.error(`Sheet【${sheetName}】列${colIndex + 1}：可空配置${allowNullStr}不合法，仅支持yes/no`);
                isHeaderValid = false;
                continue;
            }
            const allowNull = allowNullStr === 'yes';
            // 字段名校验
            if (!fieldName || fieldNameSet.has(fieldName)) {
                console.error(`Sheet【${sheetName}】列${colIndex + 1}：字段名${fieldName || '空'}重复或为空`);
                isHeaderValid = false;
                continue;
            }
            fieldNameSet.add(fieldName);
            // 类型非空校验
            if (!type) {
                console.error(`Sheet【${sheetName}】列${colIndex + 1}：数据类型不能为空`);
                isHeaderValid = false;
                continue;
            }
            columnConfigs.push({ fieldName, type, allowNull, exportTarget, comment });
        }
        return { valid: isHeaderValid, configs: columnConfigs };
    }
    //#endregion
    //#region 阶段2：数据行校验拆分函数
    /** 单Sheet全部业务数据行校验入口 */
    _validateSheetDataRows(filePath, sheetName, sheetData, columnConfigs, dataChecker) {
        const dataStartRowIndex = 6;
        if (sheetData.length <= dataStartRowIndex) {
            console.log(`Sheet【${sheetName}】无数据行，仅表头结构，跳过数据校验`);
            return;
        }
        console.log(`Sheet【${sheetName}】开始校验数据行，共${sheetData.length - dataStartRowIndex}行数据`);
        let dataErrorCount = 0;
        for (let rowIndex = dataStartRowIndex; rowIndex < sheetData.length; rowIndex++) {
            const rowData = sheetData[rowIndex];
            const excelRow = rowIndex + 1;
            for (let colIndex = 0; colIndex < columnConfigs.length; colIndex++) {
                const cfg = columnConfigs[colIndex];
                const cellValue = rowData === null || rowData === void 0 ? void 0 : rowData[colIndex];
                const excelCol = colIndex + 1;
                // 抽离独立单元格校验逻辑  
                const validateRes = this._validateSingleCellByType(cellValue, cfg, dataChecker);
                if (!validateRes.valid) {
                    dataErrorCount++;
                    console.error(`【错误】文件【${filePath}】Sheet【${sheetName}】行${excelRow}列${excelCol}【${cfg.fieldName}】：${validateRes.message}，原始值：${cellValue}`);
                }
                else {
                    console.debug(`【通过】行${excelRow}列${excelCol}【${cfg.fieldName}】校验通过，格式化值：${validateRes.value}`);
                }
            }
        }
        if (dataErrorCount === 0) {
            console.log(`Sheet【${sheetName}】数据行校验全部通过`);
        }
        else {
            console.error(`Sheet【${sheetName}】数据校验完成，共发现${dataErrorCount}个错误`);
        }
    }
    /** 抽离巨型switch，单独处理单个单元格类型校验（此时全局_customSchemaMap已全部加载完成，无时序bug） */
    _validateSingleCellByType(cellValue, colConfig, dataChecker) {
        const { type, allowNull } = colConfig;
        switch (type) {
            case 'number':
                return dataChecker.checkNumber(cellValue, allowNull);
            case 'string':
                return dataChecker.checkString(cellValue, allowNull);
            case 'boolean':
                return dataChecker.checkBoolean(cellValue, allowNull);
            case 'numberArray':
                return dataChecker.checkNumberArray(cellValue, allowNull);
            case 'stringArray':
                return dataChecker.checkStringArray(cellValue, allowNull);
            case 'booleanArray':
                return dataChecker.checkBooleanArray(cellValue, allowNull);
            default:
                // 自定义结构体/结构体数组：此时所有Sheet已预加载，_customSchemaMap一定存在对应类型
                const isArrayType = type.endsWith('Array');
                const customTypeName = isArrayType ? type.slice(0, -5) : type;
                const targetSchema = this._customSchemaMap.get(customTypeName);
                // 这里不会再出现「自定义类型未定义」时序错误，只会真的不存在才报错
                if (!targetSchema) {
                    return ValidationResult_1.default.error(`自定义类型"${customTypeName}"不存在对应Sheet定义`);
                }
                if (isArrayType) {
                    return custom_type_checker_1.default.instance.checkCustomArray(cellValue, targetSchema, allowNull);
                }
                else {
                    return custom_type_checker_1.default.instance.checkCustom(cellValue, targetSchema, allowNull);
                }
        }
    }
}
E2j._instance = null;
exports.default = E2j;
