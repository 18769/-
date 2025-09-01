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
    
    // GitHub Pages 倉庫名稱 (如果你的倉庫名稱不是根域名)
    // 例如：如果你的 GitHub Pages 網址是 https://username.github.io/repository-name
    // 那麼請設定 repositoryName: 'repository-name'
    // 如果是根域名 (https://username.github.io)，請保持為 null
    repositoryName: null, // 請根據你的實際情況修改
};

// 主函數
async function generateImageList() {
    try {
        console.log('開始生成圖片列表...');``
        
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
        
        // 顯示生成的結果預覽
        console.log('\n生成的圖片列表預覽:');
        Object.keys(formattedList).forEach(category => {
            console.log(`${category}: ${formattedList[category].length} 張圖片`);
            formattedList[category].slice(0, 3).forEach(img => {
                console.log(`  - ${img}`);
            });
            if (formattedList[category].length > 3) {
                console.log(`  ... 還有 ${formattedList[category].length - 3} 張圖片`);
            }
        });
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

// 格式化路徑 - 針對 GitHub Pages 優化
function formatPaths(rawList) {
    const formatted = {};
    
    for (const [category, files] of Object.entries(rawList)) {
        formatted[category] = files.map(filePath => {
            // 獲取相對於項目根目錄的路徑
            let relativePath = path.relative(__dirname, filePath);
            
            // 轉換為正斜杠（重要：GitHub Pages 需要正斜杠）
            relativePath = relativePath.replace(/\\/g, '/');
            
            // 構建最終路徑
            let finalPath;
            
            if (config.repositoryName) {
                // 有倉庫名稱的情況（非根域名）
                finalPath = `/${config.repositoryName}/${relativePath}`;
            } else {
                // 根域名情況
                finalPath = `/${relativePath}`;
            }
            
            return finalPath;
        });
        
        // 按文件名排序，確保一致性
        formatted[category].sort();
    }
    
    return formatted;
}

// 創建預設圖片（如果不存在）
function createDefaultImages() {
    const defaultImageDir = path.join(__dirname, 'images');
    const defaultImagePath = path.join(defaultImageDir, 'default.jpg');
    
    // 確保 images 目錄存在
    if (!fs.existsSync(defaultImageDir)) {
        fs.mkdirSync(defaultImageDir, { recursive: true });
        console.log('已創建 images 目錄');
    }
    
    // 如果沒有預設圖片，創建一個簡單的提示文件
    if (!fs.existsSync(defaultImagePath)) {
        const placeholderText = `
預設圖片位置：${defaultImagePath}
請將您的預設圖片放在這裡，命名為 default.jpg

建議圖片規格：
- 格式：JPG, PNG, WebP
- 尺寸：800x600 或 1024x768
- 大小：<500KB
        `;
        
        fs.writeFileSync(
            path.join(defaultImageDir, 'README.txt'),
            placeholderText,
            'utf8'
        );
        console.log('已創建預設圖片說明文件');
    }
}

// 驗證生成的 JSON 文件
function validateGeneratedJSON() {
    try {
        if (fs.existsSync(config.outputFile)) {
            const content = fs.readFileSync(config.outputFile, 'utf8');
            const parsed = JSON.parse(content);
            console.log('\n✅ JSON 文件驗證通過');
            return true;
        }
    } catch (error) {
        console.error('❌ JSON 文件驗證失敗:', error.message);
        return false;
    }
}

// 顯示使用說明
function showUsageInstructions() {
    console.log('\n📋 使用說明:');
    console.log('1. 確保您的圖片已放置在 images/game/ 目錄下的對應子目錄中');
    console.log('2. 支援的圖片格式: .jpg, .jpeg, .png, .gif, .webp');
    console.log('3. 目錄結構應該如下：');
    console.log('   images/game/猜人物/照片猜人物/');
    console.log('   images/game/猜人物/擷取照片猜人物/');
    console.log('   images/game/猜品牌/猜品牌/');
    console.log('   等等...');
    
    if (config.repositoryName) {
        console.log(`\n🌐 GitHub Pages 設定:`);
        console.log(`   倉庫名稱: ${config.repositoryName}`);
        console.log(`   網址格式: https://username.github.io/${config.repositoryName}`);
    } else {
        console.log(`\n🌐 GitHub Pages 設定:`);
        console.log(`   根域名模式: https://username.github.io`);
    }
    
    console.log('\n4. 運行此腳本後，將生成的 js/image-list.json 文件一起提交到 GitHub');
    console.log('5. 確保 GitHub Pages 已啟用並指向正確的分支');
}

// 執行生成
async function main() {
    showUsageInstructions();
    
    // 創建預設圖片目錄
    createDefaultImages();
    
    // 生成圖片列表
    await generateImageList();
    
    // 驗證生成的 JSON
    validateGeneratedJSON();
    
    console.log('\n🎉 圖片列表生成完成！');
    console.log('請將生成的文件提交到 GitHub 倉庫。');
}

// 檢查命令行參數
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('圖片列表生成器');
    console.log('');
    console.log('使用方法: node generate-image-list.js [選項]');
    console.log('');
    console.log('選項:');
    console.log('  --help, -h     顯示此幫助信息');
    console.log('  --repo <name>  設定 GitHub 倉庫名稱');
    console.log('');
    console.log('範例:');
    console.log('  node generate-image-list.js');
    console.log('  node generate-image-list.js --repo my-game-repo');
    process.exit(0);
}

// 檢查是否有設定倉庫名稱的參數
const repoIndex = process.argv.indexOf('--repo');
if (repoIndex !== -1 && process.argv[repoIndex + 1]) {
    config.repositoryName = process.argv[repoIndex + 1];
    console.log(`使用倉庫名稱: ${config.repositoryName}`);
}

// 執行主函數
main().catch(console.error);