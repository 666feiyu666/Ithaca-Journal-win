/* main.js */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. 定义数据存储路径 (持久化存档目录)
// Windows: %APPDATA%/伊萨卡手记-测试版/save_data/
// macOS: ~/Library/Application Support/伊萨卡手记-测试版/save_data/
const SAVE_FOLDER_NAME = app.isPackaged ? 'save_data' : 'save_data_dev_test5';
const DATA_DIR = path.join(app.getPath('userData'), SAVE_FOLDER_NAME);

// 确保存档目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "伊萨卡手记",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false 
        }
    });

    win.loadFile('src/index.html');
    // win.webContents.openDevTools(); // 调试用
}

app.whenReady().then(() => {
    // --- IPC 核心逻辑 ---

    // A. 读取文件 (带模板拷贝机制 - 已修复)
    ipcMain.handle('read-file', async (event, filename) => {
        try {
            // 目标路径：用户的存档目录
            const filePath = path.join(DATA_DIR, filename);

            // 1. 优先检查用户存档目录是否有数据 (老玩家/已保存过)
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf-8');
            }

            // 2. 如果存档不存在 (新玩家)，从初始模板拷贝
            let templatePath;

            if (app.isPackaged) {
                // 【生产环境】
                // 读取 extraResources 配置的外部资源目录 (resources/default_data)
                // 这样避免了读取 ASAR 内部文件可能产生的路径问题
                templatePath = path.join(process.resourcesPath, 'default_data', filename);
            } else {
                // 【开发环境】
                // 直接读取源码目录
                templatePath = path.join(__dirname, 'src', 'data', filename);
            }
            
            // 3. 尝试读取模板并初始化
            if (fs.existsSync(templatePath)) {
                console.log(`[Main] 新用户初始化，正在从模板拷贝: ${filename}`);
                console.log(`[Main] 模板源路径: ${templatePath}`);
                
                const initialData = fs.readFileSync(templatePath, 'utf-8');
                
                // 自动同步写入到用户的存档目录
                fs.writeFileSync(filePath, initialData, 'utf-8');
                return initialData;
            } else {
                console.error(`[Main] 错误：未找到初始模板文件 -> ${templatePath}`);
                return null; 
            }
        } catch (err) {
            console.error("读取操作失败:", err);
            return null;
        }
    });

    // B. 写入文件
    ipcMain.handle('write-file', async (event, filename, content) => {
        try {
            const filePath = path.join(DATA_DIR, filename);
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        } catch (err) {
            console.error("写入操作失败:", err);
            return false;
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});