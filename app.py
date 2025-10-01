from flask import Flask, render_template, request
from services.barcode_scanner import BarcodeScanner
from controllers.product_controller import ProductController
from controllers.cart_controller import CartController
from controllers.barcode_controller import BarcodeController
from controllers.order_controller import OrderController
import atexit

app = Flask(__name__)

# Services
scanner = BarcodeScanner()

# Controllers
product_controller = ProductController()
order_controller = OrderController()
cart_controller = CartController(scanner)
barcode_controller = BarcodeController(scanner)

# Home
@app.route("/")
def home():
    return render_template("order.html")

# Product routes
@app.route("/products", methods=["GET"])
def get_products():
    return product_controller.get_products()

@app.route("/products", methods=["POST"])
def create_product():
    return product_controller.create_product()

@app.route("/products/<int:id>", methods=["PUT"])
def update_product(id):
    return product_controller.update_product(id)

@app.route("/products/<int:id>", methods=["DELETE"])
def delete_product(id):
    return product_controller.delete_product(id)

# Order routes
@app.route("/order", methods=["GET"])
def get_all_orders():
    return order_controller.get_all_orders()

@app.route("/order/<string:order_id>", methods=["GET"])
def get_order_details(order_id):
    return order_controller.get_order_details(order_id)

# Cart routes
@app.route("/cart", methods=["GET"])
def get_cart():
    return cart_controller.get_cart()

@app.route("/cart/clear", methods=["POST"])
def clear_cart():
    return cart_controller.clear_cart()

@app.route("/cart/update/<barcode>", methods=["PUT"])
def update_cart_item(barcode):
    qty = int(request.json.get("qty", 1)) 
    return cart_controller.update_quantity(barcode, qty)

@app.route("/cart/remove/<barcode>", methods=["DELETE"])
def remove_cart_item(barcode):
    return cart_controller.remove_item(barcode)

@app.route("/checkout", methods=["POST"])
def checkout():
    return cart_controller.checkout()

# Barcode routes
@app.route('/video_feed')
def video_feed():
    return barcode_controller.video_feed()

@app.route("/camera/start", methods=["POST"])
def start_camera():
    scanner.start()
    return {"success": True, "message": "Camera đã bật"}

@app.route("/camera/stop", methods=["POST"])
def stop_camera():
    scanner.stop()
    return {"success": True, "message": "Camera đã tắt"}


# Cleanup
def cleanup():
    scanner.stop()

atexit.register(cleanup)

if __name__ == "__main__":
    try:
        app.run(debug=True, port=5000, threaded=True)
    except Exception as e:
        print(f"Lỗi: {e}")
    finally:
        cleanup()
