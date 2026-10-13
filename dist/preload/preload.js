"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// const { dialog } = require('electron')
// const { contextBridge, ipcRenderer } = require('electron/renderer')
const electron_1 = require("electron");
// console.log("1111111111111111111111111111111111 preload.js is be  load  , now set contextBridge double line API : [electronA{I}]::: ");
// contextBridge.exposeInMainWorld('electronAPI', {
//   choseFile: () => ipcRenderer.send('chose_file'),
//   only_test:() => {console.log("success play function :: only_test ");}
// })
// console.log("process.contextIsolated::", process.contextIsolated);
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    choseFile: (who) => {
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            //让主进程打开弹窗,并等待其选择完文件返回
            //这里需要等待选择完成，也是一个promise， 需要使用ipcRenderer.invoke函数来进行等待，具体详情查看【 https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args 】
            let file_list = yield electron_1.ipcRenderer.invoke('chose_file');
            // console.log('preload file_list :::',file_list);
            console.log("i am  choseFile function!!!!!!!!!!!!!!!!");
            resolve(file_list);
        }));
    },
    choseFolder: () => {
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            //让主进程打开弹窗,并等待其选择完文件返回
            //这里需要等待选择完成，也是一个promise， 需要使用ipcRenderer.invoke函数来进行等待，具体详情查看【 https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args 】
            let file_list = yield electron_1.ipcRenderer.invoke('chose_folder');
            console.log('preload chose_folder :::', file_list);
            resolve(file_list);
        }));
    },
    choseSavePath: (who) => {
        //保存路径暂时只能选择一个文件夹路径
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            let file_list = yield electron_1.ipcRenderer.invoke('chose_save_path');
            console.log('preload chose_save_path :::', file_list);
            resolve(file_list);
        }));
    },
    beginChange: (paths) => {
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            yield electron_1.ipcRenderer.invoke('begin_change', paths);
            console.log('preload beginChange :::', paths);
            // resolve(file_list);
        }));
    }
});
// console.log("222222 preload.js  now contextBridge double direction line API  is be setted: window[electronAPI]::: ", window["electronAPI"]);
