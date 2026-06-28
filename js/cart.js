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
        // 移除多餘的基底抓取邏輯，全部交由 app.js 精準分配
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
            activeItem.name = enchant.fullName.replace('【裝備】', '');
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
            container.innerHTML = `<div style="text-align: center; color: #666; padding: 30px; font-size: 1.1rem; border: 2px dashed #333; border-radius: 8px;">報價單目前為空</div>`;
            return;
        }

        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) {
            currentIndex = this.items.length - 1;
            this.activeItemId = this.items[currentIndex].id;
        }

        const currentItem = this.items[currentIndex];
        const qty = currentItem.quantity || 1;

        const nav = document.createElement('div');
        nav.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--panel-bg); padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border-color); box-shadow: 0 4px 6px rgba(0,0,0,0.3);';

        const btnPrev = document.createElement('button');
        btnPrev.innerText = '◀';
        btnPrev.style.cssText = `background: ${currentIndex > 0 ? '#3f3f46' : 'transparent'}; border: none; color: ${currentIndex > 0 ? '#fff' : '#555'}; padding: 6px 12px; border-radius: 6px; cursor: ${currentIndex > 0 ? 'pointer' : 'default'}; transition: 0.2s; font-size: 1rem;`;
        btnPrev.onclick = () => { if(currentIndex > 0) this.setActiveItem(this.items[currentIndex-1].id); };

        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'color: #fff; font-weight: bold; font-size: 1.15rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);';
        titleSpan.innerText = `${currentItem.name} (#${currentIndex + 1}/${this.items.length})`;

        const btnNext = document.createElement('button');
        btnNext.innerText = '▶';
        btnNext.style.cssText = `background: ${currentIndex < this.items.length - 1 ? '#3f3f46' : 'transparent'}; border: none; color: ${currentIndex < this.items.length - 1 ? '#fff' : '#555'}; padding: 6px 12px; border-radius: 6px; cursor: ${currentIndex < this.items.length - 1 ? 'pointer' : 'default'}; transition: 0.2s; font-size: 1rem;`;
        btnNext.onclick = () => { if(currentIndex < this.items.length - 1) this.setActiveItem(this.items[currentIndex+1].id); };

        nav.appendChild(btnPrev);
        nav.appendChild(titleSpan);
        nav.appendChild(btnNext);
        container.appendChild(nav);

        const box = document.createElement('div');
        box.style.cssText = 'background: #18181b; padding: 18px; border-radius: 10px; border: 1px solid #3f3f46; box-shadow: 0 4px 10px rgba(0,0,0,0.2);';

        const ctrlRow = document.createElement('div');
        ctrlRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #3f3f46; padding-bottom: 12px; margin-bottom: 12px;';

        const qtyBox = document.createElement('div');
        qtyBox.style.cssText = 'display: flex; align-items: center; background: #27272a; border-radius: 8px; border: 1px solid #3f3f46; overflow: hidden;';

        const btnDec = document.createElement('button');
        btnDec.innerText = '❮';
        btnDec.style.cssText = `background: transparent; color: ${qty > 1 ? '#a1a1aa' : '#52525b'}; border: none; padding: 6px 12px; cursor: ${qty > 1 ? 'pointer' : 'default'}; font-size: 1rem; transition: background 0.2s;`;
        if(qty > 1) { btnDec.onmouseover = () => btnDec.style.background = '#3f3f46'; btnDec.onmouseout = () => btnDec.style.background = 'transparent'; }
        btnDec.onclick = () => this.updateQuantity(currentItem.id, -1);

        const qtySpan = document.createElement('span');
        qtySpan.innerText = qty;
        qtySpan.style.cssText = 'color: #fff; font-weight: bold; font-size: 1.1rem; padding: 0 16px; border-left: 1px solid #3f3f46; border-right: 1px solid #3f3f46; background: #18181b;';

        const btnInc = document.createElement('button');
        btnInc.innerText = '❯';
        btnInc.style.cssText = `background: transparent; color: ${qty < 3 ? '#a1a1aa' : '#52525b'}; border: none; padding: 6px 12px; cursor: ${qty < 3 ? 'pointer' : 'default'}; font-size: 1rem; transition: background 0.2s;`;
        if(qty < 3) { btnInc.onmouseover = () => btnInc.style.background = '#3f3f46'; btnInc.onmouseout = () => btnInc.style.background = 'transparent'; }
        btnInc.onclick = () => this.updateQuantity(currentItem.id, 1);

        qtyBox.appendChild(btnDec);
        qtyBox.appendChild(qtySpan);
        qtyBox.appendChild(btnInc);

        const qtyWrapper = document.createElement('div');
        qtyWrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';
        qtyWrapper.innerHTML = `<span style="color: #a1a1aa; font-weight: 500;">數量</span>`;
        qtyWrapper.appendChild(qtyBox);

        const btnDel = document.createElement('button');
        btnDel.innerText = '🗑️';
        btnDel.style.cssText = 'background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: 0.2s;';
        btnDel.onmouseover = () => { btnDel.style.background = '#ef4444'; btnDel.style.color = '#fff'; };
        btnDel.onmouseout = () => { btnDel.style.background = 'rgba(239, 68, 68, 0.1)'; btnDel.style.color = '#ef4444'; };
        btnDel.onclick = () => this.removeEquipment(currentItem.id);

        ctrlRow.appendChild(qtyWrapper);
        ctrlRow.appendChild(btnDel);
        box.appendChild(ctrlRow);

        let itemSubtotal = 0;
        currentItem.enchants.forEach(e => {
            itemSubtotal += e.price;
            const isBase = e.id >= 200;
            const priceText = (isBase && e.price === 0) ? '自備' : (typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(e.price) : e.price);

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 1rem;';

            const nameSpan = document.createElement('span');
            nameSpan.innerText = e.fullName;
            nameSpan.style.color = isBase ? '#a1a1aa' : '#f4f4f5';
            nameSpan.style.fontWeight = isBase ? 'normal' : '500';

            const priceSpan = document.createElement('span');
            priceSpan.innerText = priceText;
            priceSpan.style.color = (isBase && e.price === 0) ? '#a1a1aa' : 'var(--price-normal)';
            priceSpan.style.fontWeight = 'bold';

            row.appendChild(nameSpan);
            row.appendChild(priceSpan);
            box.appendChild(row);
        });

        const finalSubtotal = itemSubtotal * qty;
        const subtotalRow = document.createElement('div');
        subtotalRow.style.cssText = 'border-top: 1px solid #3f3f46; margin-top: 12px; padding-top: 12px; text-align: right; font-weight: bold; color: #fff; font-size: 1.1rem;';
        subtotalRow.innerHTML = `小計 <span style="color:#a1a1aa; font-size:0.9rem; font-weight:normal;">(x${qty})</span> : <span style="color:var(--price-expensive); font-size: 1.25rem; margin-left: 8px;">${typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(finalSubtotal) : finalSubtotal}</span>`;
        box.appendChild(subtotalRow);

        container.appendChild(box);
    },

    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qty = item.quantity || 1;
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            let itemTotal = 0;
            item.enchants.forEach(e => {
                const priceText = (e.id >= 200 && e.price === 0) ? '自備' : (typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(e.price) : e.price);
                text += `${e.fullName}: ${priceText}\n`;
                itemTotal += e.price;
            });
            const subtotalText = typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(itemTotal * qty) : (itemTotal * qty);
            text += `小計 (x${qty}): ${subtotalText}\n\n`;
        });
        const totalText = typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(this.getTotal()) : this.getTotal();
        text += `====================\n總金額: ${totalText}`;
        return text;
    }
};
