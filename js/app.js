// 全域狀態
let currentCategory = '普通';
let searchQuery = '';

// --- 新增：模板資料 ---
const TRIM_PATTERNS = [
    '哨兵 (Sentry)', '惱鬼 (Vex)', '野性 (Wild)', '海岸 (Coast)', 
    '沙丘 (Dune)', '尋路 (Wayfinder)', '牧民 (Raiser)', '塑造 (Shaper)', 
    '嚮導 (Host)', '幽靜 (Silence)', '豬鼻 (Snout)', '肋骨 (Rib)', 
    '尖塔 (Spire)', '潮汐 (Tide)', '守衛 (Ward)', '眼眸 (Eye)'
];
const TRIM_MATERIALS = [
    { name: '鐵 (Iron)', color: '#e2e2e4' },
    { name: '銅 (Copper)', color: '#e77c56' },
    { name: '金 (Gold)', color: '#f8d23b' },
    { name: '青金石 (Lapis)', color: '#415eab' },
    { name: '綠寶石 (Emerald)', color: '#17dd62' },
    { name: '鑽石 (Diamond)', color: '#2bebd5' },
    { name: '獄髓 (Netherite)', color: '#443a3b' },
    { name: '紅石 (Redstone)', color: '#971607' },
    { name: '紫水晶 (Amethyst)', color: '#9a5cc6' },
    { name: '石英 (Quartz)', color: '#eeebe6' }
];
let tempTrimPattern = null;
let tempTrimMaterial = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initTrimModal(); // 新增：初始化模板彈窗
});

