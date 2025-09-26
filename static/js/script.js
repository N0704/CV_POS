class BarcodeSystem {
  constructor() {
      this.currentProductId = null;
      this.init();
  }

  init() {
      this.updateCurrentTime();
      this.loadProducts();
      this.loadCart();
      this.setupEventListeners();
      setInterval(() => this.updateCurrentTime(), 1000);
      setInterval(() => this.loadCart(), 2000); // Auto-refresh cart
  }

  updateCurrentTime() {
      const now = new Date();
      document.getElementById('current-time').textContent = 
          now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
  }

  setupEventListeners() {
      // Cart controls
      document.getElementById('clear-cart').addEventListener('click', () => this.clearCart());
      document.getElementById('checkout').addEventListener('click', () => this.checkout());

      // Product management
      document.getElementById('add-product-btn').addEventListener('click', () => this.showProductModal());
      document.getElementById('cancel-btn').addEventListener('click', () => this.hideProductModal());
      document.getElementById('product-form').addEventListener('submit', (e) => this.saveProduct(e));

      // Modal controls
      document.querySelector('.close-modal').addEventListener('click', () => this.hideProductModal());
      document.getElementById('message-ok').addEventListener('click', () => this.hideMessageModal());

      // Close modals when clicking outside
      document.getElementById('product-modal').addEventListener('click', (e) => {
          if (e.target.id === 'product-modal') this.hideProductModal();
      });
      document.getElementById('message-modal').addEventListener('click', (e) => {
          if (e.target.id === 'message-modal') this.hideMessageModal();
      });
  }

  async loadCart() {
      try {
          const response = await fetch('/cart');
          const cart = await response.json();
          this.updateCartDisplay(cart);
      } catch (error) {
          console.error('Lỗi tải giỏ hàng:', error);
      }
  }

  updateCartDisplay(cart) {
      const cartItems = document.getElementById('cart-items');
      const cartCount = document.getElementById('cart-count');
      const totalAmount = document.getElementById('total-amount');

      if (Object.keys(cart).length === 0) {
          cartItems.innerHTML = `
              <div class="empty-cart">
                  <i class="fas fa-shopping-cart"></i>
                  <p>Chưa có sản phẩm nào</p>
              </div>
          `;
          totalAmount.textContent = '0';
          cartCount.textContent = 'Giỏ hàng: 0 sản phẩm';
          return;
      }

      let total = 0;
      let itemCount = 0;
      let cartHTML = '';

      for (const [barcode, item] of Object.entries(cart)) {
          total += item.total;
          itemCount += item.qty;
          cartHTML += `
              <div class="cart-item">
                  <div class="item-info">
                      <h4>${item.name}</h4>
                      <div class="price">${this.formatCurrency(item.price)} VNĐ</div>
                  </div>
                  <div class="item-quantity">
                      <span>SL: ${item.qty}</span>
                  </div>
                  <div class="item-total">
                      <strong>${this.formatCurrency(item.total)} VNĐ</strong>
                  </div>
              </div>
          `;
      }

      cartItems.innerHTML = cartHTML;
      totalAmount.textContent = this.formatCurrency(total);
      cartCount.textContent = `Giỏ hàng: ${itemCount} sản phẩm`;
  }

  async clearCart() {
      if (!confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) return;

      try {
          const response = await fetch('/cart/clear', { method: 'POST' });
          const result = await response.json();
          this.showMessage('Thành công', result.message, 'success');
          this.loadCart();
      } catch (error) {
          this.showMessage('Lỗi', 'Không thể xóa giỏ hàng', 'error');
      }
  }

  async checkout() {
      try {
          const response = await fetch('/checkout', { method: 'POST' });
          const result = await response.json();

          if (response.ok) {
              this.showMessage('Thành công', `Đơn hàng #${result.order_id} đã được tạo!`, 'success');
              this.loadCart();
          } else {
              this.showMessage('Lỗi', result.error, 'error');
          }
      } catch (error) {
          this.showMessage('Lỗi', 'Không thể thanh toán', 'error');
      }
  }

  async loadProducts() {
      try {
          const response = await fetch('/products');
          const products = await response.json();
          this.updateProductsDisplay(products);
      } catch (error) {
          console.error('Lỗi tải sản phẩm:', error);
      }
  }

  updateProductsDisplay(products) {
      const productsList = document.getElementById('products-list');
      
      if (products.length === 0) {
          productsList.innerHTML = '<p class="empty">Chưa có sản phẩm nào</p>';
          return;
      }

      productsList.innerHTML = products.map(product => `
          <div class="product-item">
              <div class="product-info">
                  <h4>${product.name}</h4>
                  <div class="barcode">Mã: ${product.barcode}</div>
                  <div class="price">${this.formatCurrency(product.price)} VNĐ</div>
              </div>
              <div class="product-actions">
                  <button class="btn btn-primary btn-sm" onclick="barcodeSystem.editProduct(${product.id})">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="barcodeSystem.deleteProduct(${product.id})">
                      <i class="fas fa-trash"></i>
                  </button>
              </div>
          </div>
      `).join('');
  }

  showProductModal(product = null) {
      const modal = document.getElementById('product-modal');
      const title = document.getElementById('modal-title');
      const form = document.getElementById('product-form');

      if (product) {
          title.textContent = 'Sửa Sản Phẩm';
          document.getElementById('barcode').value = product.barcode;
          document.getElementById('name').value = product.name;
          document.getElementById('price').value = product.price;
          this.currentProductId = product.id;
      } else {
          title.textContent = 'Thêm Sản Phẩm Mới';
          form.reset();
          this.currentProductId = null;
      }

      modal.classList.remove('hidden');
  }

  hideProductModal() {
      document.getElementById('product-modal').classList.add('hidden');
      this.currentProductId = null;
  }

  async saveProduct(e) {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const productData = {
          barcode: formData.get('barcode'),
          name: formData.get('name'),
          price: parseFloat(formData.get('price'))
      };

      try {
          const url = this.currentProductId ? 
              `/products/${this.currentProductId}` : '/products';
          const method = this.currentProductId ? 'PUT' : 'POST';

          const response = await fetch(url, {
              method: method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(productData)
          });

          if (response.ok) {
              this.hideProductModal();
              this.loadProducts();
              this.showMessage('Thành công', 
                  this.currentProductId ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới', 
                  'success');
          } else {
              const error = await response.json();
              this.showMessage('Lỗi', error.error, 'error');
          }
      } catch (error) {
          this.showMessage('Lỗi', 'Không thể lưu sản phẩm', 'error');
      }
  }

  editProduct(productId) {
      fetch('/products')
          .then(response => response.json())
          .then(products => {
              const product = products.find(p => p.id === productId);
              if (product) {
                  this.showProductModal(product);
              }
          });
  }

  async deleteProduct(productId) {
      if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

      try {
          const response = await fetch(`/products/${productId}`, { method: 'DELETE' });
          
          if (response.ok) {
              this.loadProducts();
              this.showMessage('Thành công', 'Đã xóa sản phẩm', 'success');
          } else {
              const error = await response.json();
              this.showMessage('Lỗi', error.error, 'error');
          }
      } catch (error) {
          this.showMessage('Lỗi', 'Không thể xóa sản phẩm', 'error');
      }
  }

  showMessage(title, content, type = 'success') {
      const modal = document.getElementById('message-modal');
      const icon = document.getElementById('message-icon');
      const messageTitle = document.getElementById('message-title');
      const messageContent = document.getElementById('message-content');

      messageTitle.textContent = title;
      messageContent.textContent = content;

      if (type === 'error') {
          icon.className = 'fas fa-exclamation-triangle error';
          icon.parentElement.classList.add('error');
      } else {
          icon.className = 'fas fa-check';
          icon.parentElement.classList.remove('error');
      }

      modal.classList.remove('hidden');
  }

  hideMessageModal() {
      document.getElementById('message-modal').classList.add('hidden');
  }

  formatCurrency(amount) {
      return new Intl.NumberFormat('vi-VN').format(amount);
  }
}

// Khởi tạo ứng dụng
const barcodeSystem = new BarcodeSystem();

// Xử lý thông báo quét từ server (WebSocket simulation)
const eventSource = new EventSource('/video_feed');
eventSource.onmessage = function(event) {
  // Có thể mở rộng để nhận thông báo quét real-time
  console.log('Scan event:', event.data);
};