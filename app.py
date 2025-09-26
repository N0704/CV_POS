from flask import Flask, render_template
from services.barcode_scanner import BarcodeScanner
from controllers.product_controller import ProductController
from controllers.cart_controller import CartController
from controllers.barcode_controller import BarcodeController
import atexit

app = Flask(__name__)

# Khởi tạo services
barcode_scanner = BarcodeScanner()

# Khởi tạo controllers
product_controller = ProductController()
cart_controller = CartController(barcode_scanner)
barcode_controller = BarcodeController(barcode_scanner)

# Routes
@app.route("/")
def home():
    return render_template("index.html")

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

# Cart routes
@app.route("/cart", methods=["GET"])
def get_cart():
    return cart_controller.get_cart()

@app.route("/cart/clear", methods=["POST"])
def clear_cart():
    return cart_controller.clear_cart()

@app.route("/checkout", methods=["POST"])
def checkout():
    return cart_controller.checkout()

# Barcode routes
@app.route('/video_feed')
def video_feed():
    return barcode_controller.video_feed()

# Cleanup
def cleanup():
    barcode_scanner.stop()

atexit.register(cleanup)

if __name__ == "__main__":
    try:
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"Lỗi: {e}")
    finally:
        cleanup()