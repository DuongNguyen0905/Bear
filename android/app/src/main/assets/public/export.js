(async () => {
  // Tạo giao diện thông báo trực quan trên màn hình điện thoại
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  overlay.style.color = '#ffffff';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.innerHTML = `
    <div style="background: #1e293b; padding: 24px; border-radius: 16px; width: 100%; max-width: 350px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 2px solid #8ecae6;">
      <h3 style="margin: 0 0 15px 0; color: #8ecae6; font-size: 18px;">🔄 ĐANG TRÍCH XUẤT DỮ LIỆU...</h3>
      <p id="status-msg" style="margin: 0 0 20px 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">Vui lòng đợi trong giây lát, hệ thống đang quét bộ nhớ nhật ký trên điện thoại của bạn...</p>
      <div id="loader" style="border: 4px solid #f3f3f3; border-top: 4px solid #8ecae6; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
      <button id="close-btn" style="display: none; background: #8ecae6; color: #0f172a; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; width: 100%;">Đóng thông báo</button>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(overlay);

  const statusMsg = document.getElementById('status-msg');
  const loader = document.getElementById('loader');
  const closeBtn = document.getElementById('close-btn');

  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  try {
    const backup = {
      indexedDB: {},
      localStorage: {},
      sessionStorage: {}
    };

    // 1. Quét LocalStorage & SessionStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      backup.localStorage[k] = localStorage.getItem(k);
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      backup.sessionStorage[k] = sessionStorage.getItem(k);
    }

    // 2. Quét tất cả các cơ sở dữ liệu IndexedDB
    const dbs = await indexedDB.databases();
    let dbCount = 0;
    let entryCount = 0;

    for (const dbInfo of dbs) {
      const dbName = dbInfo.name;
      backup.indexedDB[dbName] = {};
      dbCount++;

      await new Promise((resolve) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = async (e) => {
          const db = e.target.result;
          const storeNames = Array.from(db.objectStoreNames);
          
          for (const storeName of storeNames) {
            backup.indexedDB[dbName][storeName] = {};
            
            await new Promise((resStore) => {
              try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const keysReq = store.getAllKeys();
                
                keysReq.onsuccess = () => {
                  const keys = keysReq.result;
                  if (keys.length === 0) {
                    resStore();
                    return;
                  }
                  
                  let readCount = 0;
                  keys.forEach(key => {
                    const getReq = store.get(key);
                    getReq.onsuccess = () => {
                      backup.indexedDB[dbName][storeName][key] = getReq.result;
                      entryCount++;
                      readCount++;
                      if (readCount === keys.length) resStore();
                    };
                    getReq.onerror = () => {
                      readCount++;
                      if (readCount === keys.length) resStore();
                    };
                  });
                };
                keysReq.onerror = () => resStore();
              } catch (err) {
                resStore();
              }
            });
          }
          db.close();
          resolve();
        };
        req.onerror = () => resolve();
      });
    }

    // Tạo file và kích hoạt tải về
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_journal_raw_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Cập nhật giao diện thành công
    loader.style.display = 'none';
    statusMsg.style.color = '#4ade80';
    statusMsg.innerHTML = `🎉 <b>THÀNH CÔNG RỰC RỠ!</b><br/><br/>Hệ thống đã quét xong <b>${dbCount} cơ sở dữ liệu</b> và trích xuất thành công <b>${entryCount} mục nhật ký/hình ảnh</b> cũ!<br/><br/>File <b>daily_journal_raw_backup.json</b> đã được tải về điện thoại của bạn thành công.`;
    closeBtn.style.display = 'block';

  } catch (err) {
    loader.style.display = 'none';
    statusMsg.style.color = '#f87171';
    statusMsg.innerHTML = `❌ <b>CÓ LỖI XẢY RA:</b><br/><br/>${err.message}<br/><br/>Vui lòng thử lại hoặc chụp ảnh màn hình này gửi cho em nhé.`;
    closeBtn.style.display = 'block';
  }
})();
