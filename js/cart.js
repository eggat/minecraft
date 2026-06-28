// 購物車與裝備管理 (最終完全修復版)
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

    updateQuantity(id, change) {
        this._ensureArray();
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        let newQty = (item.quantity || 1) + change;
        if (newQty < 1) newQty = 1;
        if (newQty > 3) newQty = 3;
        item.quantity = newQty;
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

        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName.replace('【裝備】', '');
        } else {
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

    getTotal() {
        this._ensureArray();
        let total = 0;
        this.items.forEach(item => {
            let basePrice = item.enchants.find(e => e.id >= 200)?.price || 0;
            let enchantSum = item.enchants.filter(e => e.id < 200).reduce((sum, e) => sum + e.price, 0);
            total += (basePrice + enchantSum) * (item.quantity || 1);
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;
        container.innerHTML = '';
        
        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">報價單為空</div>`;
            return;
        }

        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) {
            currentIndex = this.items.length - 1;
            this.activeItemId = this.items[currentIndex].id;
        }

        const item = this.items[currentIndex];
        
        // 導航列
        const nav = document.createElement('div');
        nav.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#222; padding:10px; border-radius:8px; margin-bottom:10px;';
        nav.innerHTML = `<button onclick="Cart.setActiveItem('${currentIndex > 0 ? this.items[currentIndex-1].id : item.id}')">◀</button>
                         <span style="color:#fff; font-weight:bold;">${item.name} (#${currentIndex + 1})</span>
                         <button onclick="Cart.setActiveItem('${currentIndex < this.items.length-1 ? this.items[currentIndex+1].id : item.id}')">▶</button>`;
        container.appendChild(nav);

        // 內容
        const box = document.createElement('div');
        box.style.cssText = 'background:#18181d; padding:15px; border-radius:10px; border:1px solid #444;';
        
        box.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <div>數量: <button onclick="Cart.updateQuantity('${item.id}', -1)">❮</button> ${item.quantity || 1} <button onclick="Cart.updateQuantity('${item.id}', 1)">❯</button></div>
            <button style="color:red;" onclick="Cart.removeEquipment('${item.id}')">🗑️</button>
        </div>`;

        let itemSubtotal = 0;
        item.enchants.forEach(e => {
            itemSubtotal += e.price;
            const priceDisplay = (e.id >= 200 && e.price === 0) ? '自備' : e.price;
            box.innerHTML += `<div style="display:flex; justify-content:space-between; margin:3px 0;"><span>${e.fullName}:</span><span>${priceDisplay}</span></div>`;
        });
        
        box.innerHTML += `<div style="border-top:1px solid #333; margin-top:5px; text-align:right; font-weight:bold;">小計 (x${item.quantity || 1}): ${itemSubtotal * (item.quantity || 1)}</div>`;
        container.appendChild(box);
    },

    generateQuoteText() {
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            let itemTotal = 0;
            item.enchants.forEach(e => {
                const priceText = (e.id >= 200 && e.price === 0) ? '自備' : e.price;
                text += `${e.fullName}: ${priceText}\n`;
                itemTotal += e.price;
            });
            text += `小計 (x${item.quantity || 1}): ${itemTotal * (item.quantity || 1)}\n\n`;
        });
        text += `總金額: ${this.getTotal()}`;
        return text;
    }
};
