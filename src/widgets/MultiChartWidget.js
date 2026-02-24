import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import * as DB from '../database.js';

export const MultiChartWidget = GObject.registerClass(
    class MultiChartWidget extends Gtk.DrawingArea {
        _init(tank, defs, cutoffDateStr) {
            super._init({
                hexpand: true,
                vexpand: true,
            });
            this.tank = tank;
            this.defs = defs;
            this.cutoffDateStr = cutoffDateStr;

            this.dataSeries = new Map(); // def.name -> dataPoints []
            this.events = [];

            this.set_draw_func((area, cr, width, height) => this._draw(cr, width, height));
        }

        updateData(cutoffDateStr) {
            this.cutoffDateStr = cutoffDateStr;
            this.dataSeries.clear();

            // Re-fetch all histories for the active defs
            this.defs.forEach(def => {
                const history = DB.getParameterHistory(this.tank.id, def.name);
                // Filter by cutoff and sort
                const filtered = history
                    .filter(pt => pt.date >= this.cutoffDateStr)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                this.dataSeries.set(def.name, filtered);
            });

            this.queue_draw();
        }

        updateEvents(events) {
            this.events = events;
            this.queue_draw();
        }

        _draw(cr, width, height) {
            const margin = 30;
            const w = width - margin * 2;
            const h = height - margin * 2;

            if (w <= 0 || h <= 0) return;

            cr.translate(margin, margin);

            // Find global min and max dates across all series to form X axis
            let minDate = new Date();
            let maxDate = new Date("1970-01-01");
            let hasData = false;

            this.dataSeries.forEach((pts) => {
                pts.forEach(pt => {
                    hasData = true;
                    const d = new Date(pt.date);
                    if (d < minDate) minDate = d;
                    // For the right bound, use today or max data point
                    if (d > maxDate) maxDate = d;
                });
            });

            // If no data points exist, chart is empty
            if (!hasData) {
                cr.setSourceRGBA(0.5, 0.5, 0.5, 0.5);
                cr.moveTo(w / 2 - 40, h / 2);
                cr.showText("No data available in this timeframe");
                return;
            }

            // Ensure boundaries have some width
            const today = new Date();
            if (maxDate < today) maxDate = today;

            const timeRange = maxDate.getTime() - minDate.getTime();

            // Draw each series
            this.defs.forEach((def, index) => {
                const pts = this.dataSeries.get(def.name) || [];
                if (pts.length === 0) return;

                // Find local Y axis bounds for this specific parameter
                // We normalize all lines to fit within the 0-1 vertical space so they stack neatly
                let yMinVal = def.min_value;
                let yMaxVal = def.max_value;

                pts.forEach(pt => {
                    if (pt.value < yMinVal) yMinVal = pt.value;
                    if (pt.value > yMaxVal) yMaxVal = pt.value;
                });

                if (yMinVal === yMaxVal) {
                    yMinVal -= 1;
                    yMaxVal += 1;
                } else {
                    const r = yMaxVal - yMinVal;
                    yMinVal -= r * 0.1;
                    yMaxVal += r * 0.1;
                }
                const yRange = yMaxVal - yMinVal;

                // Parse Color
                const hex = def.color || '#3584e4';
                let r = parseInt(hex.slice(1, 3), 16) / 255 || 0.2;
                let g = parseInt(hex.slice(3, 5), 16) / 255 || 0.5;
                let b = parseInt(hex.slice(5, 7), 16) / 255 || 0.9;

                cr.setSourceRGBA(r, g, b, 1.0);
                cr.setLineWidth(2.0);

                pts.forEach((pt, i) => {
                    const ptDate = new Date(pt.date);
                    // X represents position in time vs total time
                    const px = timeRange > 0 ? (ptDate.getTime() - minDate.getTime()) / timeRange : 1;
                    const x = w * px;
                    const py = ((pt.value - yMinVal) / yRange);
                    const y = h - (py * h);

                    if (i === 0) {
                        cr.moveTo(x, y);
                    } else {
                        cr.lineTo(x, y);
                    }
                });

                cr.stroke();

                // Draw points on top
                pts.forEach((pt, i) => {
                    const ptDate = new Date(pt.date);
                    const px = timeRange > 0 ? (ptDate.getTime() - minDate.getTime()) / timeRange : 1;
                    const x = w * px;
                    const py = ((pt.value - yMinVal) / yRange);
                    const y = h - (py * h);

                    cr.arc(x, y, 4, 0, 2 * Math.PI);
                    cr.setSourceRGBA(r, g, b, 1.0);
                    cr.fill();

                    // Inner dot
                    cr.arc(x, y, 2.5, 0, 2 * Math.PI);
                    cr.setSourceRGBA(1.0, 1.0, 1.0, 1.0);
                    cr.fill();
                });
            });

            // Draw Vertical Marker Events
            // Events is an array of objects { date: "YYYY-MM-DD", label: "Title" }
            cr.setSourceRGBA(1.0, 0.7, 0.0, 0.5); // Orange dashed lines
            cr.setLineWidth(1.0);
            cr.setDash([5, 5], 0);

            this.events.forEach(ev => {
                const evDate = new Date(ev.date);
                if (evDate >= minDate && evDate <= maxDate) {
                    const px = timeRange > 0 ? (evDate.getTime() - minDate.getTime()) / timeRange : 1;
                    const x = w * px;

                    cr.moveTo(x, 0);
                    cr.lineTo(x, h);
                    cr.stroke();
                }
            });

            cr.setDash([], 0);
        }
    }
);
