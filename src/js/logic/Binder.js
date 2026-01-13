/* src/js/logic/Binder.js */
import { Library } from '../data/Library.js';
import { UserData } from '../data/UserData.js';

export const Binder = {
    // 暂存当前正在编辑的书稿
    currentManuscript: "", 
    // ✨ 新增：暂存当前选择的封面 (默认值)
    currentCover: 'assets/images/booksheet/booksheet1.png',

    appendFragment(text) {
        this.currentManuscript += text + "\n\n"; 
    },

    updateManuscript(text) {
        this.currentManuscript = text;
    },

    // ✨ 新增：供 UI 调用以设置封面
    setCover(coverPath) {
        this.currentCover = coverPath;
    },

    publish(title, coverImg) {
        if (this.currentManuscript.length < 10) {
            return { success: false, msg: "书稿内容太少，无法出版。" };
        }

        const newBook = {
            id: Date.now(),
            title: title || "无题",
            content: this.currentManuscript,
            date: new Date().toLocaleDateString(),
            // 优先使用传入参数，否则使用内部状态，最后兜底
            cover: coverImg || this.currentCover || 'assets/images/booksheet/booksheet1.png' 
        };

        Library.addBook(newBook);
        
        const reward = Math.floor(this.currentManuscript.length / 2);
        UserData.addInk(reward);

        // 重置状态
        this.currentManuscript = "";
        this.currentCover = 'assets/images/booksheet/booksheet1.png'; // 恢复默认

        return { success: true, msg: `《${newBook.title}》出版成功！获得 ${reward}ml 墨水。` };
    }
};