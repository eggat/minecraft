// 購物車與多件裝備狀態管理 (含精準的裝備價格顯示邏輯)
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

    // 判斷該裝備是否為「玩家自備」的項目
    isSelfProvided(slot) {
        const selfProvidedSlots = ['bow', 'crossbow', 'fishing', 'elytra', 'trident', 'mace'];
        return selfProvidedSlots.includes(slot);
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
            if (typeof showToast === 'function') showToast('單一裝備數量最多只能 3 件！');
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
            // 只有「非自備」項目才累加基底價格
            const basePrice = !this.isSelfProvided(item.slot) ? (item.enchants.find(e => e.id >= 200)?.price || 0) : 0;
            total += (itemTotal + basePrice) * (item.quantity || 1);
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

        // UI 導航
        const navHeader = document.createElement('div');
        navHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: #22222b; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid var(--border-color);';
        const createNavBtn = (text, isEnabled, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.style.cssText = `background: ${isEnabled ? '#333' : 'transparent'}; border: none; color: ${isEnabled ? '#fff' : '#444'}; width: 36px; height: 36px; border-radius: 50%; cursor: ${isEnabled ? 'pointer' : 'default'}; transition: 0.2s; font-size: 1.1rem;`;
            if (isEnabled) btn.onclick = onClick;
            return btn;
        };
        const prevBtn = createNavBtn('◀', currentIndex > 0, () => { this.setActiveItem(this.items[currentIndex - 1].id); });
        const nextBtn = createNavBtn('▶', currentIndex < this.items.length - 1, () => { this.setActiveItem(this.items[currentIndex + 1].id); });
        
        let displayName = currentItem.name;
        const baseEnchant = currentItem.enchants.find(e => e.id >= 200);
        let basePrice = 0;
        if (baseEnchant) {
            displayName = baseEnchant.fullName.replace('【裝備】', '');
            basePrice = baseEnchant.price;
        }

        const titleDiv = document.createElement('div');
        titleDiv.style.textAlign = 'center';
        titleDiv.innerHTML = `<div style="font-weight: bold; color: #fff; font-size: 1.1rem; letter-spacing: 1px;">${displayName}</div><div style="font-size: 0.75rem; color: #aaa; margin-top: 4px;">項目 ${currentIndex + 1} / ${this.items.length}</div>`;
        navHeader.appendChild(prevBtn); navHeader.appendChild(titleDiv); navHeader.appendChild(nextBtn);
        container.appendChild(navHeader);

        // 內容
        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'background: #18181d; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color);';
        
        // 控制列
        contentBox.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #333; padding-bottom:12px; margin-bottom:10px;"><div style="display:flex; align-items:center; gap:8px;"><span style="color:#aaa; font-size:0.9rem;">數量:</span><div style="display:flex; align-items:center; background:#25252d; border-radius:6px; border:1px solid #333;"><button style="background:transparent; color:${qtyStr > 1 ? '#aaa' : '#444'}; border:none; padding:4px 10px; cursor:${qtyStr > 1 ? 'pointer' : 'not-allowed'};" onclick="Cart.updateQuantity('${currentItem.id}', -1)">❮</button><span style="color:#fff; font-weight:bold; padding:0 12px; border-left:1px solid #333; border-right:1px solid #333;">${qtyStr}</span><button style="background:transparent; color:${qtyStr < 3 ? '#aaa' : '#444'}; border:none; padding:4px 10px; cursor:${qtyStr < 3 ? 'pointer' : 'not-allowed'};" onclick="Cart.updateQuantity('${currentItem.id}', 1)">❯</button></div></div><button style="background:transparent; color:var(--danger-color); border:1px solid var(--danger-color); padding:4px 8px; border-radius:6px; cursor:pointer;" onclick="Cart.removeEquipment('${currentItem.id}')">🗑️</button></div>`;

        // 附魔清單
        const selfProvided = this.isSelfProvided(currentItem.slot);
        const priceLabel = selfProvided ? '自備' : (typeof Calculator !== 'undefined' ? Calculator.formatPrice(basePrice) : basePrice);
        contentBox.innerHTML += `<div style="color:var(--price-normal); font-size:0.85rem; padding:5px 0;">裝備基礎售價: ${priceLabel}</div>`;
        
        currentItem.enchants.filter(e => e.id < 200).forEach(enchant => {
            const enDiv = document.createElement('div');
            enDiv.style.cssText = 'background:#25252d; padding:8px; margin:5px 0; border-radius:4px; display:flex; justify-content:space-between; align-items:center; border-left:3px solid var(--primary-color);';
            enDiv.innerHTML = `<div style="font-size:0.9rem;">${enchant.fullName} <span style="color:var(--price-normal); font-size:0.8rem;">($${enchant.price})</span></div><button style="background:none; border:none; color:var(--danger-color); cursor:pointer;">&times;</button>`;
            enDiv.querySelector('button').onclick = () => this.toggleEnchant(enchant);
            contentBox.appendChild(enDiv);
        });

        // 結算
        const subtotalDiv = document.createElement('div');
        subtotalDiv.style.cssText = 'margin-top:10px; padding-top:10px; border-top:1px solid #333; text-align:right; font-weight:bold;';
        const eTotal = currentItem.enchants.filter(e => e.id < 200).reduce((sum, e) => sum + e.price, 0);
        const singleTotal = selfProvided ? eTotal : (basePrice + eTotal);
        subtotalDiv.innerHTML = `小計 (x${qtyStr}): <span style="color:var(--price-expensive); font-size:1.2rem;">${typeof Calculator !== 'undefined' ? Calculator.formatPrice(singleTotal * qtyStr) : singleTotal * qtyStr}</span>`;
        contentBox.appendChild(subtotalDiv);
        container.appendChild(contentBox);
    },

    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qtyStr = item.quantity || 1;
            let displayName = item.name;
            const baseEnchant = item.enchants.find(e => e.id >= 200);
            let basePrice = 0;
            const selfProvided = this.isSelfProvided(item.slot);
            
            if (baseEnchant) {
                displayName = baseEnchant.fullName.replace('【裝備】', '');
                basePrice = baseEnchant.price;
            }
            
            text += `=== ${displayName} (#${index + 1}) ===\n`;
            text += `裝備售價: ${selfProvided ? '自備' : (typeof Calculator !== 'undefined' ? Calculator.formatPrice(basePrice) : basePrice)}\n`;
            
            let enchantsTotal = 0;
            item.enchants.filter(e => e.id < 200).forEach(e => {
                text += `- ${e.fullName}: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(e.price) : e.price}\n`;
                enchantsTotal += e.price;
            });
            
            const singleTotal = selfProvided ? enchantsTotal : (basePrice + enchantsTotal);
            text += `單件總額: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(singleTotal) : singleTotal}\n`;
            text += `採購數量: x ${qtyStr}\n`;
            text += `小計: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(singleTotal * qtyStr) : singleTotal * qtyStr}\n\n`;
        });
        text += `====================\n`;
        text += `總計金額: ${typeof Calculator !== 'undefined' ? Calculator.formatPrice(this.getTotal()) : this.getTotal()}`;
        return text;
    }
};
