class ProductSystem {
  constructor() {
    this.barcodeInterval = null;
    this.lastBarcode = null;
    this.init();
  }

  init() {
    this.updateCurrentTime();
    this.formatDateTime();
    this.setupEventListeners();
    this.loadProduct();
    this.getBarcode();

    setInterval(() => this.updateCurrentTime(), 1000);
  }

  async request(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`Fetch error [${url}]:`, err);
      throw err;
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount || 0);
  }

  formatDateTime(date) {
    const d = new Date(date);
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN");
  }

  updateCurrentTime() {
    const now = new Date();
    const el = document.getElementById("currentTime");
    if (el)
      el.textContent =
        now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN");
  }

  async loadProduct() {
    const products = await this.request("/products");
    console.log("📦 Dữ liệu trả về:", products);
    const count = document.getElementById("productCount");
    if (count) count.textContent = products.length;
    const tbody = document.querySelector("#productsTable tbody");
    if (!tbody) return;

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-neutral-500">Chưa có sản phẩm nào</td></tr>`;
      return;
    }

    tbody.innerHTML = products
      .map(
        (p, index) => `
            <tr class="odd:bg-white even:bg-neutral-50">
                <td class="px-4 py-3">${index + 1}</td>
                <td class="px-4 py-3">${p.name}</td>
                <td class="px-4 py-3">${this.formatCurrency(p.price)}₫</td>
                <td class="px-4 py-3">${p.stock}</td>
                <td class="px-4 py-3 flex justify-center items-center gap-1.5">
                        <i onclick="productSystem.showUpdateProduct(${
                          p.id
                        })" data-lucide="square-pen" class="w-4 h-4 cursor-pointer text-neutral-800 hover:opacity-60"></i>
                        <i onclick="productSystem.deleteProduct(${
                          p.id
                        })" data-lucide="trash" class="w-4 h-4 cursor-pointer text-primary hover:opacity-60"></i>
                </td>
            </tr>
        `
      )
      .join("");

    if (typeof lucide !== "undefined" && lucide.createIcons)
      lucide.createIcons();
  }

  async getBarcode() {
    const data = await this.request("/get_barcode", { method: "GET" });

    if (data.success && data.barcode) {
      if (data.barcode !== this.lastBarcode) {
        document.getElementById("productBarcode").value = data.barcode;

        this.showToast("Thành công", "Đã quét mã mới", "success");
      }
    } else if (data.message === "Sản phẩm này đã tồn tại.") {
      this.showToast("Lỗi", data.message, "error");
    } else {
      console.log(data?.message || "Không xác định");
    }
  }

  async addProduct(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const barcode = formData.get("Barcode");

    const productData = {
      Barcode: barcode,
      Name: formData.get("Name"),
      Price: parseFloat(formData.get("Price")),
      Stock: parseInt(formData.get("Stock")),
    };

    try {
      const res = await fetch(`/product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const result = await res.json();

      if (res.ok) {
        this.showToast("Thành công", "Đã thêm sản phẩm mới", "success");
        this.hideModal("newProductModal");
        this.clearProductForm();
        this.loadProduct();
      } else {
        this.showToast(
          "Lỗi",
          result.error || "Không thể thêm sản phẩm",
          "error"
        );
      }
    } catch (error) {
      console.error("Lỗi khi thêm sản phẩm:", error);
      this.showToast("Lỗi", "Không thể thêm sản phẩm", "error");
    }
  }

  clearProductForm() {
    document.getElementById("productBarcode").value = null;
    document.getElementById("productName").value = null;
    document.getElementById("productPrice").value = null;
    document.getElementById("productStock").value = null;
  }

  async showUpdateProduct(productId) {
    try {
      const product = await this.request(`/product/${productId}`, {
        method: "GET",
      });

      if (product) {
        document.getElementById("updateProductId").value = product.id;
        document.getElementById("updateProductBarcode").value = product.barcode;
        document.getElementById("updateProductName").value = product.name;
        document.getElementById("updateProductPrice").value = product.price;
        document.getElementById("updateProductStock").value = product.stock;

        this.showModal("updateProductModal");
      }

      lucide.createIcons();
    } catch (err) {
      console.error("Lỗi khi lấy thông tin sản phẩm:", err);
      alert("Không thể tải thông tin sản phẩm.");
    }
  }

  async submitUpdateProduct(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const productId = document.getElementById("updateProductId").value;

    const productData = {
      Name: formData.get("Name"),
      Price: parseFloat(formData.get("Price")),
      Stock: parseInt(formData.get("Stock")),
    };

    try {
      const res = await fetch(`/product/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const result = await res.json();

      if (res.ok) {
        this.showToast("Thành công", "Đã cập nhật sản phẩm", "success");
        this.hideModal("updateProductModal");
        this.loadProduct();
      } else {
        this.showToast(
          "Lỗi",
          result.error || "Không thể cập nhật sản phẩm",
          "error"
        );
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật sản phẩm:", error);
      this.showToast("Lỗi", "Không thể cập nhật sản phẩm", "error");
    }
  }

  async deleteProduct(productId) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      const res = await fetch(`/product/${productId}`, { method: "DELETE" });
      const result = await res.json();

      if (res.ok) {
        this.showToast(
          "Thành công",
          result.message || "Đã xóa sản phẩm",
          "success"
        );
        this.loadProduct();
      } else {
        this.showToast(
          "Lỗi",
          result.error || "Không thể xóa sản phẩm",
          "error"
        );
      }
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      this.showToast("Lỗi", "Không thể xóa sản phẩm", "error");
    }
  }

  showToast(title, message, type = "success", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `
            flex items-start gap-3 p-4 rounded-lg shadow-md bg-white border border-gray-200 animate-slide-in
            ${type === "success" ? "" : "bg-red-50 border-red-200"}
        `;

    toast.innerHTML = `
            <div class="flex-shrink-0 mt-0.5">
                ${
                  type === "success"
                    ? '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
                    : '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>'
                }
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-900">${title}</p>
                <p class="text-gray-500 text-sm">${message}</p>
            </div>
            <button class="ml-2 text-gray-400 hover:text-gray-600">&times;</button>
        `;

    toast.querySelector("button").addEventListener("click", () => {
      toast.classList.add("animate-slide-out");
      toast.addEventListener("animationend", () => toast.remove());
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("animate-slide-out");
      toast.addEventListener("animationend", () => toast.remove());
    }, duration);
  }

  startBarcodeAutoRefresh() {
    if (this.barcodeInterval) return;
    this.barcodeInterval = setInterval(() => this.getBarcode(), 1000);
  }

  stopBarcodeAutoRefresh() {
    if (this.barcodeInterval) {
      clearInterval(this.barcodeInterval);
      this.barcodeInterval = null;
    }
  }

  async startCamera(mode = 2) {
    const camEl = document.getElementById("video-feed");
    const loader = document.getElementById("camera-loading");

    if (loader) {
      loader.classList.remove("hidden");
      loader.classList.add("flex");
    }

    await this.request(`/camera/start/${mode}`, { method: "POST" });

    if (camEl) {
      camEl.classList.add("hidden");

      camEl.onload = () => {
        if (loader) {
          loader.classList.add("hidden");
          loader.classList.remove("flex");
        }
        camEl.classList.remove("hidden");
        this.startBarcodeAutoRefresh();
      };

      camEl.onerror = () => {
        if (loader) {
          loader.classList.add("hidden");
          loader.classList.remove("flex");
        }
        camEl.src = "";
        camEl.classList.add("hidden");
      };

      camEl.src = "/video_feed?" + Date.now();
    }
  }

  async stopCamera() {
    await this.request("/camera/stop", { method: "POST" });
    const videoFeed = document.getElementById("video-feed");
    if (videoFeed) {
      videoFeed.src = "";
    }
    this.stopBarcodeAutoRefresh();
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (modalId === "newProductModal") {
      this.startCamera();
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideModal(modalId);
      }
    });
  }

  hideModal(modalId = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("flex");
    modal.classList.add("hidden");

    if (modalId === "newProductModal") {
      this.stopCamera();
      this.clearProductForm();
    }
  }

  setupEventListeners() {
    document.querySelectorAll(".closeModalBtn").forEach((btn) => {
      btn.addEventListener("click", () => this.hideModal("updateProductModal"));
    });

    const newProductBtn = document.getElementById("openNewProductModal");
    if (newProductBtn) {
      newProductBtn.addEventListener("click", () =>
        this.showModal("newProductModal")
      );
    }

    document.querySelectorAll(".closeNewProductModal").forEach((btn) => {
      btn.addEventListener("click", () => this.hideModal("newProductModal"));
    });

    const createBtn = document.getElementById("createProductForm");
    if (createBtn)
      createBtn.addEventListener("submit", (e) => this.addProduct(e));

    const updateBtn = document.getElementById("updateProductForm");
    if (updateBtn)
      updateBtn.addEventListener("submit", (e) => this.submitUpdateProduct(e));
  }
}

const productSystem = new ProductSystem();
