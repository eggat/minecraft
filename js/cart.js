// 購物車與多件裝備狀態管理 (含數量選擇與全域特殊附魔唯一性判定 - 方案 B)
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
            quantity: 1, // 新增數量屬性，預設為 1
            enchants: []
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

    // 新增：更新數量的功能 (限制 1~3)
    updateQuantity(id, change) {
        this._ensureArray();
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        let newQty = (item.quantity || 1) + change;
        if (newQty < 1) newQty = 1;
        if (newQty > 3) {
            if (typeof showToast === 'function') showToast('單件裝備數量上限為 3 件！');
            newQty = 3;
        }

        item.quantity = newQty;
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
    },

    toggleEnchant(enchant) {
        this._ensureArray();
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        if (!enchant.slots.includes(activeItem.slot)) return;

        const index = activeItem.enchants.findIndex(e => e.id === enchant.id);
        if (index > -1) {
            activeItem.enchants.splice(index, 1);
        } else {
            activeItem.enchants.push(enchant);
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

        // 1. 裝備內部的互斥判定
        const isLocalIncompatible = activeItem.enchants.some(selected => 
            (selected.incompatible && selected.incompatible.includes(enchant.name)) ||
            (enchant.incompatible && enchant.incompatible.includes(selected.name))
        );
        if (isLocalIncompatible) return true;

        // 2. 全域特殊附魔排斥：只檢查「其他裝備」是否有此特殊附魔
        // 這樣就不會阻擋「同一件裝備增加數量」的行為 (方案 B)
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
            total += itemTotal * (item.quantity || 1); // 總價計算加入數量乘數
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;
        
        container.innerHTML = '';
        const totalPriceEl = document.getElementById('total-price-value');
        if (totalPriceEl && typeof Calculator !== 'undefined') {
            totalPriceEl.innerText = Calculator.formatPrice(this.getTotal());
        }

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #888; padding: 40px; font-size: 1rem;">報價單目前為空</div>`;
            return;
        }

        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) {
            currentIndex = this.items.length - 1;
            this.activeItemId = this.items[currentIndex].id;
        }

        const currentItem = this.items[currentIndex];
        const qtyStr = currentItem.quantity || 1;

        // 1. 導航面板
        const navHeader = document.createElement('div');
        navHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: #22222b; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid var(--border-color);';

        const createNavBtn = (text, isEnabled, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.style.cssText = `background: ${isEnabled ? '#333' : 'transparent'}; border: none; color: ${isEnabled ? '#fff' : '#444'}; width: 36px; height: 36px; border-radius: 50%; cursor: ${isEnabled ? 'pointer' : 'default'}; transition: 0.2s;`;
            if (isEnabled) btn.onclick = onClick;
            return btn;
        };

        const prevBtn = createNavBtn('◀', currentIndex > 0, () => { this.setActiveItem(this.items[currentIndex - 1].id); if(typeof renderEnchantments === 'function') renderEnchantments(); });
        const nextBtn = createNavBtn('▶', currentIndex < this.items.length - 1, () => { this.setActiveItem(this.items[currentIndex + 1].id); if(typeof renderEnchantments === 'function') renderEnchantments(); });

        let displayName = currentItem.name;
        const baseEnchant = currentItem.enchants.find(e => e.id >= 200);
        let basePrice = 0;
        if (baseEnchant) {
            displayName = baseEnchant.fullName.replace('【裝備】', '');
            basePrice = baseEnchant.price;
        }

        const titleDiv = document.createElement('div');
        titleDiv.style.textAlign = 'center';
        titleDiv.innerHTML = `<div style="font-weight: bold; color: #fff; font-size: 1.1rem;">${displayName}</div><div style="font-size: 0.75rem; color: #aaa;">項目 ${currentIndex + 1} / ${this.items.length}</div>`;

        navHeader.appendChild(prevBtn);
        navHeader.appendChild(titleDiv);
        navHeader.appendChild(nextBtn);
        container.appendChild(navHeader);

        // 2. 內容區塊
        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'background: #18181d; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;';
        
        // 2.1 頂部控制列 (數量加減 + 捨棄)
        const controlRow = document.createElement('div');
        controlRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px; margin-bottom: 5px;';
        
        // 數量選擇器 UI
        const qtyBox = document.createElement('div');
        qtyBox.style.cssText = 'display: flex; align-items: center; background: #25252d; border-radius: 6px; border: 1px solid var(--border-color); overflow: hidden;';
        
        const btnMinus = document.createElement('button');
        btnMinus.innerHTML = '－';
        btnMinus.style.cssText = `background: transparent; color: ${qtyStr > 1 ? '#aaa' : '#444'}; border: none; padding: 4px 10px; cursor: ${qtyStr > 1 ? 'pointer' : 'not-allowed'}; font-weight: bold; transition: 0.2s;`;
        if (qtyStr > 1) {
            btnMinus.onmouseover = () => btnMinus.style.background = '#333';
            btnMinus.onmouseout = () => btnMinus.style.background = 'transparent';
            btnMinus.onclick = () => this.updateQuantity(currentItem.id, -1);
        }

        const spanQty = document.createElement('span');
        spanQty.innerText = qtyStr;
        spanQty.style.cssText = 'color: #fff; font-weight: bold; padding: 0 12px; font-size: 0.95rem; text-align: center; min-width: 32px;';

        const btnPlus = document.createElement('button');
        btnPlus.innerHTML = '＋';
        btnPlus.style.cssText = `background: transparent; color: ${qtyStr < 3 ? '#aaa' : '#444'}; border: none; padding: 4px 10px; cursor: ${qtyStr < 3 ? 'pointer' : 'not-allowed'}; font-weight: bold; transition: 0.2s;`;
        if (qtyStr < 3) {
            btnPlus.onmouseover = () => btnPlus.style.background = '#333';
            btnPlus.onmouseout = () => btnPlus.style.background = 'transparent';
            btnPlus.onclick = () => this.updateQuantity(currentItem.id, 1);
        }

        qtyBox.appendChild(btnMinus);
        qtyBox.appendChild(spanQty);
        qtyBox.appendChild(btnPlus);

        // 捨棄按鈕
        const btnRemove = document.createElement('button');
        btnRemove.innerHTML = '🗑️ 捨棄裝備';
        btnRemove.style.cssText = 'background: transparent; color: var(--danger-color); border: 1px solid var(--danger-color); padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: 0.2s;';
        btnRemove.onmouseover = () => { btnRemove.style.background = 'var(--danger-color)'; btnRemove.style.color = 'white'; };
        btnRemove.onmouseout = () => { btnRemove.style.background = 'transparent'; btnRemove.style.color = 'var(--danger-color)'; };
        btnRemove.onclick = () => { this.removeEquipment(currentItem.id); if(typeof renderEnchantments === 'function') renderEnchantments(); };

        controlRow.appendChild(qtyBox);
        controlRow.appendChild(btnRemove);
        contentBox.appendChild(controlRow);

        // 2.2 附魔清單
        const enchantListDiv = document.createElement('div');
        let enchantsTotal = 0;
        const displayEnchants = currentItem.enchants.filter(e => e.id < 200);

        if (displayEnchants.length === 0 && basePrice === 0) {
            enchantListDiv.innerHTML = '<div style="color: #666; text-align: center; padding: 15px 0; font-size: 0.85rem;">尚未添加附魔</div>';
        } else {
            displayEnchants.forEach(enchant => {
                enchantsTotal += enchant.price;
                const enDiv = document.createElement('div');
                enDiv.style.cssText = 'background: #25252d; padding: 8px 12px; margin: 6px 0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;';
                enDiv.innerHTML = `
                    <div>
                        <div style="font-weight: bold; color: #f5f5f5; font-size: 0.95rem;">${enchant.fullName}</div>
                        <div style="font-size: 0.8rem; color: var(--price-normal);">$${enchant.price}</div>
                    </div>
                    <button style="background:none; border:none; color:var(--danger-color); cursor:pointer; font-size: 1.4rem;">&times;</button>`;
                enDiv.querySelector('button').onclick = () => { this.toggleEnchant(enchant); if(typeof renderEnchantments === 'function') renderEnchantments(); };
                enchantListDiv.appendChild(enDiv);
            });
        }
        contentBox.appendChild(enchantListDiv);

        // 2.3 小計結算區
        const singleTotal = basePrice + enchantsTotal;
        const groupTotal = singleTotal * qtyStr;

        const subtotalDiv = document.createElement('div');
        subtotalDiv.style.cssText = 'margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-end;';
        subtotalDiv.innerHTML = `
            <div style="color: #aaa; font-size: 0.85rem; line-height: 1.4;">
                單件小計: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(singleTotal) : singleTotal}<br>
                採購數量: x ${qtyStr}
            </div>
            <div style="color: var(--price-normal); font-weight: bold; font-size: 1.25rem;">
                ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(groupTotal) : groupTotal}
            </div>
        `;
        contentBox.appendChild(subtotalDiv);

        container.appendChild(contentBox);
    },

    // 格式化 TXT 報價單
    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qtyStr = item.quantity || 1;
            let displayName = item.name;
            const baseEnchant = item.enchants.find(e => e.id >= 200);
            let basePrice = 0;
            
            if (baseEnchant) {
                displayName = baseEnchant.fullName.replace('【裝備】', '');
                basePrice = baseEnchant.price;
            }
            
            text += `=== ${displayName} (#${index + 1}) ===\n`;
            if (basePrice > 0) {
                text += `- 基底費用: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(basePrice) : basePrice}\n`;
            }
            
            const displayEnchants = item.enchants.filter(e => e.id < 200);
            displayEnchants.forEach(e => {
                text += `- ${e.fullName}: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(e.price) : e.price}\n`;
            });
            
            let itemTotal = basePrice;
            displayEnchants.forEach(e => itemTotal += e.price);
            
            text += `\n數量: x ${qtyStr}\n`;
            text += `小計: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(itemTotal * qtyStr) : (itemTotal * qtyStr)}\n\n`;
        });
        text += `====================\n`;
        text += `總計金額: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(this.getTotal()) : this.getTotal()}`;
        return text;
    }
};
