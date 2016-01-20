var should = require('should');

var plugin = require('../plugin').init({
    config: function() {
        return {
            lookBackLimit: 3
        }
    }
});

describe('tennu-correction', function() {
    it('Should correct a newly added message.', function() {
        plugin.handlers['privmsg']({
            message: 'hello world',
            nickname: 'tester',
            channel: '#helloworld'
        });
        plugin.handlers['privmsg']({
            message: 's/hello world/goodbye world',
            nickname: 'smith',
            channel: '#helloworld'
        }).should.eventually.be.equal('Correction, <tester> \u0002goodbye world\u0002');
    });
    it('Should use middleware.', function() {
        plugin.exports.addMiddleware(function() {
            return 42;
        });
        plugin.handlers['privmsg']({
            message: 's/hello world/goodbye world',
            nickname: 'smith',
            channel: '#helloworld'
        }).should.eventually.be.equal(42);
    });
});