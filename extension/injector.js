/**
 * Chatbot Extension Injector
 * Tích hợp chatbot AI vào trang Code PTIT
 */

class ChatbotExtension {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.isVisible = false;
        this.isMinimized = false;
        this.chatHistory = [];
        this.isLoading = false;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    async init() {
        // Kiểm tra xem có phải trang Code PTIT không
        if (!window.location.hostname.includes('code.ptit.edu.vn')) {
            return;
        }

        // Chờ DOM load xong
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createUI());
        } else {
            this.createUI();
        }

        // Kiểm tra kết nối API
        await this.checkAPIHealth();
    }

    async checkAPIHealth() {
        try {
            const response = await fetch(`${this.API_BASE}/health`);
            const data = await response.json();
            
            if (data.chatbot_ready) {
                console.log('Chatbot Extension: API sẵn sàng');
            } else {
                console.log('Chatbot Extension: API đang khởi tạo...');
                setTimeout(() => this.checkAPIHealth(), 5000);
            }
        } catch (error) {
            console.error('Chatbot Extension: Không thể kết nối API:', error);
            setTimeout(() => this.checkAPIHealth(), 10000);
        }
    }

    createUI() {
        // Tạo nút toggle
        this.createToggleButton();
        
        // Tạo container chatbot
        this.createChatContainer();
        
        // Bind events
        this.bindEvents();
    }

    createToggleButton() {
        const button = document.createElement('div');
        button.id = 'chat-toggle-button';
        button.innerHTML = '🤖';
        button.title = 'Chatbot Hỗ trợ Code PTIT';
        button.style.display = 'flex'; // Hiển thị button khi khởi tạo
        
        document.body.appendChild(button);
        this.toggleButton = button;
    }

    createChatContainer() {
        const container = document.createElement('div');
        container.className = 'chat-container';
        container.innerHTML = `
            <div id="chat-header">
                <span class="header-title">🤖 Trợ lý Code PTIT</span>
                <div class="header-controls">
                    <span class="header-btn" id="minimize-btn" title="Thu nhỏ">−</span>
                    <span class="header-btn" id="reset-btn" title="Reset chat">↻</span>
                    <span class="header-btn" id="close-btn" title="Đóng">×</span>
                </div>
            </div>
            
            <div id="chat-messages">
                <div class="message bot-message-wrapper">
                    <div class="bot-message">
                        👋 Chào bạn! Tôi là trợ lý AI hỗ trợ sử dụng Code PTIT.<br><br>
                        <strong>Tôi có thể giúp bạn:</strong><br>
                        • Hướng dẫn sử dụng các tính năng<br>
                        • Giải đáp thắc mắc về hệ thống<br>
                        • Cung cấp video hướng dẫn chi tiết<br><br>
                        Hãy hỏi tôi bất kỳ điều gì về Code PTIT nhé!
                    </div>
                    <img class="avatar" src="${chrome.runtime.getURL('icon.png')}" alt="Bot">
                </div>
            </div>
            
            <form id="chat-form">
                <input type="text" id="user-input" placeholder="Nhập câu hỏi của bạn..." autocomplete="off">
                <button type="submit">➤</button>
            </form>
            
            <div class="resizer resizer-se"></div>
            <div class="resizer resizer-sw"></div>
            <div class="resizer resizer-ne"></div>
            <div class="resizer resizer-nw"></div>
        `;
        
        document.body.appendChild(container);
        this.chatContainer = container;
        this.messagesContainer = container.querySelector('#chat-messages');
        this.userInput = container.querySelector('#user-input');
        this.chatForm = container.querySelector('#chat-form');
    }

    bindEvents() {
        // Toggle button
        this.toggleButton.addEventListener('click', () => this.toggleChat());
        
        // Header controls
        document.getElementById('close-btn').addEventListener('click', () => this.closeChat());
        document.getElementById('minimize-btn').addEventListener('click', () => this.toggleMinimize());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetChat());
        
        // Form submit
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Drag & drop
        const header = document.getElementById('chat-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // Resize
        document.querySelectorAll('.resizer').forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => this.startResize(e));
        });
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.stopDragResize());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                this.toggleChat();
            }
        });
    }

    toggleChat() {
        if (this.isMinimized) {
            // Nếu đang minimize, thì mở lại
            this.isMinimized = false;
            this.isVisible = true;
            this.chatContainer.classList.add('visible');
            this.toggleButton.style.display = 'none';
            this.userInput.focus();
        } else {
            // Toggle bình thường
            this.isVisible = !this.isVisible;
            if (this.isVisible) {
                this.chatContainer.classList.add('visible');
                this.toggleButton.style.display = 'none';
                this.userInput.focus();
            } else {
                this.chatContainer.classList.remove('visible');
                this.toggleButton.style.display = 'flex';
            }
        }
    }

    closeChat() {
        this.isVisible = false;
        this.isMinimized = false;
        this.chatContainer.classList.remove('visible');
        this.toggleButton.style.display = 'flex';
    }

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            // Thu về icon - ẩn chat container và hiện toggle button
            this.chatContainer.classList.remove('visible');
            this.toggleButton.style.display = 'flex';
        } else {
            // Mở lại từ minimize - hiện chat container và ẩn toggle button
            this.chatContainer.classList.add('visible');
            this.toggleButton.style.display = 'none';
            this.userInput.focus();
        }
    }

    async resetChat() {
        try {
            const response = await fetch(`${this.API_BASE}/reset`, { method: 'POST' });
            if (response.ok) {
                this.messagesContainer.innerHTML = `
                    <div class="message bot-message-wrapper">
                        <div class="bot-message">
                            Đã reset phiên chat! Bạn có thể bắt đầu cuộc trò chuyện mới.
                        </div>
                        <img class="avatar" src="${chrome.runtime.getURL('icon.png')}" alt="Bot">
                    </div>
                `;
                this.chatHistory = [];
            }
        } catch (error) {
            console.error('Lỗi reset chat:', error);
        }
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message || this.isLoading) return;
        
        // Add user message
        this.addUserMessage(message);
        this.userInput.value = '';
        this.isLoading = true;
        
        // Show loading
        const loadingId = this.addBotMessage('⏳ Đang suy nghĩ...');
        
        try {
            const response = await fetch(`${this.API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            // Remove loading message
            document.getElementById(loadingId).remove();
            
            if (data.success) {
                this.addBotMessage(data.response);
            } else {
                this.addBotMessage(`❌ ${data.error || 'Có lỗi xảy ra'}`);
            }
            
        } catch (error) {
            document.getElementById(loadingId).remove();
            this.addBotMessage('Không thể kết nối đến server. Vui lòng kiểm tra xem Flask server đã chạy chưa.');
        } finally {
            this.isLoading = false;
        }
    }

    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `<div class="user-message-bubble">${this.escapeHtml(message)}</div>`;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(message, messageId = null) {
        const id = messageId || 'msg-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message-wrapper';
        messageDiv.id = id;
        
        // Parse markdown-like formatting và video links
        const formattedMessage = this.formatBotMessage(message);
        
        messageDiv.innerHTML = `
            <div class="bot-message">${formattedMessage}</div>
            <img class="avatar" src="${chrome.runtime.getURL('icon.png')}" alt="Bot">
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        return id;
    }

    formatBotMessage(message) {
        let formattedMessage = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        // Tìm và thay thế pattern video YouTube
        const videoPattern = /�\s*\*\*Video hướng dẫn:\*\*\s*(.*?)\s*-\s*(.*?)\s*-\s*�🔗\s*(https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+))/g;
        formattedMessage = formattedMessage.replace(videoPattern, (match, title, description, url, videoId) => {
            return this.createVideoPreview(title, description, url, videoId);
        });
        
        // Fallback cho các link YouTube thông thường
        formattedMessage = formattedMessage.replace(/🔗\s*(https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+))/g, (match, url, videoId) => {
            return this.createSimpleVideoPreview(url, videoId);
        });
        
        // Các link khác vẫn hiển thị như cũ
        formattedMessage = formattedMessage.replace(/🔗\s*(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">🔗 $1</a>');
        
        return formattedMessage;
    }

    createVideoPreview(title, description, url, videoId) {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        return `
            <div class="video-preview-card">
                <div class="video-thumbnail-container">
                    <img class="video-thumbnail" src="${thumbnailUrl}" alt="${title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="video-thumbnail-placeholder" style="display:none;">📹</div>
                    <div class="video-play-overlay" onclick="window.open('${url}', '_blank')">
                        <div class="play-button">▶</div>
                    </div>
                </div>
                <div class="video-info">
                    <div class="video-title">
                        <a href="${url}" target="_blank">${title}</a>
                    </div>
                    <div class="video-description">${description}</div>
                    <button class="watch-button" onclick="window.open('${url}', '_blank')">
                        ▶ Xem video
                    </button>
                </div>
            </div>
        `;
    }

    createSimpleVideoPreview(url, videoId) {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        return `
            <div class="video-preview-card simple">
                <div class="video-thumbnail-container">
                    <img class="video-thumbnail" src="${thumbnailUrl}" alt="Video" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="video-thumbnail-placeholder" style="display:none;">📹</div>
                    <div class="video-play-overlay" onclick="window.open('${url}', '_blank')">
                        <div class="play-button">▶</div>
                    </div>
                </div>
                <div class="video-info">
                    <button class="watch-button" onclick="window.open('${url}', '_blank')">
                        ▶ Xem video
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    startDrag(e) {
        if (e.target.classList.contains('header-btn')) return;
        
        this.isDragging = true;
        const rect = this.chatContainer.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        this.chatContainer.style.transition = 'none';
        document.body.style.userSelect = 'none';
    }

    startResize(e) {
        e.preventDefault();
        this.isResizing = true;
        this.resizeType = e.target.className.split(' ')[1];
        
        this.chatContainer.style.transition = 'none';
        document.body.style.userSelect = 'none';
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Boundaries
            const maxX = window.innerWidth - this.chatContainer.offsetWidth;
            const maxY = window.innerHeight - this.chatContainer.offsetHeight;
            
            this.chatContainer.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            this.chatContainer.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            this.chatContainer.style.right = 'auto';
            this.chatContainer.style.bottom = 'auto';
        }
        
        if (this.isResizing) {
            const rect = this.chatContainer.getBoundingClientRect();
            let newWidth = rect.width;
            let newHeight = rect.height;
            
            if (this.resizeType.includes('e')) {
                newWidth = e.clientX - rect.left;
            }
            if (this.resizeType.includes('w')) {
                newWidth = rect.right - e.clientX;
            }
            if (this.resizeType.includes('s')) {
                newHeight = e.clientY - rect.top;
            }
            if (this.resizeType.includes('n')) {
                newHeight = rect.bottom - e.clientY;
            }
            
            newWidth = Math.max(320, Math.min(newWidth, window.innerWidth - 50));
            newHeight = Math.max(250, Math.min(newHeight, window.innerHeight - 50));
            
            this.chatContainer.style.width = newWidth + 'px';
            this.chatContainer.style.height = newHeight + 'px';
        }
    }

    stopDragResize() {
        if (this.isDragging || this.isResizing) {
            this.chatContainer.style.transition = '';
            document.body.style.userSelect = '';
        }
        
        this.isDragging = false;
        this.isResizing = false;
    }
}

// Khởi tạo extension khi script load
const chatbotExtension = new ChatbotExtension();
