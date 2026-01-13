/* preload.js */
const { contextBridge, ipcRenderer } = require('electron');

// 把特定的 API 暴露给 window 对象
// 前端可以通过 window.ithacaSystem.loadData() 来调用
contextBridge.exposeInMainWorld('ithacaSystem', {
    loadData: (filename) => ipcRenderer.invoke('read-file', filename),
    saveData: (filename, content) => ipcRenderer.invoke('write-file', filename, content)
});