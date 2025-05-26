class InventoryManager {
    constructor() {
        this.data = {
            inventory: [],
            sales: [],
            expenses: [],
            creditPayments: []
        };
        this.googleDriveFileId = '1CZknPLSLz4LECfLMyPZP4Iadkmry4Kgb';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setTodayDate();
        await this.loadData();
        this.updateDashboard();
        this.populateInventorySelect();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('inventoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addInventoryItem();
        });

        document.getElementById('billingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSale();
        });

        document.getElementById('expensesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('selectedDate').value = today;
    }

    showLoading() {
        document.getElementById('loading').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('show');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    async loadData() {
        this.showLoading();
        try {
            // For demo purposes, we'll use localStorage
            // In production, you'd implement Google Drive API integration
            const savedData = localStorage.getItem('inventoryData');
            if (savedData) {
                this.data = JSON.parse(savedData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading data', 'error');
        }
        this.hideLoading();
    }

    async saveData() {
        this.showLoading();
        try {
            // For demo purposes, we'll use localStorage
            // In production, you'd implement Google Drive API integration
            localStorage.setItem('inventoryData', JSON.stringify(this.data));
            this.showToast('Data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data', 'error');
        }
        this.hideLoading();
    }

    addInventoryItem() {
        const name = document.getElementById('itemName').value;
        const description = document.getElementById('itemDescription').value;
        const quantity = parseInt(document.getElementById('itemQuantity').value);
        const cost = parseFloat(document.getElementById('itemCost').value);

        const item = {
            id: Date.now(),
            name,
            description,
            quantity,
            cost,
            dateAdded: new Date().toISOString()
        };

        this.data.inventory.push(item);
        this.saveData();
        this.displayInventory();
        this.populateInventorySelect();
        this.updateDashboard();
        
        document.getElementById('inventoryForm').reset();
        this.showToast('Item added to inventory');
    }

    createSale() {
        const customerName = document.getElementById('customerName').value;
        const itemId = parseInt(document.getElementById('saleItem').value);
        const quantity = parseInt(document.getElementById('saleQuantity').value);
        const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
        const paymentType = document.getElementById('paymentType').value;

        // Find the item in inventory
        const itemIndex = this.data.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            this.showToast('Item not found', 'error');
            return;
        }

        const item = this.data.inventory[itemIndex];
        if (item.quantity < quantity) {
            this.showToast('Insufficient quantity in inventory', 'error');
            return;
        }

        // Create sale record
        const sale = {
            id: Date.now(),
            customerName,
            itemId,
            itemName: item.name,
            quantity,
            sellingPrice,
            totalAmount: quantity * sellingPrice,
            paymentType,
            costPrice: item.cost,
            profit: (sellingPrice - item.cost) * quantity,
            date: new Date().toISOString(),
            isPaid: paymentType === 'paid'
        };

        // Update inventory
        this.data.inventory[itemIndex].quantity -= quantity;

        // Add sale
        this.data.sales.push(sale);

        this.saveData();
        this.displaySales();
        this.displayCreditCustomers();
        this.populateInventorySelect();
        this.updateDashboard();
        
        document.getElementById('billingForm').reset();
        this.showToast('Sale created successfully');
    }

    addExpense() {
        const description = document.getElementById('expenseDescription').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;

        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            date: new Date().toISOString()
        };

        this.data.expenses.push(expense);
        this.saveData();
        this.displayExpenses();
        this.updateDashboard();
        
        document.getElementById('expensesForm').reset();
        this.showToast('Expense added successfully');
    }

    markAsPaid(saleId) {
        const saleIndex = this.data.sales.findIndex(sale => sale.id === saleId);
        if (saleIndex !== -1) {
            this.data.sales[saleIndex].isPaid = true;
            
            // Add to credit payments
            const payment = {
                id: Date.now(),
                saleId,
                customerName: this.data.sales[saleIndex].customerName,
                amount: this.data.sales[saleIndex].totalAmount,
                datePaid: new Date().toISOString()
            };
            
            this.data.creditPayments.push(payment);
            this.saveData();
            this.displayCreditCustomers();
            this.updateDashboard();
            this.showToast('Payment marked as received');
        }
    }

    updateDashboard() {
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate totals
        const todaySales = this.data.sales.filter(sale => 
            sale.date.split('T')[0] === today
        );
        
        const cashTotal = todaySales
            .filter(sale => sale.isPaid)
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
        
        const creditTotal = todaySales
            .filter(sale => !sale.isPaid)
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
        
        const todayExpenses = this.data.expenses
            .filter(expense => expense.date.split('T')[0] === today)
            .reduce((sum, expense) => sum + expense.amount, 0);
        
        const todayProfit = todaySales.reduce((sum, sale) => sum + sale.profit, 0) - todayExpenses;

        // Update display
        document.getElementById('cashTotal').textContent = `$${cashTotal.toFixed(2)}`;
        document.getElementById('creditTotal').textContent = `$${creditTotal.toFixed(2)}`;
        document.getElementById('expensesTotal').textContent = `$${todayExpenses.toFixed(2)}`;
        
        const profitElement = document.getElementById('todayProfit');
        profitElement.textContent = `$${todayProfit.toFixed(2)}`;
        profitElement.className = todayProfit >= 0 ? 'profit-positive' : 'profit-negative';

        this.displayRecentActivities();
    }

    displayInventory() {
        const container = document.getElementById('inventoryItems');
        
        if (this.data.inventory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <p>No items in inventory</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.inventory.map(item => `
            <div class="item-card">
                <div class="card-header">
                    <div class="card-title">${item.name}</div>
                    <div class="card-actions">
                        <button class="btn btn-danger btn-small" onclick="inventoryManager.removeItem(${item.id})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Description</span>
                        <span class="detail-value">${item.description || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Quantity</span>
                        <span class="detail-value">${item.quantity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cost per Unit</span>
                        <span class="detail-value">$${item.cost.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Value</span>
                        <span class="detail-value">$${(item.quantity * item.cost).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date Added</span>
                        <span class="detail-value">${new Date(item.dateAdded).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displaySales() {
        const container = document.getElementById('salesList');
        const recentSales = this.data.sales.slice(-10).reverse();
        
        if (recentSales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>No sales recorded</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentSales.map(sale => `
            <div class="sale-card">
                <div class="card-header">
                    <div class="card-title">${sale.customerName}</div>
                    <div class="card-actions">
                        <span class="status-${sale.isPaid ? 'paid' : 'credit'}">
                            ${sale.isPaid ? 'Paid' : 'Credit'}
                        </span>
                    </div>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Item</span>
                        <span class="detail-value">${sale.itemName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Quantity</span>
                        <span class="detail-value">${sale.quantity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Price per Unit</span>
                        <span class="detail-value">$${sale.sellingPrice.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Amount</span>
                        <span class="detail-value">$${sale.totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Profit</span>
                        <span class="detail-value ${sale.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                            $${sale.profit.toFixed(2)}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date</span>
                        <span class="detail-value">${new Date(sale.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayCreditCustomers() {
        const container = document.getElementById('creditCustomers');
        const creditSales = this.data.sales.filter(sale => !sale.isPaid);
        
        if (creditSales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>No credit customers</p>
                </div>
            `;
            return;
        }

        container.innerHTML = creditSales.map(sale => `
            <div class="credit-card">
                <div class="card-header">
                    <div class="card-title">${sale.customerName}</div>
                    <div class="card-actions">
                        <button class="btn btn-success btn-small" onclick="inventoryManager.markAsPaid(${sale.id})">
                            <i class="fas fa-check"></i> Mark Paid
                        </button>
                    </div>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Item</span>
                        <span class="detail-value">${sale.itemName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Amount Due</span>
                        <span class="detail-value">$${sale.totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Sale Date</span>
                        <span class="detail-value">${new Date(sale.date).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Days Outstanding</span>
                        <span class="detail-value">${Math.floor((new Date() - new Date(sale.date)) / (1000 * 60 * 60 * 24))} days</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayExpenses() {
        const container = document.getElementById('expensesList');
        const recentExpenses = this.data.expenses.slice(-10).reverse();
        
        if (recentExpenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No expenses recorded</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentExpenses.map(expense => `
            <div class="expense-card">
                <div class="card-header">
                    <div class="card-title">${expense.description}</div>
                    <div class="card-actions">
                        <button class="btn btn-danger btn-small" onclick="inventoryManager.removeExpense(${expense.id})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Amount</span>
                        <span class="detail-value">$${expense.amount.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Category</span>
                        <span class="detail-value">${expense.category}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date</span>
                        <span class="detail-value">${new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayRecentActivities() {
        const container = document.getElementById('recentActivities');
        const today = new Date().toISOString().split('T')[0];
        
        // Combine all activities for today
        const activities = [];
        
        // Add today's sales
        this.data.sales
            .filter(sale => sale.date.split('T')[0] === today)
            .forEach(sale => {
                activities.push({
                    type: 'sale',
                    icon: 'fas fa-shopping-cart',
                    title: `Sale to ${sale.customerName}`,
                    description: `${sale.quantity}x ${sale.itemName} - $${sale.totalAmount.toFixed(2)} (${sale.isPaid ? 'Paid' : 'Credit'})`,
                    time: new Date(sale.date).toLocaleTimeString(),
                    date: sale.date
                });
            });
        
        // Add today's expenses
        this.data.expenses
            .filter(expense => expense.date.split('T')[0] === today)
            .forEach(expense => {
                activities.push({
                    type: 'expense',
                    icon: 'fas fa-receipt',
                    title: `Expense: ${expense.description}`,
                    description: `$${expense.amount.toFixed(2)} - ${expense.category}`,
                    time: new Date(expense.date).toLocaleTimeString(),
                    date: expense.date
                });
            });
        
        // Add today's inventory additions
        this.data.inventory
            .filter(item => item.dateAdded.split('T')[0] === today)
            .forEach(item => {
                activities.push({
                    type: 'inventory',
                    icon: 'fas fa-boxes',
                    title: `Added to inventory: ${item.name}`,
                    description: `${item.quantity} units at $${item.cost.toFixed(2)} each`,
                    time: new Date(item.dateAdded).toLocaleTimeString(),
                    date: item.dateAdded
                });
            });
        
        // Sort by time (newest first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-day"></i>
                    <p>No activities today</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-card">
                <div class="card-header">
                    <div class="card-title">
                        <i class="${activity.icon}"></i> ${activity.title}
                    </div>
                    <div class="detail-value">${activity.time}</div>
                </div>
                <p>${activity.description}</p>
            </div>
        `).join('');
    }

    populateInventorySelect() {
        const select = document.getElementById('saleItem');
        const availableItems = this.data.inventory.filter(item => item.quantity > 0);
        
        select.innerHTML = '<option value="">Select an item</option>';
        
        availableItems.forEach(item => {
            select.innerHTML += `
                <option value="${item.id}">
                    ${item.name} (Available: ${item.quantity})
                </option>
            `;
        });
    }

    removeItem(itemId) {
        if (confirm('Are you sure you want to remove this item from inventory?')) {
            this.data.inventory = this.data.inventory.filter(item => item.id !== itemId);
            this.saveData();
            this.displayInventory();
            this.populateInventorySelect();
            this.updateDashboard();
            this.showToast('Item removed from inventory');
        }
    }

    removeExpense(expenseId) {
        if (confirm('Are you sure you want to remove this expense?')) {
            this.data.expenses = this.data.expenses.filter(expense => expense.id !== expenseId);
            this.saveData();
            this.displayExpenses();
            this.updateDashboard();
            this.showToast('Expense removed');
        }
    }

    loadDayData() {
        const selectedDate = document.getElementById('selectedDate').value;
        if (!selectedDate) {
            this.showToast('Please select a date', 'warning');
            return;
        }

        // Filter data for selected date
        const dayData = {
            sales: this.data.sales.filter(sale => sale.date.split('T')[0] === selectedDate),
            expenses: this.data.expenses.filter(expense => expense.date.split('T')[0] === selectedDate),
            inventory: this.data.inventory.filter(item => item.dateAdded.split('T')[0] === selectedDate)
        };

        // Calculate day totals
        const dayRevenue = dayData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const dayExpenses = dayData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const dayProfit = dayData.sales.reduce((sum, sale) => sum + sale.profit, 0) - dayExpenses;
        const dayCash = dayData.sales.filter(sale => sale.isPaid).reduce((sum, sale) => sum + sale.totalAmount, 0);
        const dayCredit = dayData.sales.filter(sale => !sale.isPaid).reduce((sum, sale) => sum + sale.totalAmount, 0);

        // Update dashboard with day data
        document.getElementById('cashTotal').textContent = `$${dayCash.toFixed(2)}`;
        document.getElementById('creditTotal').textContent = `$${dayCredit.toFixed(2)}`;
        document.getElementById('expensesTotal').textContent = `$${dayExpenses.toFixed(2)}`;
        
        const profitElement = document.getElementById('todayProfit');
        profitElement.textContent = `$${dayProfit.toFixed(2)}`;
        profitElement.className = dayProfit >= 0 ? 'profit-positive' : 'profit-negative';

        // Display day-specific activities
        this.displayDayActivities(selectedDate);
        
        this.showToast(`Showing data for ${new Date(selectedDate).toLocaleDateString()}`);
    }

    displayDayActivities(date) {
        const container = document.getElementById('recentActivities');
        
        // Get activities for the specific date
        const activities = [];
        
        // Add sales for the date
        this.data.sales
            .filter(sale => sale.date.split('T')[0] === date)
            .forEach(sale => {
                activities.push({
                    type: 'sale',
                    icon: 'fas fa-shopping-cart',
                    title: `Sale to ${sale.customerName}`,
                    description: `${sale.quantity}x ${sale.itemName} - $${sale.totalAmount.toFixed(2)} (${sale.isPaid ? 'Paid' : 'Credit'})`,
                    time: new Date(sale.date).toLocaleTimeString(),
                    date: sale.date
                });
            });
        
        // Add expenses for the date
        this.data.expenses
            .filter(expense => expense.date.split('T')[0] === date)
            .forEach(expense => {
                activities.push({
                    type: 'expense',
                    icon: 'fas fa-receipt',
                    title: `Expense: ${expense.description}`,
                    description: `$${expense.amount.toFixed(2)} - ${expense.category}`,
                    time: new Date(expense.date).toLocaleTimeString(),
                    date: expense.date
                });
            });
        
        // Add inventory additions for the date
        this.data.inventory
            .filter(item => item.dateAdded.split('T')[0] === date)
            .forEach(item => {
                activities.push({
                    type: 'inventory',
                    icon: 'fas fa-boxes',
                    title: `Added to inventory: ${item.name}`,
                    description: `${item.quantity} units at $${item.cost.toFixed(2)} each`,
                    time: new Date(item.dateAdded).toLocaleTimeString(),
                    date: item.dateAdded
                });
            });
        
        // Sort by time
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-day"></i>
                    <p>No activities on ${new Date(date).toLocaleDateString()}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-card">
                <div class="card-header">
                    <div class="card-title">
                        <i class="${activity.icon}"></i> ${activity.title}
                    </div>
                    <div class="detail-value">${activity.time}</div>
                </div>
                <p>${activity.description}</p>
            </div>
        `).join('');
    }
}

// Global functions for navigation and actions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Update displays based on section
    switch(sectionName) {
        case 'inventory':
            inventoryManager.displayInventory();
            break;
        case 'billing':
            inventoryManager.displaySales();
            inventoryManager.displayCreditCustomers();
            break;
        case 'expenses':
            inventoryManager.displayExpenses();
            break;
        case 'dashboard':
            inventoryManager.updateDashboard();
            break;
    }
}

function loadDayData() {
    inventoryManager.loadDayData();
}

// Initialize the application
let inventoryManager;
document.addEventListener('DOMContentLoaded', () => {
    inventoryManager = new InventoryManager();
});

// Google Drive API Integration (for production use)
class GoogleDriveAPI {
    constructor(apiKey, fileId) {
        this.apiKey = apiKey;
        this.fileId = fileId;
        this.baseUrl = 'https://www.googleapis.com/drive/v3';
    }

    async loadData() {
        try {
            const response = await fetch(
                `${this.baseUrl}/files/${this.fileId}?alt=media&key=${this.apiKey}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to load data from Google Drive');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error loading from Google Drive:', error);
            throw error;
        }
    }

    async saveData(data) {
        // Note: Saving to Google Drive requires OAuth2 authentication
        // This is a simplified example - in production, you'd need proper authentication
        try {
            const response = await fetch(
                `${this.baseUrl}/files/${this.fileId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAccessToken()}`
                    },
                    body: JSON.stringify(data)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to save data to Google Drive');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving to Google Drive:', error);
            throw error;
        }
    }

    getAccessToken() {
        // In production, implement proper OAuth2 flow
        // This would return the user's access token
        return localStorage.getItem('googleAccessToken');
    }
}

// Service Worker for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export/Import functionality
function exportData() {
    const dataStr = JSON.stringify(inventoryManager.data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    inventoryManager.showToast('Data exported successfully');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate data structure
            if (importedData.inventory && importedData.sales && importedData.expenses) {
                inventoryManager.data = importedData;
                inventoryManager.saveData();
                inventoryManager.updateDashboard();
                inventoryManager.populateInventorySelect();
                inventoryManager.showToast('Data imported successfully');
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            inventoryManager.showToast('Error importing data: Invalid format', 'error');
        }
    };
    reader.readAsText(file);
}

// Print functionality
function printReport(type) {
    const today = new Date().toISOString().split('T')[0];
    let content = '';
    
    switch(type) {
        case 'daily':
            content = generateDailyReport(today);
            break;
        case 'inventory':
            content = generateInventoryReport();
            break;
        case 'credit':
            content = generateCreditReport();
            break;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Report - ${type}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function generateDailyReport(date) {
    const dayData = {
        sales: inventoryManager.data.sales.filter(sale => sale.date.split('T')[0] === date),
        expenses: inventoryManager.data.expenses.filter(expense => expense.date.split('T')[0] === date)
    };
    
    const totalRevenue = dayData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalExpenses = dayData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalProfit = dayData.sales.reduce((sum, sale) => sum + sale.profit, 0) - totalExpenses;
    
    return `
        <div class="header">
            <h1>Daily Report - ${new Date(date).toLocaleDateString()}</h1>
        </div>
        
        <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Revenue:</strong> $${totalRevenue.toFixed(2)}</p>
            <p><strong>Total Expenses:</strong> $${totalExpenses.toFixed(2)}</p>
            <p><strong>Net Profit:</strong> $${totalProfit.toFixed(2)}</p>
        </div>
        
        <h3>Sales</h3>
        <table>
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Profit</th>
                </tr>
            </thead>
            <tbody>
                ${dayData.sales.map(sale => `
                    <tr>
                        <td>${sale.customerName}</td>
                        <td>${sale.itemName}</td>
                        <td>${sale.quantity}</td>
                        <td>$${sale.totalAmount.toFixed(2)}</td>
                        <td>${sale.isPaid ? 'Paid' : 'Credit'}</td>
                        <td>$${sale.profit.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h3>Expenses</h3>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${dayData.expenses.map(expense => `
                    <tr>
                        <td>${expense.description}</td>
                        <td>${expense.category}</td>
                        <td>$${expense.amount.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateInventoryReport() {
    const totalValue = inventoryManager.data.inventory.reduce((sum, item) => 
        sum + (item.quantity * item.cost), 0
    );
    
    return `
        <div class="header">
            <h1>Inventory Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Items:</strong> ${inventoryManager.data.inventory.length}</p>
            <p><strong>Total Inventory Value:</strong> $${totalValue.toFixed(2)}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Cost per Unit</th>
                    <th>Total Value</th>
                    <th>Date Added</th>
                </tr>
            </thead>
            <tbody>
                ${inventoryManager.data.inventory.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.description || 'N/A'}</td>
                        <td>${item.quantity}</td>
                        <td>$${item.cost.toFixed(2)}</td>
                        <td>$${(item.quantity * item.cost).toFixed(2)}</td>
                        <td>${new Date(item.dateAdded).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateCreditReport() {
    const creditSales = inventoryManager.data.sales.filter(sale => !sale.isPaid);
    const totalCredit = creditSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    return `
        <div class="header">
            <h1>Credit Customers Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Credit Customers:</strong> ${creditSales.length}</p>
            <p><strong>Total Outstanding Amount:</strong> $${totalCredit.toFixed(2)}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Customer Name</th>
                    <th>Item</th>
                    <th>Amount Due</th>
                    <th>Sale Date</th>
                    <th>Days Outstanding</th>
                </tr>
            </thead>
            <tbody>
                ${creditSales.map(sale => `
                    <tr>
                        <td>${sale.customerName}</td>
                        <td>${sale.itemName}</td>
                        <td>$${sale.totalAmount.toFixed(2)}</td>
                        <td>${new Date(sale.date).toLocaleDateString()}</td>
                        <td>${Math.floor((new Date() - new Date(sale.date)) / (1000 * 60 * 60 * 24))} days</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


