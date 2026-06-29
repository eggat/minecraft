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
            enchants: []
        };
        this.items.push(newItem);
        this.activeItemId = newItem.id;
        this.render();
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
        return newItem;
    },

    removeEquipment(id) {
        this._ensureArray();
        this.items = this.items.filter(item => item.id !== id);
        if (this.activeItemId === id) {
            this.activeItemId = this.items.length > 0 ? this.items[this.items.length - 1].id : null;
        }
        this.render();
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
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
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
    },

    setActiveItem(id) {
        this._ensureArray();
        this.activeItemId = id;
        this.render();
        if (typeof window.renderEnchantments === 'function') window.renderEnchantments();
    },

    getActiveItem() {
        this._ensureArray();
        return this.items.find(item => item.id === this.activeItemId);
    },

    toggleEnchant(enchant) {
        this._ensureArray();
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName || enchant.name;
        } else {
            if (!Array.isArray(enchant.slots) || !enchant.slots.includes(activeItem.slot)) return;
            const index = activeItem.enchants.findIndex(e => e.id === enchant.id);
            if (index > -1) {
                activeItem.enchants.splice(index, 1);
            } else {
                activeItem.enchants.push(enchant);
            }
        }
        this.render();
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
    },

    isSelected(enchantId) {
        const item = this.getActiveItem();
        return item ? item.enchants.some(e => e.id === enchantId) : false;
    },

    checkIncompatible(enchant) {
        this._ensureArray();
        const activeItem = this.getActiveItem();
        if (!activeItem || enchant.id >= 200) return false;

        const isLocalIncompatible = activeItem.enchants.some(selected => {
            if (!selected.incompatible || !Array.isArray(selected.incompatible)) return false;
            return selected.incompatible.includes(enchant.name) || 
                   (enchant.incompatible && enchant.incompatible.includes(selected.name));
        });
        if (isLocalIncompatible) return true;

        if (enchant.rarity === '特殊') {
            return this.items.some(item => item.id !== activeItem.id && item.enchants.some(e => e.id === enchant.id));
        }
        return false;
    },

    clear() {
        this.items = [];
        this.activeItemId = null;
        this.render();
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
    },

    getTotal() {
        this._ensureArray();
        let total = 0;
        this.items.forEach(item => {
            let itemTotal = item.enchants.reduce((s, e) => s + e.price, 0);
            total += itemTotal * (item.quantity || 1);
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;
        container.innerHTML = '';

        const totalEl = document.getElementById('total-price-value');
        if (totalEl) {
            totalEl.innerText = typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(this.getTotal()) : this.getTotal();
        }

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">報價單目前為空</div>`;
            return;
        }

        // --- 核心恢復：左右切換導航邏輯 ---
        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) { currentIndex = this.items.length - 1; this.activeItemId = this.items[currentIndex].id; }

        const nav = document.createElement('div');
        nav.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #22222b; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #333;';
        
        const btnPrev = document.createElement('button');
        btnPrev.innerText = '◀';
        btnPrev.style.cssText = `background: ${currentIndex > 0 ? '#444' : 'transparent'}; border: none; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: ${currentIndex > 0 ? 'pointer' : 'default'};`;
        btnPrev.onclick = () => { if(currentIndex > 0) this.setActiveItem(this.items[currentIndex-1].id); };

        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'color: #fff; font-weight: bold; font-size: 1rem;';
        titleSpan.innerText = `${this.items[currentIndex].name} (${currentIndex + 1}/${this.items.length})`;

        const btnNext = document.createElement('button');
        btnNext.innerText = '▶';
        btnNext.style.cssText = `background: ${currentIndex < this.items.length - 1 ? '#444' : 'transparent'}; border: none; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: ${currentIndex < this.items.length - 1 ? 'pointer' : 'default'};`;
        btnNext.onclick = () => { if(currentIndex < this.items.length - 1) this.setActiveItem(this.items[currentIndex+1].id); };

        nav.appendChild(btnPrev); nav.appendChild(titleSpan); nav.appendChild(btnNext);
        container.appendChild(nav);
        // --- 核心恢復結束 ---

        // 渲染目前編輯的項目內容
        const item = this.items[currentIndex];
        const qty = item.quantity || 1;

        const box = document.createElement('div');
        box.style.cssText = 'background: #18181b; padding: 15px; border-radius: 8px; border: 1px solid #3f3f46;';
        box.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #aaa;">數量:</span>
                <div>
                    <button onclick="Cart.updateQuantity('${item.id}', -1)">❮</button>
                    <span style="padding: 0 10px;">${qty}</span>
                    <button onclick="Cart.updateQuantity('${item.id}', 1)">❯</button>
                    <button onclick="Cart.removeEquipment('${item.id}')" style="margin-left:10px;">🗑️</button>
                </div>
            </div>`;
        
        item.enchants.forEach(e => {
            box.innerHTML += `<div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                <span style="color:${e.id >= 200 ? '#aaa' : '#fff'}">${e.fullName}</span>
                <span style="color:#10b981;">${e.price === 0 ? '自備' : '$' + e.price}</span>
            </div>`;
        });
        container.appendChild(box);
    },

    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qty = item.quantity || 1;
            text += `=== ${item.name} (x${qty}) ===\n`;
            let itemTotal = 0;
            item.enchants.forEach(e => {
                const priceText = (e.price === 0) ? '自備' : e.price;
                text += `${e.fullName}: ${priceText}\n`;
                itemTotal += e.price;
            });
            text += `小計: ${itemTotal * qty}\n\n`;
        });
        text += `總金額: ${this.getTotal()}`;
        return text;
    }
};
