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
const electron_1 = require("electron");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class E2j {
    constructor() {
        //#region *****************需求描述*****************
        /** 由于团队技术和分工的不同，可能会有不同的excel配置表可能会有多种组织习惯，
         *  这里只是其中一种，如有其习惯，则此脚本可能不再适用，需要另外重新组织需求和代码实现
         *
         *  下面是对于excel表格组织方式的规范，以及对应的该规范下的代码实现
         *
         *   配置表以列 做为 表结构字段内容，以行 作为 该表的数据内容：如一个学生表student.excel
         *   id    name   sex   Chinese    Math    ...
         *    0   李二凤   女     100       100     ...
         *    1    张三    男      60        60     ...
         *
         *   配置表在头6行对每一列属性进行描述，比如: 第一行用于描述此表作用 【学生表，用于记录学生基本信息和学习成绩】
         *   具体如下：
         *   第一行用于描述此表作用
         *   第二行用于描述此列字段需要到出的目标端，client只导出客户端，server只导出服务端，client+server导出到客户端和服务端
         *   第三行表示字段可不可空 yes(可空)/no(不可空)  默认no
         *   第四行用于对字段进行表述。注释注解等。  id唯一标识，姓名  性别  语文成绩  数学成绩
         *   第五行作为 字段名称  id      name     sex      Chinese   Math
         *   第六为数据类型     number  string   string     number   number
         *      - 一共支持number,string,boolean,numberArray,stringArray,booleanArray,XXX(自定义类型)
         *      - 字符串默认不需要双引号包裹
         *      - XXX为二重类形， 比如一个数据需要小型的复合类型结构，可以通过在该表的其他页签进行声明
         *      - XXXArray 表示为二重类型的数组类型
         *      - 数组的配置默认需要[]包裹，例如numberArray：[1,2,3];
         *
        */
        //#endregion ***************需求描述****************
        this._all_excel_paths = [];
        /**
         * - 类私有属性：存储已收集的Excel「小写文件名」（key）和「完整路径」（value）
         * - 作用：跨递归调用共享状态，实现不分大小写的同名检测
        */
        this._collectedExcelNames = new Map();
        //#endregion
    }
    static get instance() {
        if (E2j._instance === null) {
            E2j._instance = new E2j();
        }
        return E2j._instance;
    }
    add_ipc_handle() {
        console.log("ok,i will no fuck u, code is success");
        electron_1.ipcMain.addListener("change_excel", (e) => {
        });
    }
    /**根据传入的路近获取所有excel的文件路近，
     * @paths 由用户选择的文件和文件夹组合而成 */
    get_all_excel_path() {
        return __awaiter(this, arguments, void 0, function* (paths = []) {
            this._all_excel_paths = [];
            if (paths.length === 0) {
                console.warn('get_all_excel_path：传入的路径数组为空');
                return this._all_excel_paths;
            }
            for (const singlePath of paths) {
                yield this._traverseFolder(singlePath);
            }
            console.log(`Excel文件收集完成，共${this._all_excel_paths.length}个有效文件`);
            return this._all_excel_paths;
        });
    }
    /**遍历文件夹  并且把所有检测到的excel文件加入到this._all_excel_paths数组中 */
    _traverseFolder(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. 读取当前文件夹下的所有文件/子文件夹（不包含符号链接，避免循环引用）
                const dirEntries = yield promises_1.default.readdir(folderPath, {
                    withFileTypes: true, // 直接获取文件类型信息，避免二次stat调用，提升性能
                    recursive: false // 关闭Node.js原生递归，手动控制递归逻辑（更灵活）
                });
                7;
                // 2. 遍历当前文件夹下的每个条目
                for (const entry of dirEntries) {
                    // 拼接当前条目的完整路径（处理跨平台路径分隔符问题）
                    const fullPath = path_1.default.join(folderPath, entry.name);
                    // 3. 区分「文件」和「子文件夹」
                    if (entry.isFile()) {
                        // 3.1 若为文件：判断是否为Excel格式（.xlsx/.xls，不区分大小写）
                        const fileExt = path_1.default.extname(entry.name).toLowerCase(); //extname函数返回的是后缀名: .xlsx/.xls
                        if (fileExt === '.xlsx' || fileExt === '.xls') {
                            this._all_excel_paths.push(fullPath);
                            console.log(`已收集Excel文件（子文件夹）：${fullPath}`);
                        }
                        // 非Excel文件直接跳过（可根据需求添加日志）
                        // else {
                        //     console.log(`跳过非Excel文件（子文件夹）：${fullPath}`);
                        // }
                    }
                    else if (entry.isDirectory()) {
                        // 3.2 若为子文件夹：递归调用自身，继续遍历子文件夹
                        console.log(`进入子文件夹：${fullPath}`);
                        yield this._traverseFolder(fullPath);
                    }
                    // 忽略符号链接、设备文件等特殊类型（避免异常）
                }
            }
            catch (err) {
                // 捕获文件夹访问错误（如权限不足、路径不存在等）
                console.error(`遍历文件夹失败：${folderPath}，原因：${err.message}`);
            }
        });
    }
    //#region 对excel表格进行基本的配置检测,并且进行转换
    /**读取excel数据，并且根据对应1数据类型检测数据是否正确 */
    _check_date() {
        //1、根据路径读取excel   
    }
    /**返回对应名称的页面 的 数据结构 */
    _get_XXX_data_Config() {
    }
}
E2j._instance = null;
exports.default = E2j;
