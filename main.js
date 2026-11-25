const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Адрес платформы — единственное место с URL: от него зависят загрузка окна
// и проверка внешних ссылок (isAppUrl). Для своего сервера меняй только здесь
const APP_URL = 'https://app.kodme.ru';
const APP_ORIGIN = new URL(APP_URL).origin;

// Путь к файлу настроек геометрии окна в системной папке приложения
const configPath = path.join(app.getPath('userData'), 'window-state.json');

// Функция для загрузки сохранённого состояния окна
function loadWindowState() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error('Не удалось загрузить размеры окна:', e);
    }
    // Дефолтные размеры, если файла ещё нет
    return { width: 1200, height: 800 };
}

// Функция для сохранения текущего состояния окна
function saveWindowState(window) {
    try {
        if (!window.isMinimized() && !window.isMaximized()) {
            const bounds = window.getBounds();
            fs.writeFileSync(configPath, JSON.stringify(bounds));
        }
    } catch (e) {
        console.error('Не удалось сохранить размеры окна:', e);
    }
}

// Проверка, что URL принадлежит origin приложения: сравниваем origin,
// а не префикс — https://kodme.ru.evil.com внутрь окна не попадёт
function isAppUrl(url) {
    try {
        return new URL(url).origin === APP_ORIGIN;
    } catch (e) {
        // Некорректный URL — считаем чужим
        return false;
    }
}

function createWindow() {
    const windowState = loadWindowState();

    const mainWindow = new BrowserWindow({
        x: windowState.x, // Если позиции x и y равны undefined,
        y: windowState.y, // Electron отцентрирует окно автоматически
        width: windowState.width,
        height: windowState.height,

        // НАСТРОЙКА: Минимальные размеры окна
        minWidth: 350,
        minHeight: 450,

        title: "Kodme",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
                                         contextIsolation: true,
                                         nodeIntegration: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL(APP_URL);

    // Отслеживаем изменение размеров и перемещение окна, чтобы сохранить состояние
    const saveStateEvents = ['resize', 'move', 'close'];
    saveStateEvents.forEach(eventName => {
        mainWindow.on(eventName, () => saveWindowState(mainWindow));
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!isAppUrl(url)) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Нативные уведомления десктоп-обёртки: страница шлёт payload через IPC,
// клик по уведомлению фокусирует окно и пересылает данные странице
// (дальше страница открывает форму по deep-link — как с push в браузере)
ipcMain.handle('notification:show', (event, payload) => {

    // Уведомления не поддерживает система или оболочка
    if (!Notification.isSupported()) return false;

    // Данные уведомления (payload формирует наша страница)
    const data = payload && typeof payload === 'object' ? payload : {};

    const notification = new Notification({
        title: data.title || 'Kodme',
        body: data.body || '',
        // Иконка — абсолютная ссылка (аватар либо иконка приложения);
        // без неё используется иконка приложения по умолчанию
        ...(data.icon && { icon: data.icon }),
        // Тег группирует уведомления (например, одно на канал)
        ...(data.tag && { tag: data.tag })
    });

    // Клик по уведомлению: фокусируем окно и отдаём данные странице
    notification.on('click', () => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send('notification:click', data.data || {});
    });

    notification.show();
    return true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
