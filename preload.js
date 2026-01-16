/* preload.js */
// 👇👇👇 必须要有这一行！否则 contextBridge 就是未定义 👇👇👇
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ithacaSystem', {
    // 原有的读写功能
    loadData: (filename) => ipcRenderer.invoke('read-file', filename),
    saveData: (filename, content) => ipcRenderer.invoke('write-file', filename, content),
    
    // 新增的弹窗功能
    showMessage: (msg) => ipcRenderer.invoke('dialog:message', msg),
    showConfirm: (msg) => ipcRenderer.invoke('dialog:confirm', msg)
});