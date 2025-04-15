document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', document.getElementById('file').files[0]);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error processing file. Please try again.');
    }
});

function displayResults(data) {
    document.getElementById('results').style.display = 'block';
    displayAnalysis(data.analysis, data.headers);
    displayDataPreview(data.data, data.headers);
    initializeCharts(data.data, data.headers);
}

function displayAnalysis(analysis, headers) {
    const analysisContainer = document.getElementById('analysis');
    analysisContainer.innerHTML = '';

    // Store the original order of columns (matching the CSV headers)
    const originalOrder = headers;

    // Create sort select event listener
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', () => {
        const sortType = sortSelect.value;
        renderAnalysis(analysis, sortType, originalOrder);
    });

    // Initial render with default sort
    renderAnalysis(analysis, 'default', originalOrder);
}

function renderAnalysis(analysis, sortType, originalOrder) {
    const analysisContainer = document.getElementById('analysis');
    analysisContainer.innerHTML = '';

    // Get sorted columns based on sort type
    let columns;
    if (sortType === 'type') {
        // Create arrays for each data type
        const numericColumns = [];
        const textColumns = [];

        // Sort columns into their respective type arrays while maintaining original order
        originalOrder.forEach(column => {
            if (analysis[column].mean !== undefined) {
                numericColumns.push(column);
            } else {
                textColumns.push(column);
            }
        });

        // Combine arrays with numeric columns first
        columns = [...numericColumns, ...textColumns];
    } else {
        columns = originalOrder;
    }

    // Create cards for each column
    columns.forEach(column => {
        const stats = analysis[column];
        const statCard = document.createElement('div');
        statCard.className = 'stat-card';
        
        // Determine data type
        const isNumeric = stats.mean !== undefined;
        const dataType = isNumeric ? 'Numeric' : 'Text';
        const dataTypeClass = isNumeric ? 'numeric-badge' : 'text-badge';
        
        statCard.innerHTML = `
            <div class="stat-card-header">
                <h4>${column}</h4>
                <span class="data-type-badge ${dataTypeClass}">${dataType}</span>
            </div>
            <div class="stat-card-content">
                <ul class="list-unstyled">
                    <li>Total Count: ${stats.count}</li>
                    <li>Null Values: ${stats.nullCount}</li>
                    ${isNumeric ? `
                        <li>Mean: ${stats.mean.toFixed(2)}</li>
                        <li>Median: ${stats.median.toFixed(2)}</li>
                        <li>Standard Deviation: ${stats.stdDev.toFixed(2)}</li>
                        <li>Min: ${stats.min.toFixed(2)}</li>
                        <li>Max: ${stats.max.toFixed(2)}</li>
                    ` : `
                        <li>Unique Values: ${stats.uniqueCount}</li>
                        ${stats.topValues && stats.topValues.length > 0 ? `
                            <li class="top-values">Top Values:
                                <div class="top-values-list">
                                    ${stats.topValues.map(item => `
                                        <div class="top-value-item">
                                            <span>${item.value}</span>
                                            <span>${item.count} times</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </li>
                        ` : ''}
                    `}
                </ul>
            </div>
        `;

        // Add click event to toggle expansion
        statCard.addEventListener('click', () => {
            statCard.classList.toggle('expanded');
        });

        analysisContainer.appendChild(statCard);
    });
}

function displayDataPreview(data, headers) {
    const table = document.getElementById('dataPreview');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create data rows (limit to 10 rows for preview)
    data.slice(0, 10).forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function initializeCharts(data, headers) {
    // Find numeric columns
    const numericColumns = headers.filter(header => {
        const value = data[0][header];
        return value && !isNaN(parseFloat(value)) && isFinite(value);
    });

    if (numericColumns.length === 0) return;

    // Populate histogram dropdown
    const histogramSelect = document.getElementById('histogramColumn');
    numericColumns.forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        histogramSelect.appendChild(option);
    });

    // Populate scatter plot dropdowns
    const scatterXSelect = document.getElementById('scatterX');
    const scatterYSelect = document.getElementById('scatterY');
    
    numericColumns.forEach(column => {
        const optionX = document.createElement('option');
        optionX.value = column;
        optionX.textContent = column;
        scatterXSelect.appendChild(optionX);

        const optionY = document.createElement('option');
        optionY.value = column;
        optionY.textContent = column;
        scatterYSelect.appendChild(optionY);
    });

    // Initialize charts
    let histogramChart = null;
    let scatterChart = null;

    function updateScatterPlot() {
        const xColumn = scatterXSelect.value;
        const yColumn = scatterYSelect.value;
        
        if (!xColumn || !yColumn) return;

        const xValues = data.map(row => parseFloat(row[xColumn]) || 0);
        const yValues = data.map(row => parseFloat(row[yColumn]) || 0);

        // Calculate statistics if needed
        const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
        const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
        const xStd = Math.sqrt(xValues.reduce((a, b) => a + Math.pow(b - xMean, 2), 0) / xValues.length);
        const yStd = Math.sqrt(yValues.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / yValues.length);

        if (scatterChart) {
            scatterChart.destroy();
        }

        const scatterCtx = document.getElementById('scatterChart').getContext('2d');
        const datasets = [{
            label: `${xColumn} vs ${yColumn}`,
            data: xValues.map((x, i) => ({x, y: yValues[i]})),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            pointRadius: 4
        }];

        // Add mean lines if enabled
        if (document.getElementById('scatterMean').checked) {
            datasets.push({
                label: 'X Mean',
                data: [{x: xMean, y: Math.min(...yValues)}, {x: xMean, y: Math.max(...yValues)}],
                borderColor: 'rgba(255, 0, 0, 1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                type: 'line',
                pointRadius: 0
            });
            datasets.push({
                label: 'Y Mean',
                data: [{x: Math.min(...xValues), y: yMean}, {x: Math.max(...xValues), y: yMean}],
                borderColor: 'rgba(255, 0, 0, 1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                type: 'line',
                pointRadius: 0
            });
        }

        // Add standard deviation lines if enabled
        if (document.getElementById('scatterStd').checked) {
            datasets.push({
                label: 'X Mean ± Std',
                data: [
                    {x: xMean + xStd, y: Math.min(...yValues)},
                    {x: xMean + xStd, y: Math.max(...yValues)},
                    {x: xMean - xStd, y: Math.min(...yValues)},
                    {x: xMean - xStd, y: Math.max(...yValues)}
                ],
                borderColor: 'rgba(255, 165, 0, 1)',
                borderWidth: 2,
                borderDash: [2, 2],
                fill: false,
                type: 'line',
                pointRadius: 0
            });
            datasets.push({
                label: 'Y Mean ± Std',
                data: [
                    {x: Math.min(...xValues), y: yMean + yStd},
                    {x: Math.max(...xValues), y: yMean + yStd},
                    {x: Math.min(...xValues), y: yMean - yStd},
                    {x: Math.max(...xValues), y: yMean - yStd}
                ],
                borderColor: 'rgba(255, 165, 0, 1)',
                borderWidth: 2,
                borderDash: [2, 2],
                fill: false,
                type: 'line',
                pointRadius: 0
            });
        }

        scatterChart = new Chart(scatterCtx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `${xColumn} vs ${yColumn}`
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: yColumn
                        },
                        type: document.getElementById('scatterLogY').checked ? 'logarithmic' : 'linear',
                        grid: {
                            display: document.getElementById('scatterGrid').checked
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: xColumn
                        },
                        type: document.getElementById('scatterLogX').checked ? 'logarithmic' : 'linear',
                        grid: {
                            display: document.getElementById('scatterGrid').checked
                        }
                    }
                }
            }
        });
    }

    // Add event listeners for scatter plot controls
    scatterXSelect.addEventListener('change', updateScatterPlot);
    scatterYSelect.addEventListener('change', updateScatterPlot);
    document.getElementById('scatterMean').addEventListener('change', updateScatterPlot);
    document.getElementById('scatterStd').addEventListener('change', updateScatterPlot);
    document.getElementById('scatterGrid').addEventListener('change', updateScatterPlot);
    document.getElementById('scatterLogX').addEventListener('change', updateScatterPlot);
    document.getElementById('scatterLogY').addEventListener('change', updateScatterPlot);

    // Add event listeners for histogram controls
    document.getElementById('histogramMean').addEventListener('change', updateHistogram);
    document.getElementById('histogramMedian').addEventListener('change', updateHistogram);
    document.getElementById('histogramStd').addEventListener('change', updateHistogram);
    document.getElementById('histogramGrid').addEventListener('change', updateHistogram);
    document.getElementById('histogramLogX').addEventListener('change', updateHistogram);
    document.getElementById('histogramLogY').addEventListener('change', updateHistogram);
    
    // Add event listener for column selection
    histogramSelect.addEventListener('change', updateHistogram);
    
    // Initial update if a column is selected
    if (histogramSelect.value) {
        updateHistogram();
    }
} 