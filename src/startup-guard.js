// Imported ahead of the page locale by startup-loading.js. The locale awaits the verified i18n bundle (top-level
// await), so the bootstrap script can fail to load during that wait; this listener is attached before it starts.
export const BOOTSTRAP_UNAVAILABLE = new Promise((resolve) => {
    addEventListener(
        'error',
        (event) => {
            if (event.target?.matches?.('script[data-bloom-bootstrap]')) {
                resolve();
            }
        },
        true,
    );
});
