export function getTaskCategoryIcon(category) {
    switch (category) {
        case 'Maintenance': return 'wrench-wide-symbolic';
        case 'Water Change': return 'drinking-fountain-symbolic';
        case 'Dosing': return 'pharmacy-symbolic';
        case 'Feeding': return 'restaurant-symbolic';
        default: return 'seal-symbolic';
    }
}

export function getLivestockCategoryIcon(category) {
    // We refer to these as their raw resource path so that we explicitly pick the mimetype icon rather than
    // an action icon with a conflicting name
    const basePath = '/com/github/madcapjake/Villepreux/icons/scalable/mimetypes/';
    switch (category) {
        case 'Fish': return basePath + 'fish-symbolic.svg';
        case 'Invertebrates': return basePath + 'shrimp-symbolic.svg';
        case 'Corals & Anemones': return basePath + 'coral-symbolic.svg';
        case 'Plants & Macroalgae': return basePath + 'seaweed-symbolic.svg';
        case 'Amphibians & Reptiles': return basePath + 'turtle-symbolic.svg';
        default: return null;
    }
}

