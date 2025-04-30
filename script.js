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

// Chart.defaults.font.family = 'Helvetica Neue';
//   Chart.defaults.font.size = '14px';

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
    console.log("lineslines>>>", lines)
    const alerts = lines
        .map(line => {
            try { return JSON.parse(line); } catch { return null; }
        })
        .filter(entry => entry);

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
        console.log("datadata>>>", data)
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
                    backgroundColor: 'rgb(65, 109, 241, 0.4)',
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
                        font: { size: 16 }
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
                datasets: [{ label: 'Source IPs', data: srcCounts, backgroundColor: 'rgb(233, 169, 50)' }]
            },
            options: {
                ...darkOptions,
                indexAxis: 'y',
                plugins: {
                    title: { display: true, text: 'Top 10 Source IPs', color: 'white', font: { size: 18 } },
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
                datasets: [{ label: 'Destination IPs', data: dstCounts, backgroundColor: 'rgb(72, 234, 142)' }]
            },
            options: {
                ...darkOptions,
                indexAxis: 'y',
                plugins: {
                    title: { display: true, text: 'Top 10 Destination IPs', color: 'white', font: { size: 16 } },
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
                    backgroundColor: ['rgb(239, 103, 103)', 'rgb(78, 241, 83)', 'rgb(76, 134, 236)', 'rgb(236, 153, 81)'],
                    borderWidth: 0  // This removes the white border around segments
                }]
            },
            options: {
                ...darkOptions,
                scales: {},
                plugins: {
                    title: {
                        display: true,
                        text: 'Protocol Distribution',
                        color: 'white',
                        font: { size: 16 }
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
                datasets: [{ label: 'Destination Ports', data: portCounts, backgroundColor: 'rgb(236, 157, 88)' }]
            },
            options: {
                ...darkOptions,
                plugins: {
                    title: { display: true, text: 'Top 10 Destination Ports', color: 'white', font: { size: 16 } },
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

        // Top Source → Destination Flows
        const [flowLabels, flowCounts] = [data.topFlows.map(i => i[0]), data.topFlows.map(i => i[1])];

        new Chart(document.getElementById('flowChart'), {
            type: 'bar',
            data: {
                labels: flowLabels,
                datasets: [{
                    label: 'Flows',
                    data: flowCounts,
                    backgroundColor: 'rgb(74, 237, 224)'
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
                        font: { size: 16 }
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
        const srcIps = [...new Set(Object.keys(data.heatmap))];  // Unique source IPs
        const dstIps = [...new Set(Object.values(data.heatmap).flatMap((entry) => Object.keys(entry)))];  // Unique destination IPs

        // Log to debug the IP arrays
        console.log("Source IPs: ", srcIps);
        console.log("Destination IPs: ", dstIps);

        // Prepare matrix data
        const matrixData = [];
        Object.keys(data.heatmap).forEach((srcIp) => {
            Object.keys(data.heatmap[srcIp]).forEach((dstIp) => {
                matrixData.push({
                    x: dstIp,      // Destination IP
                    y: srcIp,      // Source IP
                    v: data.heatmap[srcIp][dstIp]  // Alert count or value
                });
            });
        });

        // Log matrixData to debug the structure
        console.log("Matrix Data: ", matrixData);

        // Check if the canvas element exists
        const canvas = document.getElementById('heatmapChart');
        if (!canvas) {
            console.error("Canvas element not found!");
        } else {
            // Create the heatmap chart
            // Prepare the heatmap chart
            new Chart(canvas, {
                type: 'matrix',
                data: {
                    datasets: [{
                        label: 'Alert Heatmap',
                        data: matrixData,
                        backgroundColor(context) {
                            const value = context.dataset.data[context.dataIndex].v;
                            return value > 10 ? 'rgb(239, 118, 118)' : 'rgb(88, 236, 130)';  // Adjust color logic as needed
                        },
                        borderWidth: 1,
                        borderColor: '#444',
                        width: () => Math.max(6, 600 / dstIps.length),
                        height: () => Math.max(6, 400 / srcIps.length)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            left: -1
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Source IP vs Destination IP Heatmap',
                            color: 'white',
                            font: { size: 16 }
                        },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: () => '',  // No title for tooltip
                                label(context) {
                                    const { x, y, v } = context.raw;
                                    const srcIp = y;  // Get the source IP based on the y index
                                    const dstIp = x;  // Get the destination IP based on the x index
                                    return `Src: ${srcIp}, Dst: ${dstIp}, Alerts: ${v}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            labels: dstIps,  // Destination IPs on x-axis
                            title: {
                                display: true,
                                text: 'Destination IP',
                                color: 'white'
                            },
                            ticks: {
                                color: 'white',
                                autoSkip: false,
                                maxRotation: 90
                            },
                            grid: {
                                color: '#333'
                            }
                        },
                        y: {
                            type: 'category',
                            labels: srcIps,
                            title: {
                                display: true,
                                text: 'Source IP',
                                color: 'white'
                            },
                            ticks: {
                                color: 'white',
                                padding: 10  // optional: adds space between labels and axis line
                            },
                            grid: {
                                color: '#333'
                            },
                            afterFit: (scale) => {
                                scale.width = 120; // Increase this for more spacing
                            }
                        }
                    }
                }
            });
        }


    })
    .catch(err => console.error("Failed to load eve.json:", err));
