


export function createPageUrl(pageName: string) {
    const [pathPart, queryPart] = pageName.split('?');
    const path = '/' + pathPart.toLowerCase().replace(/ /g, '-');
    return queryPart ? `${path}?${queryPart}` : path;
}
