// script.js

let fullData = [];        // Will hold the entire JSON array
let chartInstance = null; // Reference to our Chart.js instance

//
// 1) Plugin to draw "Course GPA" and "# of Students" in the center
//
const centerTextPlugin = {
  id: 'centerTextPlugin',
  afterDraw(chart) {
    const { ctx } = chart;

    // We'll store these values in chart.config.data.myGPAInfo
    const info = chart.config.data.myGPAInfo || { gpa: '0.00', students: '0' };
    const gpaText = `${info.gpa} GPA`;
    const studentsText = `${info.students} Students`;

    // Determine center coords from the first slice in dataset
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data[0]) return;

    const centerX = meta.data[0].x;
    const centerY = meta.data[0].y;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';

    // First line: bigger font for GPA
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(gpaText, centerX, centerY - 10);

    // Second line: smaller font for student count
    ctx.font = '16px sans-serif';
    ctx.fillText(studentsText, centerX, centerY + 18);

    ctx.restore();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  //
  // 2) Load the JSON data (replace the path if needed)
  //
  fetch('LARGE-DATA.json')
    .then(response => response.json())
    .then(data => {
      fullData = data;

      // 2a) Build a set of Terms for the dropdown
      const termSet = new Set(data.map(row => row['Term Desc']));
      const terms = Array.from(termSet).sort();
      populateTermDropdown(terms);

      // 3) Create the Chart
      Chart.register(ChartDataLabels, centerTextPlugin);

      const ctx = document.getElementById('gradeChart').getContext('2d');
      chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          // The letter-grade labels
          labels: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'DFW'],
          datasets: [{
            label: 'Grade Distribution',
            data: [], // We'll fill on "Update Chart"
            backgroundColor: [
              '#0d47a1', // A+ 
              '#1565c0', // A
              '#1e88e5', // A-
              '#42a5f5', // B+
              '#64b5f6', // B
              '#90caf9', // B-
              '#c5cae9', // C+
              '#b39ddb', // C
              '#9575cd', // C-
              '#ef5350'  // DFW
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '50%', // create the donut hole

          plugins: {
            // Turn off the regular legend
            legend: {
              display: false
            },
            // Configure the DataLabels plugin
            datalabels: {
              // Only show label if slice is big enough
              display: function(context) {
                const dataset = context.dataset;
                const value = dataset.data[context.dataIndex];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                const percent = (value / total) * 100;
                // Show label only if > 5% of total
                return percent > 5;
              },
              // The text is the letter grade from chart.data.labels
              formatter: function(value, context) {
                return context.chart.data.labels[context.dataIndex];
              },
              color: '#fff',
              font: {
                weight: 'bold',
                size: 14
              },
              // Outline the text to make it stand out
              textStrokeColor: '#000',
              textStrokeWidth: 2
            }
          }
        }
      });

      // 4) Listen for "Update Chart"
      document.getElementById('updateBtn').addEventListener('click', updateChart);
    })
    .catch(err => console.error('Error loading LARGE-DATA.json:', err));
});

// Fill the Term dropdown
function populateTermDropdown(terms) {
  const termSelect = document.getElementById('termSelect');
  terms.forEach(term => {
    const opt = document.createElement('option');
    opt.value = term;
    opt.textContent = term;
    termSelect.appendChild(opt);
  });
}

/**
 * Called when user clicks "Update Chart".
 * We filter the data by Term/Subject/Catalog, then set the donut slices
 * and center text (GPA & # of Students).
 */
function updateChart() {
  const term = document.getElementById('termSelect').value.trim();
  const subject = document.getElementById('subjectInput').value.trim().toUpperCase();
  const catalog = document.getElementById('catalogInput').value.trim();

  // Filter to matching row(s)
  const matching = fullData.filter(row => {
    return (
      (row['Term Desc'] || '') === term &&
      (row['Subject'] || '').toUpperCase() === subject &&
      (row['Catalog Number'] || '').trim() === catalog
    );
  });

  // If no match, clear chart
  if (matching.length === 0) {
    chartInstance.data.datasets[0].data = [];
    chartInstance.data.myGPAInfo = { gpa: '0.00', students: '0' };
    chartInstance.update();
    return;
  }

  // Take the first matching row (or sum them if multiple)
  const selected = matching[0];

  // Build the slice data from columns A+, A, A-, ...
  const gradeCols = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'DFW'];
  const dataValues = gradeCols.map(g => parseInt(selected[g] || '0', 10));

  // Update the chart
  chartInstance.data.datasets[0].data = dataValues;

  // Insert "Course GPA" & "# of Students" for the centerTextPlugin
  chartInstance.data.myGPAInfo = {
    gpa: selected['Course GPA'] || '0.00',
    students: selected['# of Students'] || '0'
  };

  // Confirm it's a doughnut
  chartInstance.config.type = 'doughnut';
  chartInstance.config.options.cutout = '50%';

  // Redraw
  chartInstance.update();
}
