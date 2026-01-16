/* src/js/logic/IntroScene.js */
import { UserData } from '../data/UserData.js';
import { UIRenderer } from '../ui/UIRenderer.js';
import { DragManager } from './DragManager.js'; // 引入拖拽管理器，用于自动开启装修模式
import { Scripts } from '../data/Scripts.js';

export const IntroScene = {
    currentIndex: 0,
    isTyping: false,
    timer: null,
    currentScript: null,

    init() {
        // 👈 加载剧本
        this.currentScript = Scripts["intro_scene"].content;

        const scene = document.getElementById('scene-intro');
        const room = document.getElementById('scene-room');
        
        // 1. 如果已经看过剧情
        if (UserData.state.hasWatchedIntro) {
            scene.style.display = 'none';
            if (room) room.style.display = 'block'; 
            scene.onclick = null;
            
            // 【安全措施】如果之前意外没解锁，这里强制解锁一次，防止坏档
            document.body.classList.remove('interaction-locked'); 
            return;
        }

        // ===============================================
        // 👉 [新增] 2. 剧情开始：锁定全局 UI
        // ===============================================
        document.body.classList.add('interaction-locked');
        console.log("🔒 剧情开始，已锁定外部按钮交互");

        // 3. 只有确实需要播放剧情时，才进行 DOM 操作显示
        if (room) room.style.display = 'none';
        scene.style.display = 'flex'; // 此时再显示
        scene.style.opacity = 1;
        scene.style.background = '#000'; 
        
        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.opacity = '1';

        // 4. 绑定点击事件 (核心修复)
        // 点击整个场景区域，推进下一句对话
        scene.onclick = () => {
            this.next();
        };

        // 绑定跳过按钮
        const btnSkip = document.getElementById('btn-skip-intro');
        if (btnSkip) {
            btnSkip.onclick = (e) => {
                e.stopPropagation(); // 防止冒泡触发 scene.onclick
                this.endIntro();
            };
        }

        this.renderLine();
    },

    next() {
        if (this.isTyping) {
            this.finishTyping();
            return;
        }
        this.currentIndex++;
        if (this.currentIndex >= this.currentScript.length) {
            this.endIntro();
        } else {
            this.renderLine();
        }
    },

    renderLine() {
        const line = this.currentScript[this.currentIndex];
        document.getElementById('dialogue-speaker').innerText = line.speaker;
        const textEl = document.getElementById('dialogue-text');
        textEl.innerText = ""; 
        
        this.isTyping = true;
        let charIndex = 0;
        if (this.timer) clearInterval(this.timer);

        this.timer = setInterval(() => {
            if (charIndex < line.text.length) {
                textEl.innerText += line.text[charIndex];
                charIndex++;
            } else {
                this.finishTyping();
            }
        }, 50);
    },

    finishTyping() {
        clearInterval(this.timer);
        this.isTyping = false;
        document.getElementById('dialogue-text').innerText = this.currentScript[this.currentIndex].text;
    },

    // 🎬 剧情结束 -> 引导开始
    endIntro() {
        // ===============================================
        // 👉 [新增] 剧情结束：解锁全局 UI
        // ===============================================
        document.body.classList.remove('interaction-locked');
        console.log("🔓 剧情结束，恢复按钮交互");

        const scene = document.getElementById('scene-intro');
        const room = document.getElementById('scene-room');

        // ✅ 核心修复：剧情结束时，必须彻底解绑点击事件！
        // 否则下次 StoryManager 复用这个界面时，还会触发 Intro 的逻辑
        scene.onclick = null; 

        // 🔴 核心修复：转场开始前，先把房间显示出来（在 intro 层底下）
        // 这样当 intro 淡出时，房间才会浮现出来
        if (room) room.style.display = 'block';
        
        // 1. 淡出动画
        scene.style.transition = "opacity 1.5s";
        scene.style.opacity = 0;
        
        setTimeout(() => {
            scene.style.display = 'none';
            
            // 2. 记录状态
            UserData.state.hasWatchedIntro = true;
            UserData.save();

            // === ✨ 核心引导逻辑 ===
            
            // A. 在日志里给一句氛围感的话
            UIRenderer.log("推开门，屋里空荡荡的，只有午后的阳光洒在地板上。");

            // B. 延迟一点点，自动打开【装修模式】
            setTimeout(() => {
                DragManager.toggleMode(true);
                alert("📦 【新手引导】\n\n你看，房间现在是空的。\n\n我已经帮你把行李放在屏幕下方的【物品栏】里了。\n\n试着把它们拖拽到房间里吧！");
            }, 500);

        }, 1500);
    }
};