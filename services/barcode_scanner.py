import cv2
import time
import winsound
from pyzbar.pyzbar import decode
from models.product_model import ProductModel


class BarcodeScanner:
    def __init__(self, camera_index=1, cooldown=1.5):
        # Camera
        self.cap = None
        self.camera_index = camera_index
        self.is_scanning = False

        # Barcode scan
        self.last_scan = 0
        self.cooldown = cooldown

        # Data
        self.product_model = ProductModel()
        self.cart = {}

    # ---------- Camera ----------
    def start(self):
        """Bật camera"""
        if not self.is_scanning:
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                raise RuntimeError("Không mở được camera")
            self.is_scanning = True

    def stop(self):
        """Tắt camera"""
        if self.is_scanning:
            self.is_scanning = False
            if self.cap:
                self.cap.release()
                self.cap = None
            cv2.destroyAllWindows()

    def generate_frames(self):
        """Stream video frames và quét barcode"""
        while self.is_scanning and self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                break

            # Quét barcode trên frame
            self.scan_barcodes(frame)

            # Encode JPEG để gửi về web
            ret, buffer = cv2.imencode(".jpg", frame)
            if not ret:
                continue

            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" +
                   buffer.tobytes() + b"\r\n")

            time.sleep(0.01)  # tránh CPU 100%

    # ---------- Barcode ----------
    def scan_barcodes(self, frame):
        """Quét tất cả barcode trong 1 frame"""
        for b in decode(frame):
            now = time.time()
            if now - self.last_scan < self.cooldown:
                continue

            barcode = b.data.decode("utf-8")
            product = self.product_model.get_product_by_barcode(barcode)
            if product:
                self._add_to_cart(barcode, product)
                self._beep()
                self.last_scan = now
                return barcode, product["name"]

        return None, None

    def _beep(self):
        """Âm báo sau khi quét thành công"""
        try:
            winsound.Beep(1000, 200)  # chỉ Windows
        except Exception:
            pass

    # ---------- Cart ----------
    def _add_to_cart(self, barcode, product):
        """Thêm sản phẩm vào giỏ"""
        if barcode in self.cart:
            self.cart[barcode]["qty"] += 1
        else:
            self.cart[barcode] = {
                "id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "qty": 1,
            }
        self.cart[barcode]["total"] = self.cart[barcode]["qty"] * self.cart[barcode]["price"]

    def update_quantity(self, barcode, qty):
        """Cập nhật số lượng sản phẩm"""
        if barcode not in self.cart:
            return
        if qty > 0:
            self.cart[barcode]["qty"] = qty
            self.cart[barcode]["total"] = qty * self.cart[barcode]["price"]
        else:
            self.remove_item(barcode)

    def remove_item(self, barcode):
        """Xóa sản phẩm khỏi giỏ"""
        self.cart.pop(barcode, None)

    def clear_cart(self):
        """Xóa toàn bộ giỏ"""
        self.cart.clear()

    def get_cart(self):
        """Lấy dữ liệu giỏ hàng"""
        return self.cart
