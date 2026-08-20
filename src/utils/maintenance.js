export function maintenanceLocation(data) {
    const reason = data?.message?.trim()
    return {path: '/maintenance', query: {reason: reason || 'Server is offline'}}
}
