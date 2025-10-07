document.addEventListener('DOMContentLoaded', function () {
    const API_DASHBOARD_ENDPOINT = '/backend/api/dashboard-data';

    async function initializeDashboard() {
        try {
            const response = await fetch(API_DASHBOARD_ENDPOINT);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // ตรวจสอบว่ามีข้อมูล itemCounts หรือไม่
            if (!data.itemCounts || Object.keys(data.itemCounts).length === 0) {
                document.getElementById('total-scans').textContent = 0;
                document.getElementById('total-classes').textContent = 0;
                document.getElementById('most-common-item').textContent = '-';
                document.getElementById('wasteChart').style.display = 'none'; // ซ่อนกราฟถ้าไม่มีข้อมูล
                return;
            }

            const itemLabels = Object.keys(data.itemCounts);
            const itemValues = Object.values(data.itemCounts);

            // Update summary cards
            document.getElementById('total-scans').textContent = data.totalScans;
            document.getElementById('total-classes').textContent = itemLabels.length;

            // ✅ START: ส่วนที่แก้ไขให้ถูกต้อง
            // -----------------------------------------------------------------
            // ใช้วิธีวนลูปเพื่อหา "ชื่อ" (key) ของขยะที่มี "จำนวน" (value) มากที่สุดจริงๆ
            let mostCommonItem = Object.keys(data.itemCounts).reduce((a, b) =>
                data.itemCounts[a] > data.itemCounts[b] ? a : b
            );
            // -----------------------------------------------------------------
            // ✅ END: ส่วนที่แก้ไข

            document.getElementById('most-common-item').textContent = mostCommonItem;

            // Create the bar chart
            const ctx = document.getElementById('wasteChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: itemLabels,
                    datasets: [{
                        label: 'จำนวนชิ้น',
                        data: itemValues,
                        backgroundColor: 'rgba(58, 142, 61, 0.7)',
                        borderColor: 'rgba(44, 107, 46, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    responsive: true,
                    plugins: { legend: { display: false } }
                }
            });

        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            document.querySelector('.container.my-5').innerHTML = '<div class="alert alert-danger">ไม่สามารถโหลดข้อมูลสถิติได้ กรุณาตรวจสอบว่า Backend ทำงานปกติหรือไม่</div>';
        }
    }

    initializeDashboard();
});
