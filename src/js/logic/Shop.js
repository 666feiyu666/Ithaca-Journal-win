/* src/js/logic/Shop.js */
import { UserData } from '../data/UserData.js';
import { HUDRenderer } from '../ui/HUDRenderer.js'; 

export const Shop = {
    // 定义商品目录
    catalog: [
        { 
            id: 'item_plant_01', 
            name: '沙发', 
            price: 50, 
            desc: '开躺！',
            img: 'assets/images/room/sofa.png' 
        },
        { 
            id: 'item_rug_blue', 
            name: '波斯地毯', 
            price: 80, 
            desc: '踩上去软软的，很舒服。',
            img: 'assets/images/room/rug2.png' 
        },
        { 
            id: 'item_cat_orange', 
            name: '橘猫', 
            price: 100, 
            desc: '它吃得很多，但很可爱。',
            img: 'assets/images/room/cat.png' 
        }
    ],

    /**
     * 购买动作
     */
    buy(itemId) {
        const item = this.catalog.find(i => i.id === itemId);
        if (!item) return;

        // 1. 检查是否已拥有
        if (UserData.hasItem(itemId)) {
            alert("你已经拥有这件物品了。");
            return;
        }

        // 2. 检查余额
        if (UserData.state.ink < item.price) {
            alert("💧 墨水不足！多写点日记吧。");
            return;
        }

        // 3. 扣款
        if (UserData.consumeInk(item.price)) {
            // 4. 发货
            UserData.addItem(itemId);
            
            // 5. === 核心修复：刷新 UI ===
            
            // A. 刷新左上角全局墨水 (修复：这里之前调用了不存在的 update()，改为 updateAll())
            HUDRenderer.updateAll(); 

            // B. 刷新商店列表 (让按钮变灰)
            this.render(); 
            
            // C. 成功提示
            alert(`🎉 购买成功：${item.name}`);
        }
    },

    /**
     * 渲染商店界面
     */
    render() {
        // 1. 先刷新商店面板上的余额数字
        this.updateShopBalance();

        // 2. 渲染商品列表
        const listEl = document.getElementById('shop-list');
        if (!listEl) return;

        listEl.innerHTML = "";

        this.catalog.forEach(item => {
            const isOwned = UserData.hasItem(item.id);
            
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            
            card.innerHTML = `
                <div class="shop-icon-box">
                    <img src="${item.img}" class="shop-icon">
                </div>
                <div class="shop-info">
                    <h4>${item.name}</h4>
                    <p class="desc">${item.desc}</p>
                    <div class="price-tag">💧 ${item.price} ml</div>
                </div>
                <button class="btn-buy ${isOwned ? 'owned' : ''}" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '购买'}
                </button>
            `;

            if (!isOwned) {
                card.querySelector('.btn-buy').onclick = () => {
                    this.buy(item.id);
                };
            }

            listEl.appendChild(card);
        });
    },

    /**
     * 专门用于更新商店内的余额显示
     */
    updateShopBalance() {
        const balanceEl = document.getElementById('shop-ink-display');
        if (balanceEl) {
            balanceEl.innerText = UserData.state.ink;
            // 闪烁特效
            balanceEl.style.transition = 'color 0.2s';
            balanceEl.style.color = '#d32f2f'; 
            setTimeout(() => {
                balanceEl.style.color = ''; 
            }, 300);
        }
    }
};