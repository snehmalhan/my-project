const darkOptions = {
    plugins: {
      legend: { labels: { color: 'white' } },
      title: { color: 'white' }
    },
    scales: {
      x: { ticks: { color: 'white' }, grid: { color: '#333' } },
      y: { ticks: { color: 'white' }, grid: { color: '#333' } }
    }
  };
  
  function groupByHour(timestamps) {
    const counts = {};
    timestamps.forEach(ts => {
      const hour = ts.slice(0, 13) + ":00"; // YYYY-MM-DDTHH:00
      counts[hour] = (counts[hour] || 0) + 1;
    });
    return counts;
  }
  
  function topN(counter, n = 10) {
    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }
  
  function parseEveJsonLines(lines) {
    const alerts = lines
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(entry => entry && entry.event_type === "alert");
  
    const timestamps = alerts.map(a => a.timestamp);
    const srcIps = alerts.map(a => a.src_ip);
    const dstIps = alerts.map(a => a.dest_ip);
    const protos = alerts.map(a => a.proto);
    const dstPorts = alerts.map(a => a.dest_port?.toString());
    const flows = alerts.map(a => `${a.src_ip} → ${a.dest_ip}`);
  
    const heatmap = {};
    srcIps.forEach((src, i) => {
      const dst = dstIps[i];
      if (!heatmap[src]) heatmap[src] = {};
      heatmap[src][dst] = (heatmap[src][dst] || 0) + 1;
    });
  
    return {
      alertsOverTime: groupByHour(timestamps),
      topSrcIps: topN(srcIps.reduce((c, ip) => (c[ip] = (c[ip] || 0) + 1, c), {})),
      topDstIps: topN(dstIps.reduce((c, ip) => (c[ip] = (c[ip] || 0) + 1, c), {})),
      protoDist: protos.reduce((c, p) => (c[p] = (c[p] || 0) + 1, c), {}),
      topDstPorts: topN(dstPorts.reduce((c, p) => (c[p] = (c[p] || 0) + 1, c), {})),
      topFlows: topN(flows.reduce((c, f) => (c[f] = (c[f] || 0) + 1, c), {})),
      heatmap
    };
  }
  
  fetch('eve.json')
    .then(res => res.text())
    .then(raw => {
      const data = parseEveJsonLines(raw.trim().split('\n'));
  
      // Alerts Over Time
      const timeLabels = Object.keys(data.alertsOverTime).sort();
      const timeCounts = timeLabels.map(k => data.alertsOverTime[k]);
      
      new Chart(document.getElementById('alertsTimeChart'), {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Alerts per Hour',
            data: timeCounts,
            backgroundColor: 'rgba(0,200,255,0.3)',
            borderColor: '#0af',
            fill: true,
            pointStyle: 'circle' // Optional: affects tooltips too
          }]
        },
        options: {
          ...darkOptions,
          plugins: {
            ...darkOptions.plugins,
            title: {
              display: true,
              text: 'Alerts Over Time (Hourly)',
              color: 'white',
              font:{size:16}
            },
            legend: {
              labels: {
                color: 'white',
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Time',
                color: 'white'
              },
              ticks: { color: 'white' },
              grid: { color: '#333' }
            },
            y: {
              title: {
                display: true,
                text: 'Number of Alerts',
                color: 'white'
              },
              ticks: { color: 'white' },
              grid: { color: '#333' }
            }
          }
        }
      });
      
      
  
      // Top 10 Source IPs
      const [srcLabels, srcCounts] = [data.topSrcIps.map(i => i[0]), data.topSrcIps.map(i => i[1])];
      new Chart(document.getElementById('srcIpChart'), {
        type: 'bar',
        data: {
          labels: srcLabels,
          datasets: [{ label: 'Source IPs', data: srcCounts, backgroundColor: '#f39c12' }]
        },
        options: {
          ...darkOptions,
          indexAxis: 'y',
          plugins: { title: { display: true, text: 'Top 10 Source IPs', color:'white' , font:{size:16}},
          legend: {
            labels: {
              color: 'white',
               usePointStyle: true,
              pointStyle: 'circle'
            }
          }
         }
        }
      });
  
      // Top 10 Destination IPs
      const [dstLabels, dstCounts] = [data.topDstIps.map(i => i[0]), data.topDstIps.map(i => i[1])];
      new Chart(document.getElementById('dstIpChart'), {
        type: 'bar',
        data: {
          labels: dstLabels,
          datasets: [{ label: 'Destination IPs', data: dstCounts, backgroundColor: '#2ecc71' }]
        },
        options: {
          ...darkOptions,
          indexAxis: 'y',
          plugins: { title: { display: true, text: 'Top 10 Destination IPs', color: 'white',font:{size:16} },
          legend: {
            labels: {
              color: 'white',
               usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        }
        }
      });
  
      // Protocol Distribution
      new Chart(document.getElementById('protocolChart'), {
        type: 'pie',
        data: {
          labels: Object.keys(data.protoDist),
          datasets: [{
            label: 'Protocol',
            data: Object.values(data.protoDist),
            backgroundColor: ['#3498db', '#e74c3c', '#f1c40f', '#9b59b6'],
            borderWidth: 0  // This removes the white border around segments
          }]
        },
        options: {
          ...darkOptions,
          plugins: {
            title: {
              display: true,
              text: 'Protocol Distribution',
              color: 'white',
              font:{size:16}
            },
            legend: {
              labels: {
                color: 'white',
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          }
        }
      });
      
  
      // Top Destination Ports
      const [portLabels, portCounts] = [data.topDstPorts.map(i => i[0]), data.topDstPorts.map(i => i[1])];
      new Chart(document.getElementById('dstPortChart'), {
        type: 'bar',
        data: {
          labels: portLabels,
          datasets: [{ label: 'Destination Ports', data: portCounts, backgroundColor: '#e67e22' }]
        },
        options: {
          ...darkOptions,
          plugins: { title: { display: true, text: 'Top 10 Destination Ports', color: 'white' , font:{size:16} },
          legend: {
            labels: {
              color: 'white',
               usePointStyle: true,
             pointStyle: 'circle'
            }
          } }
        }
      });
  
      // Top Source → Destination Flows
      const [flowLabels, flowCounts] = [data.topFlows.map(i => i[0]), data.topFlows.map(i => i[1])];

      new Chart(document.getElementById('flowChart'), {
        type: 'bar',
        data: {
          labels: flowLabels,
          datasets: [{
            label: 'Flows',
            data: flowCounts,
            backgroundColor: '#1abc9c'
          }]
        },
        options: {
          ...darkOptions,
          indexAxis: 'y',
          plugins: {
            ...darkOptions.plugins,
            title: {
              display: true,
              text: 'Top 10 Source → Destination IP Flows',
              color: 'white',
              font:{size:16}
            },
            legend: {
                labels: {
                  color: 'white',
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Number of Alerts',
                color: 'white'
              },
              ticks: { color: 'white' },
              grid: { color: '#333' }
            },
            y: {
              title: {
                display: true,
                text: 'Source → Destination',
                color: 'white'
              },
              ticks: { color: 'white' },
              grid: { color: '#333' }
            }
          }
        }
      });
      
  
      // Heatmap simulation
      const srcIps = Object.keys(data.heatmap).slice(0, 10);
      const dstIps = [...new Set(srcIps.flatMap(src => Object.keys(data.heatmap[src])))].slice(0, 10);
      
      const matrixData = [];
      srcIps.forEach((src, y) => {
        dstIps.forEach((dst, x) => {
          const value = data.heatmap[src][dst] || 0;
          matrixData.push({ x, y, v: value });
        });
      });
      
      new Chart(document.getElementById('heatmapChart'), {
        type: 'matrix',
        data: {
          datasets: [{
            label: 'Heatmap',
            data: matrixData,
            backgroundColor(context) {
              const value = context.dataset.data[context.dataIndex].v;
              const alpha = value / 60;  // normalize value
              return `rgba(0, 200, 255, ${alpha})`;
            },
            borderWidth: 0,
            width: () => 20,
            height: () => 20
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Source IP vs Destination IP Heatmap',
              color: 'white',
              font:{size:16}
            },
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: () => '',
                label(context) {
                  const { x, y, v } = context.raw;
                  return `Src: ${srcIps[y]}, Dst: ${dstIps[x]}, Alerts: ${v}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'category',
              labels: dstIps,
              title: { display: true, text: 'Destination IP', color: 'white'},
              ticks: { color: 'white', autoSkip: false, maxRotation: 90 },
              grid: { color: '#333' }
            },
            y: {
              type: 'category',
              labels: srcIps,
              title: { display: true, text: 'Source IP', color: 'white' },
              ticks: { color: 'white' },
              grid: { color: '#333' }
            }
          }
        }
      });
      
    })
    .catch(err => console.error("Failed to load eve.json:", err));
  