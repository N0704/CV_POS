from datetime import datetime
import random
from .database import Database

class OrderModel:
    def __init__(self):
        self.db = Database()

    def save_order(self, cart):
        cursor = self.db.get_cursor()
        total_amount = sum(item["total"] for item in cart.values())

        # Tạo OrderID kiểu YYYYMMDD-xxxx, kiểm tra trùng
        today_str = datetime.now().strftime("%Y-%m-%d")
        while True:
            random_suffix = random.randint(1000, 9999)
            order_id = f"{today_str}-{random_suffix}"
            cursor.execute("SELECT 1 FROM Orders WHERE OrderID=?", (order_id,))
            if not cursor.fetchone():
                break

        # Insert Orders
        cursor.execute(
            "INSERT INTO Orders(OrderID, TotalAmount, OrderDate) VALUES (?, ?, GETDATE())",
            (order_id, total_amount)
        )

        # Insert OrderDetails & giảm stock
        for barcode, item in cart.items():
            cursor.execute("SELECT ProductID, Stock FROM Products WHERE Barcode=?", (barcode,))
            row = cursor.fetchone()
            if row:
                product_id = row[0]

                # Insert OrderDetails
                cursor.execute("""
                    INSERT INTO OrderDetails(OrderID, ProductID, Quantity, Price, Total)
                    VALUES (?, ?, ?, ?, ?)
                """, (order_id, product_id, item["qty"], item["price"], item["total"]))

                # Giảm stock trực tiếp
                cursor.execute(
                    "UPDATE Products SET Stock = Stock - ? WHERE ProductID = ?",
                    (item["qty"], product_id)
                )

        self.db.commit()
        return order_id


    def get_all_orders(self):
        cursor = self.db.get_cursor()
        cursor.execute("SELECT OrderID, TotalAmount, OrderDate FROM Orders ORDER BY OrderDate DESC")
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "total": float(r[1]) if r[1] else 0,
                "order_date": r[2].strftime("%Y-%m-%d %H:%M:%S") if r[1] else None   
            }
            for r in rows
    ]

    def get_order_by_id(self, order_id):
        cursor = self.db.get_cursor()
        cursor.execute("SELECT OrderID, TotalAmount, OrderDate FROM Orders WHERE OrderID=?", (order_id,))
        row = cursor.fetchone()
        if row:
            return {
                "id": row[0],
                "total": float(row[1]),
                "order_date": row[2].strftime("%Y-%m-%d %H:%M:%S")
            }
        return None

    def get_order_details(self, order_id):
        cursor = self.db.get_cursor()
        cursor.execute("""
            SELECT P.Name, P.Barcode, O.OrderDate, OD.Quantity, OD.Price, OD.Total
            FROM Orders O
            JOIN OrderDetails OD ON O.OrderID = OD.OrderID
            JOIN Products P ON OD.ProductID = P.ProductID
            WHERE OD.OrderID = ?
        """, (order_id,))
        rows = cursor.fetchall()
        return [
            {
                "name": r[0],
                "barcode": r[1],
                "order_date": r[2].strftime("%Y-%m-%d %H:%M:%S"),
                "quantity": r[3],
                "price": float(r[4]),
                "total": float(r[5])
            }
            for r in rows
        ]

