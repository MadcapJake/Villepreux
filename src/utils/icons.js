export function getTaskCategoryIcon(category) {
    switch (category) {
        case 'Maintenance': return 'wrench-wide-symbolic';
        case 'Water Change': return 'drinking-fountain-symbolic';
        case 'Dosing': return 'pharmacy-symbolic';
        case 'Feeding': return 'restaurant-symbolic';
        default: return 'seal-symbolic';
    }
}
