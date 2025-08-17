const fs = require('fs');
const path = require('path');

// 配置設定
const config = {
    // 要掃描的根目錄
    rootDir: path.join(__dirname, 'images/game'),
    
    // 允許的圖片擴展名
    imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    
    // 輸出的 JSON 文件路徑
    outputFile: path.join(__dirname, 'js/image-list.json'),
    
    // 是否要包含子目錄
    includeSubdirectories: true,
    
    // 基礎路徑 (從路徑中移除的部分)
    basePathToRemove: path.join(__dirname, 'public')
};

// 主函數
async function generateImageList() {
    try {
        console.log('開始生成圖片列表...');
        
        // 檢查根目錄是否存在
        if (!fs.existsSync(config.rootDir)) {
            throw new Error(`目錄不存在: ${config.rootDir}`);
        }

        // 收集所有圖片文件
        const imageList = {};
        await scanDirectory(config.rootDir, imageList);
        
        // 轉換路徑格式
        const formattedList = formatPaths(imageList);
        
        // 寫入 JSON 文件
        fs.writeFileSync(
            config.outputFile, 
            JSON.stringify(formattedList, null, 2),
            'utf8'
        );
        
        console.log(`圖片列表已成功生成到: ${config.outputFile}`);
        console.log(`共找到 ${Object.keys(formattedList).length} 個目錄的圖片`);
    } catch (error) {
        console.error('生成圖片列表時出錯:', error);
    }
}

// 掃描目錄並收集圖片
async function scanDirectory(currentDir, result) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && config.includeSubdirectories) {
            // 遞歸掃描子目錄
            await scanDirectory(fullPath, result);
        } else if (stat.isFile()) {
            // 檢查是否為圖片文件
            const ext = path.extname(item).toLowerCase();
            if (config.imageExtensions.includes(ext)) {
                // 獲取相對路徑作為分類鍵
                const relativeDir = path.relative(config.rootDir, currentDir);
                const categoryKey = relativeDir ? relativeDir.replace(/\\/g, '/') : '.';
                
                // 初始化分類數組
                if (!result[categoryKey]) {
                    result[categoryKey] = [];
                }
                
                // 添加文件路徑
                result[categoryKey].push(fullPath);
            }
        }
    }
}

// 格式化路徑
function formatPaths(rawList) {
    const formatted = {};
    
    // 假設你的所有圖片都位於 public/images/game 目錄下
    const publicRoot = path.join(__dirname, '-'); 

    for (const [category, files] of Object.entries(rawList)) {
        formatted[category] = files.map(filePath => {
            // 從 'public' 目錄開始計算相對路徑
            const relativeToPublic = path.relative(publicRoot, filePath);
            // 確保路徑以正斜杠 '/' 開頭，這是網頁路徑的標準格式
            return '/' + relativeToPublic.replace(/\\/g, '/');
        });
    }
    
    return formatted;
}

// 執行生成
generateImageList();