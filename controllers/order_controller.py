from flask import jsonify
from models.order_model import OrderModel

class OrderController:
    def __init__(self):
        self.order_model = OrderModel()

    def get_all_orders(self):
        orders = self.order_model.get_all_orders()
        return jsonify(orders)

    def get_order_details(self, order_id):
        order_details = self.order_model.get_order_details(order_id)
        return jsonify(order_details)