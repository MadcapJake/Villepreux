import { getSetting } from '../database.js';

export function formatUIDate(isoDateStr) {
    if (!isoDateStr) return '';
    // Format could be e.g. "YYYY-MM-DD"
    const format = getSetting('date_format', 'YYYY-MM-DD');
    const parts = isoDateStr.split('T')[0].split('-');
    if (parts.length !== 3) return isoDateStr;
    const [year, month, day] = parts;

    switch (format) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'Mon DD, YYYY':
            const d = new Date(year, month - 1, day);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        case 'YYYY-MM-DD':
        default:
            return `${year}-${month}-${day}`;
    }
}

export function formatUITime(timeStr) {
    // timeStr should be "HH:MM" 24-hour style
    if (!timeStr) return '';
    const useAmpm = getSetting('use_ampm', 'false') === 'true';
    if (!useAmpm) return timeStr;

    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;

    let [h, m] = parts;
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${suffix}`;
}
