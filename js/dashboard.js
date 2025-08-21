// Dashboard logic for index.html
window.addEventListener('DOMContentLoaded', () => {
  const stats = {
    poojas: document.getElementById('stat-poojas'),
    receipts: document.getElementById('stat-receipts'),
    amount: document.getElementById('stat-amount')
  };
  
  const dateFilter = document.getElementById('statsDate');
  const quickFilters = document.querySelectorAll('.filter-btn');
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  dateFilter.value = today;

  // Handle quick filter buttons
  quickFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      quickFilters.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      const date = new Date();
      date.setHours(0, 0, 0, 0); // Reset time to start of day
      
      // Get current date at start of day
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let fromDate = new Date(now);
      let toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);

      switch(filter) {
        case 'today':
          // Keep current date range
          break;
        case 'yesterday':
          fromDate.setDate(fromDate.getDate() - 1);
          toDate.setDate(toDate.getDate() - 1);
          toDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          // Last 7 days including today
          fromDate.setDate(fromDate.getDate() - 6); // -6 to include today
          break;
        case 'month':
          // Last 30 days including today
          fromDate.setDate(fromDate.getDate() - 29); // -29 to include today
          break;
        default:
          break;
      }
      
      dateFilter.value = toDate.toISOString().split('T')[0];
      updateStats(fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
    });
  });
  
  // Set 'Today' button as active by default
  quickFilters[0].classList.add('active');

  async function updateStats(fromDate, toDate) {
    try {
      // For single date selection, use the same date for both
      if (!toDate) toDate = fromDate;
      
      // Get receipts for the date range
      const receiptRes = await window.electronAPI.getReceipts({
        from: fromDate,
        to: toDate
      });

      if (receiptRes.success && receiptRes.receipts) {
        // No need to filter since we're getting the specific date from backend
        const dayReceipts = receiptRes.receipts;
        
        // Update stats
        stats.receipts.textContent = dayReceipts.length;
        
        // Calculate total using reduce for better performance
        const total = dayReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        stats.amount.textContent = '₹' + total.toLocaleString('en-IN');
        
        // Get total number of available poojas from the backend
        const poojasRes = await window.electronAPI.getPoojas();
        if (poojasRes.success) {
          stats.poojas.textContent = poojasRes.poojas.length.toString();
        } else {
          stats.poojas.textContent = '0';
        }
      } else {
        stats.receipts.textContent = '0';
        stats.amount.textContent = '₹0';
        stats.poojas.textContent = '0';
      }
    } catch (error) {
      console.error('Error updating stats:', error);
      stats.receipts.textContent = '-';
      stats.amount.textContent = '-';
      stats.poojas.textContent = '-';
    }
  }

  // Update stats when date changes
  dateFilter.addEventListener('change', (e) => {
    updateStats(e.target.value, e.target.value);
  });

  // Initial update with today's date
  updateStats(today, today);
});
