import pyodbc

class Database:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize_connection()
        return cls._instance
    
    def _initialize_connection(self):
        self.conn = pyodbc.connect(
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost;"
            "DATABASE=POS_DB;"
            "UID=sa;PWD=123456"
        )
        self.cursor = self.conn.cursor()
    
    def get_cursor(self):
        return self.cursor
    
    def commit(self):
        self.conn.commit()
    
    def close(self):
        if self.conn:
            self.conn.close()