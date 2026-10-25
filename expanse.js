document.addEventListener('DOMContentLoaded', function() {
    const STORAGE_KEYS = {
        users: 'expense-tracker-users',
        currentUser: 'expense-tracker-current-user'
    };

    const today = new Date().toISOString().split('T')[0];
    const authScreen = document.getElementById('auth-screen');
    const appShell = document.getElementById('app-shell');
    const authMessage = document.getElementById('auth-message');
    const expenseForm = document.getElementById('expense-form');
    const expenseList = document.getElementById('expense-list');
    const totalExpenseEl = document.querySelector('.card-1 .card-value');
    const monthExpenseEl = document.querySelector('.card-2 .card-value');
    const dailyAverageEl = document.querySelector('.card-3 .card-value');
    const highestExpenseEl = document.querySelectorAll('.month-stat-value')[0];
    const lowestExpenseEl = document.querySelectorAll('.month-stat-value')[1];
    const averageExpenseEl = document.querySelectorAll('.month-stat-value')[2];
    const chartContainer = document.getElementById('chart-container');
    const categoryBreakdown = document.getElementById('category-breakdown');
    const filterSearch = document.getElementById('expense-search');
    const filterCategory = document.getElementById('expense-filter-category');
    const filterDate = document.getElementById('expense-filter-date');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const budgetAmountEl = document.getElementById('budget-amount');
    const monthlyBudgetInput = document.getElementById('monthly-budget-input');
    const budgetStatusEl = document.getElementById('budget-status');
    const budgetProgressFill = document.getElementById('budget-progress-fill');
    const saveBudgetBtn = document.getElementById('save-budget-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginTab = document.querySelector('[data-auth-tab="login"]');
    const signupTab = document.querySelector('[data-auth-tab="signup"]');
    const welcomeUser = document.getElementById('welcome-user');
    const logoutBtn = document.getElementById('logout-btn');
    const cancelEditBtn = document.getElementById('cancel-edit');

    function normalizeUsers() {
        users = (JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || []).map(user => ({
            ...user,
            expenses: Array.isArray(user.expenses) ? user.expenses : [],
            monthlyBudget: Number.isFinite(Number(user.monthlyBudget)) ? Number(user.monthlyBudget) : 0
        }));
        saveUsers();
    }

    let users = [];
    let currentUserId = localStorage.getItem(STORAGE_KEYS.currentUser) || null;
    let editingExpenseId = null;

    normalizeUsers();

    function formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    function getCategoryName(category) {
        const categories = {
            food: 'Food & Dining',
            shopping: 'Shopping',
            transport: 'Transportation',
            housing: 'Housing',
            entertainment: 'Entertainment',
            health: 'Health & Fitness',
            education: 'Education',
            other: 'Other'
        };
        return categories[category] || category;
    }

    function getCategoryColor(category) {
        const colors = {
            food: '#6366f1',
            shopping: '#ef4444',
            transport: '#06b6d4',
            housing: '#8b5cf6',
            entertainment: '#f59e0b',
            health: '#10b981',
            education: '#0ea5e9',
            other: '#64748b'
        };
        return colors[category] || '#64748b';
    }

    function hashPassword(password) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
            .then(buffer => Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join(''));
    }

    function saveUsers() {
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    }

    function getCurrentUser() {
        return users.find(user => user.id === currentUserId) || null;
    }

    function getCurrentExpenses() {
        const user = getCurrentUser();
        return user ? (user.expenses || []) : [];
    }

    function saveCurrentExpenses(expenses) {
        const user = getCurrentUser();
        if (!user) {
            return;
        }

        user.expenses = expenses;
        saveUsers();
    }

    function getCurrentMonthlyBudget() {
        const user = getCurrentUser();
        if (!user) {
            return 0;
        }

        const value = Number(user.monthlyBudget);
        return Number.isFinite(value) ? value : 0;
    }

    function saveCurrentMonthlyBudget(amount) {
        const user = getCurrentUser();
        if (!user) {
            return;
        }

        const numericValue = Number(amount);
        user.monthlyBudget = Number.isFinite(numericValue) ? numericValue : 0;
        saveUsers();
    }

    function setAuthMessage(message, type = 'error') {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }

    function switchAuthTab(tabName) {
        const isLogin = tabName === 'login';

        loginTab.classList.toggle('active', isLogin);
        signupTab.classList.toggle('active', !isLogin);
        loginForm.classList.toggle('hidden', !isLogin);
        signupForm.classList.toggle('hidden', isLogin);

        if (isLogin) {
            signupForm.reset();
        } else {
            loginForm.reset();
        }

        setAuthMessage('');
    }

    function renderAuthView() {
        const user = getCurrentUser();

        if (!user) {
            authScreen.classList.remove('hidden');
            appShell.classList.add('hidden');
            welcomeUser.textContent = 'Welcome';
            return;
        }

        authScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        welcomeUser.textContent = `Welcome, ${user.username}`;
        document.getElementById('expense-date').value = today;
        renderExpenses();
        updateDashboard();
        renderChart();
        renderCategoryBreakdown();
    }

    function addExpense(title, amount, date, category) {
        const user = getCurrentUser();
        if (!user) {
            return;
        }

        const newExpense = {
            id: Date.now(),
            title,
            amount: parseFloat(amount),
            date,
            category
        };

        const expenses = getCurrentExpenses();
        expenses.push(newExpense);
        saveCurrentExpenses(expenses);
        renderExpenses();
        updateDashboard();
        renderChart();
    }

    function getFilteredExpenses() {
        const expenses = getCurrentExpenses();
        const categoryValue = filterCategory.value;
        const dateValue = filterDate.value;
        const searchValue = filterSearch.value.trim().toLowerCase();

        return expenses.filter(expense => {
            const matchesCategory = categoryValue === 'all' || expense.category === categoryValue;
            const matchesDate = !dateValue || expense.date === dateValue;
            const matchesSearch = !searchValue || expense.title.toLowerCase().includes(searchValue);
            return matchesCategory && matchesDate && matchesSearch;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function deleteExpense(id) {
        const confirmed = window.confirm('Are you sure you want to delete this expense?');
        if (!confirmed) {
            return;
        }

        const expenses = getCurrentExpenses().filter(expense => expense.id !== id);
        saveCurrentExpenses(expenses);
        renderExpenses();
        updateDashboard();
        renderChart();
    }

    function renderExpenses() {
        const expenses = getFilteredExpenses();
        expenseList.innerHTML = '';

        if (expenses.length === 0) {
            const activeFilter = filterCategory.value !== 'all' || filterDate.value;
            expenseList.innerHTML = `
                <li class="no-expenses">
                    <i class="fas fa-receipt"></i>
                    <p>${activeFilter ? 'No matching expenses found' : 'No expenses added yet'}</p>
                    <p>${activeFilter ? 'Try a different filter' : 'Add your first expense to get started'}</p>
                </li>
            `;
            return;
        }

        const sortedExpenses = expenses;

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
                    <button class="edit-btn" data-id="${expense.id}" title="Edit expense">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${expense.id}" title="Delete expense">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            expenseList.appendChild(listItem);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = Number(this.getAttribute('data-id'));
                startEditExpense(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = Number(this.getAttribute('data-id'));
                deleteExpense(id);
            });
        });
    }

    function updateDashboard() {
        const expenses = getCurrentExpenses();
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyAverage = monthTotal / daysInMonth || 0;
        const monthlyBudget = getCurrentMonthlyBudget();

        totalExpenseEl.innerHTML = `<span class="rupee">₹</span> ${total.toLocaleString('en-IN')}`;
        monthExpenseEl.innerHTML = `<span class="rupee">₹</span> ${monthTotal.toLocaleString('en-IN')}`;
        dailyAverageEl.innerHTML = `<span class="rupee">₹</span> ${dailyAverage.toFixed(0).toLocaleString('en-IN')}`;

        if (monthExpenses.length > 0) {
            const amounts = monthExpenses.map(expense => expense.amount);
            const highest = Math.max(...amounts);
            const lowest = Math.min(...amounts);
            const average = monthTotal / monthExpenses.length;

            highestExpenseEl.innerHTML = `<span class="rupee">₹</span> ${highest.toLocaleString('en-IN')}`;
            lowestExpenseEl.innerHTML = `<span class="rupee">₹</span> ${lowest.toLocaleString('en-IN')}`;
            averageExpenseEl.innerHTML = `<span class="rupee">₹</span> ${average.toFixed(0).toLocaleString('en-IN')}`;
        } else {
            highestExpenseEl.innerHTML = '<span class="rupee">₹</span>0';
            lowestExpenseEl.innerHTML = '<span class="rupee">₹</span>0';
            averageExpenseEl.innerHTML = '<span class="rupee">₹</span>0';
        }

        budgetAmountEl.innerHTML = `<span class="rupee">₹</span> ${monthlyBudget.toLocaleString('en-IN')}`;
        monthlyBudgetInput.value = monthlyBudget || '';

        if (monthlyBudget > 0) {
            const percentUsed = Math.min((monthTotal / monthlyBudget) * 100, 100);
            const remaining = monthlyBudget - monthTotal;
            budgetProgressFill.style.width = `${percentUsed}%`;
            budgetProgressFill.style.background = remaining >= 0
                ? 'linear-gradient(135deg, #10b981, #4f46e5)'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)';
            budgetStatusEl.textContent = remaining >= 0
                ? `${formatCurrency(remaining)} remaining this month.`
                : `${formatCurrency(Math.abs(remaining))} over budget this month.`;
        } else {
            budgetProgressFill.style.width = '0%';
            budgetProgressFill.style.background = 'linear-gradient(135deg, #10b981, #4f46e5)';
            budgetStatusEl.textContent = 'Set a monthly budget to track your spending.';
        }

        renderCategoryBreakdown();
    }

    function renderChart() {
        chartContainer.innerHTML = '';

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthExpenses = getCurrentExpenses().filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyTotals = Array(daysInMonth).fill(0);

        monthExpenses.forEach(expense => {
            const day = new Date(expense.date).getDate();
            dailyTotals[day - 1] += expense.amount;
        });

        const maxValue = Math.max(...dailyTotals, 1000);

        for (let i = 0; i < daysInMonth; i++) {
            const dayTotal = dailyTotals[i];
            const barHeight = dayTotal > 0 ? (dayTotal / maxValue) * 200 : 5;
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = `${barHeight}px`;

            if (dayTotal > 0) {
                bar.style.background = 'linear-gradient(180deg, rgba(99, 102, 241, 0.8), rgba(99, 102, 241, 0.4))';
            } else {
                bar.style.background = 'rgba(226, 232, 240, 0.1)';
            }

            const label = document.createElement('div');
            label.className = 'chart-label';
            label.textContent = `${i + 1}`;
            bar.appendChild(label);
            chartContainer.appendChild(bar);
        }
    }

    function renderCategoryBreakdown() {
        const expenses = getCurrentExpenses();
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0) || 1;
        const grouped = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

        if (entries.length === 0) {
            categoryBreakdown.innerHTML = '<div class="category-item"><div class="category-name">No categories yet</div></div>';
            return;
        }

        categoryBreakdown.innerHTML = entries.map(([category, amount]) => {
            const width = Math.max((amount / total) * 100, 8);
            return `
                <div class="category-item">
                    <div class="category-header">
                        <span class="category-name">${getCategoryName(category)}</span>
                        <span class="category-amount">${formatCurrency(amount)}</span>
                    </div>
                    <div class="category-bar-track">
                        <div class="category-bar-fill" style="width: ${width}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateFormMode() {
        const submitButton = document.getElementById('add-expense');
        if (editingExpenseId !== null) {
            submitButton.innerHTML = '<i class="fas fa-save"></i> Update Expense';
            cancelEditBtn.classList.remove('hidden');
        } else {
            submitButton.innerHTML = '<i class="fas fa-plus-circle"></i> Add Expense';
            cancelEditBtn.classList.add('hidden');
        }
    }

    function resetExpenseForm() {
        expenseForm.reset();
        editingExpenseId = null;
        document.getElementById('expense-date').value = today;
        updateFormMode();
    }

    function startEditExpense(id) {
        const expense = getCurrentExpenses().find(item => item.id === id);
        if (!expense) {
            return;
        }

        editingExpenseId = id;
        document.getElementById('expense-title').value = expense.title;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-date').value = expense.date;
        document.getElementById('expense-category').value = expense.category;
        updateFormMode();
        document.getElementById('expense-title').focus();
    }

    saveBudgetBtn.addEventListener('click', () => {
        const budgetValue = Number(monthlyBudgetInput.value);

        if (!Number.isFinite(budgetValue) || budgetValue < 0) {
            alert('Please enter a valid monthly budget greater than or equal to zero.');
            return;
        }

        saveCurrentMonthlyBudget(budgetValue);
        updateDashboard();
    });

    monthlyBudgetInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveBudgetBtn.click();
        }
    });

    filterSearch.addEventListener('input', renderExpenses);
    filterCategory.addEventListener('change', renderExpenses);
    filterDate.addEventListener('change', renderExpenses);
    clearFiltersBtn.addEventListener('click', () => {
        filterSearch.value = '';
        filterCategory.value = 'all';
        filterDate.value = '';
        renderExpenses();
    });

    loginTab.addEventListener('click', () => switchAuthTab('login'));
    signupTab.addEventListener('click', () => switchAuthTab('signup'));

    logoutBtn.addEventListener('click', () => {
        currentUserId = null;
        localStorage.removeItem(STORAGE_KEYS.currentUser);
        loginForm.reset();
        signupForm.reset();
        setAuthMessage('You have been logged out.', 'success');
        renderAuthView();
    });

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = loginForm.username.value.trim();
        const password = loginForm.password.value;

        if (!username || !password) {
            setAuthMessage('Please enter both username and password.', 'error');
            return;
        }

        const matchingUser = users.find(user => user.username.toLowerCase() === username.toLowerCase());
        if (!matchingUser) {
            setAuthMessage('No account found for that username.', 'error');
            return;
        }

        const hashedPassword = await hashPassword(password);
        if (matchingUser.password !== hashedPassword) {
            setAuthMessage('Incorrect password. Please try again.', 'error');
            return;
        }

        currentUserId = matchingUser.id;
        localStorage.setItem(STORAGE_KEYS.currentUser, currentUserId);
        loginForm.reset();
        renderAuthView();
    });

    signupForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = signupForm.username.value.trim();
        const password = signupForm.password.value;
        const confirmPassword = signupForm.confirmPassword.value;

        if (!username || !password || !confirmPassword) {
            setAuthMessage('Please fill in all signup fields.', 'error');
            return;
        }

        if (password.length < 4) {
            setAuthMessage('Password must be at least 4 characters long.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            setAuthMessage('Passwords do not match.', 'error');
            return;
        }

        const usernameExists = users.some(user => user.username.toLowerCase() === username.toLowerCase());
        if (usernameExists) {
            setAuthMessage('That username is already taken. Please choose another one.', 'error');
            return;
        }

        const passwordHash = await hashPassword(password);
        const newUser = {
            id: Date.now().toString(),
            username,
            password: passwordHash,
            expenses: [],
            monthlyBudget: 0
        };

        users.push(newUser);
        saveUsers();
        currentUserId = newUser.id;
        localStorage.setItem(STORAGE_KEYS.currentUser, currentUserId);
        signupForm.reset();
        renderAuthView();
    });

    expenseForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const title = document.getElementById('expense-title').value.trim();
        const amount = document.getElementById('expense-amount').value;
        const date = document.getElementById('expense-date').value;
        const category = document.getElementById('expense-category').value;

        if (!title || !amount || !date) {
            alert('Please fill in all fields');
            return;
        }

        if (editingExpenseId !== null) {
            const expenses = getCurrentExpenses();
            const updatedExpenses = expenses.map(expense =>
                expense.id === editingExpenseId
                    ? { ...expense, title, amount: Number(amount), date, category }
                    : expense
            );
            saveCurrentExpenses(updatedExpenses);
            editingExpenseId = null;
        } else {
            addExpense(title, amount, date, category);
        }

        resetExpenseForm();
        renderExpenses();
        updateDashboard();
        renderChart();
        renderCategoryBreakdown();
    });

    cancelEditBtn.addEventListener('click', function() {
        resetExpenseForm();
    });

    switchAuthTab('login');
    renderAuthView();
});