// 購物車與多件裝備狀態管理 (含全域特殊附魔唯一性判定 + 專業報價格式化)
const Cart = {
    items: [],
    activeItemId: null,

    get slotNames() {
        return {
            helmet: '頭盔', chestplate: '胸甲', leggings: '護腿', boots: '靴子',
            elytra: '鞘翅', sword: '劍', axe: '斧', mace: '重錘', pickaxe: '鎬', shovel: '鏟',
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

    toggleEnchant(enchant) {
        this._ensureArray();
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        // 檢查該附魔是否適用於此裝備類型
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

        // 1. 同一件裝備內的互斥判定
        const isLocalIncompatible = activeItem.enchants.some(selected => 
            (selected.incompatible && selected.incompatible.includes(enchant.name)) ||
            (enchant.incompatible && enchant.incompatible.includes(selected.name))
        );
        if (isLocalIncompatible) return true;

        // 2. 全域特殊附魔唯一性判定 (防呆機制)
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
            item.enchants.forEach(e => total += e.price);
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

        // 繪製導航面板
        const navHeader = document.createElement('div');
        navHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: #22222b; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid var(--border-color);';

        const createNavBtn = (text, isEnabled, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.style.cssText = `background: ${isEnabled ? '#333' : 'transparent'}; border: none; color: ${isEnabled ? '#fff' : '#444'}; width: 36px; height: 36px; border-radius: 50%; cursor: ${isEnabled ? 'pointer' : 'default'}; transition: 0.2s;`;
            if (isEnabled) btn.onclick = onClick;
            return btn;
        };

        const prevBtn = createNavBtn('◀', currentIndex > 0, () => { this.setActiveItem(this.items[currentIndex - 1].id); renderEnchantments(); });
        const nextBtn = createNavBtn('▶', currentIndex < this.items.length - 1, () => { this.setActiveItem(this.items[currentIndex + 1].id); renderEnchantments(); });

        let displayName = currentItem.name;
        const baseEnchant = currentItem.enchants.find(e => e.id >= 200);
        if (baseEnchant) displayName = baseEnchant.fullName.replace('【裝備】', '');

        const titleDiv = document.createElement('div');
        titleDiv.style.textAlign = 'center';
        titleDiv.innerHTML = `<div style="font-weight: bold; color: #fff; font-size: 1.1rem;">${displayName}</div><div style="font-size: 0.75rem; color: #aaa;">裝備 ${currentIndex + 1} / ${this.items.length}</div>`;

        navHeader.appendChild(prevBtn);
        navHeader.appendChild(titleDiv);
        navHeader.appendChild(nextBtn);
        container.appendChild(navHeader);

        // 繪製附魔列表
        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'background: #18181d; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color);';
        
        const actionDiv = document.createElement('div');
        actionDiv.style.textAlign = 'right';
        actionDiv.innerHTML = `<button style="background: transparent; color: var(--danger-color); border: 1px solid var(--danger-color); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">捨棄此裝備</button>`;
        actionDiv.querySelector('button').onclick = () => { this.removeEquipment(currentItem.id); renderEnchantments(); };
        contentBox.appendChild(actionDiv);

        const enchantListDiv = document.createElement('div');
        currentItem.enchants.filter(e => e.id < 200).forEach(enchant => {
            const enDiv = document.createElement('div');
            enDiv.style.cssText = 'background: #25252d; padding: 10px; margin: 6px 0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;';
            enDiv.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: #f5f5f5;">${enchant.fullName}</div>
                    <div style="font-size: 0.8rem; color: #999;">$${enchant.price}</div>
                </div>
                <button style="background:none; border:none; color:var(--danger-color); cursor:pointer; font-size: 1.2rem;">&times;</button>`;
            enDiv.querySelector('button').onclick = () => { this.toggleEnchant(enchant); renderEnchantments(); };
            enchantListDiv.appendChild(enDiv);
        });
        contentBox.appendChild(enchantListDiv);
        container.appendChild(contentBox);
    },

    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            let displayName = item.name;
            const baseEnchant = item.enchants.find(e => e.id >= 200);
            if (baseEnchant) displayName = baseEnchant.fullName.replace('【裝備】', '');
            
            text += `=== ${displayName} (#${index + 1}) ===\n`;
            item.enchants.filter(e => e.id < 200).forEach(e => text += `- ${e.fullName}: ${Calculator.formatPrice(e.price)}\n`);
            
            let itemTotal = 0;
            item.enchants.forEach(e => itemTotal += e.price);
            text += `小計: ${Calculator.formatPrice(itemTotal)}\n\n`;
        });
        text += `====================\n`;
        text += `總計金額: ${Calculator.formatPrice(this.getTotal())}`;
        return text;
    }
};
