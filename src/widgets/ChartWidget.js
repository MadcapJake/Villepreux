import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import * as DB from '../database.js';

export const ChartWidget = GObject.registerClass(
    class ChartWidget extends Gtk.DrawingArea {
        _init(config = {}) {
            super._init({
                hexpand: true,
                vexpand: true,
            });

            this.mode = config.mode || 'mini'; // 'mini', 'detail', 'analyze'
            this.tank = config.tank || null;

            this.series = []; // [ { def, dataPoints } ]
            this.events = []; // [ { date, title, id } ]

            this.renderedPoints = [];
            this.renderedEvents = [];

            // Enable tooltips on all charts
            this.set_has_tooltip(true);
            this.connect('query-tooltip', (widget, x, y, keyboard_tooltip, tooltip) => {
                return this._onQueryTooltip(x, y, tooltip);
            });

            this.set_draw_func((area, cr, width, height) => this._draw(cr, width, height));

            if (config.def && config.dataPoints) {
                this.setData(config.def, config.dataPoints);
            }
        }

        setData(def, dataPoints) {
            this.series = [{ def, dataPoints: [...dataPoints].sort((a, b) => new Date(a.date) - new Date(b.date)) }];
            this.queue_draw();
        }

        setAnalysisData(tank, defs, cutoffDateStr) {
            this.tank = tank;
            this.series = [];
            defs.forEach(def => {
                const history = DB.getParameterHistory(tank.id, def.name);
                const filtered = history
                    .filter(pt => pt.date >= cutoffDateStr)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                this.series.push({ def, dataPoints: filtered });
            });
            this.queue_draw();
        }

        setEvents(events) {
            this.events = events;
            this.queue_draw();
        }

        _onQueryTooltip(x, y, tooltip) {
            let closestPt = null;
            let minDistSq = 144; // 12px radius

            for (const item of this.renderedPoints) {
                const dx = item.x - x;
                const dy = item.y - y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestPt = item;
                }
            }

            if (closestPt) {
                if (this.mode === 'analyze') {
                    tooltip.set_text(`${closestPt.def.name}\nDate: ${closestPt.pt.date}\nResult: ${closestPt.pt.value} ${closestPt.def.unit || ''}`);
                } else {
                    tooltip.set_text(`Date: ${closestPt.pt.date}\nResult: ${closestPt.pt.value} ${closestPt.def.unit || ''}`);
                }
                return true;
            }

            if (this.mode === 'analyze') {
                let closestEvent = null;
                let minEventDist = 12;

                for (const item of this.renderedEvents) {
                    const dx = Math.abs(item.x - x);
                    if (dx < minEventDist) {
                        minEventDist = dx;
                        closestEvent = item;
                    }
                }

                if (closestEvent) {
                    tooltip.set_text(`Event: ${closestEvent.ev.title || closestEvent.ev.label}\nDate: ${closestEvent.ev.date}`);
                    return true;
                }
            }

            return false;
        }

        _parseColor(hex) {
            if (!hex) return { r: 0.2, g: 0.5, b: 0.9 };
            let r = parseInt(hex.slice(1, 3), 16) / 255 || 0.2;
            let g = parseInt(hex.slice(3, 5), 16) / 255 || 0.5;
            let b = parseInt(hex.slice(5, 7), 16) / 255 || 0.9;
            return { r, g, b };
        }

        _draw(cr, width, height) {
            let ml = 10, mr = 10, mt = 10, mb = 10;
            if (this.mode === 'detail') {
                ml = 45;
                mr = 20;
                mt = 30;
                mb = 30;
            } else if (this.mode === 'analyze') {
                ml = 20;
                mr = 20;
                mt = 20;
                mb = 30;
            }

            const w = width - ml - mr;
            const h = height - mt - mb;

            if (w <= 0 || h <= 0) return;

            cr.translate(ml, mt);

            this.renderedPoints = [];
            this.renderedEvents = [];

            let hasData = false;
            let minDate = new Date();
            let maxDate = new Date("1970-01-01");

            this.series.forEach(s => {
                if (s.dataPoints.length > 0) hasData = true;
                s.dataPoints.forEach(pt => {
                    const d = new Date(pt.date);
                    if (d < minDate) minDate = d;
                    if (d > maxDate) maxDate = d;
                });
            });

            if (!hasData && this.mode === 'analyze') {
                cr.setSourceRGBA(0.5, 0.5, 0.5, 0.5);
                cr.moveTo(w / 2 - 40, h / 2);
                cr.showText("No data available");
                return;
            }

            // Adjust X axis time range
            if (this.mode === 'analyze') {
                const today = new Date();
                if (maxDate < today) maxDate = today;
            }
            const timeRange = maxDate.getTime() - minDate.getTime();

            // Draw series
            this.series.forEach((s) => {
                const pts = s.dataPoints;
                const def = s.def;

                // Find global/local bounds based on mode
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
                    const rLength = yMaxVal - yMinVal;
                    yMinVal -= rLength * 0.1;
                    yMaxVal += rLength * 0.1;
                }
                const yRange = yMaxVal - yMinVal;

                // For single series (mini/detail), draw acceptable range background
                if (this.mode !== 'analyze') {
                    const pxMin = h - ((def.min_value - yMinVal) / yRange) * h;
                    const pxMax = h - ((def.max_value - yMinVal) / yRange) * h;
                    cr.setSourceRGBA(0.2, 0.8, 0.2, 0.1);
                    cr.rectangle(0, pxMax, w, pxMin - pxMax);
                    cr.fill();

                    if (this.mode === 'detail') {
                        // Draw Y axis line
                        cr.setSourceRGBA(0.5, 0.5, 0.5, 1.0);
                        cr.setLineWidth(1.0);
                        cr.moveTo(0, 0);
                        cr.lineTo(0, h);
                        cr.stroke();

                        cr.setFontSize(10);
                        // Draw unit near top left
                        if (def.unit) {
                            cr.moveTo(-40, -10);
                            cr.showText(def.unit);
                        }

                        // Top and bottom Y axis marks
                        cr.moveTo(-40, 10);
                        cr.showText(yMaxVal.toFixed(1));

                        cr.moveTo(-40, h);
                        cr.showText(yMinVal.toFixed(1));

                        // Ideal range labels
                        cr.setSourceRGBA(0.2, 0.6, 0.2, 1.0);
                        cr.moveTo(-40, pxMax + 4);
                        cr.showText(def.max_value.toFixed(1));

                        cr.moveTo(-40, pxMin + 4);
                        cr.showText(def.min_value.toFixed(1));
                    }
                }

                if (pts.length === 0) {
                    if (this.mode !== 'analyze') {
                        const meanVal = (def.min_value + def.max_value) / 2;
                        const yMean = h - ((meanVal - yMinVal) / yRange) * h;
                        cr.setSourceRGBA(0.5, 0.5, 0.5, 0.5);
                        cr.setLineWidth(1.0);
                        cr.setDash([5, 5], 0);
                        cr.moveTo(0, yMean);
                        cr.lineTo(w, yMean);
                        cr.stroke();
                        cr.setDash([], 0);
                    }
                    return; // Skip drawing pts
                }

                const { r, g, b } = this._parseColor(def.color);

                // Draw lines
                cr.setSourceRGBA(r, g, b, 1.0);
                cr.setLineWidth(2.0);

                pts.forEach((pt, i) => {
                    let px;
                    if (this.mode === 'analyze') {
                        const ptDate = new Date(pt.date);
                        px = timeRange > 0 ? (ptDate.getTime() - minDate.getTime()) / timeRange : 1;
                    } else {
                        px = pts.length > 1 ? i / (pts.length - 1) : 0.5;
                    }

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

                // Draw points
                pts.forEach((pt, i) => {
                    let px;
                    if (this.mode === 'analyze') {
                        const ptDate = new Date(pt.date);
                        px = timeRange > 0 ? (ptDate.getTime() - minDate.getTime()) / timeRange : 1;
                    } else {
                        px = pts.length > 1 ? i / (pts.length - 1) : 0.5;
                    }

                    const x = w * px;
                    const py = ((pt.value - yMinVal) / yRange);
                    const y = h - (py * h);

                    this.renderedPoints.push({
                        x: x + ml,
                        y: y + mt,
                        pt: pt,
                        def: def
                    });

                    cr.arc(x, y, 4, 0, 2 * Math.PI);
                    cr.setSourceRGBA(r, g, b, 1.0);
                    cr.fill();

                    // Inner dot/outline
                    cr.arc(x, y, 2.5, 0, 2 * Math.PI);
                    cr.setSourceRGBA(1.0, 1.0, 1.0, 1.0);
                    if (this.mode === 'analyze') {
                        cr.fill();
                    } else {
                        cr.setLineWidth(1.5);
                        cr.stroke();
                    }
                });
            });

            // Draw events
            if (this.mode === 'analyze' && this.events.length > 0) {
                cr.setSourceRGBA(1.0, 0.7, 0.0, 0.5); // Orange dashed
                cr.setLineWidth(1.0);
                cr.setDash([5, 5], 0);

                this.events.forEach(ev => {
                    const evDate = new Date(ev.date);
                    if (evDate >= minDate && evDate <= maxDate) {
                        const px = timeRange > 0 ? (evDate.getTime() - minDate.getTime()) / timeRange : 1;
                        const x = w * px;

                        this.renderedEvents.push({
                            x: x + ml,
                            ev: ev
                        });

                        cr.moveTo(x, 0);
                        cr.lineTo(x, h);
                        cr.stroke();
                    }
                });
                cr.setDash([], 0);
            }

            // Draw X Axis for detail and analyze modes
            if (this.mode === 'detail' || this.mode === 'analyze') {
                cr.setSourceRGBA(0.5, 0.5, 0.5, 1.0);
                cr.setLineWidth(1.0);
                cr.moveTo(0, h);
                cr.lineTo(w, h);
                cr.stroke();

                if (hasData) {
                    cr.setFontSize(10);
                    // Simplify datestring to MM/DD/YYYY or similar based on toISOString
                    const minStr = minDate.toISOString().split('T')[0];
                    const maxStr = maxDate.toISOString().split('T')[0];

                    cr.moveTo(0, h + 15);
                    cr.showText(minStr);

                    cr.moveTo(w - 60, h + 15); // right align roughly
                    cr.showText(maxStr);
                }
            }
        }
    }
);
