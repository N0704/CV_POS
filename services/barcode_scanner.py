import cv2
import time
import winsound
import threading
from pyzbar.pyzbar import decode
from models.product_model import ProductModel

class BarcodeScanner:
    def __init__(self):
        self.cap = cv2.VideoCapture(1)
        self.last_scan = 0
        self.cooldown = 1.5
        self.product_model = ProductModel()
        self.cart = {}
        self.is_scanning = True
    
    def scan_barcode(self, frame):
        barcodes = decode(frame)
        if barcodes:
            now = time.time()
            if now - self.last_scan >= self.cooldown:
                barcode = barcodes[0].data.decode("utf-8")
                product = self.product_model.get_product_by_barcode(barcode)
                if product:
                    self._add_to_cart(barcode, product)
                    winsound.Beep(1000, 200)
                    self.last_scan = now
                    return barcode, product["name"]
        return None, None
    
    def _add_to_cart(self, barcode, product):
        if barcode in self.cart:
            self.cart[barcode]["qty"] += 1
            self.cart[barcode]["total"] = self.cart[barcode]["qty"] * product["price"]
        else:
            self.cart[barcode] = {
                "id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "qty": 1,
                "total": product["price"]
            }
    
    def get_cart(self):
        return self.cart
    
    def clear_cart(self):
        self.cart = {}
    
    def generate_frames(self):
        while self.is_scanning:
            ret, frame = self.cap.read()
            if not ret: 
                break
            self.scan_barcode(frame)
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    
    def stop(self):
        self.is_scanning = False
        self.cap.release()
        cv2.destroyAllWindows()