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
        self.mode = 1 

    # ---------------- Camera ----------------
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

            time.sleep(0.01)

    # ---------------- Barcode ----------------
    def scan_barcodes(self, frame, mode=None):
        """Scan barcode và xử lý theo mode."""
        mode = mode or self.mode
        now = time.time()
        if now - self.last_scan < self.cooldown:
            return None

        barcode = self._decode_barcode(frame)
        if not barcode:
            return None

        product = self.product_model.get_product_by_barcode(barcode)
        self._draw_barcode(frame, barcode)

        self.last_scan = now

        if mode == 1 and product:
            self._add_to_cart(barcode, product)
            self._beep()
        elif mode == 2:
            if product:
                return {'success': False, 'message': "Sản phẩm này đã tồn tại."}
            self._beep()
            return {'success': True, 'barcode': barcode}

        return None

    def _decode_barcode(self, frame):
        """Decode barcode với các phương pháp cải thiện độ chính xác."""
        barcodes = decode(frame)
        if barcodes:
            return barcodes[0].data.decode("utf-8")

        # Thử enhance frame
        enhanced = cv2.convertScaleAbs(frame, alpha=1.5, beta=40)
        barcodes = decode(enhanced)
        if barcodes:
            return barcodes[0].data.decode("utf-8")

        # Thử grayscale + equalize
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        equalized = cv2.equalizeHist(gray)
        barcodes = decode(equalized)
        if barcodes:
            return barcodes[0].data.decode("utf-8")

        return None

    def _draw_barcode(self, frame, barcode_value):
        for b in decode(frame):
            if b.data.decode("utf-8") == barcode_value:
                x, y, w, h = b.rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

    def _beep(self):
        try:
            winsound.Beep(1000, 200)
        except Exception:
            pass

    # ---------------- Cart ----------------
    def _add_to_cart(self, barcode, product):
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

    # ---------------- Scan one barcode ----------------
    def get_barcode(self, mode=2):
        """Quét một barcode từ camera."""
        if not self.cap or not self.cap.isOpened():
            return {'success': False, 'message': 'Camera chưa mở'}

        ret, frame = self.cap.read()
        if not ret:
            return {'success': False, 'message': 'Không đọc được frame'}

        result = self.scan_barcodes(frame, mode)
        if result is None:
            return {'success': False, 'message': 'Chưa quét được barcode'}

        return result

        