async function initApp() {
    // 讀取 JSON 資料
    try {
        const response = await fetch('data/enchants.json?v=' + new Date().getTime());
        if (!response.ok) {
            throw new Error(`HTTP 錯誤狀態碼: ${response.status}`);
        }
        const data = await response.json();
        // 強制寫入全域物件，避免變數被 data.js 的空陣列覆蓋
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
            
            // 如果有已載入的裝備，自動點亮左側對應的裝備分類按鈕
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
                        Cart.activeItemId = null;
                    } else {
                        Cart.addEquipment(slot);
                        let baseName = null;
                        const slotName = Cart.slotNames[slot] || slot;
                        
                        if (['sword', 'axe', 'pickaxe', 'shovel', 'hoe', 'mace', 'spear'].includes(slot)) {
                            baseName = `獄髓${slotName}`;
                        } 
                        else if (['trident', 'elytra', 'bow', 'crossbow', 'fishing'].includes(slot)) {
                            baseName = `${slotName}`;
                        }

                        if (baseName) {
                            const data = window.ENCHANTS_DATA || (typeof ENCHANTS !== 'undefined' ? ENCHANTS : []);
                            const baseItem = data.find(en => en.name === baseName || en.fullName === baseName);
                            if (baseItem) Cart.toggleEnchant(baseItem);
                        }
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
                console.error('複製失敗:', err);
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
    const data = window.ENCHANTS_DATA || (typeof ENCHANTS !== 'undefined' ? ENCHANTS : []);
    if (!Array.isArray(data) || data.length === 0) return [];
    
    let list = data.filter(e => e.id < 200);

    if (currentCategory === '收藏') {
        const favs = (typeof StorageManager !== 'undefined') ? StorageManager.loadFavorites() : [];
        list = list.filter(e => favs.includes(e.id));
    } else if (currentCategory === '最近') {
        const recents = (typeof StorageManager !== 'undefined') ? StorageManager.loadRecent() : [];
        list = recents.map(id => data.find(e => e.id === id)).filter(e => e && e.id < 200);
    } else if (currentCategory !== '全部') {
        list = list.filter(e => e.rarity === currentCategory);
    }
    
    return list.filter(enchant => {
        const slots = enchant.slots || [];
        const matchSlot = Array.isArray(slots) && slots.includes(targetSlot);
        
        const nameVal = (enchant.name || "").toLowerCase();
        const fullVal = (enchant.fullName || "").toLowerCase();
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
    const trimContainer = document.getElementById('trim-preview-container'); // 新增

    const mainPanel = document.getElementById('main-action-panel');
    if (mainPanel && mainPanel.innerHTML.includes('無法讀取')) return;

    const activeBtn = document.querySelector('.eq-btn.active');
    const currentViewSlot = activeBtn ? activeBtn.dataset.slot : null;
    const activeItem = (typeof Cart !== 'undefined') ? Cart.getActiveItem() : null;

    if (stateEmpty) stateEmpty.style.display = 'none';
    if (stateMaterial) stateMaterial.style.display = 'none';
    if (stateEnchant) stateEnchant.style.display = 'none';
    if (trimContainer) trimContainer.style.display = 'none';

    if (!currentViewSlot) {
        if (stateEmpty) stateEmpty.style.display = 'flex';
        return;
    }

    const slotName = (typeof Cart !== 'undefined' && Cart.slotNames[currentViewSlot]) ? Cart.slotNames[currentViewSlot] : currentViewSlot;

    if (!activeItem || activeItem.slot !== currentViewSlot) {
        if (stateMaterial) {
            stateMaterial.style.display = 'flex';
            const titleEl = document.getElementById('material-title');
            if (titleEl) titleEl.innerText = `選擇 ${slotName} 材質`;
            materialBtnGroup.innerHTML = '';
            
            const createBtn = (text, baseName) => {
                const btn = document.createElement('button');
                btn.style.cssText = 'background: var(--primary-color, #6366f1); color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 1.2rem; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: transform 0.2s; min-width: 160px;';
                btn.innerHTML = text;
                btn.onmouseover = () => btn.style.transform = 'translateY(-3px)';
                btn.onmouseout = () => btn.style.transform = 'translateY(0)';
                btn.onclick = () => {
                    Cart.addEquipment(currentViewSlot);
                    if (baseName) {
                        const data = window.ENCHANTS_DATA || (typeof ENCHANTS !== 'undefined' ? ENCHANTS : []);
                        const baseItem = data.find(e => e.name === baseName || e.fullName === baseName);
                        if (baseItem) Cart.toggleEnchant(baseItem);
                    }
                    renderEnchantments(); 
                    if (typeof showToast === 'function') showToast(`已建立 ${text}！`);
                };
                return btn;
            };

            if (['helmet', 'chestplate', 'leggings', 'boots'].includes(currentViewSlot)) {
                materialBtnGroup.appendChild(createBtn(`鑽石${slotName}`, `鑽石${slotName}`));
                materialBtnGroup.appendChild(createBtn(`獄髓${slotName}`, `獄髓${slotName}`));
            } else {
                let baseName = null;
                if (['sword', 'axe', 'pickaxe', 'shovel', 'hoe', 'mace', 'spear'].includes(currentViewSlot)) {
                    baseName = `獄髓${slotName}`;
                } else if (['trident', 'elytra', 'bow', 'crossbow', 'fishing'].includes(currentViewSlot)) {
                    baseName = `${slotName}`;
                }
                materialBtnGroup.appendChild(createBtn(`建立 ${slotName}`, baseName));
            }
        }
        return; 
    }

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
            anotherBtn.style.cssText = 'background: transparent; color: var(--tab-active, #6366f1); border: 2px solid var(--tab-active, #6366f1); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: background 0.2s;';
            titleEl.parentNode.appendChild(anotherBtn);
        }
        anotherBtn.innerHTML = `➕ 建立另一件`;
        anotherBtn.onmouseover = () => { anotherBtn.style.background = 'var(--tab-active, #6366f1)'; anotherBtn.style.color = 'white'; };
        anotherBtn.onmouseout = () => { anotherBtn.style.background = 'transparent'; anotherBtn.style.color = 'var(--tab-active, #6366f1)'; };
        anotherBtn.onclick = () => {
            Cart.activeItemId = null; 
            renderEnchantments();
        };
    }

    // --- 新增：模板預覽區顯示邏輯 (限護甲類顯示) ---
    if (['helmet', 'chestplate', 'leggings', 'boots'].includes(activeItem.slot)) {
        if (trimContainer) trimContainer.style.display = 'flex';
        
        const trimVisual = document.getElementById('trim-visual-icon');
        const trimDesc = document.getElementById('trim-text-desc');
        
        if (activeItem.trim) {
            trimDesc.innerText = `${activeItem.trim.pattern} | ${activeItem.trim.material.name}`;
            trimVisual.style.boxShadow = `0 0 15px ${activeItem.trim.material.color}, inset 0 0 10px ${activeItem.trim.material.color}`;
            trimVisual.style.borderColor = activeItem.trim.material.color;
            trimVisual.style.color = activeItem.trim.material.color;
        } else {
            trimDesc.innerText = `尚未套用`;
            trimVisual.style.boxShadow = 'none';
            trimVisual.style.borderColor = '#444';
            trimVisual.style.color = '#fff';
        }
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
        div.style.position = 'relative';
        div.style.overflow = 'hidden';

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
            <div class="price ${enchant.price >= 5000 ? 'expensive' : 'normal'}">$${enchant.price}</div>
            
            <div class="hover-overlay" style="
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(30, 30, 36, 0.95);
                padding: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center;
                opacity: 0; transition: opacity 0.25s ease; pointer-events: none; z-index: 5;
            ">
                <strong style="color: var(--tab-active, #6366f1); font-size: 0.95rem; margin-bottom: 6px;">效果說明</strong>
                <span style="font-size: 0.85rem; color: #ccc; line-height: 1.5; text-align: center; word-break: break-all;">${hoverDescText}</span>
            </div>
        `;

        div.onmouseenter = () => {
            const overlay = div.querySelector('.hover-overlay');
            if (overlay) overlay.style.opacity = '1';
        };
        div.onmouseleave = () => {
            const overlay = div.querySelector('.hover-overlay');
            if (overlay) overlay.style.opacity = '0';
        };

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
        if(Cart.items) StorageManager.saveCart(Cart.items);
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

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- 新增：模板彈窗控制邏輯 ---
function initTrimModal() {
    const btnOpen = document.getElementById('btn-open-trim');
    const modal = document.getElementById('trim-modal');
    const btnApply = document.getElementById('btn-apply-trim');
    const btnRemove = document.getElementById('btn-remove-trim');

    if (!btnOpen || !modal) return;

    btnOpen.onclick = () => {
        const activeItem = Cart.getActiveItem();
        if (!activeItem) return;
        
        // 載入該裝備目前的模板設定
        if (activeItem.trim) {
            tempTrimPattern = activeItem.trim.pattern;
            tempTrimMaterial = activeItem.trim.material;
            btnRemove.style.display = 'block';
        } else {
            tempTrimPattern = TRIM_PATTERNS[0];
            tempTrimMaterial = TRIM_MATERIALS[8]; // 預設紫水晶，因為發紫光最炫酷！
            btnRemove.style.display = 'none';
        }
        
        renderTrimModalOptions();
        modal.style.display = 'flex';
    };

    btnApply.onclick = () => {
        const activeItem = Cart.getActiveItem();
        if (activeItem && tempTrimPattern && tempTrimMaterial) {
            // 把模板寫入目前的裝備物件中
            activeItem.trim = { pattern: tempTrimPattern, material: tempTrimMaterial };
            if (typeof StorageManager !== 'undefined') StorageManager.saveCart(Cart.items);
            renderEnchantments();
            if (typeof Cart !== 'undefined') Cart.render();
            if(typeof showToast === 'function') showToast('裝備模板套用成功！');
        }
        modal.style.display = 'none';
    };

    btnRemove.onclick = () => {
        const activeItem = Cart.getActiveItem();
        if (activeItem) {
            delete activeItem.trim; // 移除模板屬性
            if (typeof StorageManager !== 'undefined') StorageManager.saveCart(Cart.items);
            renderEnchantments();
            if (typeof Cart !== 'undefined') Cart.render();
            if(typeof showToast === 'function') showToast('已移除裝備模板！');
        }
        modal.style.display = 'none';
    };
}

function renderTrimModalOptions() {
    const patternList = document.getElementById('trim-pattern-list');
    const materialList = document.getElementById('trim-material-list');
    
    patternList.innerHTML = '';
    materialList.innerHTML = '';

    // 生成圖案按鈕
    TRIM_PATTERNS.forEach(pat => {
        const btn = document.createElement('button');
        const isActive = (tempTrimPattern === pat);
        btn.innerText = pat.split(' ')[0]; // 只顯示中文部分讓畫面乾淨
        btn.style.cssText = `padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid ${isActive ? 'var(--primary-color, #6366f1)' : '#333'}; background: ${isActive ? 'rgba(99,102,241,0.2)' : '#27272a'}; color: ${isActive ? '#fff' : '#a1a1aa'}; font-size: 0.85rem; font-weight: ${isActive ? 'bold' : 'normal'}; transition: 0.2s;`;
        btn.onclick = () => { tempTrimPattern = pat; renderTrimModalOptions(); };
        patternList.appendChild(btn);
    });

    // 生成材質按鈕
    TRIM_MATERIALS.forEach(mat => {
        const btn = document.createElement('button');
        const isActive = (tempTrimMaterial && tempTrimMaterial.name === mat.name);
        btn.innerText = mat.name.split(' ')[0]; // 只顯示中文部分
        btn.style.cssText = `padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid ${isActive ? mat.color : '#333'}; background: ${isActive ? 'rgba(255,255,255,0.1)' : '#27272a'}; color: ${isActive ? '#fff' : '#a1a1aa'}; font-size: 0.85rem; font-weight: ${isActive ? 'bold' : 'normal'}; transition: 0.2s;`;
        if(isActive) btn.style.boxShadow = `0 0 8px ${mat.color}80`; // 專屬發光外框
        btn.onclick = () => { tempTrimMaterial = mat; renderTrimModalOptions(); };
        materialList.appendChild(btn);
    });

    updateTrimModalPreview();
}

function updateTrimModalPreview() {
    const icon = document.getElementById('modal-trim-preview-icon');
    const nameEl = document.getElementById('modal-trim-preview-name');
    
    if (tempTrimPattern && tempTrimMaterial) {
        nameEl.innerText = `${tempTrimPattern.split(' ')[0]} | ${tempTrimMaterial.name.split(' ')[0]}`;
        // 核心預覽效果：套用專屬材質顏色與霓虹發光
        icon.style.boxShadow = `0 0 20px ${tempTrimMaterial.color}, inset 0 0 10px ${tempTrimMaterial.color}`;
        icon.style.borderColor = tempTrimMaterial.color;
        icon.style.color = tempTrimMaterial.color;
    }
}
