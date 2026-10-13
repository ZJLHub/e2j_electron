/**
 * 这里注册ipc的处理器
 * 
 * 这里的每个handle基本都是cc里面每个按钮的一个处理器。
 * 函数命名方式与cc项目工程按钮名称相同 方便对照 -。-!!!
 */

import { dialog, ipcMain } from "electron";
import { mainWindow } from "./main";
import E2j from "./e2j";

export default class main_ipc_handle {
    private static _instance: main_ipc_handle = null;
    public static get instance() {
        if (!main_ipc_handle._instance) {
            main_ipc_handle._instance = new main_ipc_handle();
        }
        return main_ipc_handle._instance;
    }
    //添加进程间通信 , 处理chose_file(选择目标文件【可多选】)事件
    add_chose_file() {
        ipcMain.handle('chose_file', async () => {
            console.log("mainJS ipcMaiun get the chose_file");
            // const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {//打开选择框0
            let { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {//打开选择框0
                properties: ['openFile', 'multiSelections']
            });
            if (!canceled) {
                console.log("choseFile canceled", "filePaths::", filePaths, "filePaths[0]:::", filePaths[0]);
                return filePaths;
            }
        });
    }

    //添加进程间通信 , 处理 chose_folder(选择目标文件夹路劲【可多选】) 事件
    add_chose_folder() {
        ipcMain.handle('chose_folder', async () => {
            console.log("主进程监听到，  chose_folder");
            let file_list = await dialog.showOpenDialogSync(mainWindow, {//打开选择框
                properties: ['openDirectory', 'multiSelections']
            });
            console.log('所选路劲file_list：：：', file_list);
            return file_list;
        });
    }

    // 添加进程间通信 , 处理 chose_save_path (选择文件保存路劲) 事件
    add_chose_savePath() {
        ipcMain.handle('chose_save_path', async () => {
          console.log("主进程监听到，  chose_save_path");
          let file_list = await dialog.showOpenDialogSync(mainWindow, {//打开选择框
            properties: ['openDirectory']
          });
          console.log('所选路劲file_list：：：', file_list);
          return file_list;
        });
    }

    // 点击开始转换按钮
    add_begin_change(){
        ipcMain.handle('begin_change',async (e,paths:string[])=>{
            console.log("主进程监听到 ，  add_begin_change");
            E2j.instance.begin_change(paths);
        });
    }

}