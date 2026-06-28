// 全域狀態
let currentCategory = '普通';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // 讀取 JSON 資料
    try {
        const response = await fetch('data/enchants.json?v=' + new Date().getTime());
        if (!response.ok) {
            throw new Error(`HTTP 錯誤狀態碼: ${response.status}`);
        }
        const data = await response.json();
        // 強制寫入全域物件，避免變數被覆蓋
        window.ENCHANTS_DATA = data;
        try { ENCHANTS = data; } catch (e) {} 
    } catch (error) {
        console.error('載入附魔資料失敗:', error);
        
        const container = document.getElementById('main-action-panel');
        if (container) {
            if (window.location.protocol === 'file:') {
                container.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff9800; padding: 20px; text-align: center;">
                        <h3 style="margin-bottom: 10px; font-size: 1.5rem;">⚠️ 無法讀取 enchants.json</h3>
                        <p>因為瀏覽器的安全性限制 (CORS)，無法直接雙擊 <b>index.html</b> 讀取外部 JSON。</p>
                        <p style="margin-top: 15px;">請使用 VS Code 的 <b>Live Server</b> 擴充功能開啟。</p>
                    </div>
                `;
            } else {
                container.innerHTML = `<div style="text-align: center; color: #f44336; padding: 40px; font-size: 1.2rem;">載入附魔資料庫失敗，請確認 data/enchants.json 是否存在。</div>`;
            }
        }
        
        if (typeof showToast === 'function') showToast('載入附魔資料庫失敗');
        bindEvents(); 
        return;
    }

    // 從 LocalStorage 載入購物車
    if (typeof StorageManager !== 'undefined') {
        const savedCart = StorageManager.loadCart();
        if (Array.isArray(savedCart) && savedCart.length > 0) {
            Cart.items = savedCart;
            Cart.activeItemId = savedCart[savedCart.length - 1].id; 
            
            const activeItem = Cart.getActiveItem();
            if (activeItem) {
                const btn = document.querySelector(`.eq-btn[data-slot="${activeItem.slot}"]`);
                if (btn) btn.classList.add('active');
            }
        }
    }

    bindEvents();
    renderEnchantments();
    if (typeof Cart !== 'undefined') Cart.render();
}

function bindEvents() {
    // 左側裝備點擊：智慧分支延伸邏輯
    document.querySelectorAll('.eq-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentBtn = e.currentTarget;
            document.querySelectorAll('.eq-btn').forEach(b => b.classList.remove('active'));
            currentBtn.classList.add('active');
            
            const slot = currentBtn.dataset.slot;
            
            if (typeof Cart !== 'undefined') {
                const existingItems = Cart.items.filter(i => i.slot === slot);
                
                if (existingItems.length > 0) {
                    Cart.activeItemId = existingItems[existingItems.length - 1].id;
                } else {
                    if (['helmet', 'chestplate', 'leggings', 'boots'].includes(slot)) {
                        // 【盔甲分支】：強制觸發 State 1（材質二選一）
                        Cart.activeItemId = null;
                    } else {
                        // 【工具/武器/其他裝備分支】：自動建立對應基底
                        Cart.addEquipment(slot);
                        const data = window.ENCHANTS_DATA || [];
                        let baseItem = null;
                        
                        // 工具武器自動配獄髓，其他原味配對
                        if (['sword', 'axe', 'pickaxe', 'shovel', 'hoe', 'mace', 'spear'].includes(slot)) {
                            baseItem = data.find(en => en.id >= 200 && Array.isArray(en.slots) && en.slots.includes(slot) && en.name.includes('獄髓'));
                        } else {
                            baseItem = data.find(en => en.id >= 200 && Array.isArray(en.slots) && en.slots.includes(slot));
                        }

                        if (baseItem) Cart.toggleEnchant(baseItem);
                    }
                }
            }
            
            renderEnchantments();
            if (typeof Cart !== 'undefined') Cart.render();
        });
    });

    // 附魔分類切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            targetBtn.classList.add('active');
            currentCategory = targetBtn.dataset.category;
            renderEnchantments();
        });
    });

    // 搜尋功能
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderEnchantments();
        });
    }

    // 底部按鈕
    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (typeof Cart !== 'undefined') Cart.clear();
            if (typeof StorageManager !== 'undefined') StorageManager.clearCart();
            
            document.querySelectorAll('.eq-btn').forEach(b => b.classList.remove('active'));
            renderEnchantments();
            if (typeof showToast === 'function') showToast('已清空所有選擇');
        });
    }

    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            if (typeof Cart === 'undefined' || Cart.items.length === 0) {
                if (typeof showToast === 'function') showToast('尚未選擇任何裝備或附魔');
                return;
            }
            const text = Cart.generateQuoteText();
            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('報價已複製到剪貼簿！');
            }).catch(err => {
                if (typeof showToast === 'function') showToast('複製失敗');
            });
        });
    }

    const btnExportTxt = document.getElementById('btn-export-txt');
    if (btnExportTxt) {
        btnExportTxt.addEventListener('click', () => {
            if (typeof ExportManager !== 'undefined') ExportManager.exportTXT();
        });
    }

    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            if (typeof ExportManager !== 'undefined') ExportManager.exportJSON();
        });
    }

    window.renderEnchantments = renderEnchantments;
}

function getFilteredEnchants(targetSlot) {
    const data = window.ENCHANTS_DATA || [];
    if (!Array.isArray(data) || data.length === 0) return [];
    
    // 過濾掉 ID >= 200 的基底裝備
    let list = data.filter(e => e.id < 200);

    if (currentCategory === '收藏') {
        const favs = (typeof StorageManager !== 'undefined') ? StorageManager.loadFavorites() : [];
        list = list.filter(e => favs.includes(e.id));
    } else if (currentCategory === '最近') {
        const recents = (typeof StorageManager !== 'undefined') ? StorageManager.loadRecent() : [];
        list = recents.map(id => data.find(e => e.id === id)).filter(e => e && e.id < 200);
    } else {
        list = list.filter(e => e.rarity === currentCategory);
    }
    
    return list.filter(enchant => {
        const matchSlot = Array.isArray(enchant.slots) && enchant.slots.includes(targetSlot);
        const nameVal = enchant.name ? enchant.name.toLowerCase() : '';
        const fullVal = enchant.fullName ? enchant.fullName.toLowerCase() : '';
        const matchSearch = searchQuery === '' || nameVal.includes(searchQuery) || fullVal.includes(searchQuery);
        
        return matchSlot && matchSearch;
    });
}

function renderEnchantments() {
    const stateEmpty = document.getElementById('state-empty');
    const stateMaterial = document.getElementById('state-material');
    const stateEnchant = document.getElementById('state-enchant');
    const materialBtnGroup = document.getElementById('material-btn-group');
    const container = document.getElementById('enchant-list');

    const mainPanel = document.getElementById('main-action-panel');
    if (mainPanel && mainPanel.innerHTML.includes('無法讀取')) return;

    const activeBtn = document.querySelector('.eq-btn.active');
    const currentViewSlot = activeBtn ? activeBtn.dataset.slot : null;
    const activeItem = (typeof Cart !== 'undefined') ? Cart.getActiveItem() : null;

    if (stateEmpty) stateEmpty.style.display = 'none';
    if (stateMaterial) stateMaterial.style.display = 'none';
    if (stateEnchant) stateEnchant.style.display = 'none';

    // 狀態 0：完全沒有選擇左側裝備
    if (!currentViewSlot) {
        if (stateEmpty) stateEmpty.style.display = 'flex';
        return;
    }

    const slotName = (typeof Cart !== 'undefined' && Cart.slotNames[currentViewSlot]) ? Cart.slotNames[currentViewSlot] : currentViewSlot;

    // 狀態 1：已選左側裝備，但尚未建立材質
    if (!activeItem || activeItem.slot !== currentViewSlot) {
        if (stateMaterial) {
            stateMaterial.style.display = 'flex';
            const titleEl = document.getElementById('material-title');
            if (titleEl) titleEl.innerText = `選擇 ${slotName} 材質`;
            materialBtnGroup.innerHTML = '';
            
            const createBtn = (text, matType) => {
                const btn = document.createElement('button');
                btn.className = 'eq-btn'; 
                btn.style.cssText = 'padding: 15px 30px; font-size: 1.2rem; min-width: 150px;';
                btn.innerHTML = text;
                btn.onclick = () => {
                    Cart.addEquipment(currentViewSlot);
                    const data = window.ENCHANTS_DATA || [];
                    const baseItem = data.find(e => e.id >= 200 && Array.isArray(e.slots) && e.slots.includes(currentViewSlot) && e.name.includes(matType));
                    if (baseItem) Cart.toggleEnchant(baseItem);
                    
                    renderEnchantments(); 
                    if (typeof showToast === 'function') showToast(`已建立 ${text}！`);
                };
                return btn;
            };

            if (['helmet', 'chestplate', 'leggings', 'boots'].includes(currentViewSlot)) {
                materialBtnGroup.appendChild(createBtn(`鑽石${slotName}`, '鑽石'));
                materialBtnGroup.appendChild(createBtn(`獄髓${slotName}`, '獄髓'));
            }
        }
        return; 
    }

    // 狀態 2：展開附魔庫
    if (stateEnchant) stateEnchant.style.display = 'block';

    let editingName = activeItem.name;
    const baseEnchant = activeItem.enchants.find(e => e.id >= 200);
    if (baseEnchant) {
        editingName = baseEnchant.fullName.replace('【裝備】', '');
    }

    const titleEl = document.getElementById('enchant-target-title');
    if (titleEl) {
        titleEl.innerHTML = `✨ 正在配置：<span style="color: #fff; margin-left: 8px;">${editingName}</span>`;
        
        let anotherBtn = document.getElementById('btn-add-another');
        if (!anotherBtn) {
            anotherBtn = document.createElement('button');
            anotherBtn.id = 'btn-add-another';
            anotherBtn.style.cssText = 'background: transparent; color: var(--tab-active); border: 2px solid var(--tab-active); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: 0.2s;';
            titleEl.parentNode.appendChild(anotherBtn);
        }
        anotherBtn.innerHTML = `➕ 建立另一件`;
        anotherBtn.onmouseover = () => { anotherBtn.style.background = 'var(--tab-active)'; anotherBtn.style.color = 'white'; };
        anotherBtn.onmouseout = () => { anotherBtn.style.background = 'transparent'; anotherBtn.style.color = 'var(--tab-active)'; };
        anotherBtn.onclick = () => {
            Cart.activeItemId = null; 
            renderEnchantments();
        };
    }

    container.innerHTML = '';
    const list = getFilteredEnchants(currentViewSlot);

    if (list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 40px; font-size: 1.1rem;">此分類目前無符合的附魔</div>';
        return;
    }

    list.forEach(enchant => {
        const div = document.createElement('div');
        div.className = 'enchant-item';

        const isSelected = activeItem && typeof Cart !== 'undefined' && Cart.isSelected(enchant.id);
        if (isSelected) div.classList.add('selected');

        let isDisabled = false;
        if (activeItem && !isSelected && typeof Cart !== 'undefined') {
            isDisabled = Cart.checkIncompatible(enchant);
        }
        if (isDisabled) div.classList.add('disabled');

        const isFav = (typeof StorageManager !== 'undefined') && StorageManager.isFavorite(enchant.id);
        const favIcon = isFav ? '★' : '☆';
        const hoverDescText = enchant.description ? enchant.description : '無特殊效果說明';
        
        div.innerHTML = `
            <span class="fav-icon" style="position: absolute; top: 6px; right: 6px; cursor: pointer; color: #f1c40f; font-size: 1.2rem; z-index: 10;">${favIcon}</span>
            <div class="name">${enchant.fullName}</div>
            <div class="rarity-label rarity-${enchant.rarity}">${enchant.rarity}</div>
            <div class="price ${enchant.price >= 5000 ? 'expensive' : 'normal'}">$${typeof Calculator !== 'undefined' ? Calculator.formatPrice(enchant.price) : enchant.price}</div>
            
            <div class="hover-overlay">
                <strong style="color: var(--tab-active); font-size: 0.95rem; margin-bottom: 6px;">效果說明</strong>
                <span style="font-size: 0.85rem; color: #ccc; line-height: 1.5; text-align: center; word-break: break-all;">${hoverDescText}</span>
            </div>
        `;

        div.onclick = (e) => {
            if (e.target.classList.contains('fav-icon')) {
                if (typeof StorageManager !== 'undefined') StorageManager.toggleFavorite(enchant.id);
                renderEnchantments();
                return;
            }

            if (isDisabled) {
                if (typeof showToast === 'function') showToast(`【${enchant.name}】與已選附魔互斥！`);
                return;
            }
            toggleEnchant(enchant);
        };

        container.appendChild(div);
    });
}

function toggleEnchant(enchant) {
    if (typeof Cart !== 'undefined') Cart.toggleEnchant(enchant);
    if (typeof StorageManager !== 'undefined') {
        StorageManager.saveCart(Cart.items);
        StorageManager.addRecent(enchant.id);
    }
    renderEnchantments();
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}
