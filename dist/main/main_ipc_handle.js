"use strict";
/**
 * 这里注册ipc的处理器
 *
 * 这里的每个handle基本都是cc里面每个按钮的一个处理器。
 * 函数命名方式与cc项目工程按钮名称相同 方便对照 -。-!!!
 */
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
const main_1 = require("./main");
const e2j_1 = __importDefault(require("./e2j"));
class main_ipc_handle {
    static get instance() {
        if (!main_ipc_handle._instance) {
            main_ipc_handle._instance = new main_ipc_handle();
        }
        return main_ipc_handle._instance;
    }
    //添加进程间通信 , 处理chose_file(选择目标文件【可多选】)事件
    add_chose_file() {
        electron_1.ipcMain.handle('chose_file', () => __awaiter(this, void 0, void 0, function* () {
            console.log("mainJS ipcMaiun get the chose_file");
            // const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {//打开选择框0
            let { canceled, filePaths } = yield electron_1.dialog.showOpenDialog(main_1.mainWindow, {
                properties: ['openFile', 'multiSelections']
            });
            if (!canceled) {
                console.log("choseFile canceled", "filePaths::", filePaths, "filePaths[0]:::", filePaths[0]);
                return filePaths;
            }
        }));
    }
    //添加进程间通信 , 处理 chose_folder(选择目标文件夹路劲【可多选】) 事件
    add_chose_folder() {
        electron_1.ipcMain.handle('chose_folder', () => __awaiter(this, void 0, void 0, function* () {
            console.log("主进程监听到，  chose_folder");
            let file_list = yield electron_1.dialog.showOpenDialogSync(main_1.mainWindow, {
                properties: ['openDirectory', 'multiSelections']
            });
            console.log('所选路劲file_list：：：', file_list);
            return file_list;
        }));
    }
    // 添加进程间通信 , 处理 chose_save_path (选择文件保存路劲) 事件
    add_chose_savePath() {
        electron_1.ipcMain.handle('chose_save_path', () => __awaiter(this, void 0, void 0, function* () {
            console.log("主进程监听到，  chose_save_path");
            let file_list = yield electron_1.dialog.showOpenDialogSync(main_1.mainWindow, {
                properties: ['openDirectory']
            });
            console.log('所选路劲file_list：：：', file_list);
            return file_list;
        }));
    }
    // 点击开始转换按钮
    add_begin_change() {
        electron_1.ipcMain.handle('begin_change', (e, paths) => __awaiter(this, void 0, void 0, function* () {
            console.log("主进程监听到 ，  add_begin_change");
            e2j_1.default.instance.begin_change(paths);
        }));
    }
}
main_ipc_handle._instance = null;
exports.default = main_ipc_handle;
