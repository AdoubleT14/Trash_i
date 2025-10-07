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
        "รู้หรือไม่? กล่องนม UHT สามารถนำไปรีไซเคิลทำเป็น 'แผ่นกรีนบอร์ด' เพื่อใช้ทำโต๊ะหรือเก้าอี้ได้",
        "การใช้ถุงผ้าแทนถุงพลาสติกเพียง 1 วัน/สัปดาห์ สามารถลดจำนวนถุงพลาสติกได้มากกว่า 100 ล้านถุง/ปี",
        "ขวดแก้ว 1 ใบที่ถูกนำมารีไซเคิล จะช่วยประหยัดพลังงานได้เท่ากับการเปิดคอมพิวเตอร์นาน 25 นาที",
        "กระดาษ A4 หนึ่งรีม (500 แผ่น) ต้องใช้ต้นไม้ถึง 6% ของต้นเลยทีเดียว การใช้กระดาษ 2 หน้าช่วยลดการตัดต้นไม้ได้เท่าตัว",
        "เพียงแค่ปิดน้ำขณะแปรงฟัน สามารถช่วยประหยัดน้ำได้ถึง 6-14 ลิตรต่อครั้ง",
        "การเลือกใช้แบตเตอรี่แบบชาร์จได้ ช่วยลดปริมาณขยะอันตรายจากแบตเตอรี่แบบใช้แล้วทิ้งได้มหาศาล",
        "น้ำซาวข้าวหรือน้ำล้างผัก สามารถนำไปรดน้ำต้นไม้เพื่อเป็นปุ๋ยชั้นดีได้",
        "เศษกาแฟที่เหลือจากการชง สามารถนำไปใช้ขัดผิวหรือใช้ดับกลิ่นในตู้เย็นได้",
        "การทิ้งขยะอิเล็กทรอนิกส์ (E-waste) ให้ถูกที่ ช่วยป้องกันสารพิษ เช่น ตะกั่วและปรอท ไม่ให้ปนเปื้อนลงดินและแหล่งน้ำ",
        "ฝาขวดพลาสติกมีค่า สามารถรวบรวมเพื่อบริจาคให้กับโครงการที่นำไปรีไซเคิลเป็นผลิตภัณฑ์ใหม่",
    ];

    const wasteDetails = {
        'bag_plastic': {
            dos: ["เช็ดทำความสะอาดเศษอาหารออกก่อน", "รวบรวมถุงพลาสติกสะอาดไว้เพื่อนำไปรีไซเคิล", "นำไปใช้ซ้ำถ้าเป็นไปได้"],
            donts: ["ไม่ควรทิ้งถุงที่เปื้อนเศษอาหารปนกับขยะอื่น", "ไม่ควรทิ้งลงในถังขยะรีไซเคิลทันทีโดยไม่ตรวจสอบ (บางพื้นที่ไม่รับ)"],
            fact: "ถุงพลาสติกประมาณ 10-15 ใบ สามารถนำไปรีไซเคิลเพื่อผลิตเป็นเก้าอี้พลาสติก 1 ตัวได้"
        },
        'bottle_plastic': {
            dos: ["ล้างทำความสะอาด", "บีบขวดให้แบน", "แยกฝาและฉลากออก"],
            donts: ["ไม่ควรทิ้งของเหลวไว้ข้างใน", "ไม่ควรทิ้งรวมกับขยะชนิดอื่น"],
            fact: "การรีไซเคิลขวดพลาสติก (PET) 1 ตัน เทียบเท่ากับการลดการปล่อยก๊าซคาร์บอนไดออกไซด์ของรถยนต์ 1 คันเป็นเวลา 2 เดือน"
        },
        'box_paper': {
            dos: ["ทำให้แบน", "เอาเทปพลาสติกและลวดเย็บกระดาษออก"],
            donts: ["ไม่ควรทิ้งขณะที่เปียกหรือเปื้อนน้ำมัน/อาหาร", "ไม่ควรทิ้งกล่องพิซซ่าที่เปื้อนไขมันในส่วนรีไซเคิล"],
            fact: "การรีไซเคิลกระดาษ 1 ตัน ช่วยประหยัดต้นไม้ได้ถึง 17 ต้น และน้ำ 26,500 ลิตร"
        },
        'box_plastic': {
            dos: ["ล้างคราบอาหารและน้ำมันออกให้สะอาด", "เช็ดให้แห้ง"],
            donts: ["ไม่ควรทิ้งโดยมีเศษอาหารปนเปื้อน", "ไม่ควรทิ้งรวมกับพลาสติกประเภทอื่นโดยไม่แยก"],
            fact: "พลาสติกประเภท PP (Polypropylene) ที่มักใช้ทำกล่องอาหาร สามารถนำไปรีไซเคิลเป็นชิ้นส่วนรถยนต์หรือเฟอร์นิเจอร์ได้"
        },
        'can': {
            dos: ["เทเครื่องดื่มหรือเศษอาหารออกให้หมด", "ล้างทำความสะอาดด้านใน", "บีบให้แบนเพื่อประหยัดพื้นที่"],
            donts: ["ไม่ควรทิ้งโดยมีของเหลวหรือเศษอาหารอยู่ข้างใน", "ไม่ควรทิ้งกระป๋องสเปรย์ที่มีสารเคมีอันตรายรวมกับกระป๋องทั่วไป"],
            fact: "การรีไซเคิลกระป๋องอลูมิเนียม 1 ใบ ประหยัดพลังงานได้เท่ากับการเปิดทีวีได้นานถึง 3 ชั่วโมง"
        },
        'cup_paper': {
            dos: ["เทของเหลวออกให้หมด", "ล้างคราบสกปรกออก", "แยกฝาพลาสติกและหลอดออก"],
            donts: ["ไม่ควรทิ้งทั้งที่มีเครื่องดื่มเหลืออยู่"],
            fact: "แก้วกระดาษส่วนใหญ่ถูกเคลือบด้วยพลาสติก polyethylene เพื่อป้องกันการรั่วซึม ซึ่งทำให้กระบวนการรีไซเคิลซับซ้อนและต้องแยกพลาสติกออกจากกระดาษก่อน"
        },
        'cup_plastic': {
            dos: ["ล้างทำความสะอาด", "แยกฝาและหลอด", "ตรวจสอบสัญลักษณ์ประเภทพลาสติก"],
            donts: ["ไม่ควรทิ้งพร้อมของเหลวข้างใน"],
            fact: "พลาสติกที่ใช้ทำแก้วกาแฟเย็นมักเป็นคนละประเภทกับที่ใช้ทำฝา ควรแยกทิ้งเพื่อให้ง่ายต่อการนำไปรีไซเคิล"
        },
        'paper': {
            dos: ["เก็บในที่แห้ง ไม่ให้เปียกชื้น", "นำลวดเย็บกระดาษหรือคลิปหนีบกระดาษออก", "แยกกระดาษขาวออกจากกระดาษสีหรือหนังสือพิมพ์"],
            donts: ["ไม่ควรทิ้งกระดาษที่เปื้อนน้ำมันหรืออาหารลงถังรีไซเคิล", "ไม่ควรทิ้งกระดาษทิชชูที่ใช้แล้วลงถังรีไซเคิล (ไม่สามารถรีไซเคิลได้)"],
            fact: "กระดาษสามารถนำกลับมารีไซเคิลได้ประมาณ 5-7 ครั้ง ก่อนที่เส้นใยจะสั้นเกินไปที่จะนำมาผลิตเป็นกระดาษใหม่"
        },
        'stick': {
            dos: ["ทำความสะอาดหากเป็นไม้เสียบอาหาร", "รวบรวมไม้ไอศกรีมเพื่อทำงานประดิษฐ์"],
            donts: ["ไม่ควรทิ้งไม้เสียบลูกชิ้นแหลมๆ โดยไม่มีการห่อ (อาจเป็นอันตรายต่อพนักงานเก็บขยะ)", "ไม่ควรใส่ไม้จิ้มฟันหรือไม้เสียบอาหารลงในถังขยะรีไซเคิล"],
            fact: "ไม้เสียบอาหารหรือไม้ไอศกรีมเป็นขยะอินทรีย์ สามารถย่อยสลายได้ แต่หากทิ้งในปริมาณมากโดยไม่จัดการ อาจก่อให้เกิดปัญหาขยะได้"
        },
        'tools': {
            dos: ["ล้างทำความสะอาดคราบอาหารออกให้หมด", "หากเป็นพลาสติกเนื้อแข็ง (เช่น ช้อนส้อมบางชนิด) สามารถนำกลับมาใช้ซ้ำได้"],
            donts: ["ไม่ควรทิ้งขณะที่ยังเปื้อนเศษอาหาร เพราะจะทำให้ขยะอื่น ๆ สกปรก", "อย่าทิ้งพลาสติกย่อยสลายได้ (PLA) ปนกับพลาสติกที่รีไซเคิลได้"],
            fact: "ช้อนส้อมและหลอดพลาสติก เป็นหนึ่งในประเภทขยะที่พบในทะเลมากที่สุด และเป็นอันตรายต่อสัตว์ทะเลอย่างยิ่ง เพราะสัตว์อาจกินเข้าไปโดยเข้าใจผิดว่าเป็นอาหาร"
        },
        'unknow': {
            dos: ["ใส่ถังรอแยกขยะ"],
            donts: ["ไม่ควรทิ้งในถังขยะทั่วไปโดยเด็ดขาด", "ไม่ควรทิ้งรวมกับถังขยะรีไซเคิลอื่นๆ (เช่น ขวด, กระดาษ)", "ไม่ควรทิ้งไว้ข้างทางหรือในที่สาธารณะ"],
            fact: "การทิ้งขยะผิดประเภทลงในถังรีไซเคิล อาจทำให้ขยะรีไซเคิลทั้งล็อตนั้นไม่สามารถนำไปรีไซเคิลได้ และต้องถูกส่งไปฝังกลบแทน"
        }
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
