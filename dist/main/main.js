"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const e2j_1 = __importDefault(require("./e2j"));
const main_ipc_handle_1 = __importDefault(require("./main_ipc_handle"));
// 创建窗口函数
function createMainWindow() {
    // 配置窗口大小（建议与 Cocos 设计分辨率一致，如 1280x720）
    exports.mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            // 安全配置：关闭 nodeIntegration，通过 preload 脚本实现通信
            nodeIntegration: false,
            sandbox: false,
            contextIsolation: true, // 隔离渲染进程和主进程环境
            // allowFileAccess: true,   // 允许加载本地文件（必须，否则无法读取 resource 资源）
            webSecurity: false, // 关闭跨域限制（避免 Cocos 本地资源加载报错）
            preload: path_1.default.join(__dirname, '../preload/preload.js') // 预加载脚本路径（可选）
            // preload: path.join(app.getAppPath(), 'preload.js'),
        }
    });
    // 加载 Cocos 打包的 index.html（关键路径）
    // __dirname 是编译后主进程目录（dist/main/），通过 ../../ 回退到项目根目录，再进入 resource 
    const cocosIndexPath = path_1.default.join(__dirname, '../../resource/index.html');
    exports.mainWindow.loadFile(cocosIndexPath);
    // 开发阶段打开调试工具 （查看 Cocos 日志和错误）
    exports.mainWindow.webContents.openDevTools();
    //#region ------------添加ipc处理器------------
    //添加进程间通信 , 处理chose_file(选择目标文件【可多选】)事件
    main_ipc_handle_1.default.instance.add_chose_file();
    /** 封存
    ipcMain.handle('open_file', async () => {
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
    */
    //添加进程间通信 , 处理chose_file(选择目标文件夹【可多选】)事件
    main_ipc_handle_1.default.instance.add_chose_folder();
    //#endregion ------------添加ipc处理器------------
    // console.log("see see the wathc code");//-- 项目需要开启实时ts 转 js  ，工具库安装在项目内部，需要到项目内启动
    // ------------------------------------------ npm run watch   可通过开关此代码检查是否成功开启
}
// Electron 初始化完成后创建窗口
electron_1.app.whenReady().then(() => {
    createMainWindow();
    e2j_1.default.instance.add_ipc_handle();
    // macOS 特殊处理：窗口关闭后重新激活时重建窗口
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});
// 所有窗口关闭时退出应用（macOS 除外）
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
