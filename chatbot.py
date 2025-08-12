import os
import PyPDF2
import google.generativeai as genai
import re
import json

class CodeptitChatbot:
    def __init__(self):
        """Khởi tạo chatbot"""
        self.pdf_content = ""
        self.video_data = []
        self.model = None
        self.chat_session = None
        self.api_key = "AIzaSyB-YIaPo7kJfxhDCcLPvCuaKPdD2BJeMLM" 
        self.pdf_file = "HDSD_GV_V1.pdf"
        self.video_file = "playlist_videos.json"
        
        self.generation_config = {"temperature": 0.7, "max_output_tokens": 2048}
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

    def load_pdf_content(self) -> bool:
        """Đọc nội dung từ file PDF"""
        try:
            if not os.path.exists(self.pdf_file):
                print(f"Lỗi: Không tìm thấy {self.pdf_file}")
                return False
            
            with open(self.pdf_file, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                content_parts = []
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text.strip():
                        content_parts.append(self._clean_pdf_text(text))
                self.pdf_content = "\n\n".join(content_parts)
                return bool(self.pdf_content.strip())
        except Exception as e:
            print(f"Lỗi đọc PDF: {e}")
            return False

    def load_video_data(self) -> bool:
        """Đọc dữ liệu video từ file JSON"""
        try:
            if not os.path.exists(self.video_file):
                print(f"Lỗi: Không tìm thấy {self.video_file}")
                return False
            
            with open(self.video_file, 'r', encoding='utf-8') as file:
                self.video_data = json.load(file)
                return True
        except Exception as e:
            print(f"Lỗi đọc file video: {e}")
            return False

    def get_video_list_for_gemini(self) -> str:
        """Tạo danh sách video cho Gemini để chọn"""
        if not self.video_data:
            return ""
        
        video_list = "DANH SÁCH VIDEO HƯỚNG DẪN:\n"
        for i, video in enumerate(self.video_data, 1):
            video_list += f"{i}. **{video['title']}**: {video['description']} - Link: {video['link']}\n"
        
        return video_list

    def get_video_by_title(self, title: str) -> dict:
        """Lấy thông tin video dựa trên tiêu đề"""
        for video in self.video_data:
            if video['title'] == title:
                return video
        return None

    def _clean_pdf_text(self, text: str) -> str:
        """Làm sạch text từ PDF"""
        text = re.sub(r'\s+', ' ', text).strip()
        replacements = {'“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...'}
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text

    def setup_gemini_api(self) -> bool:
        """Thiết lập kết nối Gemini API"""
        try:
            if not self.api_key:
                print("Lỗi: API key trống.")
                return False
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                model_name="gemini-2.5-pro",
                generation_config=self.generation_config,
                safety_settings=self.safety_settings,
                system_instruction=self._get_system_prompt()
            )
            self.chat_session = self.model.start_chat(history=[])
            return True
        except Exception as e:
            print(f"Lỗi kết nối Gemini API: {e}")
            return False

    def _get_system_prompt(self) -> str:
        """Tạo system prompt"""
        video_list = self.get_video_list_for_gemini()
        return f"""
        Bạn là trợ lý AI hỗ trợ giảng viên sử dụng Codeptit.
        Trả lời câu hỏi về Codeptit dựa trên tài liệu nhưng không cần trích dẫn hình ảnh và mục lục:
        {self.pdf_content[:12000]}
        {video_list}
        Hãy trả lời ngắn gọn, rõ ràng và chính xác.
        
        HƯỚNG DẪN QUAN TRỌNG:
        - Khi đề xuất video, PHẢI sử dụng định dạng: 📹 **Video hướng dẫn:** [Tên video] - [Mô tả] 🔗 [Link]
        - Ví dụ: 📹 **Video hướng dẫn:** Đăng nhập - Truy cập hệ thống bằng tài khoản giảng viên được cấp 🔗 https://www.youtube.com/watch?v=Mu54mQnBbnY
        - Chỉ đưa 1 video phù hợp nhất với câu hỏi
        - Nếu không có video phù hợp, không cần đưa video vào
        - Kết thúc bằng câu hỏi để tiếp tục hỗ trợ
        """

    def chat(self, user_input: str) -> str:
        """Xử lý tin nhắn và trả về phản hồi"""
        try:
            if not self.chat_session: return "Lỗi: Chưa kết nối Gemini."
            
            # Lấy phản hồi từ Gemini (Gemini sẽ tự chọn video phù hợp)
            response = self.chat_session.send_message(user_input)
            bot_response = response.text.strip() if response.text else "Không nhận được phản hồi."
            
            return bot_response
            
        except Exception as e:
            err = str(e).lower()
            if "quota" in err or "limit" in err: return "Vượt giới hạn API."
            if "api_key" in err: return "Lỗi API key."
            return f"Lỗi: {e}"

    def run(self):
        """Chạy chatbot"""
        print("--- CHATBOT CODEPTIT ---")
        if not self.load_pdf_content() or not self.load_video_data() or not self.setup_gemini_api():
            print("Không thể khởi động chatbot.")
            return
        
        print("Chatbot sẵn sàng! Gõ 'quit' để thoát, 'help' để gợi ý.")
        while True:
            user_input = input("\nBạn: ").strip()
            if user_input.lower() in ['quit', 'thoat', 'q']:
                print("Tạm biệt!")
                break
            if user_input.lower() in ['help', 'h']:
                self._show_help()
                continue
            if not user_input:
                print("Vui lòng nhập câu hỏi.")
                continue
            
            print(f"Trợ lý: {self.chat(user_input)}")

    def _show_help(self):
        """Hiển thị gợi ý"""
        print("\nGợi ý: Đăng nhập? Tạo bài tập? Thêm sinh viên? Chấm điểm? Báo cáo?")
        print("Chatbot sẽ tự động gợi ý video hướng dẫn liên quan đến câu hỏi của bạn!")

def main():
    """Hàm main"""
    CodeptitChatbot().run()

if __name__ == "__main__":
    main()
