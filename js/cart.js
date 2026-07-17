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
            enchants: [],
            trim: null
        };
        this.items.push(newItem);
        this.activeItemId = newItem.id;
        this.render();
        if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
        return newItem;
    },

    updateName(id, newName) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.name = newName || (this.slotNames[item.slot] || item.slot);
            this.render();
            if (typeof StorageManager !== 'undefined' && StorageManager.saveCart) StorageManager.saveCart(this.items);
        }
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
            console.log('單一裝備數量上限為 3 件！');
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
            return this.items.some(item => 
                item.id !== activeItem.id && 
                item.enchants.some(e => e.id === enchant.id)
            );
        }
        return false;
    },

    clear() {
        this.items = [];
        this.activeItemId = null;
        this.render();
        console.log('已清空所有選擇');
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

        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) { currentIndex = this.items.length - 1; this.activeItemId = this.items[currentIndex].id; }

        const item = this.items[currentIndex];
        const qty = item.quantity || 1;

        // 左右切換導航
        const nav = document.createElement('div');
        nav.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #22222b; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #333;';
        nav.innerHTML = `
            <button onclick="Cart.setActiveItem('${currentIndex > 0 ? this.items[currentIndex-1].id : item.id}')" style="background:#444; border:none; color:#fff; padding:5px 10px; border-radius:4px; cursor:pointer;">◀</button>
            <span style="color:#fff; font-weight:bold; font-size:1rem;">${item.name} (${currentIndex + 1}/${this.items.length})</span>
            <button onclick="Cart.setActiveItem('${currentIndex < this.items.length - 1 ? this.items[currentIndex+1].id : item.id}')" style="background:#444; border:none; color:#fff; padding:5px 10px; border-radius:4px; cursor:pointer;">▶</button>
        `;
        container.appendChild(nav);

        // 卡片渲染
        const box = document.createElement('div');
        box.style.cssText = 'background: #18181b; padding: 15px; border-radius: 8px; border: 1px solid #3f3f46;';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = item.name;
        nameInput.placeholder = '自定義裝備名稱...';
        nameInput.style.cssText = 'width: 100%; background: #25252d; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 6px; margin-bottom: 10px; box-sizing: border-box;';
        nameInput.onchange = (e) => this.updateName(item.id, e.target.value);
        box.appendChild(nameInput);

        box.innerHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #aaa;">數量:</span>
                <div>
                    <button onclick="Cart.updateQuantity('${item.id}', -1)">❮</button>
                    <span style="padding: 0 10px; color:#fff;">${qty}</span>
                    <button onclick="Cart.updateQuantity('${item.id}', 1)">❯</button>
                    <button onclick="Cart.removeEquipment('${item.id}')" style="margin-left:10px;">🗑️</button>
                </div>
            </div>`;
        
        if (item.trim) {
            box.innerHTML += `<div style="color:var(--tab-active); font-size:0.9rem; margin-bottom:5px;">🎨 模板: ${item.trim.pattern} / ${item.trim.material.name}</div>`;
        }

        item.enchants.forEach(e => {
            const priceDisplay = (e.id >= 200 && e.price === 0) ? '自備' : '$' + e.price;
            box.innerHTML += `<div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                <span style="color:${e.id >= 200 ? '#fff' : '#aaa'}">${e.fullName}</span>
                <span style="color:#10b981;">${priceDisplay}</span>
            </div>`;
        });
        container.appendChild(box);
    },

    generateQuoteText() {
        this._ensureArray();
        if (this.items.length === 0) {
            console.log('⚠️ 報價單是空的，無法匯出');
            return '';
        }
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item) => {
            text += `=== ${item.name} (x${item.quantity || 1}) ===\n`;
            if (item.trim) text += `🎨 模板: ${item.trim.pattern} / ${item.trim.material.name}\n`;
            item.enchants.forEach(e => {
                const priceText = (e.id >= 200 && e.price === 0) ? '自備' : e.price;
                text += `${e.fullName}: ${priceText}\n`;
            });
            text += '\n';
        });
        text += `總金額: ${this.getTotal()}`;
        return text;
    }
};
