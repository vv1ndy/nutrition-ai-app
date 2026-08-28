from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import urllib

# 1. Điền chính xác các thông số bạn vừa kiểm tra vào đây:
server = 'localhost' # Hoặc 'TEN_MAY\\SQLEXPRESS'
database = 'AI_Nutri' # Điền tên database của bạn
username = 'sa'
password = '123456'
driver = 'ODBC Driver 17 for SQL Server'

# 2. Tạo chuỗi kết nối
connection_string = f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};UID={username};PWD={password}"

# 3. Mã hóa và khởi tạo Engine
params = urllib.parse.quote_plus(connection_string)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    fast_executemany=True, 
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
''' TEST KẾT NỐI ĐẾN SQL SERVER '''
'''if __name__ == "__main__":
    from sqlalchemy import text
    
    try:
        # Thử mở một kết nối đến database
        with engine.connect() as connection:
            print("✅ KẾT NỐI ĐẾN SQL SERVER THÀNH CÔNG!")
            
            # Thử truy vấn lấy 1 món ăn từ bảng food (bảng bạn vừa nạp dữ liệu lúc nãy)
            query = text("SELECT TOP 1 ten_mon FROM food")
            result = connection.execute(query)
            
            for row in result:
                print(f"🍲 Truy vấn thử thành công. Món ăn đầu tiên trong DB là: {row[0]}")
                
    except Exception as e:
        print("❌ KẾT NỐI THẤT BẠI! Vui lòng kiểm tra lại thông số (server, username, password).")
        print("Chi tiết lỗi:")
        print(e)
'''