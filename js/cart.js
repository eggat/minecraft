// 購物車與多件裝備狀態管理 - 專業報價版
const Cart = {
    items: [],
    activeItemId: null,

    get slotNames() {
        return {
            helmet: '頭盔', chestplate: '胸甲', leggings: '護腿', boots: '靴子',
            elytra: '鞘翅', sword: '劍', axe: '斧', mace: '重錘', spear: '長矛', pickaxe: '鎬', shovel: '鏟',
            hoe: '鋤', bow: '弓', crossbow: '弩', trident: '三叉戟', fishing: '釣竿'
        };
    },

    _ensureArray() {
        if (!Array.isArray(this.items)) {
            this.items = [];
            this.activeItemId = null;
        }
    },

    addEquipment(slot) {
        this._ensureArray();
        const newItem = {
            id: 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            slot: slot,
            name: this.slotNames[slot] || slot,
            quantity: 1,
            enchants: [] // 這裡改為：加入基底裝備時，它的附魔陣列會是空的，由後續選擇材質來填充
        };
        this.items.push(newItem);
        this.activeItemId = newItem.id;
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
        return newItem;
    },

    removeEquipment(id) {
        this._ensureArray();
        this.items = this.items.filter(item => item.id !== id);
        if (this.activeItemId === id) {
            this.activeItemId = this.items.length > 0 ? this.items[this.items.length - 1].id : null;
        }
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
    },

    setActiveItem(id) {
        this._ensureArray();
        this.activeItemId = id;
        this.render();
    },

    getActiveItem() {
        this._ensureArray();
        return this.items.find(item => item.id === this.activeItemId);
    },

    updateQuantity(id, change) {
        this._ensureArray();
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        let newQty = (item.quantity || 1) + change;
        if (newQty < 1) newQty = 1;
        if (newQty > 3) {
            if (typeof showToast === 'function') showToast('單一裝備數量上限為 3 件！');
            newQty = 3;
        }

        item.quantity = newQty;
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
    },

    // 核心邏輯：區分「基底裝備(>200)」與「附魔(<200)」
    toggleEnchant(enchant) {
        this._ensureArray();
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        // 如果是基底裝備 (ID >= 200)，替換掉原本該 slot 的舊基底
        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName; // 更新裝備名稱
        } else {
            // 一般附魔
            if (!enchant.slots.includes(activeItem.slot)) return;
            const index = activeItem.enchants.findIndex(e => e.id === enchant.id);
            if (index > -1) {
                activeItem.enchants.splice(index, 1);
            } else {
                activeItem.enchants.push(enchant);
            }
        }
        this.render();
    },

    isSelected(enchantId) {
        this._ensureArray();
        const activeItem = this.getActiveItem();
        if (!activeItem) return false;
        return activeItem.enchants.some(e => e.id === enchantId);
    },

    checkIncompatible(enchant) {
        this._ensureArray();
        const activeItem = this.getActiveItem();
        if (!activeItem) return false;
        if (enchant.id >= 200) return false; // 基底裝備不互斥

        const isLocalIncompatible = activeItem.enchants.some(selected => 
            (selected.incompatible && selected.incompatible.includes(enchant.name)) ||
            (enchant.incompatible && enchant.incompatible.includes(selected.name))
        );
        if (isLocalIncompatible) return true;

        if (enchant.rarity === '特殊') {
            const isAlreadyInOtherItem = this.items.some(item => 
                item.id !== activeItem.id && item.enchants.some(e => e.id === enchant.id)
            );
            if (isAlreadyInOtherItem) return true;
        }
        return false;
    },

    clear() {
        this.items = [];
        this.activeItemId = null;
        this.render();
    },

    getTotal() {
        this._ensureArray();
        let total = 0;
        this.items.forEach(item => {
            let itemTotal = 0;
            item.enchants.forEach(e => itemTotal += e.price);
            total += itemTotal * (item.quantity || 1);
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;
        container.innerHTML = '';
        const totalPriceEl = document.getElementById('total-price-value');
        if (totalPriceEl && typeof Calculator !== 'undefined') totalPriceEl.innerText = Calculator.formatPrice(this.getTotal());

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #888; padding: 40px; font-size: 1rem;">報價單為空</div>`;
            return;
        }

        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) {
            currentIndex = this.items.length - 1;
            this.activeItemId = this.items[currentIndex].id;
        }

        const currentItem = this.items[currentIndex];
        const qtyStr = currentItem.quantity || 1;

        // 導航
        const navHeader = document.createElement('div');
        navHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: #22222b; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #444;';
        
        const createNavBtn = (text, isEnabled, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.style.cssText = `background: ${isEnabled ? '#333' : 'transparent'}; border: none; color: ${isEnabled ? '#fff' : '#444'}; width: 36px; height: 36px; border-radius: 50%; cursor: ${isEnabled ? 'pointer' : 'default'};`;
            if (isEnabled) btn.onclick = onClick;
            return btn;
        };
        navHeader.appendChild(createNavBtn('◀', currentIndex > 0, () => { this.setActiveItem(this.items[currentIndex - 1].id); }));
        navHeader.appendChild(document.createElement('div')).innerHTML = `<div style="font-weight: bold; color: #fff;">${currentItem.name}</div>`;
        navHeader.appendChild(createNavBtn('▶', currentIndex < this.items.length - 1, () => { this.setActiveItem(this.items[currentIndex + 1].id); }));
        container.appendChild(navHeader);

        // 內容
        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'background: #18181d; padding: 15px; border-radius: 10px; border: 1px solid #444;';
        
        // 數量/刪除控制
        contentBox.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #333; padding-bottom:12px; margin-bottom:10px;"><div style="display:flex; align-items:center; gap:8px;"><span style="color:#aaa; font-size:0.9rem;">數量:</span><button onclick="Cart.updateQuantity('${currentItem.id}', -1)">-</button><span>${qtyStr}</span><button onclick="Cart.updateQuantity('${currentItem.id}', 1)">+</button></div><button style="color:red; background:none; border:1px solid red; border-radius:4px;" onclick="Cart.removeEquipment('${currentItem.id}')">🗑️</button></div>`;

        // 基底裝備顯示 (如果已選)
        const base = currentItem.enchants.find(e => e.id >= 200);
        if (base) {
            contentBox.innerHTML += `<div style="color:var(--primary-color); font-weight:bold; font-size:0.95rem; margin-bottom:5px;">${base.fullName}: <span style="color:#fff;">$${base.price}</span></div>`;
        } else {
            contentBox.innerHTML += `<div style="color:red; font-size:0.8rem; margin-bottom:5px;">請至附魔庫點選材質基底</div>`;
        }

        // 附魔清單
        currentItem.enchants.filter(e => e.id < 200).forEach(enchant => {
            contentBox.innerHTML += `<div style="background:#25252d; padding:6px; margin:4px 0; border-radius:4px; display:flex; justify-content:space-between;"><span>${enchant.fullName}</span><span>$${enchant.price}</span></div>`;
        });

        container.appendChild(contentBox);
    },

    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qtyStr = item.quantity || 1;
            const base = item.enchants.find(e => e.id >= 200);
            const baseName = base ? base.fullName : '未選材質';
            const basePrice = base ? base.price : 0;
            
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            text += `${baseName}: ${basePrice}\n`;
            
            let enchantsTotal = 0;
            item.enchants.filter(e => e.id < 200).forEach(e => {
                text += `- ${e.fullName}: ${e.price}\n`;
                enchantsTotal += e.price;
            });
            
            text += `小計 (x${qtyStr}): ${(basePrice + enchantsTotal) * qtyStr}\n\n`;
        });
        text += `總計金額: ${this.getTotal()}`;
        return text;
    }
};
