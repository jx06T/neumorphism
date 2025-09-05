// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Config ---
    const COURSE_SUBJECTS = ['網頁', 'Unity', '演算法', 'Python', '資安'];
    const DEFAULT_SCHEDULE = { 1: 'Unity', 2: '資安', 3: '演算法', 4: 'Python', 5: '網頁' };
    const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

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
        // [修正] 當手動輸入時，儲存並立即更新日曆
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
        saveBtn.addEventListener('click', saveEvent);
        cancelBtn.addEventListener('click', hideModal);
        // modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });
        modalOverlay.addEventListener('mousedown', (e) => {
            if (e.target === modalOverlay) {
                isMouseDownOnOverlay = true;
            } else {
                isMouseDownOnOverlay = false;
            }
        });

        modalOverlay.addEventListener('mouseup', (e) => {
            if (isMouseDownOnOverlay && e.target === modalOverlay) {
                hideModal();
            }
            isMouseDownOnOverlay = false;
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });
    }

    // --- UI Update & View Logic ---
    function updateView() {
        yearDisplay.textContent = currentYear;
        updateActiveMonthButton();
        generateCalendar(currentYear, currentMonth);
    }

    function updateActiveMonthButton() {
        const buttons = monthSelector.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.month) === currentMonth);
        });
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
        if (editingDate) {
            updateCsvAndRefresh(editingDate, eventInput.value);
        }
        hideModal();
    }

    // --- Core Calendar Logic ---
    function generateCalendar(year, month) {
        const data = parseCSV(csvInput.value);
        calendarGrid.innerHTML = '';
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();
        let totalCells = 0;

        const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
        for (let i = 0; i < startDayOfWeek; i++) {
            const day = prevMonthLastDay - startDayOfWeek + 1 + i;
            calendarGrid.insertAdjacentHTML('beforeend', `<div class="day-cell other-month"><div class="day-number">${day}</div></div>`);
            totalCells++;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            const currentDate = new Date(year, month - 1, day);
            const dayOfWeek = currentDate.getDay();
            const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let finalSubject = data.get(currentDateStr);
            if (finalSubject === undefined && DEFAULT_SCHEDULE[dayOfWeek]) finalSubject = DEFAULT_SCHEDULE[dayOfWeek];
            let weekend = finalSubject === undefined;
            finalSubject = finalSubject || '　';

            const isCourseDay = COURSE_SUBJECTS.some(course => finalSubject.includes(course));
            cell.className = `neumo day-cell ${isCourseDay ? 'convex' : 'concave'} soft ${weekend ? "weekend" : ""}  text-inset`;
            if (isHoliday(finalSubject)) cell.classList.add('holiday');
            cell.innerHTML = `<div class="day-number">${day}</div><div class="day-subject">${finalSubject}</div>`;

            cell.addEventListener('click', () => showModal(currentDateStr, data.get(currentDateStr) || ''));
            calendarGrid.appendChild(cell);
            totalCells++;
        }

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

    function isHoliday(subject) {
        // return subject && ['假', '節', '紀念日', '休息', '考'].some(k => subject.includes(k));
        return subject && !COURSE_SUBJECTS.includes(subject);
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
        const dateElement = document.getElementById('update-date');
        if (!dateElement) return; // 如果找不到元素就提前退出

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        dateElement.textContent = `${year}-${month}-${day}`;
    }

    // --- Start the App ---
    init();
});