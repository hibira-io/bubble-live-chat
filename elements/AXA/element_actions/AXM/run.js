function(instance, properties, context) {
    if (!instance.data.ready) return;
    var id = String(properties.user_id || '').trim();
    var hash = String(properties.user_hash || '').trim();
    if (!id || !hash) {
        instance.publishState('error', 'Identify visitor needs User ID and User hash.');
        instance.triggerEvent('error');
        return;
    }
    window.HibiraBubbleChat.identify({ id: id, hash: hash, name: String(properties.name || ''), email: String(properties.email || '') });
}
