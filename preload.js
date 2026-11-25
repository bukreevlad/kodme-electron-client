// Здесь можно безопасно прокинуть мосты между Node.js и сайтом, если потребуется
const { contextBridge, ipcRenderer } = require('electron');

// Мост десктоп-обёртки: страница показывает нативные уведомления системы
// и подписывается на клики по ним. В Electron нет push-сервиса (Web Push
// не работает) — уведомления приходят по WebSocket при открытом приложении,
// а показываются через главный процесс.
contextBridge.exposeInMainWorld('kodmeDesktop', {
    // Показ нативного уведомления (payload: title, body, icon, tag, data)
    showNotification: (payload) => ipcRenderer.invoke('notification:show', payload),

    // Подписка на клик по уведомлению (callback получает data уведомления)
    onNotificationClick: (callback) => {
        ipcRenderer.on('notification:click', (_event, data) => callback(data));
    }
});

// Сообщаем в консоль страницы, что обёртка инициализирована
window.addEventListener('DOMContentLoaded', () => {
    console.log('Kodme Desktop Wrapper initialized.');
});
