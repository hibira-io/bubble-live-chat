function(instance, properties, context) {
    if (!instance.data.ready) return;
    var chat = window.HibiraBubbleChat;
    var error = chat.load({
        workspace: context.keys['Workspace ID'],
        show_button: properties.show_button,
        color: properties.color,
        language: properties.language
    });
    if (error) {
        instance.publishState('error', error);
        instance.triggerEvent('error');
    } else if (chat.isReady() && !instance.data.announced) {
        instance.data.announced = true;
        instance.publishState('ready', true);
        instance.triggerEvent('ready');
    }
}
