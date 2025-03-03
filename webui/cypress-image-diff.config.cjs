const config = {
    ROOT_DIR: 'cypress/visual-tests/',
    JSON_REPORT: {
        OVERWRITE: true
    },
    FAIL_ON_MISSING_BASELINE: true,
    RETRY_OPTIONS: {
        doNotFail: true
    }
};

module.exports = config
