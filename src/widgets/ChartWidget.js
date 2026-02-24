import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export const ChartWidget = GObject.registerClass(
    class ChartWidget extends Gtk.DrawingArea {
        _init(def, dataPoints = []) {
            super._init({
                hexpand: true,
                vexpand: true,
            });
            this.def = def;
            this.dataPoints = dataPoints;

            this.set_draw_func((area, cr, width, height) => this._draw(cr, width, height));
        }

        updateData(dataPoints) {
            this.dataPoints = dataPoints;
            this.queue_draw();
        }

        _draw(cr, width, height) {
            const margin = 20;
            const w = width - margin * 2;
            const h = height - margin * 2;

            if (w <= 0 || h <= 0) return;

            cr.translate(margin, margin);

            // Determine min/max values including the def range
            let minVal = this.def.min_value;
            let maxVal = this.def.max_value;

            for (const pt of this.dataPoints) {
                if (pt.value < minVal) minVal = pt.value;
                if (pt.value > maxVal) maxVal = pt.value;
            }

            // Ensure min and max don't overlap exactly
            if (minVal === maxVal) {
                minVal -= 1;
                maxVal += 1;
            } else {
                const range = maxVal - minVal;
                minVal -= range * 0.1;
                maxVal += range * 0.1;
            }
            const range = maxVal - minVal;

            // Sort data points by date ascending
            const pts = [...this.dataPoints].sort((a, b) => new Date(a.date) - new Date(b.date));

            // Draw acceptable range background
            const yMin = h - ((this.def.min_value - minVal) / range) * h;
            const yMax = h - ((this.def.max_value - minVal) / range) * h;

            // Note: GTK/CSS colors are better, but we hardcode a subtle green for the 'good' zone
            cr.setSourceRGBA(0.2, 0.8, 0.2, 0.1);
            cr.rectangle(0, yMax, w, yMin - yMax);
            cr.fill();

            // Draw line graph
            if (pts.length > 0) {
                // Parse hex color from def or default to blue
                const hex = this.def.color || '#3584e4';
                let r = parseInt(hex.slice(1, 3), 16) / 255 || 0.2;
                let g = parseInt(hex.slice(3, 5), 16) / 255 || 0.5;
                let b = parseInt(hex.slice(5, 7), 16) / 255 || 0.9;

                cr.setSourceRGBA(r, g, b, 1.0);
                cr.setLineWidth(2.0);

                pts.forEach((pt, i) => {
                    const x = w * (pts.length > 1 ? i / (pts.length - 1) : 0.5);
                    const y = h - ((pt.value - minVal) / range) * h;

                    if (i === 0) {
                        cr.moveTo(x, y);
                    } else {
                        cr.lineTo(x, y);
                    }
                });

                cr.stroke();

                // Draw points
                pts.forEach((pt, i) => {
                    const x = w * (pts.length > 1 ? i / (pts.length - 1) : 0.5);
                    const y = h - ((pt.value - minVal) / range) * h;

                    cr.arc(x, y, 4, 0, 2 * Math.PI);
                    cr.setSourceRGBA(r, g, b, 1.0);
                    cr.fill();

                    // Small white outline for contrast
                    cr.arc(x, y, 4, 0, 2 * Math.PI);
                    cr.setSourceRGBA(1.0, 1.0, 1.0, 1.0);
                    cr.setLineWidth(1.5);
                    cr.stroke();
                });
            } else {
                // If no data, draw a dotted line indicating the ideal range mean
                const meanVal = (this.def.min_value + this.def.max_value) / 2;
                const yMean = h - ((meanVal - minVal) / range) * h;
                cr.setSourceRGBA(0.5, 0.5, 0.5, 0.5);
                cr.setLineWidth(1.0);
                cr.setDash([5, 5], 0);
                cr.moveTo(0, yMean);
                cr.lineTo(w, yMean);
                cr.stroke();
                cr.setDash([], 0);
            }
        }
    }
);
