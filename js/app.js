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
    const container = document.getElementById('enchant-list');
    if (!container) return;
    container.innerHTML = '';

    const activeItem = (typeof Cart !== 'undefined') ? Cart.getActiveItem() : null;
    
    // 如果沒有選裝備，顯示提示
    if (!activeItem) {
        document.getElementById('state-empty').style.display = 'flex';
        document.getElementById('state-material').style.display = 'none';
        document.getElementById('state-enchant').style.display = 'none';
        return;
    }

    // 確保顯示切換正確
    document.getElementById('state-empty').style.display = 'none';
    document.getElementById('state-material').style.display = 'none';
    document.getElementById('state-enchant').style.display = 'block';

    const titleEl = document.getElementById('enchant-target-title');
    if (titleEl) titleEl.innerHTML = `✨ 正在配置：<span style="color: #fff;">${activeItem.name}</span>`;

    const keyword = (document.getElementById('search-input')?.value || '').toLowerCase();
    const data = window.ENCHANTS_DATA || [];

    // 嚴謹的過濾邏輯：只顯示 ID < 200 的附魔，且必須符合該裝備的 slot
    const available = data.filter(e => {
        if (e.id >= 200) return false;
        // 檢查 slots 是否包含當前裝備的 slot
        const matchSlot = Array.isArray(e.slots) && e.slots.includes(activeItem.slot);
        if (!matchSlot) return false;

        // 分類過濾
        if (currentCategory !== '全部' && e.rarity !== currentCategory) return false;

        // 搜尋過濾
        return e.fullName.toLowerCase().includes(keyword);
    });

    if (available.length === 0) {
        container.innerHTML = '<div style="color: #888; padding: 20px; text-align: center;">無符合的附魔</div>';
        return;
    }

    available.forEach(enchant => {
        const isSelected = Cart.isSelected(enchant.id);
        const card = document.createElement('div');
        card.className = 'enchant-item ' + (isSelected ? 'selected' : '');
        card.innerHTML = `
            <div class="name">${enchant.fullName}</div>
            <div class="price">$${enchant.price}</div>
        `;
        card.onclick = () => Cart.toggleEnchant(enchant);
        container.appendChild(card);
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
