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
        if (newQty > 3) newQty = 3;
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

        // 如果選的是裝備基底 (ID >= 200)，先移除舊的基底，再放入新的
        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName || enchant.name;
        } else {
            // 一般附魔處理
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
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
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

        const totalEl = document.getElementById('total-price-value');
        if (totalEl) {
            totalEl.innerText = typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(this.getTotal()) : this.getTotal();
        }

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">報價單目前為空</div>`;
            return;
        }

        this.items.forEach((item) => {
            const isActive = item.id === this.activeItemId;
            const qty = item.quantity || 1;
            
            const box = document.createElement('div');
            box.style.cssText = `background: #18181b; padding: 15px; border-radius: 10px; border: 2px solid ${isActive ? '#6366f1' : '#3f3f46'}; margin-bottom: 15px; cursor: pointer;`;
            box.onclick = () => this.setActiveItem(item.id);

            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
            header.innerHTML = `
                <strong style="color:#fff; font-size: 1.1rem;">${item.name}</strong>
                <div>
                    <button onclick="event.stopPropagation(); Cart.updateQuantity('${item.id}', -1)" style="background:#333; border:none; color:#fff; padding:2px 8px; border-radius:4px;">❮</button>
                    <span style="padding:0 10px; font-weight:bold;">${qty}</span>
                    <button onclick="event.stopPropagation(); Cart.updateQuantity('${item.id}', 1)" style="background:#333; border:none; color:#fff; padding:2px 8px; border-radius:4px;">❯</button>
                    <button onclick="event.stopPropagation(); Cart.removeEquipment('${item.id}')" style="background:#ef4444; border:none; color:#fff; padding:2px 8px; border-radius:4px; margin-left:10px;">刪除</button>
                </div>
            `;
            box.appendChild(header);

            // 渲染附魔項目（包含基底）
            item.enchants.forEach(e => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; justify-content:space-between; padding:4px 0; font-size:0.95rem;';
                row.innerHTML = `
                    <span style="color:${e.id >= 200 ? '#a1a1aa' : '#e4e4e7'}">${e.fullName}</span>
                    <span style="color:${e.price === 0 ? '#a1a1aa' : '#10b981'}">${e.price === 0 ? '自備' : '$' + e.price}</span>
                `;
                box.appendChild(row);
            });

            container.appendChild(box);
        });
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
