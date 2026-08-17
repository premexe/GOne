from app.database.connection import engine

try:
    with engine.connect() as connection:
        print("✅ PostgreSQL Connected Successfully!")
except Exception as e:
    print("❌ Connection Failed")
    print(e)