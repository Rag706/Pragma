from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
import sqlite3

DATABASE_URL = "sqlite:///./taskflow.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    if isinstance(dbapi_conn, sqlite3.Connection):
        dbapi_conn.execute("PRAGMA foreign_keys = ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
