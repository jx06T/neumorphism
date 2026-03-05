// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Config ---
    const COURSE_CONFIG = [
        { name: 'ML', className: 'c-ml' },
        { name: 'FREE', className: 'c-free' },
        { name: 'ALGO', className: 'c-algo' },
        { name: 'FP', className: 'c-pat' },
        { name: 'WEB', className: 'c-web' },
    ];
    // 新的預設課表
    const DEFAULT_SCHEDULE = { 1: 'ML', 2: 'FREE', 3: 'ALGO', 4: 'FP', 5: 'WEB' };
    const HOLIDAY_KEYWORDS = ['假', '節', '日', "畢旅", "式", "線上"];
    const PREFIX_CHARS = ['_', '-', '^']; // 渲染時會忽略這些前綴

    // 每個格子的內部文字寬度 (不含邊框)，一定要偶數比較好算
    const CELL_WIDTH = 10;

    // 表格邊線樣式定義
    const BORDER_STYLES = {
        ascii: {
            top: { l: '+', c: '+', r: '+', h: '-' },
            mid: { l: '+', c: '+', r: '+', h: '-' },
            bot: { l: '+', c: '+', r: '+', h: '-' },
            v: '|'
        },
        markdown: {
            top: { l: '|', c: '|', r: '|', h: ' ' },
            mid: { l: '|', c: '|', r: '|', h: '-' },
            bot: { l: '|', c: '|', r: '|', h: ' ' }, // MD不顯示底線
            v: '|'
        },
        unicode_single: {
            top: { l: '┌', c: '┬', r: '┐', h: '─' },
            mid: { l: '├', c: '┼', r: '┤', h: '─' },
            bot: { l: '└', c: '┴', r: '┘', h: '─' },
            v: '│'
        },
        unicode_double: {
            top: { l: '╔', c: '╦', r: '╗', h: '═' },
            mid: { l: '╠', c: '╬', r: '╣', h: '═' },
            bot: { l: '╚', c: '╩', r: '╝', h: '═' },
            v: '║'
        }
    };

    // --- DOM Elements ---
    const csvInput = document.getElementById('csv-input');
    const exportBtn = document.getElementById('export-btn');
    const asciiCanvas = document.getElementById('ascii-calendar');
    const renderArea = document.getElementById('render-area');
    const yearDisplay = document.getElementById('current-year-display');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');
    const monthSelector = document.getElementById('month-selector');
    const styleSelector = document.getElementById('style-selector');

    // --- State ---
    let today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth() + 1;
    let currentStyle = 'ascii';

    function init() {
        csvInput.value = localStorage.getItem('asciiCsvData') || '';
        currentStyle = localStorage.getItem('asciiTableStyle') || 'ascii';
        styleSelector.value = currentStyle;

        createMonthButtons();
        addEventListeners();
        updateView();
    }

    function createMonthButtons() {
        for (let i = 1; i <= 12; i++) {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = `${i}月`;
            btn.dataset.month = i;
            monthSelector.appendChild(btn);
        }
    }

    function addEventListeners() {
        csvInput.addEventListener('input', () => {
            localStorage.setItem('asciiCsvData', csvInput.value);
            updateView();
        });
        prevYearBtn.addEventListener('click', () => { currentYear--; updateView(); });
        nextYearBtn.addEventListener('click', () => { currentYear++; updateView(); });
        monthSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') { currentMonth = parseInt(e.target.dataset.month); updateView(); }
        });
        styleSelector.addEventListener('change', (e) => {
            currentStyle = e.target.value;
            localStorage.setItem('asciiTableStyle', currentStyle);
            updateView();
        });
        exportBtn.addEventListener('click', exportAsImage);
    }

    function updateView() {
        yearDisplay.textContent = currentYear;
        const buttons = monthSelector.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.month) === currentMonth));

        renderAsciiCalendar(currentYear, currentMonth);
    }

    // --- ASCII 字串排版工具 ---

    // 計算字串視覺寬度 (中文字/全形算 2，英文/半形算 1)
    function getVisualWidth(str) {
        let width = 0;
        for (let i = 0; i < str.length; i++) {
            // 如果 charCode 大於 255 (大部分為中文及全形符號) 則寬度為 2
            width += str.charCodeAt(i) > 255 ? 2 : 1;
        }
        return width;
    }

    // 將字串填充或截斷至指定寬度
    function padString(str, targetWidth) {
        if (!str) return ' '.repeat(targetWidth);

        let currentWidth = getVisualWidth(str);
        if (currentWidth > targetWidth) {
            // 如果超過寬度，進行暴力截斷
            let res = '';
            let w = 0;
            for (let char of str) {
                let cw = char.charCodeAt(0) > 255 ? 2 : 1;
                if (w + cw > targetWidth) break;
                res += char;
                w += cw;
            }
            str = res;
            currentWidth = getVisualWidth(str);
        }

        const spacesNeeded = targetWidth - currentWidth;
        // 左靠齊，右補空白
        return str + ' '.repeat(spacesNeeded);
    }

    // 繪製分隔線
    function buildSeparator(parts) {
        let line = `<span class="c-border">${parts.l}`;
        for (let i = 0; i < 7; i++) {
            line += parts.h.repeat(CELL_WIDTH + 2); // +2 是因為文字左右各有1格空白 padding
            line += (i === 6) ? parts.r : parts.c;
        }
        return line + '</span>\n';
    }

    // --- 核心渲染邏輯 ---
    function renderAsciiCalendar(year, month) {
        const data = parseCSV(csvInput.value);
        const style = BORDER_STYLES[currentStyle];
        const v = `<span class="c-border">${style.v}</span>`; // 垂直線

        let htmlOutput = '';

        // 1. 繪製標題 (置中)
        const titleStr = `[ ${year} - ${String(month).padStart(2, '0')} ]`;
        const totalTableWidth = 7 * (CELL_WIDTH + 3) + 1;
        const titlePadding = Math.floor((totalTableWidth - titleStr.length) / 2);
        htmlOutput += `<span style="
    font-size: 1.2rem;
    text-align: center;
    display: block;
">${titleStr}</span><div style="height: 0.2rem;"></div>`;

        // 2. 頂部邊線
        htmlOutput += buildSeparator(style.top);

        // 3. 星期標題列
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let headerRow = v;
        for (let day of daysOfWeek) {
            // 將星期置中
            const padLeft = Math.floor((CELL_WIDTH - day.length) / 2);
            const padRight = CELL_WIDTH - day.length - padLeft;
            headerRow += ` ${' '.repeat(padLeft)}${day}${' '.repeat(padRight)} ${v}`;
        }
        htmlOutput += headerRow + '\n';

        // 4. 表頭底線
        if (currentStyle === 'markdown') {
            // Markdown 特殊表頭底線 |---|---|
            let mdLine = `<span class="c-border">|</span>`;
            for (let i = 0; i < 7; i++) {
                mdLine += `<span class="c-border">-${'-'.repeat(CELL_WIDTH)}-|</span>`;
            }
            htmlOutput += mdLine + '\n';
        } else {
            htmlOutput += buildSeparator(style.mid);
        }

        // 5. 計算日期邏輯
        const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        let currentDay = 1;
        // 固定顯示 6 週以保持表格高度一致
        for (let week = 0; week < 6; week++) {
            let rowDayStr = v;
            let rowEventStr = v;
            let rowBlenkStr = v;

            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                rowBlenkStr += ` ${padString('', CELL_WIDTH)} ${v}`;
                if ((week === 0 && dayOfWeek < firstDayOfMonth) || currentDay > daysInMonth) {
                    // 空白日期 (非本月)
                    rowDayStr += ` ${padString('', CELL_WIDTH)} ${v}`;
                    rowEventStr += ` ${padString('', CELL_WIDTH)} ${v}`;
                } else {
                    // 正常日期
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                    const subjectFromCsv = data.get(dateStr);
                    const subjectFromDefault = DEFAULT_SCHEDULE[dayOfWeek];

                    let displaySubject = subjectFromCsv !== undefined ? subjectFromCsv : subjectFromDefault;
                    displaySubject = displaySubject || '';

                    // 處理前綴 (純邏輯過濾，畫面上不顯示)
                    const firstChar = displaySubject.charAt(0);
                    if (PREFIX_CHARS.includes(firstChar)) {
                        displaySubject = displaySubject.substring(1).trim();
                    }

                    // 判定顏色
                    let colorClass = 'c-other';
                    if (HOLIDAY_KEYWORDS.some(k => displaySubject.includes(k))) {
                        colorClass = 'c-holiday';
                    } else {
                        const course = COURSE_CONFIG.find(c => displaySubject.includes(c.name));
                        if (course) colorClass = course.className;
                        else if (subjectFromCsv === undefined && !displaySubject) colorClass = 'c-muted';
                    }

                    // 填入字串並加上 HTML Span 上色
                    rowDayStr += ` ${padString(String(currentDay), CELL_WIDTH)} ${v}`;
                    rowEventStr += ` <span class="${colorClass}">${padString(displaySubject, CELL_WIDTH)}</span> ${v}`;

                    currentDay++;
                }
            }

            // 寫入一週的兩行資料
            // htmlOutput += rowDayStr + '\n' + rowEventStr + '\n' + rowBlenkStr + '\n';
            htmlOutput += rowDayStr + '\n' + rowEventStr + '\n';

            // 週與週的分隔線 / 底線
            if (week < 5) {
                if (currentStyle !== 'markdown') htmlOutput += buildSeparator(style.mid);
            } else {
                if (currentStyle !== 'markdown') htmlOutput += buildSeparator(style.bot);
            }
        }
        // ==========================================
        // ===== [新增] 繪製科技風格頁尾 (Tech Footer) =====
        // ==========================================

        // 取得當天日期 (YYYY-MM-DD) 作為更新時間
        const updateDate = new Date().toISOString().split('T')[0];

        // 定義頁尾內容 (使用終端機風格裝飾)
        const footerTitle = "TITLE = \"建北電資 30th x 31st 小社課課表\"";
        const footerInfo = "LOC   = \"建中電教一\"\nTIME  = \"17:30~19:00\"";
        const footerUpdate = `// UPDATED:${updateDate}`;

        // 計算「更新日期」需要補多少個空白才能完美靠右對齊表格
        const rightPadSpaces = totalTableWidth - getVisualWidth(footerUpdate);

        // 組合字串並加上顏色
        htmlOutput += '<div style="height: 0.5rem;"></div>'; // 預留一行空白與表格隔開

        // 第一行：社團名稱 (稍微縮排 2 格，使用 ML 的藍色高亮)
        htmlOutput += `<span class="c-muted">${footerTitle}</span>\n`;

        // 第二行：地點與時間 (縮排 2 格，使用次要的灰色)
        htmlOutput += `<span class="c-muted">${footerInfo}</span>\n`;

        // 第三行：更新日期 (靠右對齊表格，使用邊框的暗色)
        if (rightPadSpaces > 0) {
            htmlOutput += ' '.repeat(rightPadSpaces) + `<span class="c-muted">${footerUpdate}</span>\n`;
        } else {
            // 防呆機制：如果表格太窄，就直接換行印出
            htmlOutput += `\n<span class="c-border">${footerUpdate}</span>\n`;
        }
        // ==========================================

        // 最後將組合好的字串渲染到畫面上
        asciiCanvas.innerHTML = htmlOutput;
    }

    function parseCSV(csvText) {
        const dataMap = new Map();
        if (!csvText) return dataMap;
        csvText.trim().split('\n').forEach(row => {
            const [date, ...parts] = row.split(',');
            if (date && parts.length > 0) dataMap.set(date.trim(), parts.join(',').trim());
        });
        return dataMap;
    }

    function exportAsImage() {
        exportBtn.textContent = '產生中...';
        exportBtn.disabled = true;

        const scaleFactor = 3; // 為了終端機清晰度，稍微放大
        const options = {
            bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--bg-color'),
            quality: 1.0,
            width: renderArea.scrollWidth * scaleFactor,
            height: renderArea.scrollHeight * scaleFactor,
            style: {
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top left'
            }
        };

        domtoimage.toPng(renderArea, options).then(dataUrl => {
            const link = document.createElement('a');
            link.download = `AsciiCal_${currentYear}-${String(currentMonth).padStart(2, '0')}.png`;
            link.href = dataUrl;
            link.click();
        }).catch(error => {
            console.error('匯出失敗:', error);
            alert('匯出失敗，請檢查主控台。');
        }).finally(() => {
            exportBtn.textContent = '匯出為圖片 (Export)';
            exportBtn.disabled = false;
        });
    }

    // --- Start ---
    init();
});