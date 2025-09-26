from flask import Response
from services.barcode_scanner import BarcodeScanner

class BarcodeController:
    def __init__(self, barcode_scanner):
        self.barcode_scanner = barcode_scanner
    
    def video_feed(self):
        return Response(
            self.barcode_scanner.generate_frames(), 
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )