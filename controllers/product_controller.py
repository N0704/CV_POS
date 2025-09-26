from flask import jsonify, request
from models.product_model import ProductModel

class ProductController:
    def __init__(self):
        self.product_model = ProductModel()
    
    def get_products(self):
        products = self.product_model.get_all_products()
        return jsonify(products)
    
    def create_product(self):
        data = request.json
        success = self.product_model.create_product(
            data["barcode"], 
            data["name"], 
            data["price"]
        )
        if success:
            return jsonify({"message": "Đã thêm sản phẩm"})
        return jsonify({"error": "Không thể thêm sản phẩm"}), 400
    
    def update_product(self, product_id):
        data = request.json
        success = self.product_model.update_product(
            product_id, 
            data["name"], 
            data["price"]
        )
        if success:
            return jsonify({"message": "Đã cập nhật sản phẩm"})
        return jsonify({"error": "Không thể cập nhật sản phẩm"}), 400
    
    def delete_product(self, product_id):
        success = self.product_model.delete_product(product_id)
        if success:
            return jsonify({"message": "Đã xóa sản phẩm"})
        return jsonify({"error": "Không thể xóa sản phẩm"}), 400