from .database import Database

class ProductModel:
    def __init__(self):
        self.db = Database()
    
    def get_all_products(self):
        cursor = self.db.get_cursor()
        cursor.execute("SELECT ProductID, Barcode, Name, Price FROM Products")
        rows = cursor.fetchall()
        return [{"id": r[0], "barcode": r[1], "name": r[2], "price": float(r[3])} for r in rows]
    
    def get_product_by_barcode(self, barcode):
        cursor = self.db.get_cursor()
        cursor.execute("SELECT ProductID, Name, Price FROM Products WHERE Barcode=?", (barcode,))
        row = cursor.fetchone()
        if row:
            return {"id": row[0], "name": row[1], "price": float(row[2])}
        return None
    
    def create_product(self, barcode, name, price):
        cursor = self.db.get_cursor()
        cursor.execute("INSERT INTO Products(Barcode, Name, Price) VALUES (?, ?, ?)", 
                      (barcode, name, price))
        self.db.commit()
        return cursor.rowcount > 0
    
    def update_product(self, product_id, name, price):
        cursor = self.db.get_cursor()
        cursor.execute("UPDATE Products SET Name=?, Price=? WHERE ProductID=?", 
                      (name, price, product_id))
        self.db.commit()
        return cursor.rowcount > 0
    
    def delete_product(self, product_id):
        cursor = self.db.get_cursor()
        cursor.execute("DELETE FROM Products WHERE ProductID=?", (product_id,))
        self.db.commit()
        return cursor.rowcount > 0