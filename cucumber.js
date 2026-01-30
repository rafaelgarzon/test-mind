module.exports = {
    default: {
        paths: ['features/**/*.feature'],
        require: [
            'features/support/setup.ts',
            'features/step_definitions/**/*.ts'
        ],
        requireModule: ['ts-node/register'],
        format: [
            '@serenity-js/cucumber'
        ],
        publishQuiet: true,
    }
}
