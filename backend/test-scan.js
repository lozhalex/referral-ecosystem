const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInBob25lIjoiKzc5NTAzMjc4MDI3Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzkzOTA1MzEwLCJleHAiOjE3OTY0OTczMTB9.hU_q8fHZbM7Y_P7y5hFGBSG_B1xCgJFRsgShmR31_Gg";

async function testScan() {
  try {
    const response = await fetch('http://localhost:3000/api/scanner/scan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qrCode: "bb6b8060-2fe6-4145-9bbc-53fe340948c1",
        eventId: 1
      })
    });
    
    const data = await response.json();
    console.log('✅ Ответ сервера:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testScan();