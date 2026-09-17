from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import urllib

# 1. Điền các thông số 
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
    db = SessionLocal()#Mở kết nối Database mới
    try:
        yield db#Bàn giao kết nối (biến db) cho API sử dụng
    finally:
        db.close()#Đảm bảo ĐÓNG kết nối dù API chạy thành công hay bị lỗi
