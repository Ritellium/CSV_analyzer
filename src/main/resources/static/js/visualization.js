// Global chart instances
let histogramChart = null;
let scatterChart = null;
let analysisData = null;

// Helper functions for statistics calculations
function calculateMean(data) {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

function calculateMedian(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calculateStandardDeviation(data) {
    const mean = calculateMean(data);
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}

// Initialize visualization data
function initializeVisualizationData(data) {
    analysisData = data;
    console.log('Visualization data initialized:', analysisData);
    
    // Get numeric columns
    const numericColumns = Object.entries(analysisData.columnAnalysis)
        .filter(([_, column]) => column.dataType === 'FLOAT' || column.dataType === 'NUMERIC')
        .map(([key]) => key);

    // Initialize histogram column dropdown
    const histogramSelect = document.getElementById('histogramColumn');
    histogramSelect.innerHTML = '<option value="">Select Column</option>' +
        numericColumns.map(col => `<option value="${col}">${col}</option>`).join('');

    // Initialize scatter plot column dropdowns
    const scatterXSelect = document.getElementById('scatterX');
    const scatterYSelect = document.getElementById('scatterY');
    scatterXSelect.innerHTML = '<option value="">Select X Column</option>' +
        numericColumns.map(col => `<option value="${col}">${col}</option>`).join('');
    scatterYSelect.innerHTML = '<option value="">Select Y Column</option>' +
        numericColumns.map(col => `<option value="${col}">${col}</option>`).join('');

    // Add event listeners for scatter plot controls
    document.getElementById('scatterX').addEventListener('change', updateScatter);
    document.getElementById('scatterY').addEventListener('change', updateScatter);
    document.getElementById('showScatterGrid').addEventListener('change', updateScatter);
    document.getElementById('logScatterX').addEventListener('change', updateScatter);
    document.getElementById('logScatterY').addEventListener('change', updateScatter);
    document.getElementById('showScatterMean').addEventListener('change', updateScatter);
    document.getElementById('showScatterMedian').addEventListener('change', updateScatter);
    document.getElementById('showScatterStd').addEventListener('change', updateScatter);
}

// Update histogram based on selected column and options
function updateHistogram() {
    if (!analysisData) {
        console.error('Analysis data not initialized');
        return;
    }

    const column = document.getElementById('histogramColumn').value;
    if (!column) {
        if (histogramChart) {
            histogramChart.destroy();
            histogramChart = null;
        }
        return;
    }

    const columnData = analysisData.columnAnalysis[column];
    if (!columnData) {
        console.error('Column data not found:', column);
        return;
    }

    if (!columnData.values || !Array.isArray(columnData.values)) {
        console.error('Invalid column data structure:', columnData);
        return;
    }

    const values = columnData.values
        .filter(v => v !== null && v !== 'NA' && v !== '' && !isNaN(v))
        .map(Number);
    
    if (values.length === 0) {
        console.error('No valid numeric values found for column:', column);
        return;
    }
    
    // Calculate optimal number of bins (between 10 and 50)
    const numBins = Math.min(50, Math.max(10, Math.ceil(Math.sqrt(values.length))));
    
    // Calculate bin width
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / numBins;
    
    // Create bins
    const bins = Array(numBins).fill(0);
    const binLabels = [];
    
    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binWidth;
        binLabels.push(binStart.toFixed(2));
    }
    
    // Count values in each bin
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
        bins[binIndex]++;
    });

    // Calculate statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2
        : sorted[Math.floor(sorted.length/2)];
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // Create chart
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
                const binStart = min + i * binWidth;
                const binEnd = binStart + binWidth;
                return (mean >= binStart && mean < binEnd) ? Math.max(...bins) : 0;
            }),
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
        });
    }

    if (document.getElementById('showMedian').checked) {
        datasets.push({
            label: 'Median',
            data: bins.map((_, i) => {
                const binStart = min + i * binWidth;
                const binEnd = binStart + binWidth;
                return (median >= binStart && median < binEnd) ? Math.max(...bins) : 0;
            }),
            borderColor: 'green',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
        });
    }

    if (document.getElementById('showStd').checked) {
        datasets.push({
            label: 'Mean ± Std',
            data: bins.map((_, i) => {
                const binStart = min + i * binWidth;
                const binEnd = binStart + binWidth;
                const meanPlusStd = mean + std;
                const meanMinusStd = mean - std;
                return ((meanPlusStd >= binStart && meanPlusStd < binEnd) || 
                       (meanMinusStd >= binStart && meanMinusStd < binEnd)) ? Math.max(...bins) : 0;
            }),
            borderColor: 'orange',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
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
                    type: document.getElementById('logX').checked ? 'logarithmic' : 'linear',
                    grid: {
                        display: document.getElementById('showGrid').checked
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency'
                    },
                    type: document.getElementById('logY').checked ? 'logarithmic' : 'linear',
                    grid: {
                        display: document.getElementById('showGrid').checked
                    }
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

// Update scatter plot based on selected columns and options
function updateScatter() {
    const xColumn = document.getElementById('scatterX').value;
    const yColumn = document.getElementById('scatterY').value;
    const showGrid = document.getElementById('showScatterGrid').checked;
    const logX = document.getElementById('logScatterX').checked;
    const logY = document.getElementById('logScatterY').checked;
    const showMean = document.getElementById('showScatterMean').checked;
    const showMedian = document.getElementById('showScatterMedian').checked;
    const showStd = document.getElementById('showScatterStd').checked;

    if (!xColumn || !yColumn) {
        if (scatterChart) {
            scatterChart.destroy();
            scatterChart = null;
        }
        return;
    }

    const xData = analysisData.columnAnalysis[xColumn].values.map(Number);
    const yData = analysisData.columnAnalysis[yColumn].values.map(Number);

    // Calculate statistics
    const xMean = calculateMean(xData);
    const yMean = calculateMean(yData);
    const xMedian = calculateMedian(xData);
    const yMedian = calculateMedian(yData);
    const xStd = calculateStandardDeviation(xData);
    const yStd = calculateStandardDeviation(yData);

    const datasets = [{
        label: 'Data Points',
        data: xData.map((x, i) => ({x, y: yData[i]})),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        pointRadius: 3
    }];

    // Add vertical and horizontal lines for statistics
    if (showMean) {
        datasets.push({
            label: 'X Mean',
            data: [{x: xMean, y: Math.min(...yData)}, {x: xMean, y: Math.max(...yData)}],
            type: 'line',
            borderColor: 'rgba(255, 0, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
        datasets.push({
            label: 'Y Mean',
            data: [{x: Math.min(...xData), y: yMean}, {x: Math.max(...xData), y: yMean}],
            type: 'line',
            borderColor: 'rgba(255, 0, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
    }

    if (showMedian) {
        datasets.push({
            label: 'X Median',
            data: [{x: xMedian, y: Math.min(...yData)}, {x: xMedian, y: Math.max(...yData)}],
            type: 'line',
            borderColor: 'rgba(0, 255, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
        datasets.push({
            label: 'Y Median',
            data: [{x: Math.min(...xData), y: yMedian}, {x: Math.max(...xData), y: yMedian}],
            type: 'line',
            borderColor: 'rgba(0, 255, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
    }

    if (showStd) {
        datasets.push({
            label: 'X Mean ± Std',
            data: [
                {x: xMean + xStd, y: Math.min(...yData)},
                {x: xMean + xStd, y: Math.max(...yData)}
            ],
            type: 'line',
            borderColor: 'rgba(255, 165, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
        datasets.push({
            label: 'X Mean - Std',
            data: [
                {x: xMean - xStd, y: Math.min(...yData)},
                {x: xMean - xStd, y: Math.max(...yData)}
            ],
            type: 'line',
            borderColor: 'rgba(255, 165, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
        datasets.push({
            label: 'Y Mean + Std',
            data: [
                {x: Math.min(...xData), y: yMean + yStd},
                {x: Math.max(...xData), y: yMean + yStd}
            ],
            type: 'line',
            borderColor: 'rgba(255, 165, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
        datasets.push({
            label: 'Y Mean - Std',
            data: [
                {x: Math.min(...xData), y: yMean - yStd},
                {x: Math.max(...xData), y: yMean - yStd}
            ],
            type: 'line',
            borderColor: 'rgba(255, 165, 0, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
        });
    }

    const ctx = document.getElementById('scatterChart').getContext('2d');
    if (scatterChart) {
        scatterChart.destroy();
    }

    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: logX ? 'logarithmic' : 'linear',
                    title: {
                        display: true,
                        text: xColumn
                    },
                    grid: {
                        display: showGrid
                    }
                },
                y: {
                    type: logY ? 'logarithmic' : 'linear',
                    title: {
                        display: true,
                        text: yColumn
                    },
                    grid: {
                        display: showGrid
                    }
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

// Make functions globally available
window.updateHistogram = updateHistogram;
window.updateScatter = updateScatter;
window.initializeVisualizationData = initializeVisualizationData; 