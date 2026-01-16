/* src/js/ui/ReviewRender.js */
import { UserData } from '../data/UserData.js';
import { ModalManager } from './ModalManager.js';
import { Scripts } from '../data/Scripts.js'; // 导入剧本库
import { marked } from '../libs/marked.esm.js'; 

export const ReviewRenderer = {
    init() {
        const btn = document.getElementById('btn-review-log');
        if (btn) {
            btn.onclick = () => {
                this.render();
                ModalManager.open('modal-review-log');
            };
        }
    },

    /**
     * 渲染回顾列表：只展示剧情脚本
     */
    render() {
        const container = document.getElementById('review-list-container');
        if (!container) return;

        container.innerHTML = ''; 

        // 1. 获取已解锁的脚本 ID 列表
        // 兼容处理：如果没有这个字段，则为空数组
        const unlockedIds = UserData.state.unlockedScripts || [];

        if (unlockedIds.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">暂无剧情记录</div>';
            return;
        }

        // 2. 遍历并渲染
        // 为了体验好，我们可以倒序排列（新发生的在上面），或者按 Scripts 定义顺序
        // 这里演示：直接按解锁顺序的倒序 (也就是最近发生的在最上面)
        [...unlockedIds].reverse().forEach(scriptId => {
            const scriptData = Scripts[scriptId];
            if (scriptData) {
                const item = this.createScriptItem(scriptData);
                container.appendChild(item);
            }
        });
    },

    createScriptItem(scriptData) {
        const item = document.createElement('div');
        item.className = 'review-day-item'; // 复用之前的样式类名

        // 1. 标题栏
        const header = document.createElement('div');
        header.className = 'review-header';
        // 显示标题，如果没有标题则显示 ID
        header.innerHTML = `<span>🎬 ${scriptData.title || scriptData.id}</span> <span class="toggle-icon">▼</span>`;
        
        // 2. 内容区域 (默认折叠)
        const content = document.createElement('div');
        content.className = 'review-content hidden';
        
        // 生成对话流
        let dialogueHtml = '<div class="script-log-container" style="padding: 10px; background: rgba(255,255,255,0.5); border-radius: 4px;">';
        scriptData.content.forEach(line => {
            // 给说话人加个颜色高亮
            const speakerColor = line.speaker === '我' ? '#5d4037' : '#d84315'; 
            dialogueHtml += `
                <div style="margin-bottom: 6px; font-size: 14px; line-height: 1.5;">
                    <strong style="color:${speakerColor}">${line.speaker}:</strong> 
                    <span style="color:#333;">${line.text}</span>
                </div>
            `;
        });
        dialogueHtml += '</div>';

        content.innerHTML = dialogueHtml;

        // 3. 点击展开/收起
        header.onclick = () => {
            const isHidden = content.classList.contains('hidden');
            if (isHidden) {
                content.classList.remove('hidden');
                header.querySelector('.toggle-icon').innerText = '▲';
            } else {
                content.classList.add('hidden');
                header.querySelector('.toggle-icon').innerText = '▼';
            }
        };

        item.appendChild(header);
        item.appendChild(content);
        return item;
    }
};
