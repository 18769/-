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
    
    // 基礎路徑（從路徑中移除的部分）
    basePathToRemove: path.join(__dirname),
    
    // GitHub Pages 倉庫名稱
    repositoryName: null,
};

// 主函數
async function generateImageList() {
    try {
        console.log('開始生成圖片列表...');
        
        // 檢查根目錄是否存在
        if (!fs.existsSync(config.rootDir)) {
            throw new Error(`目錄不存在: ${config.rootDir}`);
        }

        // 收集所有圖片文件（包含解答）
        const imageList = {};
        await scanDirectoryWithAnswers(config.rootDir, imageList);
        
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
        
        // 顯示統計信息
        showStatistics(formattedList);
        
    } catch (error) {
        console.error('生成圖片列表時出錯:', error);
    }
}

// 掃描目錄並收集圖片（包含解答）
async function scanDirectoryWithAnswers(currentDir, result) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (item === '解答') {
                // 掃描解答資料夾並記錄解答圖片
                await scanAnswerDirectory(fullPath, currentDir, result);
            } else {
                // 掃描其他子目錄
                await scanDirectoryWithAnswers(fullPath, result);
            }
        } else if (stat.isFile()) {
            // 檢查是否為圖片文件
            const ext = path.extname(item).toLowerCase();
            if (config.imageExtensions.includes(ext)) {
                // 獲取相對路徑作為分類鍵
                const relativeDir = path.relative(config.rootDir, currentDir);
                const categoryKey = relativeDir ? relativeDir.replace(/\\/g, '/') : '.';
                
                // 初始化分類數組
                if (!result[categoryKey]) {
                    result[categoryKey] = {
                        questions: [],
                        answers: {}
                    };
                }
                
                // 添加題目文件路徑到 questions 陣列
                result[categoryKey].questions.push(fullPath);
            }
        }
    }
}

// 掃描解答資料夾
async function scanAnswerDirectory(answerDir, parentDir, result) {
    const items = fs.readdirSync(answerDir);
    const relativeDir = path.relative(config.rootDir, parentDir);
    const categoryKey = relativeDir ? relativeDir.replace(/\\/g, '/') : '.';
    
    // 確保該分類存在
    if (!result[categoryKey]) {
        result[categoryKey] = {
            questions: [],
            answers: {}
        };
    }
    
    for (const item of items) {
        const fullPath = path.join(answerDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (config.imageExtensions.includes(ext)) {
                // 獲取檔案名稱（不含副檔名）作為題目識別
                const questionName = path.basename(item, path.extname(item));
                
                // 記錄解答圖片路徑
                result[categoryKey].answers[questionName] = fullPath;
            }
        }
    }
}

// 格式化路徑
function formatPaths(rawList) {
    const formatted = {};
    
    for (const [category, data] of Object.entries(rawList)) {
        formatted[category] = {
            questions: data.questions.map(filePath => formatSinglePath(filePath)),
            answers: {}
        };
        
        // 格式化解答路徑
        for (const [questionName, answerPath] of Object.entries(data.answers)) {
            formatted[category].answers[questionName] = formatSinglePath(answerPath);
        }
    }
    
    return formatted;
}

// 格式化單一路徑
function formatSinglePath(filePath) {
    // 移除基礎路徑並轉換為正斜杠
    let relativePath = path.relative(config.basePathToRemove, filePath);
    relativePath = relativePath.replace(/\\/g, '/');
    
    // 確保路徑以 / 開頭
    if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
    }
    
    // 如果有設定倉庫名稱，添加到路徑開頭
    if (config.repositoryName) {
        return `/${config.repositoryName}${relativePath}`;
    }
    
    return relativePath;
}

// 顯示統計信息
function showStatistics(formattedList) {
    console.log('\n📊 統計信息:');
    let totalQuestions = 0;
    let totalAnswers = 0;
    
    Object.keys(formattedList).forEach(category => {
        const questionsCount = formattedList[category].questions.length;
        const answersCount = Object.keys(formattedList[category].answers).length;
        
        totalQuestions += questionsCount;
        totalAnswers += answersCount;
        
        console.log(`\n${category}:`);
        console.log(`  - 題目: ${questionsCount} 張`);
        console.log(`  - 解答: ${answersCount} 張`);
        
        // 顯示前幾個題目和解答
        if (questionsCount > 0) {
            console.log(`  - 範例题目: ${formattedList[category].questions[0]}`);
        }
        if (answersCount > 0) {
            const firstAnswer = Object.values(formattedList[category].answers)[0];
            console.log(`  - 範例解答: ${firstAnswer}`);
        }
    });
    
    console.log(`\n總計: ${totalQuestions} 張題目圖片, ${totalAnswers} 張解答圖片`);
}

// 驗證資料夾結構
function validateFolderStructure() {
    console.log('\n🔍 驗證資料夾結構...');
    
    if (!fs.existsSync(config.rootDir)) {
        console.log('❌ 根目錄不存在:', config.rootDir);
        return false;
    }
    
    // 檢查是否有解答資料夾
    const hasAnswerFolders = checkAnswerFolders(config.rootDir);
    console.log(hasAnswerFolders ? '✅ 找到解答資料夾' : '⚠️  未找到解答資料夾');
    
    return true;
}

// 檢查是否有解答資料夾
function checkAnswerFolders(dir) {
    const items = fs.readdirSync(dir);
    let hasAnswers = false;
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (item === '解答') {
                console.log(`✅ 找到解答資料夾: ${path.relative(config.rootDir, fullPath)}`);
                hasAnswers = true;
            } else {
                hasAnswers = checkAnswerFolders(fullPath) || hasAnswers;
            }
        }
    }
    
    return hasAnswers;
}

// 創建預設圖片
function createDefaultImages() {
    const defaultImageDir = path.join(__dirname, 'images');
    if (!fs.existsSync(defaultImageDir)) {
        fs.mkdirSync(defaultImageDir, { recursive: true });
    }
}

// 執行生成
async function main() {
    console.log('🖼️  圖片列表生成器（包含解答功能）');
    console.log('================================');
    
    createDefaultImages();
    validateFolderStructure();
    await generateImageList();
    
    console.log('\n🎉 生成完成！');
    console.log('請檢查生成的 js/image-list.json 文件');
}

// 執行
main().catch(console.error);