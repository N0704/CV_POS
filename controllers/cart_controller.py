from flask import jsonify
from models.order_model import OrderModel

class CartController:
    def __init__(self, barcode_scanner):
        self.barcode_scanner = barcode_scanner
        self.order_model = OrderModel()

    def get_cart(self):
        cart = self.barcode_scanner.get_cart()
        return jsonify(cart)
    
    def clear_cart(self):
        self.barcode_scanner.clear_cart()
        return jsonify({"message": "Đã xóa giỏ hàng"})
    
    def checkout(self):
        cart = self.barcode_scanner.get_cart()
        if not cart:
            return jsonify({"error": "Giỏ hàng trống"}), 400
        
        order_id = self.order_model.save_order(cart)
        self.barcode_scanner.clear_cart()
        return jsonify({"message": "Đã lưu đơn hàng", "order_id": order_id})
    
    def update_quantity(self, barcode, qty):
        self.barcode_scanner.update_quantity(barcode, qty)
        return jsonify({"success": True, "cart": self.barcode_scanner.get_cart()})

    def remove_item(self, barcode):
        self.barcode_scanner.remove_item(barcode)
        return jsonify({"success": True, "cart": self.barcode_scanner.get_cart()})

    # ----------------- Xuất hóa đơn PDF -----------------
    def get_invoice_data(self, order_id):
        order = self.order_model.get_order_by_id(order_id)
        items = self.order_model.get_order_details(order_id)
        if not order:
            return None
        return {
            "order": order,
            "items": items
        }
