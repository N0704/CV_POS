class OrderSystem {
    constructor() {
        this.init();
    }

    init() {
        this.updateCurrentTime();
        this.formatDateTime();
        this.loadCart();
        this.setupEventListeners();
        this.loadOrder();

        setInterval(() => this.updateCurrentTime(), 1000);
        setInterval(() => this.loadCart(), 1000);
    }

    // ----------------- Helpers -----------------
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

    // ----------------- Order -----------------
    async loadOrder() {
        const orders = await this.request("/order");
        const count = document.getElementById("orderCount");
        if (count) count.textContent = orders.length;
        const tbody = document.querySelector("#ordersTable tbody");
        if (!tbody) return;
    
        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-neutral-500">Chưa có đơn hàng nào</td></tr>`;
            return;
        }
  
        tbody.innerHTML = orders.map((o, index) => `
            <tr class="odd:bg-white even:bg-neutral-50">
                <td class="px-4 py-3">${index + 1}</td>
                <td class="px-4 py-3">${o.id}</td>
                <td class="px-4 py-3">${this.formatDateTime(o.order_date)}</td>
                <td class="px-4 py-3">${this.formatCurrency(o.total)}₫</td>
                <td class="px-4 py-3 flex justify-center hover:opacity-60">
                        <i onclick="orderSystem.showOrderDetails('${o.id}')" data-lucide="ellipsis" class="w-4 h-4 cursor-pointer"></i>
                </td>
            </tr>
        `).join("");
    
        if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    }

    async showOrderDetails(orderId) {
        try {
            // Gọi API, encode để an toàn
            const items = await this.request(`/order/${orderId}`);
            // Header & ngày
            const titleEl = document.getElementById("orderModalTitle");
            const dateEl = document.getElementById("orderModalDate");
            if (titleEl) titleEl.innerText = `Đơn hàng #${orderId}`;
            if (dateEl) dateEl.innerText = `Ngày: ${items[0].order_date || "-"}`;
    
            // Table sản phẩm
            const tbody = document.getElementById("orderModalBody");
            if (tbody) {
                tbody.innerHTML = items.map(item => `
                    <tr class="text-sm text-neutral-800 text-center hover:bg-neutral-50 transition-colors">
                        <td class="px-8 py-4 text-left w-1/2">
                            <div>
                                <p class="font-medium text-neutral-800">${item.name || "Không có tên"}</p>
                                <p class="text-neutral-500 text-xs mt-1">Mã: ${item.barcode || "-"}</p>
                            </div>
                        </td>
                        <td class="px-4 py-4 w-1/6">${this.formatCurrency(item.price)}₫</td>
                        <td class="px-4 py-4 w-1/6">${item.quantity}</td>
                        <td class="px-4 py-4 w-1/6">${this.formatCurrency(item.total)}₫</td>
                    </tr>
                `).join("");
            }
    
            // Tổng thanh toán
            const total = items.reduce((sum, i) => sum + (i.total || 0), 0);
            const totalPaymentEl = document.querySelector("#orderModal .totalPayment");
            const grandTotalEl = document.querySelector("#orderModal .grandTotal");
            if (totalPaymentEl) totalPaymentEl.innerText = this.formatCurrency(total) + "₫";
            if (grandTotalEl) grandTotalEl.innerText = this.formatCurrency(total) + "₫";
    
            // Lucide icons
            if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    
            // Hiển thị modal
            this.showModal("orderModal");
    
        } catch (err) {
            console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
            alert("Không thể tải chi tiết đơn hàng.");
        }
    }
    
    
    
    

    // ----------------- Cart UI -----------------
    updateCurrentTime() {
        const now = new Date();
        const el = document.getElementById("currentTime");
        if (el) el.textContent = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN");
    }

    renderCartRow(barcode, item) {
        return `
        <tr class="text-sm text-neutral-800 hover:bg-neutral-50 transition-colors">
            <td class="px-6 py-4">
                <div>
                    <p class="font-medium text-neutral-800">${item.name || "Không có tên"}</p>
                    <p class="text-neutral-500 text-xs mt-1">Mã: ${barcode}</p>
                </div>
            </td>
            <td class="px-4 py-4 text-center">${this.formatCurrency(item.price)}₫</td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button class="w-6 h-6 flex items-center justify-center border border-neutral-300 rounded bg-white hover:bg-neutral-100"
                        onclick="orderSystem.updateQty('${barcode}', ${item.qty - 1})">-</button>
                    <span class="w-8 text-center">${item.qty}</span>
                    <button class="w-6 h-6 flex items-center justify-center border border-neutral-300 rounded bg-white hover:bg-neutral-100"
                        onclick="orderSystem.updateQty('${barcode}', ${item.qty + 1})">+</button>
                </div>
            </td>
            <td class="px-4 py-4 text-center font-semibold">${this.formatCurrency(item.total)}₫</td>
            <td class="px-4 py-3 text-center">
                <button class="text-red-400 hover:text-red-700 transition mt-1 cursor-pointer" 
                    onclick="orderSystem.removeItem('${barcode}')">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </td>
        </tr>
        `;
    }

    updateCartDisplay(cart) {
        const tbody = document.querySelector("#orderNewModal tbody");
        const totalEl = document.querySelector("#orderNewModal .text-lg.font-bold");
        if (!tbody || !totalEl) return;

        if (!cart || Object.keys(cart).length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-neutral-500">Chưa có sản phẩm nào</td></tr>`;
            totalEl.textContent = "0₫";
            return;
        }

        let total = 0;
        let rows = "";

        for (const [barcode, item] of Object.entries(cart)) {
            total += item.total || 0;
            rows += this.renderCartRow(barcode, item);
        }

        tbody.innerHTML = rows;
        if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
        totalEl.textContent = this.formatCurrency(total) + "₫";
    }

    // ----------------- Toast Notification -----------------
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
                ${type === "success" ? 
                    '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
                    :
                    '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>'
                }
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-900">${title}</p>
                <p class="text-gray-500 text-sm">${message}</p>
            </div>
            <button class="ml-2 text-gray-400 hover:text-gray-600">&times;</button>
        `;
    
        // Đóng khi click nút ×
        toast.querySelector("button").addEventListener("click", () => {
            toast.classList.add("animate-slide-out");
            toast.addEventListener("animationend", () => toast.remove());
        });
    
        container.appendChild(toast);
    
        // Tự xóa sau duration
        setTimeout(() => {
            toast.classList.add("animate-slide-out");
            toast.addEventListener("animationend", () => toast.remove());
        }, duration);
    }
    

    // ----------------- Cart actions -----------------
    async loadCart() {
        const cart = await this.request("/cart");
        this.updateCartDisplay(cart);
    }

    async updateQty(barcode, qty) {
        if (qty <= 0) return this.removeItem(barcode);
        await this.request(`/cart/update/${barcode}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qty }),
        });
        this.loadCart();
    }

    async checkout() {
        const result = await this.request("/checkout", { method: "POST" });
        this.showToast("Lưu thành công!", `Đơn hàng ${result.order_id} đã được tạo!`, "success");
        this.loadCart();
    }

    async removeItem(barcode) {
        await this.request(`/cart/remove/${barcode}`, { method: "DELETE" });
        this.loadCart();
    }

    async clearCartAndClose(modalId) {
        if (!confirm("Bạn có chắc muốn hủy đơn hàng?")) return;
        await this.request("/cart/clear", { method: "POST" });
        this.loadCart();
        this.hideModal(modalId, { skipClear: true });
        location.reload();
    }

    // ----------------- Camera -----------------
    async startCamera() {
        const camEl = document.getElementById("video-feed");
        const loader = document.getElementById("camera-loading");
    
        if (loader) {
            loader.classList.remove("hidden");
            loader.classList.add("flex");
        }
    
        await this.request("/camera/start", { method: "POST" });
    
        if (camEl) {
            camEl.classList.add("hidden");
    
            camEl.onload = () => {
                if (loader) {
                    loader.classList.add("hidden");
                    loader.classList.remove("flex");
                }
                camEl.classList.remove("hidden");
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
    }

    // ----------------- Modal -----------------
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
      
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      
        if (modalId === "orderNewModal") {
          this.startCamera();
        }
      
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.hideModal(modalId);
          }
        });
    }

    hideModal(modalId, { skipClear = false } = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
    
        modal.classList.remove("flex");
        modal.classList.add("hidden");
    
        if (modalId === "orderNewModal") {
            this.stopCamera();
            if (!skipClear) this.clearCart();
        }
    }

    // ----------------- Events -----------------
    setupEventListeners() {         
        document.querySelectorAll(".closeModalBtn").forEach((btn) => {
            btn.addEventListener("click", () => this.hideModal("orderModal"));
        });
          
        const newOrderBtn = document.getElementById("openNewOrderModal");
        if (newOrderBtn) {
            newOrderBtn.addEventListener("click", () => this.showModal("orderNewModal"));
        }
          
        document.querySelectorAll(".closeNewOrderModal").forEach((btn) => {
            btn.addEventListener("click", () => this.clearCartAndClose("orderNewModal"));
        });

        const checkoutBtn = document.getElementById("checkout");
        if (checkoutBtn) checkoutBtn.addEventListener("click", () => this.checkout());
    }
}

const orderSystem = new OrderSystem();
