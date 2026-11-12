function(instance, properties, context) {
    if (instance.data.ready) window.HibiraBubbleChat.open(String(properties.topic || '').trim());
}
