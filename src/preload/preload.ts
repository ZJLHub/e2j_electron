// const { dialog } = require('electron')
// const { contextBridge, ipcRenderer } = require('electron/renderer')
import { contextBridge, ipcRenderer } from 'electron';
import path from 'path';
// console.log("1111111111111111111111111111111111 preload.js is be  load  , now set contextBridge double line API : [electronA{I}]::: ");
// contextBridge.exposeInMainWorld('electronAPI', {
//   choseFile: () => ipcRenderer.send('chose_file'),
//   only_test:() => {console.log("success play function :: only_test ");}
// })

// console.log("process.contextIsolated::", process.contextIsolated);
contextBridge.exposeInMainWorld('electronAPI',
  {
    choseFile: (who:string) => {//choseFile
      return new Promise(async (resolve) => {
        //让主进程打开弹窗,并等待其选择完文件返回
        //这里需要等待选择完成，也是一个promise， 需要使用ipcRenderer.invoke函数来进行等待，具体详情查看【 https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args 】
        let file_list = await  ipcRenderer.invoke('chose_file');
        // console.log('preload file_list :::',file_list);
        console.log("i am  choseFile function!!!!!!!!!!!!!!!!");
        resolve(file_list);
      });
    },
    choseFolder: () => {//choseFolder
      return new Promise(async (resolve) => {
        //让主进程打开弹窗,并等待其选择完文件返回
        //这里需要等待选择完成，也是一个promise， 需要使用ipcRenderer.invoke函数来进行等待，具体详情查看【 https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args 】
        let file_list = await ipcRenderer.invoke('chose_folder');
        console.log('preload chose_folder :::', file_list);
        resolve(file_list);
      });
    },   

    choseSavePath: (who:string) => {//choseFolder
      //保存路径暂时只能选择一个文件夹路径
      return new Promise(async (resolve) => {
        let file_list = await ipcRenderer.invoke('chose_save_path');
        console.log('preload chose_save_path :::', file_list);
        resolve(file_list);
      });
    },

    beginChange: (paths:string[]) => {//开始转换excel文件
      return new Promise(async (resolve) => {
        await ipcRenderer.invoke('begin_change',paths);
        console.log('preload beginChange :::', paths);
        // resolve(file_list);
      });
    }

  })
// console.log("222222 preload.js  now contextBridge double direction line API  is be setted: window[electronAPI]::: ", window["electronAPI"]);