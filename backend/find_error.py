import os

print("Đang quét toàn bộ dự án để tìm chữ 'weights'...")
found = False

for root, _, files in os.walk('.'):
    # Bỏ qua các thư mục môi trường ảo hoặc cache
    if 'venv' in root or '__pycache__' in root or 'site-packages' in root:
        continue
        
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'weights' in content:
                        print(f"🔥 ĐÃ TÌM THẤY TẠI: {filepath}")
                        found = True
            except Exception:
                pass

if not found:
    print("✅ Không tìm thấy chữ 'weights' nào! Code đã sạch sẽ.")