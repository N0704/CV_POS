from .database import Database

class OrderModel:
    def __init__(self):
        self.db = Database()
    
    def save_order(self, cart):
        total_amount = sum(item["total"] for item in cart.values())
        cursor = self.db.get_cursor()
        
        cursor.execute("INSERT INTO Orders(TotalAmount) OUTPUT INSERTED.OrderID VALUES (?)", 
                      (total_amount,))
        order_id = cursor.fetchone()[0]

        for barcode, item in cart.items():
            cursor.execute("SELECT ProductID FROM Products WHERE Barcode=?", (barcode,))
            row = cursor.fetchone()
            if row:
                cursor.execute("""
                    INSERT INTO OrderDetails(OrderID, ProductID, Quantity, Price, Total)
                    VALUES (?, ?, ?, ?, ?)
                """, (order_id, row[0], item["qty"], item["price"], item["total"]))

        self.db.commit()
        return order_id