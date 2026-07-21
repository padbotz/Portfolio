import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild
} from '@angular/core';
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Filler, ChartConfiguration
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

/**
 * Reusable Chart.js line chart for a single vital's trend.
 * Draws the trend line plus dashed warning-threshold reference lines.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`:host { display: block; position: relative; height: 160px; }`]
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() values: number[] = [];
  @Input() labels: string[] = [];
  @Input() unit = '';
  @Input() stroke = '#1591c9';
  /** Normal range [lo, hi] drawn as dashed reference lines. */
  @Input() band: [number, number] | null = null;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  ngAfterViewInit(): void { this.render(); }

  ngOnChanges(): void { if (this.chart) this.render(); }

  ngOnDestroy(): void { this.chart?.destroy(); }

  private render(): void {
    if (!this.canvasRef) return;
    this.chart?.destroy();

    const n = this.values.length;
    const flat = (v: number) => new Array(n).fill(v);
    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
      {
        label: this.unit || 'value',
        data: this.values,
        borderColor: this.stroke,
        backgroundColor: this.stroke + '22',
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 4
      }
    ];
    if (this.band) {
      const dashed = (v: number) => ({
        label: 'threshold',
        data: flat(v),
        borderColor: '#c2740c',
        borderWidth: 1,
        borderDash: [5, 4],
        pointRadius: 0,
        fill: false,
        tension: 0
      });
      datasets.push(dashed(this.band[0]), dashed(this.band[1]));
    }

    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data: { labels: this.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.datasetIndex === 0,
            callbacks: { label: (ctx) => `${ctx.parsed.y} ${this.unit}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 7, font: { size: 10 } } },
          y: { grid: { color: '#eef2f7' }, ticks: { font: { size: 10 } } }
        }
      }
    };
    this.chart = new Chart(this.canvasRef.nativeElement, cfg);
  }
}
