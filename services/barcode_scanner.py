import cv2
import time
import winsound
from pyzbar.pyzbar import decode
from models.product_model import ProductModel


class BarcodeScanner:
    def __init__(self, camera_index=1, cooldown=1.5):
        self.cap = None
        self.camera_index = camera_index
        self.is_scanning = False

        self.last_scan = 0
        self.cooldown = cooldown

        self.product_model = ProductModel()
        self.cart = {}
        self.mode = 1

    def start(self):
        if not self.is_scanning:
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                raise RuntimeError("Không mở được camera")
            self.is_scanning = True

    def stop(self):
        if self.is_scanning:
            self.is_scanning = False
            if self.cap:
                self.cap.release()
                self.cap = None
            cv2.destroyAllWindows()

    def set_mode(self, mode: int):
        self.mode = mode

    def generate_frames(self):
        """Yield các frame JPEG cho streaming."""
        while self.is_scanning and self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                break

            self.scan_barcodes(frame, self.mode)

            ret, buffer = cv2.imencode(".jpg", frame)
            if ret:
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" +
                       buffer.tobytes() + b"\r\n")

    def scan_barcodes(self, frame, mode=None):
        """Scan barcode và xử lý theo mode."""
        mode = mode or self.mode
        now = time.time()
        if now - self.last_scan < self.cooldown:
            return None

        self.last_scan = now

        barcode = self._decode_barcode(frame)
        if not barcode:
            return None

        elapsed = time.time() - now 
        print(f"Thời gian nhận: {elapsed:.2f} giây")

        product = self.product_model.get_product_by_barcode(barcode)
        self._draw_barcode(frame, barcode)

        if mode == 1:
            if not product:
                return None
            self._add_to_cart(barcode, product)
            self._beep()
        elif mode == 2:
            self._beep()
            if product:
                return {'success': False, 'message': "Sản phẩm này đã tồn tại."}
            return {'success': True, 'barcode': barcode}

        return None

    def _decode_barcode(self, frame):

        barcodes = decode(frame)
        if barcodes:
            return barcodes[0].data.decode("utf-8")

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        blurred = cv2.GaussianBlur(gray, (3, 3), 0)

        barcodes = decode(blurred)
        if barcodes:
            return barcodes[0].data.decode("utf-8")

        enhanced = cv2.convertScaleAbs(blurred, alpha=1.8, beta=40)

        barcodes = decode(enhanced)
        if barcodes:
            return barcodes[0].data.decode("utf-8")

        return None

    def _draw_barcode(self, frame, barcode_value):
        for b in decode(frame):
            if b.data.decode("utf-8") == barcode_value:
                x, y, w, h = b.rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                break

    def _beep(self):
        try:
            winsound.Beep(1200, 120) 
        except Exception:
            pass

    def _add_to_cart(self, barcode, product):
        item = self.cart.get(barcode)
        if item:
            item["qty"] += 1
        else:
            self.cart[barcode] = {
                "id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "qty": 1,
            }
        self.cart[barcode]["total"] = self.cart[barcode]["qty"] * self.cart[barcode]["price"]

    def update_quantity(self, barcode, qty):
        if barcode not in self.cart:
            return
        if qty > 0:
            self.cart[barcode]["qty"] = qty
            self.cart[barcode]["total"] = qty * self.cart[barcode]["price"]
        else:
            self.remove_item(barcode)

    def remove_item(self, barcode):
        self.cart.pop(barcode, None)

    def clear_cart(self):
        self.cart.clear()

    def get_cart(self):
        return self.cart

    def get_barcode(self, mode=2, timeout=3):
        if not self.cap or not self.cap.isOpened():
            self.start()

        start_time = time.time()
        while time.time() - start_time < timeout:
            ret, frame = self.cap.read()
            if not ret:
                return {'success': False, 'message': 'Không đọc được frame'}

            result = self.scan_barcodes(frame, mode)
            if result is not None:
                return result

        return {'success': False, 'message': 'Không nhận được barcode'}
