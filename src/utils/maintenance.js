export function maintenanceLocation(data) {
    const reason = data?.error || data?.message?.trim()
    return {path: '/maintenance', query: {reason: reason || 'SERVER_OFFLINE'}}
}
