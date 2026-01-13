/* src/js/logic/CityEvent.js */
import { StoryManager } from './StoryManager.js';
import { UserData } from '../data/UserData.js';

export const CityEvent = {
    // 📍 1. 配置图片路径 (对应你上传的文件)
    locations: [
               { 
            id: 'street', 
            name: '🏘️ 公寓街道', 
            desc: '安静的住宅区，偶尔有猫路过。',
            bg: 'assets/images/city/street0.png' // 通用街道图
        },
        { 
            id: 'subway', 
            name: '🚇 地铁口', 
            desc: '人潮拥挤的地下入口。',
            bg: 'assets/images/city/street1.png' // Subway图
        },
        { 
            id: 'shops', 
            name: '🏮 商店街', 
            desc: '充满烟火气的老街。',
            bg: 'assets/images/city/street2.png' // 商店街图
        },
        { 
            id: 'mall', 
            name: '🏢 百货商店', 
            desc: '光鲜亮丽的消费主义迷宫。',
            bg: 'assets/images/city/street3.png' // 商场图
        },
        { 
            id: 'university', 
            name: '🎓 大学', 
            desc: '充满书卷气与青春的地方。',
            bg: 'assets/images/city/street4.png' // 大学图
        },
        { 
            id: 'stadium', 
            name: '🏟️ 体育馆', 
            desc: '巨大的混凝土建筑。',
            bg: 'assets/images/city/street5.png' // 体育馆图
        }
    ],

    // 渲染选择菜单 (保持不变)
    renderSelectionMenu() {
        const listEl = document.getElementById('map-choices-list');
        if (!listEl) return;
        
        listEl.innerHTML = "";
        this.locations.forEach(loc => {
            const btn = document.createElement('button');
            btn.className = 'gal-choice-btn pixel-font';
            btn.innerText = loc.name;
            btn.onclick = () => this.visit(loc);
            listEl.appendChild(btn);
        });
    },

    // 🚶 2. 修改：访问逻辑
    visit(location) {
        // 关闭选择菜单
        document.getElementById('modal-map-selection').style.display = 'none';

        // 生成随机剧情文本
        const content = this.generateEventText(location);

        // ✨ 核心修改：调用 showSceneDialogue 而不是 showDialogue
        // 传入 location.bg 让 StoryManager 切换背景
        StoryManager.showSceneDialogue(
            `抵达：${location.name.split(' ')[1]}`, 
            content,
            location.bg 
        );

        // 概率掉落碎片 (保持不变)
        if (Math.random() > 0.7) {
            setTimeout(() => {
                StoryManager.unlockFragment('frag_pineapple_03'); 
            }, 1000);
        }
    },

    // 生成随机文本 (保持不变)
    generateEventText(loc) {
        const events = [
            `你在这个地方漫无目的地走了一会儿。<br>空气中有一股${loc.id === 'shops' ? '关东煮' : '尘土'}的味道。`,
            `人很多，但没有人注意到你。<br>你感觉自己像是一个透明的观察者。`,
            `并没有发生什么特别的事。<br>但这片刻的宁静让你感到放松。`,
            `你在路边的长椅上坐了一会儿，<br>看着行色匆匆的路人，记录下了一些灵感。`
        ];
        return `"${loc.desc}"<br><br>${events[Math.floor(Math.random() * events.length)]}`;
    }
};