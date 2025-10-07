document.addEventListener('DOMContentLoaded', function () {
    // --- Configuration ---
    const API_ENDPOINT = '/predict'; 

    // --- DOM Elements ---
    const uploaderView = document.getElementById('uploader-view');
    const resultView = document.getElementById('result-view');
    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');
    const analyzeButton = document.getElementById('analyze-button');
    const analyzeNewButton = document.getElementById('analyze-new-button');
    const resultImage = document.getElementById('result-image');
    const predictionClass = document.getElementById('prediction-class');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceText = document.getElementById('confidence-text');
    const binInfoCard = document.getElementById('bin-info-card');
    const binName = document.getElementById('bin-name');
    const binDescription = document.getElementById('bin-description');
    
    // Side Features Elements
    const historyList = document.getElementById('history-list');
    const dailyTip = document.getElementById('daily-tip');
    const personalStatsText = document.getElementById('personal-stats-text');
    
    // More Info Modal Elements
    const moreInfoButton = document.getElementById('more-info-button');
    const moreInfoModal = new bootstrap.Modal(document.getElementById('more-info-modal'));
    const modalTitle = document.getElementById('modal-title');
    const modalDos = document.getElementById('modal-dos');
    const modalDonts = document.getElementById('modal-donts');
    const modalFact = document.getElementById('modal-fact');

    let base64Image = null;
    let currentPrediction = null;

    // Data for Side & Modal Features
    const dailyTips = [
        "รู้หรือไม่? ขวดพลาสติก 1 ตัน สามารถนำไปผลิตเป็นเส้นใยสำหรับทำเสื้อยืดได้!",
        "การแยกขยะเศษอาหาร ช่วยลดปริมาณก๊าซมีเทนซึ่งเป็นสาเหตุของภาวะโลกร้อน",
        "กระป๋องอลูมิเนียมใช้พลังงานเพียง 5% ในการรีไซเคิลเมื่อเทียบกับการผลิตใหม่",
    ];

    const wasteDetails = {
        'bottle_plastic': {
            dos: ["ล้างทำความสะอาด", "บีบขวดให้แบน", "แยกฝาและฉลากออก"],
            donts: ["ทิ้งของเหลวไว้ข้างใน", "ทิ้งรวมกับขยะชนิดอื่น"],
            fact: "การรีไซเคิลขวดพลาสติก (PET) 1 ตัน เทียบเท่ากับการลดการปล่อยก๊าซคาร์บอนไดออกไซด์ของรถยนต์ 1 คันเป็นเวลา 2 เดือน"
        },
        'box_paper': {
            dos: ["ทำให้แบน", "เอาเทปพลาสติกออก"],
            donts: ["ทิ้งขณะที่เปียกหรือเปื้อนน้ำมัน", "ทิ้งกล่องพิซซ่าที่เปื้อนไขมัน"],
            fact: "การรีไซเคิลกระดาษ 1 ตัน ช่วยประหยัดต้นไม้ได้ถึง 17 ต้น และน้ำ 26,500 ลิตร"
        },
        'can': { dos: ["ล้างเศษอาหารออกก่อน"], donts: ["ทิ้งกระป๋องสเปรย์ที่มีสารเคมี"], fact: "อลูมิเนียมสามารถรีไซเคิลได้ไม่จำกัดจำนวนครั้งโดยไม่สูญเสียคุณภาพเลย" }
    };
    
    // --- Event Listeners ---
    uploadArea.addEventListener('click', () => imageUpload.click());
    analyzeButton.addEventListener('click', handlePrediction);
    analyzeNewButton.addEventListener('click', resetUI);
    imageUpload.addEventListener('change', (e) => handleFile(e.target.files[0]));
    moreInfoButton.addEventListener('click', showMoreInfo);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { uploadArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false); uploadArea.addEventListener(eventName, () => uploadArea.classList.toggle('dragover', ['dragenter', 'dragover'].includes(eventName)), false); });
    uploadArea.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]), false);

    // --- Core Functions ---
    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            base64Image = e.target.result;
            uploadArea.innerHTML = `<img src="${base64Image}" alt="Preview" style="max-height: 100%; object-fit: contain;">`;
            analyzeButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }
    
    async function handlePrediction() {
        if (!base64Image) return;
        analyzeButton.disabled = true;
        analyzeButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> กำลังวิเคราะห์...`;
        try {
            const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_base64: base64Image }) });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Server Error"); }
            const result = await response.json();
            
            currentPrediction = result;
            displayResults(result);
            updateHistory(result);
            incrementScanCount();

        } catch (error) { console.error('API Error:', error); alert(`เกิดข้อผิดพลาด: ${error.message}`); resetUI(); }
    }

    function displayResults(result) {
        resultImage.src = base64Image;
        predictionClass.textContent = result.prediction;
        const confidencePercent = (result.confidence * 100).toFixed(2);
        confidenceBar.style.width = `${confidencePercent}%`;
        confidenceText.textContent = `${confidencePercent}%`;
        
        if (result.recommendation) {
            binName.textContent = "คำแนะนำการทิ้ง";
            binDescription.textContent = `ควรทิ้งใน: ${result.recommendation}`;
            binInfoCard.style.borderColor = '#0D6EFD';
            binName.style.color = '#0D6EFD';
            binInfoCard.classList.remove('d-none');
        } else {
            binInfoCard.classList.add('d-none');
        }
        uploaderView.classList.add('d-none');
        resultView.classList.remove('d-none');
    }

    function showMoreInfo() {
        if (!currentPrediction) return;
        const details = wasteDetails[currentPrediction.prediction];
        if (!details) { alert("ขออภัย, ยังไม่มีข้อมูลเพิ่มเติมสำหรับขยะประเภทนี้"); return; }
        modalTitle.textContent = currentPrediction.prediction;
        modalFact.textContent = details.fact;
        modalDos.innerHTML = details.dos.map(item => `<li>${item}</li>`).join('');
        modalDonts.innerHTML = details.donts.map(item => `<li>${item}</li>`).join('');
        moreInfoModal.show();
    }
    
    function updatePersonalStats() {
        let scanCount = localStorage.getItem('trashiScanCount') || 0;
        personalStatsText.innerHTML = `คุณได้ช่วยโลกด้วยการสแกนขยะไปแล้ว <span class="stat-number">${scanCount}</span> ครั้ง!`;
    }

    function incrementScanCount() {
        let scanCount = parseInt(localStorage.getItem('trashiScanCount') || 0);
        scanCount++;
        localStorage.setItem('trashiScanCount', scanCount);
        updatePersonalStats();
    }

    function updateHistory(result) {
        const placeholder = historyList.querySelector('.text-muted');
        if (placeholder) placeholder.remove();
        const li = document.createElement('li');
        li.innerHTML = `<span>${result.prediction}</span><span class="history-confidence">${(result.confidence * 100).toFixed(0)}%</span>`;
        historyList.prepend(li);
        while (historyList.children.length > 3) {
            historyList.removeChild(historyList.lastChild);
        }
    }

    function resetUI() {
        uploaderView.classList.remove('d-none');
        resultView.classList.add('d-none');
        base64Image = null;
        currentPrediction = null;
        analyzeButton.disabled = true;
        analyzeButton.innerHTML = 'วิเคราะห์';
        uploadArea.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fs-1 text-muted"></i> <p class="mt-3 mb-0 text-muted">ลากไฟล์มาวาง หรือ <strong class="text-success">คลิกเพื่ออัปโหลด</strong></p>`;
        imageUpload.value = '';
        binInfoCard.classList.add('d-none');
    }
    
    function initialize() {
        dailyTip.textContent = dailyTips[Math.floor(Math.random() * dailyTips.length)];
        updatePersonalStats();
    }
    initialize();
});