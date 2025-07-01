document.addEventListener('DOMContentLoaded', function() {
            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('expense-date').value = today;
            
            // Initialize expenses array
            let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
            
            // DOM elements
            const expenseForm = document.getElementById('expense-form');
            const expenseList = document.getElementById('expense-list');
            const totalExpenseEl = document.querySelector('.card-1 .card-value');
            const monthExpenseEl = document.querySelector('.card-2 .card-value');
            const dailyAverageEl = document.querySelector('.card-3 .card-value');
            const highestExpenseEl = document.querySelectorAll('.month-stat-value')[0];
            const lowestExpenseEl = document.querySelectorAll('.month-stat-value')[1];
            const averageExpenseEl = document.querySelectorAll('.month-stat-value')[2];
            const chartContainer = document.getElementById('chart-container');
            
            // Format currency with Rupee symbol
            function formatCurrency(amount) {
                return '₹' + amount.toLocaleString('en-IN');
            }
            
            // Format date as DD/MM/YYYY
            function formatDate(dateString) {
                const date = new Date(dateString);
                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            }
            
            // Get category display name
            function getCategoryName(category) {
                const categories = {
                    'food': 'Food & Dining',
                    'shopping': 'Shopping',
                    'transport': 'Transportation',
                    'housing': 'Housing',
                    'entertainment': 'Entertainment',
                    'health': 'Health & Fitness',
                    'education': 'Education',
                    'other': 'Other'
                };
                return categories[category] || category;
            }
            
            // Get category color
            function getCategoryColor(category) {
                const colors = {
                    'food': '#4361ee',
                    'shopping': '#f72585',
                    'transport': '#4cc9f0',
                    'housing': '#7209b7',
                    'entertainment': '#f8961e',
                    'health': '#43aa8b',
                    'education': '#577590',
                    'other': '#6c757d'
                };
                return colors[category] || '#6c757d';
            }
            
            // Add new expense
            function addExpense(title, amount, date, category) {
                const newExpense = {
                    id: Date.now(),
                    title,
                    amount: parseFloat(amount),
                    date,
                    category
                };
                
                expenses.push(newExpense);
                saveExpenses();
                renderExpenses();
                updateDashboard();
                renderChart();
            }
            
            // Delete expense
            function deleteExpense(id) {
                expenses = expenses.filter(expense => expense.id !== id);
                saveExpenses();
                renderExpenses();
                updateDashboard();
                renderChart();
            }
            
            // Save expenses to localStorage
            function saveExpenses() {
                localStorage.setItem('expenses', JSON.stringify(expenses));
            }
            
            // Render expenses list
            function renderExpenses() {
                expenseList.innerHTML = '';
                
                if (expenses.length === 0) {
                    expenseList.innerHTML = `
                        <li class="no-expenses">
                            <i class="fas fa-receipt"></i>
                            <p>No expenses added yet</p>
                            <p>Add your first expense to get started</p>
                        </li>
                    `;
                    return;
                }
                
                // Sort expenses by date (newest first)
                const sortedExpenses = [...expenses].sort((a, b) => 
                    new Date(b.date) - new Date(a.date));
                
                // Display all expenses (now scrollable)
                sortedExpenses.forEach(expense => {
                    const listItem = document.createElement('li');
                    listItem.className = 'expense-item';
                    listItem.innerHTML = `
                        <div class="expense-info">
                            <div class="expense-title">${expense.title}</div>
                            <div class="expense-details">
                                <span class="expense-category" style="background: ${getCategoryColor(expense.category)}11; color: ${getCategoryColor(expense.category)};">
                                    ${getCategoryName(expense.category)}
                                </span>
                                <span class="expense-date">${formatDate(expense.date)}</span>
                            </div>
                        </div>
                        <div class="expense-amount">${formatCurrency(expense.amount)}</div>
                        <div class="expense-actions">
                            <button class="delete-btn" data-id="${expense.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    expenseList.appendChild(listItem);
                });
                
                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const id = parseInt(this.getAttribute('data-id'));
                        deleteExpense(id);
                    });
                });
            }
            
            // Update dashboard metrics
            function updateDashboard() {
                // Calculate total expenses
                const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                
                // Calculate current month expenses
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const monthExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                           expenseDate.getFullYear() === currentYear;
                });
                
                const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                
                // Calculate daily average for current month
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const dailyAverage = monthTotal / daysInMonth || 0;
                
                // Update DOM
                totalExpenseEl.innerHTML = `<span class="rupee">₹</span> ${total.toLocaleString('en-IN')}`;
                monthExpenseEl.innerHTML = `<span class="rupee">₹</span> ${monthTotal.toLocaleString('en-IN')}`;
                dailyAverageEl.innerHTML = `<span class="rupee">₹</span> ${dailyAverage.toFixed(0).toLocaleString('en-IN')}`;
                
                // Update monthly stats
                if (monthExpenses.length > 0) {
                    const amounts = monthExpenses.map(e => e.amount);
                    const highest = Math.max(...amounts);
                    const lowest = Math.min(...amounts);
                    const average = monthTotal / monthExpenses.length;
                    
                    highestExpenseEl.innerHTML = `<span class="rupee">₹</span> ${highest.toLocaleString('en-IN')}`;
                    lowestExpenseEl.innerHTML = `<span class="rupee">₹</span> ${lowest.toLocaleString('en-IN')}`;
                    averageExpenseEl.innerHTML = `<span class="rupee">₹</span> ${average.toFixed(0).toLocaleString('en-IN')}`;
                } else {
                    highestExpenseEl.innerHTML = `<span class="rupee">₹</span>0`;
                    lowestExpenseEl.innerHTML = `<span class="rupee">₹</span>0`;
                    averageExpenseEl.innerHTML = `<span class="rupee">₹</span>0`;
                }
            }
            
            // Render chart
            function renderChart() {
                // Clear existing chart
                chartContainer.innerHTML = '';
                
                // Get current month expenses
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const monthExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                           expenseDate.getFullYear() === currentYear;
                });
                
                // Group expenses by day
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const dailyTotals = Array(daysInMonth).fill(0);
                
                monthExpenses.forEach(expense => {
                    const day = new Date(expense.date).getDate();
                    dailyTotals[day - 1] += expense.amount;
                });
                
                // Find max value for scaling
                const maxValue = Math.max(...dailyTotals, 1000);
                
                // Create bars
                for (let i = 0; i < daysInMonth; i++) {
                    const dayTotal = dailyTotals[i];
                    const barHeight = dayTotal > 0 ? (dayTotal / maxValue * 200) : 5;
                    
                    const bar = document.createElement('div');
                    bar.className = 'chart-bar';
                    bar.style.height = `${barHeight}px`;
                    bar.style.background = dayTotal > 0 ? 'var(--primary)' : '#e0e0e0';
                    
                    const label = document.createElement('div');
                    label.className = 'chart-label';
                    label.textContent = `${i + 1}`;
                    
                    bar.appendChild(label);
                    chartContainer.appendChild(bar);
                }
            }
            
            // Handle form submission
            expenseForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const title = document.getElementById('expense-title').value;
                const amount = document.getElementById('expense-amount').value;
                const date = document.getElementById('expense-date').value;
                const category = document.getElementById('expense-category').value;
                
                if (!title || !amount || !date) {
                    alert('Please fill in all fields');
                    return;
                }
                
                addExpense(title, amount, date, category);
                
                // Reset form
                expenseForm.reset();
                document.getElementById('expense-date').value = today;
            });
            
            // Initialize the app
            renderExpenses();
            updateDashboard();
            renderChart();
        });