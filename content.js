let lastKeyTime = 0;
let lastSelectedText = "";
let menuElement = null;
let lastActionId = null;
let mousePos = { x: 0, y: 0 };

// 記錄滑鼠位置
document.addEventListener('mousedown', (e) => {
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
});

// --- 核心轉換邏輯 ---
const actions = [
    { id: 'extract', label: '僅抓取 [XXX]', key: '5', type: 'transform', fn: (t) => {
        const match = t.match(/\[[A-Za-z0-9-]+\]/); // 抓取中括號包含內容的正規表達式
        return match ? match[0] : t;
    }},
    { id: 'quote', label: '加上引號 ""', key: '1', type: 'copy', fn: (t) => `"${t}"` },
    { id: 'clean-md', label: '清洗 Markdown (##**)', key: '2', type: 'copy', fn: (t) => t.replace(/[#*~_]/g, '') },
    { id: 'clean-id', label: '提取核心 ID', key: '3', type: 'copy', fn: (t) => t.replace(/[#*~_\[\]]/g, '') },
    { id: 'code-block', label: '封裝為 TXT 代碼塊', key: '4', type: 'copy', fn: (t) => `\`\`\`TXT\n${t}\n\`\`\`` }
];

// 監聽按鍵事件 (Ctrl + C + C)
document.addEventListener('keydown', (e) => {
    // 偵測 Ctrl + C + C
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        const currentTime = new Date().getTime();
        // 如果兩次 Ctrl+C 間隔小於 500ms
        if (currentTime - lastKeyTime < 500) {
            const selection = window.getSelection().toString().trim();
            if (selection) {
                lastSelectedText = selection;
                showMenu();
            }
        }
        lastKeyTime = currentTime;
    }
    
    // 選單開啟時的快速鍵
    if (menuElement) {
        if (e.key === 'Escape') closeMenu();
        
        // 數字鍵快捷選取
        const action = actions.find(a => a.key === e.key);
        if (action) {
            executeAction(action);
            e.preventDefault();
        }
        
        // 空白鍵重複上次操作
        if (e.key === ' ' && lastActionId) {
            const lastAction = actions.find(a => a.id === lastActionId);
            if (lastAction) executeAction(lastAction);
            e.preventDefault();
        }
    }
});

function showMenu() {
    if (menuElement) menuElement.remove();
    
    menuElement = document.createElement('div');
    menuElement.className = 'cb-helper-menu';
    
    // 預覽區：現在點擊預覽區也可以直接複製原始內容
    const preview = document.createElement('div');
    preview.className = 'cb-helper-preview';
    preview.innerText = lastSelectedText;
    preview.title = "點擊直接複製原始選取內容";
    preview.onclick = () => executeAction({id: 'raw', fn: (t)=>t, type:'copy'});
    menuElement.appendChild(preview);

    // 建立功能按鈕
    actions.forEach(action => {
        const item = document.createElement('div');
        item.className = 'cb-helper-item';
        if (action.id === lastActionId) item.classList.add('cb-helper-last-action');
        
        let lastTag = (action.id === lastActionId) ? '<span class="cb-helper-last-tag">上次使用</span>' : '';
        // 如果是 transform 類型，換個顏色或加個圖示提醒
        let prefix = action.type === 'transform' ? '✨' : ''; 
        
        item.innerHTML = `<span class="cb-helper-key">${action.key}</span> <span>${prefix}${action.label}</span> ${lastTag}`;
        
        item.onclick = (e) => {
            e.stopPropagation();
            executeAction(action);
        };
        menuElement.appendChild(item);
    });

    document.body.appendChild(menuElement);
    
    // 智慧定位：出現在滑鼠點擊位置，並檢查是否超出視窗邊界
    let left = mousePos.x + 10;
    let top = mousePos.y + 10;
    // 防止超出右側邊界
    if (left + 260 > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - 280;
    // 防止底部超出
    if (top + 300 > window.innerHeight + window.scrollY) top = window.innerHeight + window.scrollY - 320;
    menuElement.style.left = `${left}px`;
    menuElement.style.top = `${top}px`;
}


function executeAction(action) {
    const result = action.fn(lastSelectedText);
    
    if (action.type === 'transform') {
        // --- 連鎖機制 ---
        lastSelectedText = result; // 更新目前的處理對象
        showMenu(); // 重新渲染選單，讓使用者繼續選下一個動作
    } else {
        // --- 最終複製機制 ---
        copyToClipboard(result);
        lastActionId = action.id;
        closeMenu();
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        console.log("複製成功:", text);
    } catch (err) {
        // 備用方案
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

function closeMenu() {
    if (menuElement) {
        menuElement.remove();
        menuElement = null;
    }
}

// 點擊空白處關閉
document.addEventListener('mousedown', (e) => {
    if (menuElement && !menuElement.contains(e.target)) {
        closeMenu();
    }
});