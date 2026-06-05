'use strict'
import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export default class E2j {
    private static _instance: E2j = null;

    public static get instance(): E2j {
        if (E2j._instance === null) {
            E2j._instance = new E2j();
        }
        return E2j._instance;
    }

    add_ipc_handle(): void {
        console.log("ok,i will no fuck u, code is success");
        ipcMain.addListener("change_excel", (e) => {

        });
    }

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

    private _all_excel_paths: string[] = [];

    /**
     * - 类私有属性：存储已收集的Excel「小写文件名」（key）和「完整路径」（value） 
     * - 作用：跨递归调用共享状态，实现不分大小写的同名检测
    */
    private _collectedExcelNames: Map<string, string> = new Map();
    

    /**根据传入的路近获取所有excel的文件路近，
     * @paths 由用户选择的文件和文件夹组合而成 */
    async get_all_excel_path(paths: string[] = []): Promise<string[]> {
        this._all_excel_paths = [];

        if (paths.length === 0) {
            console.warn('get_all_excel_path：传入的路径数组为空');
            return this._all_excel_paths;
        }

        for (const singlePath of paths) {
            await this._traverseFolder(singlePath);
        }

        console.log(`Excel文件收集完成，共${this._all_excel_paths.length}个有效文件`);
        return this._all_excel_paths;

    }

    /**遍历文件夹  并且把所有检测到的excel文件加入到this._all_excel_paths数组中 */
    private async _traverseFolder(folderPath: string): Promise<void> {
        try {
            // 1. 读取当前文件夹下的所有文件/子文件夹（不包含符号链接，避免循环引用）
            const dirEntries = await fs.readdir(folderPath, {
                withFileTypes: true,// 直接获取文件类型信息，避免二次stat调用，提升性能
                recursive: false    // 关闭Node.js原生递归，手动控制递归逻辑（更灵活）
            });7
            // 2. 遍历当前文件夹下的每个条目
            for (const entry of dirEntries) {
                // 拼接当前条目的完整路径（处理跨平台路径分隔符问题）
                const fullPath = path.join(folderPath, entry.name);

                // 3. 区分「文件」和「子文件夹」
                if (entry.isFile()) {
                    // 3.1 若为文件：判断是否为Excel格式（.xlsx/.xls，不区分大小写）
                    const fileExt = path.extname(entry.name).toLowerCase();//extname函数返回的是后缀名: .xlsx/.xls
                    if (fileExt === '.xlsx' || fileExt === '.xls') {
                        this._all_excel_paths.push(fullPath);
                        console.log(`已收集Excel文件（子文件夹）：${fullPath}`);
                    }
                    // 非Excel文件直接跳过（可根据需求添加日志）
                    else {
                        console.log(`跳过非Excel文件（子文件夹）：${fullPath}`);
                    }
                }     
                else if (entry.isDirectory()) {
                    // 3.2 若为子文件夹：递归调用自身，继续遍历子文件夹
                    console.log(`进入子文件夹：${fullPath}`);
                    await this._traverseFolder(fullPath);
                }
                // 忽略符号链接、设备文件等特殊类型（避免异常）
            }
        } catch (err) {
            // 捕获文件夹访问错误（如权限不足、路径不存在等）
            console.error(`遍历文件夹失败：${folderPath}，原因：${(err as Error).message}`);
        }
    }

    //#region 对excel表格进行基本的配置检测,并且进行转换

    /**读取excel数据，并且根据对应数据类型检测数据是否正确 */
    private _check_date(): void {
        //1、根据路径数组_all_excel_paths读取excel  

        //2、逐行逐列进通过check_data.ts提供的校验函数行数据校验
        
    }

    /**
     * 返回对应 自定义数据类型 名称的页面 的 数据结构 
     *  - 配置表 自定义数据类型名称 = 自定义数据类型页面名称  (该页面定义具体数据类型结构)
     *  
     * 
    */
    private _get_custom_data_Config(customName:string): void {


    }



    //#endregion
}