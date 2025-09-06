// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Config ---
    const COURSE_SUBJECTS = ['網頁', 'Unity', '演算法', 'Python', '資安'];
    const DEFAULT_SCHEDULE = { 1: 'Unity', 2: '資安', 3: '演算法', 4: 'Python', 5: '網頁' };
    const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const HOLIDAY_KEYWORDS = ['假', '節', '日'];
    
    // [新增] 在此處修改預設的 CSV 內容
    const DEFAULT_CSV = `2025-09-01,-
2025-09-02,-
2025-09-03,-
2025-09-04,-
2025-09-05,-
2025-09-08,-
2025-09-09,-
2025-09-10,-
2025-09-11,-
2025-09-12,-
2025-09-15,-
2025-09-16,-
2025-09-17,-
2025-09-18,-
2025-09-19,-
2025-09-22,-
2025-09-23,-
2025-09-24,-
2025-09-25,-
2025-09-29,教師節
2025-10-06,中秋節
2025-10-07,-段考週
2025-10-08,-段考週
2025-10-09,-段考週
2025-10-10,國慶日
2025-10-13,-段考週
2025-10-14,_段考
2025-10-15,_段考
2025-10-16,（Python)
2025-10-17,（網頁）
2025-10-24,光復節
2025-11-17,-段考週
2025-11-18, -段考週
2025-11-19, -段考週
2025-11-20, -段考週
2025-11-21, -段考週
2025-11-24, -段考週
2025-11-25,_段考
2025-11-26,_段考
2025-11-27,（Python）
2025-11-28,（網頁）
2025-12-08,校慶補假
2025-12-25,行憲紀念日
2026-01-01,元旦放假
2026-01-05, -段考週
2026-01-06, -段考週
2026-01-07, -段考週
2026-01-08, -段考週
2026-01-09, -段考週
2026-01-12, -段考週
2026-01-13, -段考週
2026-01-14,_段考
2026-01-15,_段考
2026-01-16,_段考
2026-01-19,-
2026-01-20, -
2026-01-21, -
2026-01-22, -
2026-01-23, -
2026-01-26, -
2026-01-27, -
2026-01-28, -
2026-01-29, -
2026-01-30, -`;

    // --- DOM Elements ---
    const csvInput = document.getElementById('csv-input');
    const exportBtn = document.getElementById('export-btn');
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarWrapper = document.getElementById('calendar-wrapper');
    const themeToggle = document.getElementById('theme-toggle');
    const yearDisplay = document.getElementById('current-year-display');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');
    const monthSelector = document.getElementById('month-selector');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const eventInput = document.getElementById('event-input');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const restoreDefaultBtn = document.getElementById('restore-default-btn');

    // --- State ---
    let today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth() + 1; // 1-12
    let editingDate = null;
    let isMouseDownOnOverlay = false;

    // --- Initialization ---
    function init() {
        loadState();
        createMonthButtons();
        addEventListeners();
        updateView();
        updateFooterDate();
    }

    function loadState() {
        const savedTheme = localStorage.getItem('calendarTheme');
        if (savedTheme === 'dark') { document.body.classList.add('dark-theme'); themeToggle.textContent = '●'; }
        else { document.body.classList.remove('dark-theme'); themeToggle.textContent = '◑'; }
        csvInput.value = localStorage.getItem('calendarCsvData') || '';
    }

    function createMonthButtons() {
        MONTH_NAMES.forEach((name, index) => {
            const month = index + 1;
            const button = document.createElement('button');
            button.className = 'neumo convex soft';
            button.textContent = name;
            button.dataset.month = month;
            monthSelector.appendChild(button);
        });
    }

    function addEventListeners() {
        themeToggle.addEventListener('click', toggleTheme);
        csvInput.addEventListener('input', () => {
            localStorage.setItem('calendarCsvData', csvInput.value);
            generateCalendar(currentYear, currentMonth);
        });
        prevYearBtn.addEventListener('click', () => { currentYear--; updateView(); });
        nextYearBtn.addEventListener('click', () => { currentYear++; updateView(); });
        monthSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') { currentMonth = parseInt(e.target.dataset.month); updateView(); }
        });
        exportBtn.addEventListener('click', exportAsImage);
        restoreDefaultBtn.addEventListener('click', restoreDefaultCsv);
        saveBtn.addEventListener('click', saveEvent);
        cancelBtn.addEventListener('click', hideModal);
        modalOverlay.addEventListener('mousedown', (e) => {
            if (e.target === modalOverlay) isMouseDownOnOverlay = true; else isMouseDownOnOverlay = false;
        });
        modalOverlay.addEventListener('mouseup', (e) => {
            if (isMouseDownOnOverlay && e.target === modalOverlay) hideModal();
            isMouseDownOnOverlay = false;
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });
    }

    // --- UI Update & View Logic ---
    function updateView() {
        yearDisplay.textContent = currentYear;
        updateActiveMonthButton();
        generateCalendar(currentYear, currentMonth);
        const headerDateElement = document.getElementById('current-month');
        headerDateElement.textContent = `${currentYear} 年　 ${currentMonth} 月`;
    }

    function updateActiveMonthButton() {
        const buttons = monthSelector.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.month) === currentMonth));
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        themeToggle.textContent = document.body.classList.contains('dark-theme') ? '●' : '◑';
        localStorage.setItem('calendarTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    }

    // --- Modal Logic ---
    function showModal(dateStr, currentText) {
        editingDate = dateStr;
        modalTitle.textContent = `編輯 ${dateStr} 的事件`;
        eventInput.value = currentText;
        modalOverlay.style.display = 'flex';
        eventInput.focus();
    }

    function hideModal() {
        modalOverlay.style.display = 'none';
        editingDate = null;
    }

    function saveEvent() {
        if (editingDate) updateCsvAndRefresh(editingDate, eventInput.value);
        hideModal();
    }
    
    function restoreDefaultCsv() {
        if (confirm('這會覆蓋目前的自訂事件，確定要還原為預設內容嗎？')) {
            csvInput.value = DEFAULT_CSV;
            csvInput.dispatchEvent(new Event('input'));
        }
    }

    // --- Core Calendar Logic ---
    function generateCalendar(year, month) {
        const data = parseCSV(csvInput.value);
        calendarGrid.innerHTML = '';
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
        for (let i = 0; i < startDayOfWeek; i++) {
            const day = prevMonthLastDay - startDayOfWeek + 1 + i;
            calendarGrid.insertAdjacentHTML('beforeend', `<div class="day-cell other-month"><div class="day-number">${day}</div></div>`);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            const dayOfWeek = new Date(year, month - 1, day).getDay();
            const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const subjectFromCsv = data.get(currentDateStr);
            const subjectFromDefault = DEFAULT_SCHEDULE[dayOfWeek];
            const finalSubject = subjectFromCsv !== undefined ? subjectFromCsv : subjectFromDefault;

            // ==========================================================
            // [核心修改] 重構形狀 (凹凸) 和顏色 (accent) 的判斷邏輯
            // ==========================================================
            let displaySubject = finalSubject || '';
            let shapeClass; // 先不設定預設值，由邏輯決定
            const firstChar = displaySubject.charAt(0);

            // 1. 最高優先級：前綴字元 (_, -, ^)
            if (['_', '-', '^'].includes(firstChar)) {
                displaySubject = displaySubject.substring(1).trim();
                if (firstChar === '_') shapeClass = 'concave';
                else if (firstChar === '-') shapeClass = 'flat';
                else if (firstChar === '^') shapeClass = 'convex';
            } else {
                // 2. 無前綴時，套用預設規則
                const isHoliday = HOLIDAY_KEYWORDS.some(k => displaySubject.includes(k));
                
                if (isHoliday) {
                    // 如果是假日，預設為下凹
                    shapeClass = 'concave';
                } else if ((dayOfWeek === 0 || dayOfWeek === 6) && subjectFromCsv === undefined) {
                    // 如果是無自訂事件的週末，也下凹
                    shapeClass = 'concave';
                } else {
                    // 其他所有情況 (如預設課程)，預設為上凸
                    shapeClass = 'convex';
                }
            }

            // 3. 決定文字顏色
            let dayNumberClass = '';
            let daySubjectClass = '';
            // 檢查的是處理完前綴後的 displaySubject
            if (HOLIDAY_KEYWORDS.some(k => displaySubject.includes(k))) {
                dayNumberClass = 'day-number-accent';
                daySubjectClass = 'day-subject-accent';
            } else if (subjectFromCsv !== undefined && subjectFromDefault && subjectFromCsv !== subjectFromDefault) {
                daySubjectClass = 'day-subject-accent';
            }
            
            // 4. 組合 Class 和 HTML
            cell.className = `neumo day-cell ${shapeClass} soft text-inset`;
            cell.innerHTML = `<div class="day-number ${dayNumberClass}">${day}</div><div class="day-subject ${daySubjectClass}">${displaySubject || '　'}</div>`;

            cell.addEventListener('click', () => showModal(currentDateStr, subjectFromCsv || ''));
            calendarGrid.appendChild(cell);
        }
        
        // 填補下個月日期
        let totalCells = startDayOfWeek + daysInMonth;
        let nextMonthDay = 1;
        while (totalCells % 7 !== 0) {
            calendarGrid.insertAdjacentHTML('beforeend', `<div class="day-cell other-month"><div class="day-number">${nextMonthDay++}</div></div>`);
            totalCells++;
        }
    }

    function updateCsvAndRefresh(date, newSubject) {
        let lines = (csvInput.value.trim().length > 0 ? csvInput.value.trim().split('\n') : []).filter(line => !line.startsWith(date));
        if (newSubject && newSubject.trim().length > 0) lines.push(`${date},${newSubject.trim()}`);
        csvInput.value = lines.sort().join('\n');
        localStorage.setItem('calendarCsvData', csvInput.value);
        updateView();
    }

    function parseCSV(csvText) {
        const dataMap = new Map();
        if (!csvText) return dataMap;
        csvText.trim().split('\n').forEach(row => { const [date, ...parts] = row.split(','); if (date && parts.length > 0) dataMap.set(date.trim(), parts.join(',').trim()); });
        return dataMap;
    }

    function exportAsImage() {
        exportBtn.textContent = '產生中...'; exportBtn.disabled = true;
        const scaleFactor = 5;
        const options = { bgcolor: getComputedStyle(document.body).getPropertyValue('--bg-color'), quality: 1.0, width: calendarWrapper.scrollWidth * scaleFactor, height: calendarWrapper.scrollHeight * scaleFactor, style: { transform: `scale(${scaleFactor})`, transformOrigin: 'top left' } };
        domtoimage.toPng(calendarWrapper, options).then(dataUrl => {
            const link = document.createElement('a'); link.download = `課表_${currentYear}-${String(currentMonth).padStart(2, '0')}.png`; link.href = dataUrl; link.click();
        }).catch(error => { console.error('匯出圖片失敗:', error); alert('匯出圖片失敗，請檢查主控台錯誤。'); }).finally(() => { exportBtn.textContent = '匯出圖片'; exportBtn.disabled = false; });
    }

    function updateFooterDate() {
        const footerDateElement = document.getElementById('update-date');
        if (!footerDateElement) return; 

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        footerDateElement.textContent = `${year}-${month}-${day}`;
    }

    // --- Start the App ---
    init();
});