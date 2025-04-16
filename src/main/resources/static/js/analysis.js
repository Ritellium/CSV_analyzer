let currentData = null;
let currentFileName = null;
let histogramChart = null;
let scatterChart = null;

// Initialize the page when it loads
document.addEventListener('DOMContentLoaded', function() {
    // Get data from session storage
    const storedData = sessionStorage.getItem('csvData');
    const storedFileName = sessionStorage.getItem('fileName');
    
    if (storedData && storedFileName) {
        currentData = JSON.parse(storedData);
        currentFileName = storedFileName;
        document.getElementById('fileName').textContent = currentFileName;
        displayResults();
    } else {
        // If no data is found, redirect to upload page
        window.location.href = '/';
    }
});

// Display all results
function displayResults() {
    displayAnalysis();
    displayDataPreview();
    initializeCharts();
}

// Display analysis cards for each column
function displayAnalysis() {
    const analysisContainer = document.getElementById('analysisContainer');
    analysisContainer.innerHTML = '';
    
    const columns = Object.keys(currentData[0]);
    
    columns.forEach(column => {
        const values = currentData.map(row => row[column]);
        const isNumeric = !isNaN(values[0]);
        
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        
        let content = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${column}</h5>
                    <p class="card-text">
                        Total Count: ${values.length}<br>
                        Null Values: ${values.filter(v => v === null || v === '').length}
                    </p>
        `;
        
        if (isNumeric) {
            const numericValues = values.filter(v => !isNaN(v) && v !== null && v !== '');
            const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            const sorted = numericValues.sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const std = Math.sqrt(numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length);
            
            content += `
                <p class="card-text">
                    Mean: ${mean.toFixed(2)}<br>
                    Median: ${median.toFixed(2)}<br>
                    Standard Deviation: ${std.toFixed(2)}
                </p>
            `;
        } else {
            const uniqueValues = new Set(values.filter(v => v !== null && v !== ''));
            content += `
                <p class="card-text">
                    Unique Values: ${uniqueValues.size}
                </p>
            `;
        }
        
        content += '</div></div>';
        card.innerHTML = content;
        analysisContainer.appendChild(card);
    });
}

// Display data preview table
function displayDataPreview() {
    const previewContainer = document.getElementById('dataPreview');
    const columns = Object.keys(currentData[0]);
    
    let table = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Show first 10 rows
    currentData.slice(0, 10).forEach(row => {
        table += '<tr>';
        columns.forEach(col => {
            table += `<td>${row[col]}</td>`;
        });
        table += '</tr>';
    });
    
    table += '</tbody></table></div>';
    previewContainer.innerHTML = table;
}

// Initialize charts
function initializeCharts() {
    const numericColumns = Object.keys(currentData[0]).filter(col => 
        !isNaN(currentData[0][col]) && currentData[0][col] !== null && currentData[0][col] !== ''
    );
    
    // Populate histogram column selector
    const histogramColumnSelect = document.getElementById('histogramColumn');
    histogramColumnSelect.innerHTML = numericColumns.map(col => 
        `<option value="${col}">${col}</option>`
    ).join('');
    
    // Create initial histogram
    updateHistogram();
    
    // Add event listeners for histogram controls
    document.getElementById('histogramColumn').addEventListener('change', updateHistogram);
    document.getElementById('showMean').addEventListener('change', updateHistogram);
    document.getElementById('showMedian').addEventListener('change', updateHistogram);
    document.getElementById('showStd').addEventListener('change', updateHistogram);
    document.getElementById('showGrid').addEventListener('change', updateHistogram);
    document.getElementById('logX').addEventListener('change', updateHistogram);
    document.getElementById('logY').addEventListener('change', updateHistogram);
}

// Update histogram based on selected column and settings
function updateHistogram() {
    const column = document.getElementById('histogramColumn').value;
    const values = currentData.map(row => row[column]).filter(v => !isNaN(v) && v !== null && v !== '');
    
    // Calculate optimal number of bins (between 10 and 50)
    const numBins = Math.min(50, Math.max(10, Math.ceil(Math.sqrt(values.length))));
    
    // Calculate bin ranges
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / numBins;
    
    // Create bins
    const bins = Array(numBins).fill(0);
    const binLabels = [];
    
    for (let i = 0; i < numBins; i++) {
        const binMin = min + (i * binWidth);
        const binMax = binMin + binWidth;
        binLabels.push(binMin.toFixed(2));
        
        values.forEach(value => {
            if (value >= binMin && value < binMax) {
                bins[i]++;
            }
        });
    }
    
    // Calculate statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = values.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    
    // Create or update chart
    const ctx = document.getElementById('histogramChart').getContext('2d');
    
    if (histogramChart) {
        histogramChart.destroy();
    }
    
    const datasets = [{
        label: 'Frequency',
        data: bins,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
    }];
    
    // Add statistics lines if selected
    if (document.getElementById('showMean').checked) {
        datasets.push({
            label: 'Mean',
            data: bins.map((_, i) => {
                const binMin = min + (i * binWidth);
                const binMax = binMin + binWidth;
                return (mean >= binMin && mean < binMax) ? Math.max(...bins) : 0;
            }),
            type: 'line',
            borderColor: 'rgba(255, 0, 0, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false
        });
    }
    
    if (document.getElementById('showMedian').checked) {
        datasets.push({
            label: 'Median',
            data: bins.map((_, i) => {
                const binMin = min + (i * binWidth);
                const binMax = binMin + binWidth;
                return (median >= binMin && median < binMax) ? Math.max(...bins) : 0;
            }),
            type: 'line',
            borderColor: 'rgba(0, 255, 0, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false
        });
    }
    
    if (document.getElementById('showStd').checked) {
        datasets.push({
            label: 'Mean ± Std',
            data: bins.map((_, i) => {
                const binMin = min + (i * binWidth);
                const binMax = binMin + binWidth;
                const meanPlusStd = mean + std;
                const meanMinusStd = mean - std;
                return ((meanPlusStd >= binMin && meanPlusStd < binMax) || 
                       (meanMinusStd >= binMin && meanMinusStd < binMax)) ? Math.max(...bins) : 0;
            }),
            type: 'line',
            borderColor: 'rgba(255, 165, 0, 1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false
        });
    }
    
    histogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: column
                    },
                    type: document.getElementById('logX').checked ? 'logarithmic' : 'linear'
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency'
                    },
                    type: document.getElementById('logY').checked ? 'logarithmic' : 'linear',
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    sessionStorage.clear();
    window.location.href = '/';
});

// Handle back to upload
document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = '/';
}); 