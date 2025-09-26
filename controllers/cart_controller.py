from flask import jsonify
from services.barcode_scanner import BarcodeScanner
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