#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask API cho Chatbot Extension
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from chatbot import CodeptitChatbot
import threading
import time

app = Flask(__name__)
CORS(app, origins=["https://code.ptit.edu.vn", "chrome-extension://*"])

# Khởi tạo chatbot global
chatbot_instance = None
chatbot_ready = False

def init_chatbot():
    """Khởi tạo chatbot trong background"""
    global chatbot_instance, chatbot_ready
    try:
        print("Đang khởi tạo chatbot...")
        chatbot_instance = CodeptitChatbot()
        
        if (chatbot_instance.load_pdf_content() and 
            chatbot_instance.load_video_data() and 
            chatbot_instance.setup_gemini_api()):
            chatbot_ready = True
            print("✅ Chatbot đã sẵn sàng!")
        else:
            print("❌ Lỗi khởi tạo chatbot")
    except Exception as e:
        print(f"❌ Lỗi khởi tạo chatbot: {e}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Kiểm tra trạng thái API"""
    return jsonify({
        'status': 'online',
        'chatbot_ready': chatbot_ready,
        'message': 'API đang hoạt động'
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Xử lý tin nhắn chat"""
    try:
        if not chatbot_ready:
            return jsonify({
                'success': False,
                'error': 'Chatbot chưa sẵn sàng. Vui lòng đợi...'
            }), 503
        
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Thiếu tin nhắn'
            }), 400
        
        user_message = data['message'].strip()
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'Tin nhắn trống'
            }), 400
        
        # Gọi chatbot để xử lý
        response = chatbot_instance.chat(user_message)
        
        return jsonify({
            'success': True,
            'response': response,
            'timestamp': time.time()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi server: {str(e)}'
        }), 500

@app.route('/api/videos', methods=['GET'])
def get_videos():
    """Lấy danh sách video"""
    try:
        if not chatbot_ready:
            return jsonify({
                'success': False,
                'error': 'Chatbot chưa sẵn sàng'
            }), 503
        
        return jsonify({
            'success': True,
            'videos': chatbot_instance.video_data
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi server: {str(e)}'
        }), 500

@app.route('/api/reset', methods=['POST'])
def reset_chat():
    """Reset phiên chat"""
    try:
        if chatbot_ready and chatbot_instance:
            chatbot_instance.chat_session = chatbot_instance.model.start_chat(history=[])
            return jsonify({
                'success': True,
                'message': 'Đã reset phiên chat'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Chatbot chưa sẵn sàng'
            }), 503
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi server: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Khởi tạo chatbot trong background thread
    init_thread = threading.Thread(target=init_chatbot)
    init_thread.daemon = True
    init_thread.start()
    
    print("Đang khởi động Flask server...")
    print("Extension sẽ kết nối tới: http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
