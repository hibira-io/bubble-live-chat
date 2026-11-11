function(instance, context) {
    instance.data.ready = false;
    if (!window.HibiraBubbleChat) {
        instance.publishState('error', 'The Hibira Live Chat runtime did not load.');
        return;
    }
    instance.data.onChange = function (error) {
        if (error) {
            instance.publishState('error', error);
            instance.triggerEvent('error');
            return;
        }
        instance.data.announced = true;
        instance.publishState('error', '');
        instance.publishState('ready', true);
        instance.triggerEvent('ready');
    };
    window.HibiraBubbleChat.onChange(instance.data.onChange);
    instance.data.ready = true;
}
