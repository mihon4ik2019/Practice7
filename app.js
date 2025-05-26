// Проверка онлайн-статуса
function updateOnlineStatus() {
    const offlineStatus = document.getElementById('offline-status');
    if (navigator.onLine) {
        offlineStatus.classList.add('hidden');
    } else {
        offlineStatus.classList.remove('hidden');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    updateOnlineStatus();
    
    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker зарегистрирован:', registration.scope);
            })
            .catch(err => {
                console.error('Ошибка регистрации ServiceWorker:', err);
            });
    }

    // Инициализация IndexedDB
    const dbPromise = openDB();

    // Элементы интерфейса
    const noteInput = document.getElementById('note-input');
    const addNoteBtn = document.getElementById('add-note-btn');
    const notesList = document.getElementById('notes-list');

    // Загрузка заметок при старте
    loadNotes();

    // Добавление новой заметки
    addNoteBtn.addEventListener('click', () => {
        const noteText = noteInput.value.trim();
        if (noteText) {
            addNote(noteText);
            noteInput.value = '';
        }
    });

    // Функция открытия IndexedDB
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NotesDB', 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('notes')) {
                    db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject('Ошибка открытия базы данных');
            };
        });
    }

    // Добавление заметки
    async function addNote(text) {
        const db = await dbPromise;
        const transaction = db.transaction('notes', 'readwrite');
        const store = transaction.objectStore('notes');

        const note = {
            text: text,
            createdAt: new Date().toISOString()
        };

        store.add(note);
        
        transaction.oncomplete = () => {
            loadNotes();
        };
    }

    // Удаление заметки
    async function deleteNote(id) {
        const db = await dbPromise;
        const transaction = db.transaction('notes', 'readwrite');
        const store = transaction.objectStore('notes');

        store.delete(id);
        
        transaction.oncomplete = () => {
            loadNotes();
        };
    }

    // Загрузка всех заметок
    async function loadNotes() {
        const db = await dbPromise;
        const transaction = db.transaction('notes', 'readonly');
        const store = transaction.objectStore('notes');
        const request = store.getAll();

        request.onsuccess = () => {
            renderNotes(request.result);
        };
    }

    // Отображение заметок
    function renderNotes(notes) {
        notesList.innerHTML = '';
        
        if (notes.length === 0) {
            notesList.innerHTML = '<p>Нет заметок. Добавьте первую!</p>';
            return;
        }

        // Сортируем по дате создания (новые сверху)
        notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        notes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note';
            
            noteElement.innerHTML = `
                <div class="note-content">${note.text}</div>
                <button class="delete-btn" data-id="${note.id}">×</button>
            `;
            
            notesList.appendChild(noteElement);
        });

        // Добавляем обработчики для кнопок удаления
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.target.getAttribute('data-id'));
                deleteNote(id);
            });
        });
    }
});